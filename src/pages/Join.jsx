import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { authService } from '../services/api';

const Join = () => {
  const { login, isAuthenticated, user } = useKindeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteData, setInviteData] = useState(null);
  
  // Extract token from query params
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  
  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!token) {
          setError('Invalid invitation link. No token provided.');
          setLoading(false);
          return;
        }
        
        // Verify the invitation token
        const response = await authService.verifyInvitation(token);
        setInviteData(response);
        
        // If the user is already logged in, process the join immediately
        if (isAuthenticated && user) {
          await processJoin();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error verifying invitation:', error);
        setError(error.message || 'Invalid or expired invitation link.');
        setLoading(false);
      }
    };
    
    verifyInvitation();
  }, [token, isAuthenticated, user]);
  
  const processJoin = async () => {
    try {
      setLoading(true);
      
      // Accept the invitation
      await authService.acceptInvitation(token);
      
      // Navigate to dashboard
      navigate('/dashboard', { 
        state: { joinSuccess: true, organization: inviteData?.organization?.name } 
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation. Please try again.');
      setLoading(false);
    }
  };
  
  const handleJoin = async () => {
    if (!isAuthenticated) {
      // Redirect to login/signup
      login();
    } else {
      // Process the join if already authenticated
      await processJoin();
    }
  };
  
  return (
    <div className="join-page">
      <div className="join-container">
        <h1>Team Invitation</h1>
        
        {loading ? (
          <div className="loading-container">
            <p>Processing invitation...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h2>Invitation Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="button">
              Go to Login
            </button>
          </div>
        ) : inviteData ? (
          <div className="invitation-details">
            <h2>You've Been Invited!</h2>
            
            {inviteData.organization && (
              <p>
                You've been invited to join <strong>{inviteData.organization.name}</strong> as a{' '}
                <strong>{inviteData.role}</strong>.
              </p>
            )}
            
            <p>To accept this invitation, please click the button below.</p>
            
            <button onClick={handleJoin} className="join-button">
              {isAuthenticated ? 'Accept Invitation' : 'Sign in to accept'}
            </button>
          </div>
        ) : (
          <div className="error-container">
            <p>No valid invitation found.</p>
            <button onClick={() => navigate('/')} className="button">
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Join; 