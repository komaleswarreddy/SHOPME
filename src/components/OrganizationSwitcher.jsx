import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';
import { FaBuilding, FaExchangeAlt, FaSpinner } from 'react-icons/fa';

/**
 * Organization Switcher Component
 * 
 * Allows the user to view and switch between organizations they belong to
 */
const OrganizationSwitcher = ({ onSwitch }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [debugMode, setDebugMode] = useState(process.env.NODE_ENV === 'development');
  const dropdownRef = useRef(null);

  // Add this debug function to help troubleshoot issues
  const debugData = (data) => {
    // Skip extensive logging in production
    if (process.env.NODE_ENV === 'production') return;
    
    console.group('OrganizationSwitcher Debug');
    console.log('Raw data:', data);
    console.log('Is array:', Array.isArray(data));
    console.log('Length:', data?.length || 0);
    console.log('Data type:', typeof data);
    
    if (Array.isArray(data)) {
      // Log each organization
      data.forEach((org, index) => {
        console.log(`Organization ${index + 1}:`, {
          id: org.id,
          name: org.name,
          role: org.role,
          isCurrent: org.isCurrent
        });
      });
    } else if (data && typeof data === 'object') {
      console.log('Keys:', Object.keys(data));
      if (data.organizations) {
        console.log('Organizations found in response');
        console.log('Is organizations array:', Array.isArray(data.organizations));
        console.log('Organizations length:', data.organizations?.length || 0);
      }
    }
    console.groupEnd();
  };

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching organizations from API...');
        // Get organizations data from API
        const response = await authService.getUserOrganizations();
        console.log('OrganizationSwitcher received response:', response);
        
        // Debug the response
        debugData(response);
        
        if (Array.isArray(response)) {
          if (response.length > 0) {
            console.log(`Found ${response.length} organizations for current user`);
            
            // Ensure isCurrent property exists on at least one org
            let hasCurrent = response.some(org => org.isCurrent === true);
            if (!hasCurrent && response.length > 0) {
              console.log('No current organization found, setting first as current');
              response[0].isCurrent = true;
            }
            
            setOrganizations(response);
          } else {
            console.log('No organizations found (empty array)');
            setOrganizations([]);
            setError('No organizations found for your account. Please contact support.');
          }
        } else {
          console.error('Invalid response format from API: not an array', response);
          setOrganizations([]);
          setError('Could not load organizations due to invalid data format.');
        }
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError('Failed to load your organizations. Please try refreshing the page.');
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [lastRefresh]); // Added lastRefresh as dependency to force refresh when needed
  
  // Handle manual refresh
  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  // Toggle debug mode (development only)
  const toggleDebugMode = () => {
    if (process.env.NODE_ENV === 'development') {
      setDebugMode(!debugMode);
    }
  };

  // Handle switching organization
  const handleSwitchOrg = async (organizationId) => {
    try {
      setSwitching(true);
      setDropdownOpen(false);
      setError(null);
      console.log(`Switching to organization: ${organizationId}`);
      
      const result = await authService.switchOrganization(organizationId);
      console.log('Switch organization result:', result);
      
      if (!result || result.success === false) {
        throw new Error(result?.message || 'Failed to switch organization');
      }
      
      // Call the onSwitch callback if provided
      if (onSwitch && typeof onSwitch === 'function') {
        onSwitch(result);
      }
      
      // Force page reload to ensure all components update with new context
      // This is the most reliable way to ensure the app reflects the new organization
      window.location.href = '/dashboard';
      
      // Or just refresh the organizations list to update current status
      // setTimeout(() => {
      //   setLastRefresh(Date.now());
      // }, 500); // Small delay to ensure backend changes are reflected
    } catch (error) {
      console.error('Error switching organization:', error);
      setError(`Failed to switch organization: ${error.message}`);
    } finally {
      setSwitching(false);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get current organization
  const currentOrg = organizations.find(org => org.isCurrent === true);
  
  // Check if user has multiple organizations
  const hasMultipleOrgs = organizations.length > 1;

  // Check if we have organizations but none is marked as current
  if (organizations.length > 0 && !currentOrg) {
    console.warn("Found organizations but none is marked as current:", organizations);
  }
  
  return (
    <div className="org-switcher" ref={dropdownRef}>
      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="org-switcher-button"
        disabled={loading || switching || !hasMultipleOrgs}
        title={!hasMultipleOrgs ? (organizations.length === 0 ? "No organizations found" : "You belong to only one organization") : "Switch organization"}
      >
        <FaBuilding />
        <span className="org-name">
          {loading ? 'Loading...' : (currentOrg ? currentOrg.name : 'No organization')}
        </span>
        {hasMultipleOrgs && <FaExchangeAlt className="switch-icon" />}
        {(loading || switching) && <FaSpinner className="spinner" />}
      </button>
      
      {/* Debug info - click to toggle in development */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          onClick={toggleDebugMode} 
          style={{
            display: debugMode ? 'block' : 'none',
            position: 'absolute',
            background: '#f8f9fa',
            border: '1px solid #ddd',
            padding: '10px',
            borderRadius: '4px',
            marginTop: '5px',
            zIndex: 1000,
            fontSize: '12px',
            width: '300px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} 
          className="debug-info"
        >
          <h4>Debug Info (click to hide)</h4>
          <p>Organizations count: {organizations?.length || 0}</p>
          <p>Has current org: {currentOrg ? 'Yes' : 'No'}</p>
          <p>Has multiple orgs: {hasMultipleOrgs ? 'Yes' : 'No'}</p>
          <p>Current org name: {currentOrg?.name || 'None'}</p>
          <p>Current org ID: {currentOrg?.id || 'None'}</p>
          {Array.isArray(organizations) && organizations.map((org, idx) => (
            <div key={idx} style={{marginTop: '5px', borderTop: '1px solid #eee', paddingTop: '5px'}}>
              <p><strong>Org #{idx+1}:</strong> {org.name} ({org.id})</p>
              <p>Role: {org.role}, Current: {org.isCurrent ? 'Yes' : 'No'}</p>
            </div>
          ))}
          <button onClick={handleRefresh} style={{marginTop: '10px'}}>
            Refresh Data
          </button>
        </div>
      )}
      
      {dropdownOpen && hasMultipleOrgs && (
        <div className="org-dropdown">
          <div className="dropdown-header">Your organizations</div>
          <ul className="org-list">
            {organizations.map(org => (
              <li 
                key={org.id}
                className={`org-item ${org.isCurrent ? 'current' : ''}`}
                onClick={() => handleSwitchOrg(org.id)}
              >
                <span className="org-name">{org.name}</span>
                <span className={`org-role ${org.role}`}>
                  {org.role}
                </span>
                {org.isCurrent && <span className="current-indicator">Current</span>}
              </li>
            ))}
          </ul>
          {error && <div className="error-message">{error}</div>}
        </div>
      )}
      
      {/* Show message if no organizations are found */}
      {!loading && organizations.length === 0 && (
        <div className="error-message" style={{marginTop: '10px'}}>
          {error || 'No organizations found.'}
        </div>
      )}
    </div>
  );
};

export default OrganizationSwitcher; 