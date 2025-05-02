import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../../../design/css/history-detail.css';
import Navbar from '../components/Navbar';

function GameHistory({ user, setUser }) {
  const { game_id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchGame = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3000/api/games/${game_id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setGame(response.data);
      } catch (err) {
        console.error('Failed to load game details:', err);
        setError('Failed to load game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [game_id, user, navigate]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!game) return <div className="error">Game not found</div>;

  const getResultClass = () => {
    if (game.winner === user.username) return "won";
    if (game.winner === 'draw') return "draw";
    return "lost";
  };

  const getResultText = () => {
    if (game.winner === user.username) return "You Won";
    if (game.winner === 'draw') return "Draw";
    return `${game.winner || game.opponent || 'Opponent'} Won`;
  };

  const getDisplayId = () => {
    if (game_id && game_id.length > 8) {
      return game_id.substring(0, 8);
    }
    return game_id;
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/default-avatar.png';
  };

  const renderGrid = () => {
    const gridData = game.grid || game.final_grid || game.finalGrid;
    
    if (!gridData || !Array.isArray(gridData)) {
      return (
        <div className="grid-container">
          <p>No grid data available</p>
        </div>
      );
    }
    
    const transposedGrid = Array(5).fill().map((_, colIndex) => 
      Array(5).fill().map((_, rowIndex) => 
        gridData[rowIndex] && gridData[rowIndex][colIndex] ? gridData[rowIndex][colIndex] : null
      )
    );
    
    return (
      <div className="grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 60px)',
        gridTemplateRows: 'repeat(5, 60px)',
        gap: '5px',
        margin: '0 auto',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        position: 'relative',
        zIndex: 1
      }}>
        {transposedGrid.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <div 
              key={`${rowIndex}-${colIndex}`}
              className="cell"
              style={{ 
                backgroundColor: cell || 'rgba(255, 255, 255, 0.1)',
                border: '2px solid #fff',
                borderRadius: '4px',
                width: '60px',
                height: '60px'
              }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="snapshot-container">
        <h1 className="snapshot-title">Game #{getDisplayId()}</h1>
        <div className="game-info">
          <p className={`result ${getResultClass()}`}>{getResultText()}</p>
          <p className="played-on">Played: {new Date(game.createdAt || game.date || Date.now()).toLocaleString()}</p>
          {game.opponent && <p className="opponent">Against: {game.opponent}</p>}
        </div>

        <div className="grid-wrapper" style={{ marginBottom: '20px' }}>
          {renderGrid()}
        </div>

        <div className="button-group">
          <Link to="/history" className="btn btn-secondary">Back to History</Link>
          <button onClick={() => navigate('/home')} className="btn btn-primary">Home</button>
        </div>
      </main>
    </>
  );
}

export default GameHistory;