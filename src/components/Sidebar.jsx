import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MapPin, Activity, MonitorSmartphone, Settings, Users, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  
  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'mobile-open' : ''}`} style={{borderRight: '1px solid var(--glass-border)', borderRadius: 0}}>
      <div className="brand" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '32px'}}>
        <div className="brand-logo" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <img src="/image-2.png" alt="Satturn Logo" style={{height: '28px', objectFit: 'contain'}} />
          <span style={{fontWeight: 800, fontSize: '20px', letterSpacing: '-1px', color: 'var(--accent-primary)'}}>SATTURN</span>
          <button className="btn-icon mobile-menu-btn" onClick={onClose} style={{marginLeft: 'auto'}}>
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="nav-section">
        <div className="nav-section-title">Navigation</div>
        <ul>
          <li>
            <NavLink onClick={onClose} to="/dashboard" end className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <LayoutDashboard size={18} />
              Devices
            </NavLink>
          </li>
          <li>
            <NavLink onClick={onClose} to="/dashboard/locations" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <MapPin size={18} />
              Locations
            </NavLink>
          </li>
          <li>
            <NavLink onClick={onClose} to="/dashboard/reports" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <FileText size={18} />
              Reports
            </NavLink>
          </li>
        </ul>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="nav-section">
          <div className="nav-section-title">Admin Controls</div>
          <ul>
            <li>
              <NavLink onClick={onClose} to="/dashboard/admin/users" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Users size={18} />
                User Management
              </NavLink>
            </li>
            <li>
              <NavLink onClick={onClose} to="/dashboard/analytics" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <Activity size={18} />
                System Analytics
              </NavLink>
            </li>
          </ul>
        </div>
      )}

      {user?.role === 'USER' && (
        <div className="nav-section">
          <div className="nav-section-title">Personal</div>
          <ul>
            <li>
              <NavLink onClick={onClose} to="/dashboard/my-devices" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                <MonitorSmartphone size={18} />
                My Devices
              </NavLink>
            </li>
          </ul>
        </div>
      )}

      <div style={{marginTop: 'auto'}} className="nav-section">
        <div className="nav-section-title">System</div>
        <ul>
          <li>
            <NavLink onClick={onClose} to="/dashboard/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              <Settings size={18} />
              Settings
            </NavLink>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
