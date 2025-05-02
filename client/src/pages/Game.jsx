import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ColorGrid from '../components/ColorGrid';
import { useGame } from '../contexts/GameContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import '../../../design/css/gameplay.css';
import Navbar from '../components/Navbar';

function Game({ user, setUser }) {
  const { game_id } = useParams();
  const navigate = useNavigate();
  const { gameState, makeMove } = useGame();
  
  const emptyGrid = Array(5).fill().map(() => Array(5).fill(null));
  
  const [localGameState, setLocalGameState] = useState({
    grid: emptyGrid,
    currentTurn: null,
    playerColor: null,
    opponentColor: null,
    opponent: null,
    status: 'playing'
  });
  
  const [statusMessage, setStatusMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (!user?.username) {
      navigate('/login');
      return;
    }

    let socket = window.socket;
    
    if (!socket || !socket.connected) {
      socket = io('http://localhost:3000', {
        auth: {
          username: user.username,
          token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket']
      });
      
      window.socket = socket;
    }

    const onConnect = () => {
      setConnectionStatus('connected');
      
      if (game_id) {
        socket.emit('joinGame', { gameId: game_id, username: user.username });
      }
    };
    
    const onDisconnect = (reason) => {
      setConnectionStatus('disconnected');
    };
    
    const onConnectError = (err) => {
      setConnectionStatus(`error: ${err.message}`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    
    const handleGameState = (data) => {
      let gridData = emptyGrid;
      if (data.grid && Array.isArray(data.grid)) {
        gridData = JSON.parse(JSON.stringify(data.grid));
      }
      
      setLocalGameState({
        grid: gridData,
        currentTurn: data.currentTurn,
        playerColor: data.playerColor,
        opponentColor: data.opponentColor,
        opponent: data.opponent,
        opponentProfilePicture: data.opponentProfilePicture,
        status: data.status || 'playing'
      });
      
      setStatusMessage(data.currentTurn === user.username ? 'Your Turn' : `${data.opponent}'s Turn`);
    };
    
    socket.on('gameState', handleGameState);
    socket.on('gameStatus', handleGameState);
    socket.on('game_state', handleGameState);
    
    const handleMoveMade = (data) => {
      let gridData = localGameState.grid;
      if (data.grid && Array.isArray(data.grid)) {
        gridData = JSON.parse(JSON.stringify(data.grid));
      }
      
      setLocalGameState(prev => ({
        ...prev,
        grid: gridData,
        currentTurn: data.currentTurn
      }));
      
      setStatusMessage(data.currentTurn === user.username ? 'Your Turn' : `Opponent's Turn`);
    };
    
    socket.on('moveMade', handleMoveMade);
    socket.on('move_made', handleMoveMade);
    socket.on('playerMove', handleMoveMade);
    
    const refreshUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.error('Failed to refresh user data:', err);
      }
    };
    
    const handleGameOver = (data) => {
      const winner = data.winner;
      const status = data.status || 'finished';
      
      if (status === 'forfeit') {
        setStatusMessage(`Game forfeited. ${winner === user.username ? 'You gained 200 coins' : 'You lost 200 coins'}`);
      } else {
        setStatusMessage(
          winner === user.username 
            ? `You Won (+200 coins)` 
            : winner === 'draw'
              ? 'Game ended in a draw'
              : `You Lost ${user.coins > 0 ? '(-200 coins)' : ''}`
        );
      }
      
      let gridData = localGameState.grid;
      if (data.grid && Array.isArray(data.grid)) {
        gridData = JSON.parse(JSON.stringify(data.grid));
      }
      
      setLocalGameState(prev => ({
        ...prev,
        grid: gridData,
        status: 'finished',
        winner: winner
      }));
      
      try {
        if (window.socket && window.socket.connected) {
          window.socket.emit('saveGameSnapshot', {
            gameId: game_id,
            grid: gridData,
            winner: winner,
            status: status,
            player: user.username,
            opponent: localGameState.opponent
          });
          
          window.socket.once('snapshotSaved', (response) => {
            if (response.success) {
              refreshUserData();
            }
          });
        }
      } catch (err) {
        console.error('Error saving game snapshot:', err);
      }
      
      refreshUserData();
    };
    
    socket.on('gameOver', handleGameOver);
    socket.on('game_over', handleGameOver);
    socket.on('gameEnd', handleGameOver);
    socket.on('game_end', handleGameOver);

    if (socket.connected) {
      onConnect();
    }

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now(), gameId: game_id }, (response) => {});
      }
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      
      socket.off('gameState', handleGameState);
      socket.off('gameStatus', handleGameState);
      socket.off('game_state', handleGameState);
      
      socket.off('moveMade', handleMoveMade);
      socket.off('move_made', handleMoveMade);
      socket.off('playerMove', handleMoveMade);
      
      socket.off('gameOver', handleGameOver);
      socket.off('game_over', handleGameOver);
      socket.off('gameEnd', handleGameOver);
      socket.off('game_end', handleGameOver);
    };
  }, [user?.username, game_id, navigate, setUser]);

  const handleCellClick = (row, col) => {
    if (localGameState.currentTurn !== user.username || localGameState.status !== 'playing') {
      return;
    }
    
    const newGrid = JSON.parse(JSON.stringify(localGameState.grid));
    
    if (newGrid[row][col] !== null && newGrid[row][col] !== 0) {
      return;
    }
    
    newGrid[row][col] = localGameState.playerColor;
    
    setLocalGameState(prev => ({
      ...prev,
      grid: newGrid,
      currentTurn: prev.opponent
    }));
    
    setStatusMessage(`${localGameState.opponent}'s Turn`);
    
    if (window.socket && window.socket.connected) {
      window.socket.emit('makeMove', {
        gameId: game_id,
        player: user.username,
        row,
        col
      });
    }
  };

  const handleForfeit = async () => {
    if (window.socket && window.socket.connected) {
      window.socket.emit('forfeit', { 
        gameId: game_id, 
        username: user.username 
      });
      
      setLocalGameState(prev => ({
        ...prev,
        status: 'finished',
        winner: prev.opponent
      }));
      
      setStatusMessage(`Game forfeited. You lost ${user.coins > 0 ? '(-200 coins)' : ''}`);
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.user) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.error('Failed to refresh user data after forfeit:', err);
      }
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/default-avatar.png';
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="game-container">
        <div className="connection-status">
          Status: {connectionStatus}
        </div>
        <div className="players-header">
          <div className="player">
            <img 
              src={user.profilePicture || '/default-avatar.png'} 
              alt="You" 
              className="player-avatar"
              onError={handleImageError}
            />
            <span>{user.username}</span>
            <div className="color-indicator" style={{ backgroundColor: localGameState.playerColor || '#ccc' }}></div>
          </div>
          <span className="vs">VS</span>
          <div className="player">
            <img 
              src={localGameState.opponentProfilePicture || '/default-avatar.png'} 
              alt="Opponent" 
              className="player-avatar"
              onError={handleImageError}
            />
            <span>{localGameState.opponent || 'Waiting...'}</span>
            <div className="color-indicator" style={{ backgroundColor: localGameState.opponentColor || '#ccc' }}></div>
          </div>
        </div>

        <ColorGrid
          grid={localGameState.grid}
          onCellClick={handleCellClick}
          playerColor={localGameState.playerColor}
          currentTurn={localGameState.currentTurn}
          username={user.username}
        />

        <div className="status-area">
          <p className="status">
            Status: <span className={localGameState.currentTurn === user.username ? 'your-turn' : ''}>
              {statusMessage || (localGameState.currentTurn === user.username ? 'Your Turn' : localGameState.currentTurn ? `${localGameState.opponent}'s Turn` : 'Waiting...')}
            </span>
          </p>
          {localGameState.status === 'playing' ? (
            <button 
              className="btn btn-secondary forfeit-btn"
              onClick={handleForfeit}
              disabled={localGameState.status !== 'playing'}
            >
              Forfeit
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate('/newgame/waiting')}>Play Again</button>
          )}
        </div>

        {localGameState.status === 'finished' && (
          <div className="game-over-overlay">
            <div className="game-over-content">
              <h2>
                {localGameState.winner === user.username 
                  ? 'Victory!' 
                  : localGameState.winner === 'draw'
                    ? 'Draw!'
                    : 'Defeat!'}
              </h2>
              <p>Game Over</p>
              <div className="game-over-buttons">
                <button className="btn btn-primary" onClick={() => navigate('/newgame/waiting')}>Play Again</button>
                <button className="btn btn-secondary" onClick={() => navigate('/home')}>Back to Home</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default Game;