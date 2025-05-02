import { useNavigate } from 'react-router-dom';
import '../../../design/css/welcome.css';

function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="welcome-container">
      <h1 className="welcome-title">Welcome to ColorGrid</h1>
      <p className="welcome-subtitle">A real‑time, multiplayer grid conquest game.</p>
      <div className="welcome-buttons">
        <button onClick={() => navigate('/login')} className="btn btn-primary">Login</button>
        <button onClick={() => navigate('/signup')} className="btn btn-secondary">Sign Up</button>
      </div>
    </main>
  );
}

export default Welcome;
