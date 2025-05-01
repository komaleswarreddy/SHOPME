import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { authService } from '../../services/api';
import '../../styles/admin.css';

const TeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('customer');
  const [adding, setAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authService.getTeamMembers();
      setTeamMembers(data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setError('Failed to load team members. Please try again later.');
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError(null);
      
      await authService.updateTeamMemberRole(userId, { role: newRole });
      
      setTeamMembers(prevMembers => 
        prevMembers.map(member => 
          member._id === userId ? { ...member, role: newRole } : member
        )
      );
      
      setSuccessMessage(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update user role:', error);
      setError(`Failed to update user role: ${error.message}`);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!newMemberEmail) {
      setError('Please enter an email address');
      return;
    }
    
    try {
      setAdding(true);
      setError(null);
      setSuccessMessage('');
      
      // Create new team member directly
      const newMember = {
        email: newMemberEmail.toLowerCase(),
        role: newMemberRole,
        status: 'active',
        isActive: true
      };
      
      // Call API to create team member
      await authService.createTeamMember(newMember);
      
      setSuccessMessage(`Team member ${newMemberEmail} added successfully with role: ${newMemberRole}`);
      setNewMemberEmail('');
      setNewMemberRole('customer');
      setAdding(false);
      
      // Refresh the team members list
      fetchTeamMembers();
    } catch (error) {
      console.error('Failed to add team member:', error);
      setError(`Failed to add team member: ${error.message}`);
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }
    
    try {
      setError(null);
      
      await authService.removeTeamMember(userId);
      
      setTeamMembers(prevMembers => 
        prevMembers.filter(member => member._id !== userId)
      );
      
      setSuccessMessage('Team member removed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to remove team member:', error);
      setError(`Failed to remove team member: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="team-members-page">
        <h1>Team Members</h1>
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="invite-section">
          <h2>Add New Team Member</h2>
          <p className="invite-description">
            Add new members to your team. They can log in using their email address.
          </p>
          <form onSubmit={handleAddMember} className="invite-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newMemberEmail">Email Address</label>
                <input
                  type="email"
                  id="newMemberEmail"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newMemberRole">Role</label>
                <select
                  id="newMemberRole"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  required
                >
                  <option value="customer">Customer</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              
              <button
                type="submit"
                className="invite-button"
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="team-list-section">
          <h2>Current Team Members</h2>
          
          {loading ? (
            <div className="loading-container">
              <p>Loading team members...</p>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="no-members">
              <p>No team members found.</p>
            </div>
          ) : (
            <table className="team-members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(member => (
                  <tr key={member._id}>
                    <td>
                      {member.firstName} {member.lastName}
                    </td>
                    <td>{member.email}</td>
                    <td>
                      {member.role === 'owner' ? (
                        <span className="role-badge owner">Owner</span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          disabled={member.role === 'owner'}
                        >
                          <option value="customer">Customer</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${member.status}`}>
                        {member.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {member.lastLogin 
                        ? new Date(member.lastLogin).toLocaleDateString() 
                        : 'Never'}
                    </td>
                    <td>
                      {member.role !== 'owner' && (
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveMember(member._id)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeamMembers; 