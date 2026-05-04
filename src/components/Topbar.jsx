import React from 'react';
import { Bell, Search, LogOut, Menu, Activity } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const Topbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useData();
  
  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('admin/users')) return 'User Management';
    if (path.includes('device')) return 'Device Details';
    if (path.includes('locations')) return 'Device Locations';
    if (path.includes('analytics')) return 'System Analytics';
    if (path.includes('my-devices')) return 'My Devices';
    if (path === '/dashboard') return 'Devices Overview';
    return 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);

  return (
    <header className="topbar glass-panel" style={{borderRadius: 0, borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.7)'}}>
      <div className="topbar-title" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
        <button className="btn-icon mobile-menu-btn" onClick={onMenuToggle}>
          <Menu size={20} />
        </button>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <img src="/image-2.png" alt="Satturn" style={{height: '24px', objectFit: 'contain'}} />
          {!isSearchExpanded && <span style={{fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px'}}>SATTURN</span>}
        </div>
        {!isSearchExpanded && (
          <>
            <div style={{height: '20px', width: '1px', background: 'var(--border-color)', margin: '0 4px'}} />
            <span style={{color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500}}>{getTitle()}</span>
          </>
        )}
      </div>
      
      <div className="topbar-actions">
        <div className="search-box" style={{
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center',
          transition: 'all 0.3s ease'
        }}>
          {isSearchExpanded ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Search size={16} style={{position: 'absolute', left: '12px', color: 'var(--text-tertiary)'}} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search devices..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchExpanded(false)}
                style={{
                  padding: '8px 12px 8px 36px',
                  borderRadius: '20px',
                  border: '1px solid var(--accent-secondary)',
                  background: 'var(--bg-base)',
                  fontSize: '13px',
                  width: '240px',
                  outline: 'none',
                  boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.1)'
                }}
              />
              <button onClick={() => {setSearchQuery(''); setIsSearchExpanded(false)}} style={{fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer'}}>CLOSE</button>
            </div>
          ) : (
            <button className="btn-icon" onClick={() => setIsSearchExpanded(true)} title="Search">
              <Search size={18} />
            </button>
          )}
        </div>
        <button className="btn-icon" onClick={() => alert('0 New Notifications')}>
          <Bell size={18} />
        </button>
        
        <div className="profile-btn" style={{
          cursor: 'default', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          background: 'rgba(59, 130, 246, 0.05)', 
          padding: '6px 16px', 
          borderRadius: '30px', 
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div className="profile-avatar" style={{
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            background: '#fff', 
            border: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            {user?.company_logo_url ? (
              <img src={user.company_logo_url} alt="Company Logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
            ) : (
              <Activity size={14} className="text-primary" />
            )}
          </div>
          <span className="profile-name" style={{fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)'}}>
            {user?.company_name || 'Satturn Enterprise'}
          </span>
        </div>

        <button className="btn-icon" onClick={handleLogout} title="Logout" style={{marginLeft: 8, color: 'var(--accent-danger)'}}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;
