import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../../../design/css/leaderboard.css';
import Navbar from '../components/Navbar';

function Leaderboard({ user, setUser }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gamesData, setGamesData] = useState([]);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/api/games');
      if (response.data && Array.isArray(response.data)) {
        setGamesData(response.data);
        fetchLeaderboard(response.data);
      }
    } catch (err) {
      console.error('Failed to load games:', err);
      fetchLeaderboard([]);
    }
  };

  const fetchLeaderboard = async (games) => {
    try {
      const response = await axios.get('http://localhost:3000/api/leaderboard');
      
      if (response.data && Array.isArray(response.data)) {
        const playersWithStats = response.data.map(player => {
          const playerGames = games.filter(game => 
            game.player1_username === player.username || 
            game.player2_username === player.username
          );
          
          let totalLosses = 0;
          
          playerGames.forEach(game => {
            if (game.status === 'finished') {
              if (game.winner !== 'draw' && game.result !== 'draw' && 
                  game.winner_username !== player.username && 
                  (game.player1_username === player.username || game.player2_username === player.username)) {
                totalLosses++;
              }
            }
          });
          
          return {
            ...player,
            calculatedLosses: totalLosses
          };
        });
        
        setPlayers(playersWithStats);
      } else {
        setPlayers([]);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = searchQuery
    ? players.filter(player =>
        player.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : players;

  if (loading) return <div className="loading">Loading leaderboard data...</div>;

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="board-container">
        <h1 className="board-title">Leaderboard</h1>
        
        <input 
          id="searchInput" 
          type="text" 
          placeholder="Search by username…" 
          className="search-box"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {players.length === 0 && !error ? (
          <div className="no-data">No players found.</div>
        ) : (
          <table className="board-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Record (W/L/D)</th>
                <th>Coins</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const wins = player.wins || 0;
                const losses = player.calculatedLosses || 0;
                const draws = player.draws || 0;
                
                return (
                  <tr key={player._id}>
                    <td className="player-cell">
                      <img 
                        src={player.profilePicture || '/default-avatar.png'} 
                        alt={player.username}
                        className="player-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/default-avatar.png';
                        }}
                      />
                      <span>{player.username}</span>
                    </td>
                    <td>{wins}/{losses}/{draws}</td>
                    <td>{player.coins}</td>
                  </tr>
                );
              })}
              {filteredPlayers.length === 0 && (
                <tr>
                  <td colSpan="3" className="no-results">No players found matching your search</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => navigate('/home')} className="btn btn-secondary">Back to Home</button>
          <button 
            onClick={fetchGames} 
            className="btn btn-primary"
            style={{ marginLeft: '10px' }}
          >
            Refresh Data
          </button>
        </div>
      </main>
    </>
  );
}

export default Leaderboard;