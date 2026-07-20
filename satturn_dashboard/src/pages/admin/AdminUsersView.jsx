import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { User, Trash2, Plus, ArrowLeft, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminUsersView = () => {
  const { users, addUser, deleteUser, devices, assignGlobalDeviceToUser, unassignUserDevice, searchQuery } = useData();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [selectedDeviceToAssign, setSelectedDeviceToAssign] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.phone.includes(searchQuery) ||
    (u.company_name && u.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if(newUserName && newUserPhone && newUserPassword) {
      const formattedPhone = newUserPhone.startsWith('+') ? newUserPhone : `+${newUserPhone}`;
      
      await addUser({ 
        name: newUserName, 
        phone: formattedPhone, 
        password: newUserPassword,
        role: 'USER',
        company_name: newCompany,
        company_logo_url: newLogoUrl
      });
      setIsAdding(false);
      setNewUserName('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewCompany('');
      setNewLogoUrl('');
    }
  };

  const handleAssignDevice = (userId) => {
    if (selectedDeviceToAssign) {
      assignGlobalDeviceToUser(selectedDeviceToAssign, userId);
      setSelectedDeviceToAssign('');
    }
  };

  return (
    <div className="dashboard-view fade-in">
      <div className="table-container panel">
        <div className="table-header">
          <h3 className="table-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <User size={20} /> User Management
          </h3>
          <div className="table-actions">
            {!isAdding && (
              <button className="btn-primary" style={{width: 'auto', padding: '8px 16px', marginTop: 0}} onClick={() => setIsAdding(true)}>
                <Plus size={16} style={{display: 'inline', marginRight: 4}}/> Add User
              </button>
            )}
          </div>
        </div>

        {isAdding && (
          <div className="panel" style={{padding: '16px', marginBottom: '24px', backgroundColor: 'var(--bg-base)'}}>
            <h4 style={{fontSize: 14, marginBottom: 12}}>Add New User</h4>
            <form onSubmit={handleAddSubmit} style={{display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap'}}>
              <div>
                <input type="text" className="input-base" placeholder="Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
              </div>
              <div>
                <input type="text" className="input-base" placeholder="Phone (e.g. +919718600346)" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} required />
              </div>
              <div>
                <input type="password" className="input-base" placeholder="Password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required minLength={6} />
              </div>
              <div>
                <input type="text" className="input-base" placeholder="Company Name" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
              </div>
              <div style={{width: '100%'}}>
                <input type="url" className="input-base" style={{width: '100%', maxWidth: '400px'}} placeholder="Company Logo URL (e.g. https://imgur.com/...)" value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} />
              </div>
              <div style={{display: 'flex', gap: 8, width: '100%'}}>
                <button type="submit" className="btn-primary" style={{marginTop: 0, padding: '10px 16px', width: 'auto'}}>Save & Create User</button>
                <button type="button" className="btn-view" onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Phone Number</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <React.Fragment key={u.id}>
                  <tr>
                    <td className="font-mono">{u.id}</td>
                    <td style={{fontWeight: 500}}>{u.name}</td>
                    <td>{u.phone}</td>
                    <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-success'}`}>{u.role}</span></td>
                    <td>
                      {u.role !== 'ADMIN' && (
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <button 
                            className="btn-view" 
                            style={{padding: '4px 8px'}}
                            onClick={() => setExpandedUserId(prev => prev === u.id ? null : u.id)}
                          >
                            <Settings size={14} style={{marginRight: '4px', display: 'inline'}}/> Manage Devices
                          </button>
                          <button className="btn-icon" style={{color: 'var(--accent-danger)'}} onClick={() => deleteUser(u.id)} title="Delete User">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedUserId === u.id && (
                    <tr>
                      <td colSpan="5" style={{padding: 0}}>
                        <div style={{padding: '16px 24px', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)'}}>
                          <h5 style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                            Devices Assigned to {u.name}
                          </h5>
                          
                          {/* List of currently assigned devices */}
                          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px'}}>
                            {devices.filter(d => d.assignedUserId === u.id).length === 0 ? (
                              <div style={{fontSize: '14px', color: 'var(--text-tertiary)'}}>No devices assigned yet.</div>
                            ) : (
                              devices.filter(d => d.assignedUserId === u.id).map(d => (
                                <div key={d.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-base)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                  <div>
                                    <span style={{fontWeight: 500, marginRight: '8px'}}>{d.name}</span>
                                    <span className="font-mono text-tertiary" style={{fontSize: '12px'}}>{d.device_code || d.id}</span>
                                  </div>
                                  <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                    <button 
                                      className="btn-view"
                                      style={{padding: '4px 8px'}}
                                      onClick={() => navigate(`/dashboard/device/${d.id}`)}
                                    >
                                      View Data
                                    </button>
                                    <button 
                                      className="btn-icon" 
                                      style={{color: 'var(--text-tertiary)'}} 
                                      onClick={() => unassignUserDevice(d.id)}
                                      title="Unassign & Delete Clone"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Assign new device controls */}
                          <div style={{display: 'flex', gap: '8px'}}>
                            <select 
                              className="input-base" 
                              style={{maxWidth: '300px'}}
                              value={selectedDeviceToAssign}
                              onChange={e => setSelectedDeviceToAssign(e.target.value)}
                            >
                              <option value="">Select a global template to assign...</option>
                              {devices.filter(d => !d.parent_device_id).map(d => (
                                <option key={d.id} value={d.id}>{d.name} ({d.device_code || d.id})</option>
                              ))}
                            </select>
                            <button 
                              className="btn-primary" 
                              style={{marginTop: 0, padding: '8px 16px', width: 'auto'}}
                              onClick={() => handleAssignDevice(u.id)}
                              disabled={!selectedDeviceToAssign}
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersView;
