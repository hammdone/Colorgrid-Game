import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { io } from 'socket.io-client';
import '../../../design/css/waiting.css';
import '../../../design/css/matchfound.css';
import Navbar from '../components/Navbar';

function GameWaiting({ user, setUser }) {
  const navigate = useNavigate();
  const { gameState } = useGame();
  const [opponent, setOpponent] = useState(null);
  const [waitingTime, setWaitingTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [countDown, setCountDown] = useState(3);
  const [debugMessage, setDebugMessage] = useState('');
  
  const inQueueRef = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    let socket = window.socket;

    if (!socket) {
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

    if (socket.connected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('connecting');
      socket.connect();
    }

    const handleConnect = () => {
      setConnectionStatus('connected');
      
      if (!inQueueRef.current && !opponent) {
        socket.emit('find_match', { 
          username: user.username,
          timestamp: Date.now()
        });
        
        inQueueRef.current = true;
        setDebugMessage('Joined matchmaking queue');
      }
    };
    
    const handleConnectError = (err) => {
      setConnectionStatus(`error: ${err.message}`);
      setDebugMessage(`Connection error: ${err.message}`);
      inQueueRef.current = false;
    };

    const handleDisconnect = (reason) => {
      setConnectionStatus(`disconnected: ${reason}`);
      setDebugMessage(`Socket disconnected: ${reason}`);
      inQueueRef.current = false;
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    
    socket.on('matchmaking_status', (data) => {
      if (data.status === 'queued') {
        inQueueRef.current = true;
        setDebugMessage(`In queue (with ${data.queueSize - 1} others)`);
      } else if (data.status === 'canceled') {
        inQueueRef.current = false;
        setDebugMessage('Matchmaking canceled');
      }
    });

    const handleGameStart = (gameData) => {
      const gameId = gameData.gameId || gameData._id || gameData.id;
      setDebugMessage(`Match found! Game ID: ${gameId}`);
      
      const opponentData = {
        username: gameData.opponent || gameData.player2,
        profilePicture: gameData.opponentProfilePicture,
        color: gameData.opponentColor || gameData.player2Color
      };
      
      setOpponent(opponentData);
      
      const timer = setInterval(() => {
        setCountDown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(`/newgame/${gameId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    };
    
    socket.on('gameStart', handleGameStart);
    socket.on('game_start', handleGameStart);
    socket.on('start_game', handleGameStart);
    socket.on('match_found', handleGameStart);

    const waitingInterval = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping', { timestamp: Date.now() }, (response) => {
          if (response) {
            setDebugMessage(`Last ping: ${Date.now() - response.timestamp}ms`);
          }
        });
      }
    }, 5000);

    if (socket.connected && !inQueueRef.current && !opponent) {
      handleConnect();
    }

    return () => {
      clearInterval(waitingInterval);
      clearInterval(pingInterval);
      
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('matchmaking_status');
      
      socket.off('gameStart', handleGameStart);
      socket.off('game_start', handleGameStart);
      socket.off('start_game', handleGameStart);
      socket.off('match_found', handleGameStart);
      
      if (!opponent) {
        socket.emit('cancelMatchmaking', { username: user.username });
        inQueueRef.current = false;
      }
    };
  }, [user, navigate, opponent, setUser]);

  const handleCancel = () => {
    const socket = window.socket;
    if (socket) {
      socket.emit('cancelMatchmaking', { username: user.username });
      inQueueRef.current = false;
    }
    navigate('/home');
  };

  const handleTryAgain = () => {
    const socket = window.socket;
    if (socket && socket.connected) {
      if (inQueueRef.current) {
        setDebugMessage('Already in matchmaking queue');
        return;
      }
      
      socket.emit('find_match', { 
        username: user.username,
        timestamp: Date.now()
      });
      
      inQueueRef.current = true;
      setDebugMessage('Retry sent to server');
      
      setWaitingTime(0);
    }
  };

  const formatWaitingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="waiting-container">
        {connectionStatus !== 'connected' && (
          <div className="connection-status">
            Socket status: {connectionStatus}
            {connectionStatus === 'connecting' && (
              <div className="loading-spinner"></div>
            )}
          </div>
        )}
        
        {!opponent ? (
          <>
            <h1 className="waiting-title">Waiting for Opponent…</h1>
            <p className="waiting-subtitle">Matchmaking in progress</p>
            <div className="waiting-time">Time elapsed: {formatWaitingTime(waitingTime)}</div>
            <div className="waiting-animation">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
            <div className="action-buttons">
              <button 
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={connectionStatus !== 'connected'}
              >
                Cancel
              </button>
              <button 
                onClick={handleTryAgain}
                className="btn btn-primary"
                disabled={connectionStatus !== 'connected' || inQueueRef.current}
              >
                Try Again
              </button>
            </div>
            {debugMessage && (
              <div className="debug-message">
                {debugMessage}
              </div>
            )}
          </>
        ) : (
          <div className="match-found">
            <h1 className="match-title">Opponent Found!</h1>
            <div className="players-info">
              <div className="player">
                <img 
                  src={user?.profilePicture || '/default-avatar.png'} 
                  alt="You" 
                  className="player-avatar"
                />
                <span>{user?.username}</span>
                <div className="color-indicator" style={{ backgroundColor: gameState?.playerColor || '#ccc' }}></div>
              </div>
              <div className="vs">VS</div>
              <div className="player">
                <img 
                  src={opponent.profilePicture || '/default-avatar.png'} 
                  alt={opponent.username} 
                  className="player-avatar"
                />
                <span>{opponent.username}</span>
                <div className="color-indicator" style={{ backgroundColor: opponent.color || '#ccc' }}></div>
              </div>
            </div>
            <p className="status-message">Game starting in {countDown}...</p>
          </div>
        )}
      </main>
    </>
  );
}

export default GameWaiting;