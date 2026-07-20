import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Activity, Wind, Droplets, ChevronRight } from 'lucide-react';

const MyDevicesView = () => {
  const { user } = useAuth();
  const { devices, searchQuery } = useData();
  const navigate = useNavigate();

  const myDevices = devices
    .filter(d => d.assignedUserId === user?.id)
    .filter(d => 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (d.device_code && d.device_code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const getIcon = (type) => {
    if (type.includes('Air')) return <Wind size={24} style={{color: '#00F4E8'}} />;
    if (type.includes('Water')) return <Droplets size={24} style={{color: '#3E8BFF'}} />;
    return <Activity size={24} style={{color: '#B647FF'}} />;
  };

  return (
    <div className="dashboard-view fade-in">
      <div className="panel" style={{marginBottom: '24px', backgroundColor: 'transparent', border: 'none', padding: 0}}>
        <h2 style={{marginBottom: '8px'}}>My Assigned Devices</h2>
        <p className="text-secondary">View and monitor the devices assigned to your profile.</p>
      </div>

      <div style={{display: 'flex', gap: '20px', marginBottom: '32px'}}>
        <div className="panel" style={{flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)'}}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase'}}>Total Devices</div>
            <div style={{fontSize: '24px', fontWeight: 700}}>{myDevices.length}</div>
          </div>
        </div>
        <div className="panel" style={{flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{width: '48px', height: '48px', borderRadius: '12px', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#065F46'}}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase'}}>Online</div>
            <div style={{fontSize: '24px', fontWeight: 700}}>{myDevices.filter(d => d.status === 'Online').length}</div>
          </div>
        </div>
        <div className="panel" style={{flex: 1, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
          <div style={{width: '48px', height: '48px', borderRadius: '12px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B'}}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase'}}>Offline</div>
            <div style={{fontSize: '24px', fontWeight: 700}}>{myDevices.filter(d => d.status === 'Offline').length}</div>
          </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
        {myDevices.map(device => (
          <div key={device.id} className="panel hover-glow" style={{display: 'flex', flexDirection: 'column', padding: '24px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: device.status === 'Online' ? 'var(--accent-success)' : 'var(--text-tertiary)'}}></div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={{padding: '12px', backgroundColor: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
                  {getIcon(device.type)}
                </div>
                <div>
                  <h3 style={{fontSize: '16px', fontWeight: 600, marginBottom: '4px'}}>{device.name}</h3>
                  <div className="font-mono" style={{fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.5px'}}>{device.device_code || device.id.substring(0,8)}</div>
                </div>
              </div>
              <div className={`badge ${device.status === 'Online' ? 'badge-success' : 'badge-offline'}`} style={{display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px'}}>
                {device.status === 'Online' && <span className="status-pulse-success" style={{margin: 0, width: '6px', height: '6px'}}></span>}
                {device.status}
              </div>
            </div>
            
            <div style={{marginBottom: '24px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between'}}>
              <span>Type: <span style={{fontWeight: 600}}>{device.type}</span></span>
              <span style={{fontSize: '11px', color: 'var(--text-tertiary)'}}>Last Sync: Just now</span>
            </div>
            
            <button 
              className="btn-primary" 
              style={{marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', gap: '8px', padding: '10px'}}
              onClick={() => navigate(`/dashboard/device/${device.id}`)}
            >
              View Data Insights <ChevronRight size={16} />
            </button>
          </div>
        ))}

        {myDevices.length === 0 && (
          <div className="panel" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '64px'}}>
            <Activity size={48} className="text-tertiary" style={{margin: '0 auto 16px', opacity: 0.5}} />
            <h3 style={{color: 'var(--text-secondary)', marginBottom: '8px'}}>No Devices Assigned</h3>
            <p className="text-tertiary">Please contact your administrator to assign a device to your profile.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDevicesView;
