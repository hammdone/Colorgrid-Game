import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../../../design/css/history.css';
import Navbar from '../components/Navbar';

function History({ user, setUser }) {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGames = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/games/history/${user.username}`);
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setGames(response.data);
      } else {
        setGames([]);
      }
    } catch (err) {
      console.error('Failed to load game history:', err);
      setError('Failed to load game history. Please try again later.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    
    const handleRouteChange = () => {
      fetchGames();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [user, navigate]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const getResultText = (game) => {
    if (game.winner === 'draw' || game.result === 'draw') return "Draw";
    if (game.winner === user.username || game.winner_username === user.username) return "Won";
    return "Lost";
  };

  const getDisplayId = (gameId) => {
    if (gameId && gameId.length > 8) {
      return gameId.substring(0, 8);
    }
    return Math.floor(Math.random() * 90000000 + 10000000).toString();
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="history-container">
        <h1 className="history-title">Your Game History</h1>
        {games.length === 0 ? (
          <div className="no-games">
            <p>No games played yet.</p>
            <button className="play-button" onClick={() => navigate('/newgame/waiting')}>Play Now</button>
          </div>
        ) : (
          <div className="history-list-wrapper">
            <ul className="history-list">
              {games.map((game) => {
                const resultText = getResultText(game);
                const opponent = game.opponent || (game.player1_username === user.username ? game.player2_username : game.player1_username);
                
                return (
                  <li key={game._id}>
                    <Link to={`/history/${game._id}`} className="game-link">
                      <span className="game-id">Game #{getDisplayId(game._id)}</span>
                      <span className="game-opponent">{opponent}</span>
                      <span className={`game-result result-${resultText.toLowerCase()}`}>
                        {resultText}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/home')} className="btn btn-secondary">Back to Home</button>
          <button onClick={fetchGames} className="btn btn-primary" style={{ marginLeft: '10px' }}>Refresh</button>
        </div>
      </main>
    </>
  );
}

export default History;