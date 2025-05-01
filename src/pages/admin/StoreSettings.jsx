import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { authService } from '../../services/api';
import '../../styles/admin.css';

const StoreSettings = () => {
  const [storeInfo, setStoreInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    logo: '',
    currencyCode: 'USD',
    taxRate: 10,
    shippingThreshold: 50
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchStoreInfo();
  }, []);

  const fetchStoreInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would fetch store settings from an API
      // For now, we'll just use the current user's organization info
      const userData = await authService.getCurrentUser();
      
      if (userData && userData.user && userData.user.organizationId) {
        const orgId = userData.user.organizationId;
        
        // Mock data - in a real app you would fetch this from an API
        setStoreInfo(prev => ({
          ...prev,
          name: `Store ${orgId.slice(-4)}`,
          email: `store${orgId.slice(-4)}@example.com`
        }));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch store information:', error);
      setError('Failed to load store settings. Please try again later.');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects like address.street
      const [parent, child] = name.split('.');
      setStoreInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setStoreInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setSuccessMessage('');
      
      // In a real app, this would update the store settings via an API
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Store settings updated successfully');
      setSaving(false);
    } catch (error) {
      console.error('Failed to update store settings:', error);
      setError('Failed to update store settings. Please try again.');
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="store-settings-page">
        <h1>Store Settings</h1>
        
        {loading ? (
          <div className="loading-container">
            <p>Loading store settings...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={fetchStoreInfo} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="settings-form">
            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}
            
            <div className="form-section">
              <h2>Basic Information</h2>
              
              <div className="form-group">
                <label htmlFor="name">Store Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={storeInfo.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Store Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={storeInfo.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Store Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={storeInfo.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="form-section">
              <h2>Store Address</h2>
              
              <div className="form-group">
                <label htmlFor="address.street">Street Address</label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={storeInfo.address.street}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="address.city">City</label>
                  <input
                    type="text"
                    id="address.city"
                    name="address.city"
                    value={storeInfo.address.city}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address.state">State/Province</label>
                  <input
                    type="text"
                    id="address.state"
                    name="address.state"
                    value={storeInfo.address.state}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="address.zipCode">Postal/Zip Code</label>
                  <input
                    type="text"
                    id="address.zipCode"
                    name="address.zipCode"
                    value={storeInfo.address.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address.country">Country</label>
                  <select
                    id="address.country"
                    name="address.country"
                    value={storeInfo.address.country}
                    onChange={handleInputChange}
                  >
                    <option value="">Select a country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="form-section">
              <h2>Store Preferences</h2>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currencyCode">Currency</label>
                  <select
                    id="currencyCode"
                    name="currencyCode"
                    value={storeInfo.currencyCode}
                    onChange={handleInputChange}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="taxRate">Tax Rate (%)</label>
                  <input
                    type="number"
                    id="taxRate"
                    name="taxRate"
                    min="0"
                    max="100"
                    step="0.01"
                    value={storeInfo.taxRate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="shippingThreshold">
                  Free Shipping Threshold ({storeInfo.currencyCode})
                </label>
                <input
                  type="number"
                  id="shippingThreshold"
                  name="shippingThreshold"
                  min="0"
                  step="0.01"
                  value={storeInfo.shippingThreshold}
                  onChange={handleInputChange}
                />
                <small>Set to 0 for no free shipping</small>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StoreSettings; 