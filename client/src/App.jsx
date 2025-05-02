import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { GameProvider } from './contexts/GameContext';

// Pages
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import GameWaiting from './pages/GameWaiting';
import Game from './pages/Game';
import History from './pages/History';
import GameHistory from './pages/GameHistory';
import UpdateProfile from './pages/UpdateProfile';
import Leaderboard from './pages/Leaderboard';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <GameProvider>
        <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/signup" element={<Signup setUser={setUser} />} />
        <Route path="/home" element={<Home user={user} />} />
        <Route path="/newgame/waiting" element={<GameWaiting user={user} />} />
        <Route path="/newgame/:game_id" element={<Game user={user} />} />
        <Route path="/history" element={<History user={user} />} />
        <Route path="/history/:game_id" element={<GameHistory user={user} />} />
        <Route path="/update-profile" element={<UpdateProfile user={user} setUser={setUser} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </GameProvider>
    </Router>
  );
}

export default App;
