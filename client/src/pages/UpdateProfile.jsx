import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../../../design/css/update-profile.css';
import Navbar from '../components/Navbar';

function UpdateProfile({ user, setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    profilePicture: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setFormData({
      username: user.username,
      password: '',
      profilePicture: user.profilePicture || ''
    });
    
    setPreviewUrl(user.profilePicture || '');
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (name === 'profilePicture') {
      setPreviewUrl(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    if (formData.profilePicture && !isValidUrl(formData.profilePicture)) {
      setError('Please enter a valid URL for the profile picture');
      setIsSubmitting(false);
      return;
    }

    try {
      const usernameChanged = formData.username !== user.username;
      
      const response = await axios.put('http://localhost:3000/api/users/profile', {
        username: user.username,
        newUsername: usernameChanged ? formData.username : undefined,
        password: formData.password || undefined,
        profilePicture: formData.profilePicture
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data && response.data.user) {
        const updatedUser = {
          ...user,
          ...response.data.user
        };
        
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        setMessage('Profile updated successfully!' + (usernameChanged ? ' Username has been updated.' : ''));
        
        setTimeout(() => {
          navigate('/home');
        }, 1500);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidUrl = (string) => {
    if (!string) return true;
    try {
      const url = new URL(string);
      
      const isImageUrl = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname);
      const isGoogleImagesUrl = url.hostname.includes('images.app.goo.gl');
      
      if (isGoogleImagesUrl) {
        setError('Google Images links (images.app.goo.gl) cannot be used directly. Please use a direct image URL.');
        return false;
      }
      
      if (!isImageUrl) {
        setError('URL does not appear to be a direct image link. Please use a URL that ends with .jpg, .png, .gif, etc.');
        return false;
      }
      
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleImageError = () => {
    setPreviewUrl('/default-avatar.png');
  };

  if (!user) return null;

  return (
    <>
      <Navbar user={user} setUser={setUser} />

      <main className="update-container">
        <h1 className="update-title">Update Profile</h1>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        
        <div className="profile-preview">
          <img 
            src={previewUrl || '/default-avatar.png'} 
            alt="Profile Preview" 
            className="profile-preview-img"
            onError={handleImageError}
            style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
          />
          <p>Profile Picture Preview</p>
        </div>
        
        <form className="update-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input 
            id="username" 
            name="username" 
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your username"
          />

          <label htmlFor="password">New Password</label>
          <input 
            id="password" 
            name="password" 
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Leave blank to keep current password"
          />

          <label htmlFor="profilePicture">Profile Picture URL</label>
          <input 
            id="profilePicture" 
            name="profilePicture" 
            type="url"
            value={formData.profilePicture}
            onChange={handleChange}
            placeholder="Enter direct image URL (e.g., https://example.com/image.jpg)"
          />

          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/home')}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </>
  );
}

export default UpdateProfile;