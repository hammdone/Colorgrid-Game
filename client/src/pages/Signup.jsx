import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../design/css/signup.css';

function Signup({ setUser }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    profilePicture: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return; 
    }
    
    setIsSubmitting(true);
    setError(''); 

    if (formData.profilePicture && !isValidUrl(formData.profilePicture)) {
      setError('Please enter a valid URL for the profile picture');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log('Attempting to sign up with:', { ...formData, coins: 1000 });
      
      const response = await axios.post('http://localhost:3000/api/auth/signup', {
        ...formData,
        coins: 1000 
      });
      
      console.log('Signup response:', response.data);
      
      if (!response.data.user) {
        throw new Error('Invalid response from server - missing user data');
      }
      
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      
      navigate('/home');
    } catch (err) {
      console.error('Signup error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Signup failed');
      setIsSubmitting(false);
    }
  };


  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <main className="auth-container">
      <h1 className="auth-title">Sign Up</h1>
      {error && (
        <div className="error-box">
          <p className="error-message">{error}</p>
        </div>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="profilePic">Profile Picture URL (optional)</label>
          <input
            id="profilePic"
            type="url"
            name="profilePicture"
            value={formData.profilePicture}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <div className="field-hint">
            Enter a valid image URL. The image will be displayed in the game.
          </div>
        </div>

        {formData.profilePicture && (
          <div className="preview-container">
            <p>Profile Picture Preview:</p>
            <img 
              src={formData.profilePicture} 
              alt="Profile Preview" 
              className="profile-preview"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-avatar.png';
              }}
            />
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      <p className="auth-footer">
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </main>
  );
}

export default Signup;