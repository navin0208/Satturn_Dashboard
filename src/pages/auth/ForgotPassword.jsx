import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ShieldAlert } from 'lucide-react';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card panel fade-in">
        <div className="auth-header">
          <div className="auth-brand">
            <Activity strokeWidth={2.5} size={32} />
            Satturn
          </div>
          <h1 className="auth-title">Reset Password</h1>
        </div>

        <div style={{
          padding: '24px', 
          borderRadius: 'var(--radius-sm)', 
          backgroundColor: 'rgba(59,130,246,0.06)', 
          border: '1px solid rgba(59,130,246,0.15)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ShieldAlert size={32} style={{color: 'var(--accent-secondary)'}} />
          <p style={{fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontWeight: 500}}>
            Password resets are handled by your administrator.
          </p>
          <p style={{fontSize: '13px', color: 'var(--text-secondary)', margin: 0}}>
            Please contact your Satturn system administrator to reset your credentials.
          </p>
        </div>

        <div className="auth-links" style={{marginTop: '24px'}}>
          <span 
            className="auth-link" 
            style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'}} 
            onClick={() => navigate('/login')}
          >
            <ArrowLeft size={14} />
            Back to Login
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
