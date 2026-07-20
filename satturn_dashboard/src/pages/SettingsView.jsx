import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Building, Shield, Bell, Smartphone } from 'lucide-react';

const SettingsView = () => {
  const { user } = useAuth();

  return (
    <div className="settings-view fade-in" style={{padding: '32px'}}>
      <div className="detail-header glass-panel" style={{padding: '24px 32px', marginBottom: '32px', borderRadius: 'var(--radius-lg)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
           <div style={{padding: '12px', background: 'var(--accent-primary)', borderRadius: '12px', color: '#fff'}}>
             <User size={24} />
           </div>
           <div>
             <h1 style={{fontSize: '24px', fontWeight: 800, margin: 0}}>Account Settings</h1>
             <p style={{margin: 0, fontSize: '14px', color: 'var(--text-tertiary)'}}>Manage your personal profile and preferences.</p>
           </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px'}}>
        
        {/* Profile Card */}
        <div className="panel" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <User size={18} /> Personal Profile
          </h3>
          <div className="form-group" style={{marginBottom: '16px'}}>
            <label className="form-label">Full Name</label>
            <input type="text" className="input-base" value={user?.name || ''} readOnly />
          </div>
          <div className="form-group" style={{marginBottom: '16px'}}>
            <label className="form-label">Phone Number</label>
            <input type="text" className="input-base" value={user?.phone || ''} readOnly />
          </div>
          <div className="form-group" style={{marginBottom: '16px'}}>
            <label className="form-label">Account Role</label>
            <div className="badge badge-admin" style={{display: 'inline-block'}}>{user?.role}</div>
          </div>
        </div>

        {/* Company Card */}
        <div className="panel" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Building size={18} /> Organization Details
          </h3>
          <div className="form-group" style={{marginBottom: '16px'}}>
            <label className="form-label">Company Name</label>
            <input type="text" className="input-base" value={user?.company_name || 'Satturn Enterprise'} readOnly />
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
            <div style={{width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#fff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              {user?.company_logo_url ? <img src={user.company_logo_url} alt="Logo" style={{width: '100%'}} /> : <Building size={20} />}
            </div>
            <span style={{fontSize: '13px', fontWeight: 600}}>Corporate Branding Active</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsView;
