import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60; // seconds

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => {
        if (prev <= 1) {
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const isLockedOut = lockoutTimer > 0;

  const sanitizeError = (msg) => {
    // Never expose whether the user exists or not
    const lower = msg?.toLowerCase() || '';
    if (lower.includes('invalid') || lower.includes('credentials') || lower.includes('not found') || lower.includes('password')) {
      return 'Invalid phone number or password.';
    }
    if (lower.includes('rate') || lower.includes('limit')) {
      return 'Too many attempts. Please wait and try again.';
    }
    return 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isLockedOut) return;

    // Basic client-side validation
    const cleanPhone = phone.trim();
    if (!cleanPhone || !password) {
      setError('Please enter both phone number and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const result = await login(cleanPhone, password);
    if (result.success) {
      setAttempts(0);
      navigate('/dashboard');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_DURATION);
        setError(`Too many failed attempts. Account locked for ${LOCKOUT_DURATION} seconds.`);
      } else {
        setError(sanitizeError(result.error));
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card panel fade-in">
        <div className="auth-header">
          <div className="auth-brand">
            <Activity strokeWidth={2.5} size={32} />
            Satturn
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to the Operations Dashboard</p>
        </div>

        {error && (
          <div className="auth-error">
            <ShieldCheck size={14} style={{marginRight: '6px', verticalAlign: 'middle'}} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label" htmlFor="login-phone">Phone Number</label>
            <div style={{position: 'relative'}}>
              <Phone size={16} style={{position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)'}} />
              <input 
                id="login-phone"
                type="text" 
                className="input-base" 
                placeholder="e.g. 1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{paddingLeft: 38}}
                required
                disabled={isLockedOut}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{position: 'relative'}}>
              <Lock size={16} style={{position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)'}} />
              <input 
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-base" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{paddingLeft: 38, paddingRight: 42}}
                required
                disabled={isLockedOut}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 10, top: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-tertiary)', padding: '4px',
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || isLockedOut}
          >
            {isLockedOut
              ? `Locked (${lockoutTimer}s)`
              : loading 
                ? 'Signing in...' 
                : 'Sign In'}
          </button>

          {attempts > 0 && attempts < MAX_ATTEMPTS && !isLockedOut && (
            <p style={{textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', margin: 0}}>
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
