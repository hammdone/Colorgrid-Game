import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import '../../../design/css/home.css';


function Home({ user, setUser }) {
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }


    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3000/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && response.data.user) {
          console.log('Updated user data:', response.data.user);
          setUser(response.data.user);

          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (err) {
        console.error('Error fetching updated user data:', err);
      } finally {
        setIsLoading(false);
      }
    };


    fetchUserData();


    if (!window.socket || !window.socket.connected) {
      console.log('No active socket connection in Home, initializing...');
      setConnectionStatus('connecting');
      
      const socket = io('http://localhost:3000', {
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
      
      socket.on('connect', () => {
        console.log('Socket connected in Home component! Socket ID:', socket.id);
        setConnectionStatus('connected');
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error in Home:', err);
        setConnectionStatus('error: ' + err.message);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected in Home:', reason);
        setConnectionStatus('disconnected: ' + reason);
        

        setTimeout(() => {
          if (socket && !socket.connected) {
            console.log('Attempting to reconnect...');
            socket.connect();
          }
        }, 3000);
      });
    } else {
      console.log('Using existing socket connection in Home:', window.socket.id);
      setConnectionStatus(window.socket.connected ? 'connected' : 'disconnected');
    }
    

    const pingInterval = setInterval(() => {
      if (window.socket && window.socket.connected) {
        window.socket.emit('ping', { timestamp: Date.now() }, (response) => {
          if (response) {
            console.log('Ping response time:', Date.now() - response.timestamp, 'ms');
          }
        });
      }
    }, 30000); 
    
    return () => {
      clearInterval(pingInterval);

      if (window.socket) {
        window.socket.off('connect');
        window.socket.off('connect_error');
        window.socket.off('disconnect');
      }
    };
  }, [user, navigate, setUser]);

  const handlePlayClick = () => {
    if (!window.socket || !window.socket.connected) {
      console.log('Socket not connected, attempting to reconnect...');
      
      if (window.socket) {
        window.socket.connect();
        
        window.socket.once('connect', () => {
          navigate('/newgame/waiting');
        });
        
        setTimeout(() => {
          navigate('/newgame/waiting');
        }, 2000);
      } else {
        navigate('/newgame/waiting');
      }
    } else {
      navigate('/newgame/waiting');
    }
  };

  if (!user || isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <>
      <header className="navbar">
        <Link to="/home" className="nav-logo">🎨 ColorGrid</Link>
        <div className="nav-right">
          <span className="coins">💰 <span>{user.coins}</span></span>
          <div className="profile-dropdown">
            <img 
              src={user.profilePicture || '/default-avatar.png'} 
              alt="Profile" 
              className="profile-pic"
              onError={(e) => {
                console.log('Profile picture failed to load:', user.profilePicture);
                e.target.onerror = null;
                e.target.src = '/default-avatar.png';
                
                if (user.profilePicture && user.profilePicture.includes('images.app.goo.gl')) {
                  console.log('Detected Google Images URL, this type of URL cannot be used directly');
                }
              }}
            />
            <span className="username">{user.username}</span>
            <div className="dropdown-menu">
              <Link to="/update-profile">Update Profile</Link>
              <Link to="/">Logout</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="home-container">
        <h1 className="home-title">Main Dashboard</h1>
        
        {connectionStatus !== 'connected' && (
          <div className="connection-status">
            Socket status: {connectionStatus}
            {connectionStatus.includes('disconnected') && (
              <button 
                onClick={() => {
                  if (window.socket) {
                    window.socket.connect();
                  }
                }}
                className="btn btn-small"
              >
                Reconnect
              </button>
            )}
          </div>
        )}
        
        <div className="home-buttons">
          <button onClick={handlePlayClick} className="btn btn-primary">Play</button>
          <button onClick={() => navigate('/leaderboard')} className="btn btn-secondary">Leaderboard</button>
          <button onClick={() => navigate('/history')} className="btn btn-secondary">History</button>
        </div>
      </main>
      
      {window.socket && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 12px',
          borderRadius: '4px',
          backgroundColor: window.socket.connected ? '#4CAF50' : '#F44336',
          color: 'white',
          fontSize: '14px',
          zIndex: 1000
        }}>
          Socket: {window.socket.connected ? 'Connected' : 'Disconnected'} 
          {window.socket.id ? ` (${window.socket.id})` : ''}
        </div>
      )}
    </>
  );
}

export default Home;