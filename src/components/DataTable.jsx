import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Trash2, Plus, Settings, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const DataTable = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { devices, addDevice, deleteDevice, users, bulkUpdateDeviceSimConfig, searchQuery } = useData();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState('Ambient Air Quality System');

  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const defaultConfig = {
    pm25: { min: 10, max: 30 },
    pm10: { min: 15, max: 40 },
    aqi: { min: 25, max: 50 },
    temperature: { min: 20, max: 35 },
    humidity: { min: 40, max: 60 }
  };
  const [globalSimForm, setGlobalSimForm] = useState(defaultConfig);

  // Admins see the Global Inventory (templates only). Standard users don't use this component anymore.
  let visibleDevices = devices.filter(d => !d.parent_device_id);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visibleDevices = visibleDevices.filter(d => 
      d.name.toLowerCase().includes(q) || 
      (d.device_code || d.id).toLowerCase().includes(q) || 
      d.type.toLowerCase().includes(q)
    );
  }

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if(newDevName) {
      addDevice({
        name: newDevName,
        type: newDevType,
        company: 'Satturn Innovation',
        status: 'Offline',
        assignedUserId: null // Assignment happens strictly in User Management now
      });
      setIsAdding(false);
      setNewDevName('');
    }
  };

  const handleGlobalConfigChange = (metric, field, value) => {
    setGlobalSimForm(prev => ({
      ...prev,
      [metric]: { ...prev[metric], [field]: Number(value) }
    }));
  };

  const handleSaveGlobalConfig = () => {
    bulkUpdateDeviceSimConfig(globalSimForm);
    setIsGlobalSettingsOpen(false);
  };

  return (
    <div className="table-container panel">
      <div className="table-header">
        <h3 className="table-title">Global Device Inventory</h3>
        <div className="table-actions" style={{display: 'flex', gap: 12}}>
          {user?.role === 'ADMIN' && (
            <>
              <button className="btn-view" style={{marginTop: 0, width: 'auto', padding: '8px 16px'}} onClick={() => setIsGlobalSettingsOpen(!isGlobalSettingsOpen)}>
                <Settings size={16} style={{display: 'inline', marginRight: 4}}/> Global Sim Settings
              </button>
              {!isAdding && (
                <button className="btn-primary" style={{marginTop: 0, width: 'auto', padding: '8px 16px'}} onClick={() => setIsAdding(true)}>
                  <Plus size={16} style={{display: 'inline', marginRight: 4}}/> Add Device
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isGlobalSettingsOpen && user?.role === 'ADMIN' && (
        <div className="panel" style={{padding: '24px', marginBottom: '24px', border: '1px solid var(--accent-danger)', backgroundColor: 'rgba(255, 60, 60, 0.05)'}}>
          <h3 style={{marginBottom: '12px', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <AlertTriangle size={20} /> Global Simulation Settings
          </h3>
          <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px'}}>
            <strong>WARNING:</strong> Saving these settings will forcefully overwrite the simulation configuration for <strong>ALL {devices.length} DEVICES</strong> in the global inventory.
          </p>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px'}}>
            {Object.keys(defaultConfig).map(metric => (
              <div key={metric} style={{backgroundColor: 'var(--bg-base)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <h4 style={{textTransform: 'uppercase', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)'}}>{metric}</h4>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <div>
                    <label style={{fontSize: '10px', color: 'var(--text-tertiary)'}}>MIN</label>
                    <input type="number" className="input-base" style={{padding: '6px', fontSize: '13px'}} value={globalSimForm[metric].min} onChange={e => handleGlobalConfigChange(metric, 'min', e.target.value)} />
                  </div>
                  <div>
                    <label style={{fontSize: '10px', color: 'var(--text-tertiary)'}}>MAX</label>
                    <input type="number" className="input-base" style={{padding: '6px', fontSize: '13px'}} value={globalSimForm[metric].max} onChange={e => handleGlobalConfigChange(metric, 'max', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop: '20px', display: 'flex', gap: '12px'}}>
            <button className="btn-primary" onClick={handleSaveGlobalConfig} style={{width: 'auto', backgroundColor: 'var(--accent-danger)'}}>Overwrite All Devices</button>
            <button className="btn-view" onClick={() => setIsGlobalSettingsOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      
      {isAdding && user?.role === 'ADMIN' && (
        <div className="panel" style={{padding: '16px', marginBottom: '24px', backgroundColor: 'var(--bg-base)'}}>
          <h4 style={{fontSize: 14, marginBottom: 12}}>Register New Device</h4>
          <form onSubmit={handleAddSubmit} style={{display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap'}}>
            <div>
              <input type="text" className="input-base" placeholder="Device Name" value={newDevName} onChange={e => setNewDevName(e.target.value)} required />
            </div>
            <div>
              <select className="input-base" value={newDevType} onChange={e => setNewDevType(e.target.value)}>
                <option value="Ambient Air Quality System">AAQMS</option>
                <option value="Water Quality Sensor">Water Sensor</option>
                <option value="Industrial Gateway">Gateway</option>
              </select>
            </div>
            <div style={{display: 'flex', gap: 8}}>
              <button type="submit" className="btn-primary" style={{marginTop: 0, padding: '10px 16px', width: 'auto'}}>Add to Inventory</button>
              <button type="button" className="btn-view" onClick={() => setIsAdding(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Device Name</th>
              <th>Device Code</th>
              <th>Type</th>
              <th>Status</th>
              {user?.role === 'ADMIN' && <th>Assigned To</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleDevices.map((item) => (
              <tr key={item.id}>
                <td style={{fontWeight: 500}}>{item.name}</td>
                <td className="font-mono" style={{color: 'var(--accent-primary)'}}>{item.device_code || <span style={{fontSize: 10, color: 'var(--text-tertiary)'}}>UUID: {item.id.substring(0,8)}</span>}</td>
                <td>{item.type}</td>
                <td>
                  <span className={`badge ${item.status === 'Online' ? 'badge-success' : 'badge-offline'}`}>
                    {item.status}
                  </span>
                </td>
                {user?.role === 'ADMIN' && (
                  <td>
                    <span className="badge" style={{backgroundColor: 'var(--bg-base)', border: '1px solid rgba(255,255,255,0.05)'}}>
                      {devices.filter(d => d.parent_device_id === item.id).length} Users
                    </span>
                  </td>
                )}
                <td>
                  <div style={{display: 'flex', gap: 8}}>
                    <button 
                      className="btn-view"
                      onClick={() => navigate(`/dashboard/device/${item.id}`)}
                    >
                      View Data <ChevronRight size={14} />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <button className="btn-icon" style={{color: 'var(--accent-danger)'}} onClick={() => deleteDevice(item.id)} title="Delete Device">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleDevices.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'ADMIN' ? 6 : 5} style={{textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)'}}>
                  No devices assigned or found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
