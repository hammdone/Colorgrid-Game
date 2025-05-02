import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import '../../../design/css/login.css';

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoggingIn) {
      return;
    }
    
    setIsLoggingIn(true);
    setError('');
    setSocketStatus('Authenticating...');
    
    try {
      console.log('Attempting to login with:', formData);
      
      const response = await axios.post('http://localhost:3000/api/auth/login', formData);
      
      console.log('Login response:', response.data);
      
      if (!response.data.user) {
        throw new Error('Invalid response from server - missing user data');
      }
      

      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
   
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      

      setSocketStatus('Connecting to socket...');
      
      try {

        if (window.socket && window.socket.connected) {
          console.log('Socket already connected:', window.socket.id);
          setSocketStatus('Socket already connected! Redirecting...');
          

          setTimeout(() => {
            setIsLoggingIn(false);
            navigate('/home');
          }, 500);
          return;
        }
        

        const socket = io('http://localhost:3000', {
          auth: {
            username: response.data.user.username,
            token: response.data.token || localStorage.getItem('token')
          },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          transports: ['websocket']
        });
        

        window.socket = socket;
        
        // Connection event handlers
        socket.on('connect', () => {
          console.log('Socket connected immediately after login! Socket ID:', socket.id);
          setSocketStatus('Socket connected successfully! Redirecting...');
          

          setTimeout(() => {
            setIsLoggingIn(false);
            navigate('/home');
          }, 500);
        });
        
        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setSocketStatus(`Socket error: ${err.message}`);
          setIsLoggingIn(false);
          
          setTimeout(() => {
            navigate('/home');
          }, 1500);
        });
        
        setTimeout(() => {
          if (!socket.connected) {
            console.warn('Socket connection taking too long, navigating anyway');
            setSocketStatus('Socket connection taking too long, navigating anyway...');
            setIsLoggingIn(false);
            navigate('/home');
          }
        }, 3000);
      } catch (socketErr) {
        console.error('Error establishing socket connection:', socketErr);
        setSocketStatus(`Socket initialization error: ${socketErr.message}`);
        setIsLoggingIn(false);
        
        setTimeout(() => {
          navigate('/home');
        }, 1500);
      }
      
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Login failed');
      setSocketStatus('');
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="auth-container">
      <h1 className="auth-title">Login</h1>
      {error && <p className="error-message">{error}</p>}
      {socketStatus && <p className="status-message">{socketStatus}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={isLoggingIn}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoggingIn}
          />
        </div>
        <button 
          type="submit" 
          className="auth-button"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="auth-footer">
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}

export default Login;