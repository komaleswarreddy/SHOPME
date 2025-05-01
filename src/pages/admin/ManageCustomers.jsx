import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { customersService } from '../../services/api';
import { FaSearch, FaEnvelope, FaUser, FaCalendarAlt, FaClock, FaEye, FaUserCheck, FaUserTimes, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/admin.css';

const ManageCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await customersService.getAll();
      
      // Handle empty data
      if (!data || !Array.isArray(data)) {
        // Set mock customers data for development purposes
        const mockCustomers = [
          {
            _id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'customer',
            createdAt: new Date('2023-03-15').toISOString(),
            lastLogin: new Date('2023-06-20').toISOString(),
            isActive: true,
            totalSpent: 1250.75
          },
          {
            _id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            role: 'customer',
            createdAt: new Date('2023-04-10').toISOString(),
            lastLogin: new Date('2023-06-25').toISOString(),
            isActive: true,
            totalSpent: 870.25
          },
          {
            _id: '3',
            firstName: 'Robert',
            lastName: 'Johnson',
            email: 'robert.johnson@example.com',
            role: 'customer',
            createdAt: new Date('2023-01-22').toISOString(),
            lastLogin: null,
            isActive: false,
            totalSpent: 0
          },
          {
            _id: '4',
            firstName: 'Emily',
            lastName: 'Williams',
            email: 'emily.williams@example.com',
            role: 'customer',
            createdAt: new Date('2023-05-30').toISOString(),
            lastLogin: new Date('2023-06-28').toISOString(),
            isActive: true,
            totalSpent: 450.99
          },
          {
            _id: '5',
            firstName: 'Michael',
            lastName: 'Brown',
            email: 'michael.brown@example.com',
            role: 'customer',
            createdAt: new Date('2023-02-14').toISOString(),
            lastLogin: new Date('2023-03-15').toISOString(),
            isActive: false,
            totalSpent: 125.50
          }
        ];
        setCustomers(mockCustomers);
      } else {
        setCustomers(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setError('Failed to load customers. Please try again later.');
      setLoading(false);
      
      // Set mock data even on error for development purposes
      const mockCustomers = [
        {
          _id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'customer',
          createdAt: new Date('2023-03-15').toISOString(),
          lastLogin: new Date('2023-06-20').toISOString(),
          isActive: true,
          totalSpent: 1250.75
        },
        {
          _id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          role: 'customer',
          createdAt: new Date('2023-04-10').toISOString(),
          lastLogin: new Date('2023-06-25').toISOString(),
          isActive: true,
          totalSpent: 870.25
        },
        {
          _id: '3',
          firstName: 'Robert',
          lastName: 'Johnson',
          email: 'robert.johnson@example.com',
          role: 'customer',
          createdAt: new Date('2023-01-22').toISOString(),
          lastLogin: null,
          isActive: false,
          totalSpent: 0
        }
      ];
      setCustomers(mockCustomers);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
    const email = (customer.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    
    return name.includes(term) || email.includes(term);
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
  };
  
  const handleCloseDetails = () => {
    setSelectedCustomer(null);
  };

  return (
    <DashboardLayout>
      <div className="manage-customers-page animate-fade-in">
        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Manage Customers</h2>
            <div className="search-container">
              <div className="form-group flex items-center bg-white rounded-lg shadow-sm p-2">
                <FaSearch className="text-gray-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control border-0 shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="section-body mt-6">
            {loading ? (
              <div className="loading-container py-8">
                <div className="loader"></div>
                <p className="loading-text mt-4">Loading customers...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger">
                <div className="alert-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="alert-content">
                  <h3 className="alert-title">Error Loading Customers</h3>
                  <p className="alert-message">{error}</p>
                </div>
                <button onClick={fetchCustomers} className="btn btn-outline btn-sm">
                  Try Again
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <FaUsers />
                </div>
                <h3 className="empty-state-title">No customers found</h3>
                <p className="empty-state-message">
                  No customers match your search criteria. Try adjusting your search or add new customers.
                </p>
                <button onClick={() => setSearchTerm('')} className="btn btn-primary mt-4">
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="table-container stagger-children">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Last Login</th>
                      <th>Spent</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map(customer => (
                      <tr key={customer._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="avatar-with-status">
                              <div className="avatar avatar-md bg-primary-100 text-primary-700">
                                {customer.firstName?.charAt(0) || ''}
                                {customer.lastName?.charAt(0) || ''}
                              </div>
                              <div className={`avatar-status ${customer.isActive ? 'online' : 'offline'}`}></div>
                            </div>
                            <div>
                              <p className="font-semibold text-primary">{customer.firstName} {customer.lastName}</p>
                              <p className="text-xs text-secondary">{customer.role}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <FaEnvelope className="text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${customer.isActive ? 'success' : 'danger'}`}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400" />
                            <span>{formatDate(customer.createdAt)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <FaClock className="text-gray-400" />
                            <span>{formatDate(customer.lastLogin)}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-semibold">{formatCurrency(customer.totalSpent)}</span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleViewDetails(customer)} 
                            className="btn btn-sm btn-outline flex items-center gap-2"
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="modal fade-in">
          <div className="modal-content animate-scale-in">
            <div className="card-header flex justify-between items-center">
              <h3>Customer Details</h3>
              <button 
                onClick={handleCloseDetails} 
                className="btn-icon btn-sm"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="card-body">
              <div className="flex items-center gap-4 mb-6">
                <div className="avatar avatar-lg bg-primary-100 text-primary-700">
                  {selectedCustomer.firstName?.charAt(0) || ''}
                  {selectedCustomer.lastName?.charAt(0) || ''}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</h3>
                  <p className="text-secondary">{selectedCustomer.email}</p>
                </div>
                <span className={`status-badge ml-auto ${selectedCustomer.isActive ? 'success' : 'danger'}`}>
                  {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="divider"></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-secondary mb-1">Role</p>
                  <p className="font-medium">{selectedCustomer.role || 'Customer'}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-1">Account Created</p>
                  <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-1">Last Login</p>
                  <p className="font-medium">{formatDate(selectedCustomer.lastLogin)}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-1">Total Spent</p>
                  <p className="font-medium">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
              </div>
              
              <div className="divider"></div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button className="btn btn-outline flex items-center gap-2">
                  <FaEnvelope /> Send Message
                </button>
                <button className="btn btn-primary flex items-center gap-2">
                  {selectedCustomer.isActive ? (
                    <>
                      <FaTimesCircle /> Deactivate
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageCustomers; 