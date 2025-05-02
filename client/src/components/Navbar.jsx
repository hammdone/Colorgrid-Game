import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Navbar({ user, setUser }) {
  const [refreshing, setRefreshing] = useState(false);

  const refreshUserData = useCallback(async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
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
    } finally {
      setRefreshing(false);
    }
  }, [user, setUser]);

  useEffect(() => {
    refreshUserData();
    
    const intervalId = setInterval(() => {
      refreshUserData();
    }, 5000);
    
    if (window.socket) {
      const handleGameEvent = () => {
        setTimeout(() => {
          refreshUserData();
        }, 500);
      };
      
      window.socket.on('coinUpdate', handleGameEvent);
      window.socket.on('gameOver', handleGameEvent);
      window.socket.on('game_over', handleGameEvent);
      window.socket.on('gameEnd', handleGameEvent);
      window.socket.on('game_end', handleGameEvent);
      window.socket.on('moveMade', handleGameEvent);
      window.socket.on('playerMove', handleGameEvent);
      
      return () => {
        clearInterval(intervalId);
        window.socket.off('coinUpdate', handleGameEvent);
        window.socket.off('gameOver', handleGameEvent);
        window.socket.off('game_over', handleGameEvent);
        window.socket.off('gameEnd', handleGameEvent);
        window.socket.off('game_end', handleGameEvent);
        window.socket.off('moveMade', handleGameEvent);
        window.socket.off('playerMove', handleGameEvent);
      };
    }
    
    return () => clearInterval(intervalId);
  }, [refreshUserData]);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/default-avatar.png';
  };

  if (!user) return null;

  return (
    <header className="navbar">
      <Link to="/home" className="nav-logo">🎨 ColorGrid</Link>
      <div className="nav-right">
        <span className="coins">💰 <span>{user.coins}</span></span>
        <div className="profile-dropdown">
          <img 
            src={user.profilePicture || '/default-avatar.png'} 
            alt="Profile" 
            className="profile-pic"
            onError={handleImageError}
          />
          <span className="username">{user.username}</span>
          <div className="dropdown-menu">
            <Link to="/update-profile">Update Profile</Link>
            <Link to="/">Logout</Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;