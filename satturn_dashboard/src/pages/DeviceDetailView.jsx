import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Wind, Thermometer, Droplets, MapPin, Download, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import MetricCard from '../components/MetricCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateMockHistoricalData, exportDeviceToCSV } from '../utils/exportUtils';

// --- Realistic Sensor Simulation Engine ---
// Instead of wild random jumps, values drift gradually like real hardware.
// Uses a "random walk" where each tick nudges the value by a tiny amount,
// clamped within the configured min/max bounds.
const drift = (current, min, max, volatility = 0.08) => {
  const range = max - min;
  // Small gaussian-ish nudge: mostly tiny, occasionally a bit bigger
  const nudge = (Math.random() + Math.random() + Math.random() - 1.5) * range * volatility;
  // Apply a gentle pull toward the midpoint so values don't hug the edges
  const mid = (min + max) / 2;
  const pullToCenter = (mid - current) * 0.02;
  const next = current + nudge + pullToCenter;
  // Clamp and round to whole number
  return Math.round(Math.min(max, Math.max(min, next)));
};

const DeviceDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices, users, updateDeviceSimConfig, updateDeviceStatus } = useData();
  const { user } = useAuth();
  
  const device = devices.find(d => d.id === id);
  const assignedUser = users.find(u => u.id === device?.assignedUserId);

  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Default config — "fixed" mode with exact values
  const defaultConfig = {
    pm10:        { mode: 'fixed', fixed: 45,  min: 30,  max: 100 },
    pm25:        { mode: 'fixed', fixed: 25,  min: 15,  max: 60 },
    no2:         { mode: 'fixed', fixed: 30,  min: 20,  max: 80 },
    so2:         { mode: 'fixed', fixed: 25,  min: 15,  max: 80 },
    co:          { mode: 'fixed', fixed: 1,   min: 0,   max: 4 },
    o3:          { mode: 'fixed', fixed: 40,  min: 30,  max: 100 },
    nh3:         { mode: 'fixed', fixed: 150, min: 100, max: 400 },
    pb:          { mode: 'fixed', fixed: 0,   min: 0,   max: 1 },
    aqi:         { mode: 'fixed', fixed: 38,  min: 25,  max: 150 },
    temperature: { mode: 'fixed', fixed: 27,  min: 20,  max: 35 },
    humidity:    { mode: 'fixed', fixed: 50,  min: 40,  max: 60 },
  };

  // Merge saved DB config with defaults
  const currentConfig = Object.keys(defaultConfig).reduce((acc, key) => {
    const saved = device?.sim_config?.[key];
    acc[key] = saved && typeof saved === 'object' && ('fixed' in saved || 'min' in saved)
      ? { ...defaultConfig[key], ...saved }
      : { ...defaultConfig[key] };
    return acc;
  }, {});

  const [simForm, setSimForm] = useState(currentConfig);

  // Sync form whenever DB data changes (admin pushes realtime update)
  useEffect(() => {
    setSimForm({ ...currentConfig });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(device?.sim_config)]);

  // --- Realistic live readings with persistent state ---
  const liveRef = useRef(null);
  const historyRef = useRef(null);
  const [liveData, setLiveData] = useState({ live: {}, history: [] });

  // Initialize or reset when device/config changes
  useEffect(() => {
    if (!device) return;
    const seed = (cfg) => {
      const min = Number(cfg.min); const max = Number(cfg.max);
      return cfg.mode === 'fixed' ? Number(cfg.fixed) : Math.round((min + (max - min) * (0.3 + Math.random() * 0.4)));
    };
    
    // Generic initialization for all metrics in config
    const initialLive = {};
    Object.keys(defaultConfig).forEach(key => {
      initialLive[key] = seed(currentConfig[key]);
    });
    liveRef.current = initialLive;

    // Seed history
    const hours = ['10:00','11:00','12:00','13:00','14:00','15:00'];
    let h = { ...initialLive };
    historyRef.current = hours.map(time => {
      const entry = { time };
      Object.keys(defaultConfig).forEach(key => {
        const cfg = currentConfig[key];
        h[key] = cfg.mode === 'fixed' ? Number(cfg.fixed) : drift(h[key], cfg.min, cfg.max, 0.12);
        entry[key] = h[key];
      });
      return entry;
    });
    
    setLiveData({ live: { ...liveRef.current }, history: [...historyRef.current] });
  }, [device?.id, JSON.stringify(device?.sim_config)]);

  // Tick: drift each value slightly from its previous reading
  useEffect(() => {
    if (!device) return;
    const interval = setInterval(() => {
      if (!liveRef.current) return;
      
      const newLive = {};
      Object.keys(defaultConfig).forEach(key => {
        const cfg = currentConfig[key];
        if (cfg.mode === 'fixed') {
          newLive[key] = Number(cfg.fixed);
        } else {
          newLive[key] = drift(liveRef.current[key], Number(cfg.min), Number(cfg.max));
        }
      });
      liveRef.current = newLive;

      if (historyRef.current && historyRef.current.length > 0) {
        const nextTime = historyRef.current[historyRef.current.length - 1].time;
        const [hh, mm] = nextTime.split(':').map(Number);
        const newTime = `${String(hh).padStart(2,'0')}:${String((mm + 10) % 60).padStart(2,'0')}`;
        
        const historyEntry = { time: newTime };
        Object.keys(defaultConfig).forEach(key => {
          historyEntry[key] = liveRef.current[key];
        });

        historyRef.current = [
          ...historyRef.current.slice(1),
          historyEntry
        ];
      }
      setLiveData({ live: { ...liveRef.current }, history: [...historyRef.current] });
    }, 4000);
    return () => clearInterval(interval);
  }, [device?.id, JSON.stringify(device?.sim_config)]);

  const handleConfigChange = (metric, field, value) => {
    setSimForm(prev => ({
      ...prev,
      [metric]: { ...prev[metric], [field]: field === 'mode' ? value : Number(value) }
    }));
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');
    try {
      await updateDeviceSimConfig(device.id, simForm);
      setSaveStatus('saved');
      setIsEditing(false);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setSaveStatus('error');
      console.error('Failed to save config:', e);
    }
  };

  if (!device) {
    return <div style={{padding: '32px', color: 'var(--text-secondary)'}}>Device not found.</div>;
  }

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // Export last 30 days
      const data = generateMockHistoricalData(device, startDate, new Date());
      exportDeviceToCSV(device, data);
      setIsExporting(false);
    }, 1000);
  };

  return (
    <div className="device-detail-view fade-in">
      <div className="detail-header glass-panel" style={{padding: '16px 24px', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
           <button className="btn-back" onClick={() => navigate('/dashboard')} style={{padding: '8px', borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
             <ArrowLeft size={18} />
           </button>
           <div>
             <h2 style={{fontSize: '20px', fontWeight: 700, margin: 0}}>{device.name}</h2>
             <div style={{fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500}}>Environmental Monitoring Node</div>
           </div>
        </div>
        <div className="header-actions" style={{display: 'flex', gap: '12px'}}>
          {user?.role === 'ADMIN' && (
            <button className="btn-view" onClick={() => setIsEditing(!isEditing)}>
              <Settings size={16} style={{marginRight: '6px', display: 'inline'}}/> 
              {isEditing ? 'Cancel Edit' : 'Edit Sim Settings'}
            </button>
          )}
          <button className="btn-export" onClick={handleExport} disabled={isExporting}>
            <Download size={16} /> {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {isEditing && user?.role === 'ADMIN' && (
        <div className="panel" style={{padding: '24px', marginBottom: '24px', border: '1px solid var(--accent-secondary)', backgroundColor: 'rgba(59,130,246,0.04)'}}>
          <h3 style={{marginBottom: '6px'}}>Device Sensor Settings</h3>
          <p style={{fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px'}}>
            <strong>Fixed</strong> — always show this exact value. &nbsp;|&nbsp; <strong>Range</strong> — simulate random values between min and max every few seconds.
          </p>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px'}}>
            {Object.keys(defaultConfig).map(metric => (
              <div key={metric} style={{backgroundColor: 'var(--bg-base)', padding: '16px', borderRadius: '8px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h4 style={{textTransform: 'uppercase', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px'}}>{metric}</h4>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <button
                      onClick={() => handleConfigChange(metric, 'mode', 'fixed')}
                      style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer',
                        backgroundColor: simForm[metric]?.mode === 'fixed' ? 'var(--accent-primary)' : 'transparent',
                        color: simForm[metric]?.mode === 'fixed' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >Fixed</button>
                    <button
                      onClick={() => handleConfigChange(metric, 'mode', 'range')}
                      style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer',
                        backgroundColor: simForm[metric]?.mode === 'range' ? 'var(--accent-secondary)' : 'transparent',
                        color: simForm[metric]?.mode === 'range' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >Range</button>
                  </div>
                </div>
                {simForm[metric]?.mode === 'fixed' ? (
                  <div>
                    <label style={{fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px'}}>FIXED VALUE</label>
                    <input type="number" className="input-base" style={{padding: '8px'}} value={simForm[metric]?.fixed ?? ''} onChange={e => handleConfigChange(metric, 'fixed', e.target.value)} />
                  </div>
                ) : (
                  <div style={{display: 'flex', gap: '8px'}}>
                    <div style={{flex: 1}}>
                      <label style={{fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px'}}>MIN</label>
                      <input type="number" className="input-base" style={{padding: '8px'}} value={simForm[metric]?.min ?? ''} onChange={e => handleConfigChange(metric, 'min', e.target.value)} />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={{fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px'}}>MAX</label>
                      <input type="number" className="input-base" style={{padding: '8px'}} value={simForm[metric]?.max ?? ''} onChange={e => handleConfigChange(metric, 'max', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop: '24px', display: 'flex', gap: '12px', alignItems: 'center'}}>
            <button className="btn-primary" onClick={handleSaveConfig} disabled={saveStatus === 'saving'} style={{width: 'auto'}}>
              {saveStatus === 'saving' ? 'Saving...' : 'Save & Apply'}
            </button>
            <button className="btn-view" onClick={() => setIsEditing(false)}>Cancel</button>
            {saveStatus === 'saved' && <span style={{color: 'var(--accent-success)', fontSize: '13px', fontWeight: 600}}>✓ Saved to database</span>}
            {saveStatus === 'error' && <span style={{color: 'var(--accent-danger)', fontSize: '13px', fontWeight: 600}}>✗ Save failed — check console</span>}
          </div>
        </div>
      )}

      <div className="detail-hero glass-panel">
        <div className="hero-info">
          <h2>
            {device.name}{' '}
            <span 
              className={`badge ${device.status === 'Online' ? 'badge-success' : 'badge-offline'}`}
              style={{ cursor: user?.role === 'ADMIN' ? 'pointer' : 'default' }}
              onClick={() => user?.role === 'ADMIN' && updateDeviceStatus(device.id, device.status === 'Online' ? 'Offline' : 'Online')}
              title={user?.role === 'ADMIN' ? 'Click to toggle status' : ''}
            >
              {device.status}
            </span>
          </h2>
          <div className="meta-list">
            <div className="meta-item"><span className="text-secondary">Device ID:</span> <span className="font-mono">{device.device_code || device.id}</span></div>
            <div className="meta-item"><span className="text-secondary">Assigned To:</span> {assignedUser ? assignedUser.name : 'Unassigned'}</div>
            <div className="meta-item"><span className="text-secondary">Type:</span> {device.type}</div>
            <div className="meta-item"><MapPin size={14} className="text-secondary"/> <span className="text-secondary">Location Not Set</span></div>
          </div>
        </div>
      </div>

      <h3 className="section-title">Live Sensor Readings</h3>
      <div className="metrics-grid">
        <MetricCard title="AQI Index" value={liveData.live.aqi} unit="" icon={Activity} colorClass="blue" />
        <MetricCard title="PM 10" value={liveData.live.pm10} unit="µg/m³" icon={Wind} colorClass="purple" />
        <MetricCard title="PM 2.5" value={liveData.live.pm25} unit="µg/m³" icon={Wind} colorClass="cyan" />
        <MetricCard title="NO2" value={liveData.live.no2} unit="µg/m³" icon={Wind} colorClass="purple" />
        <MetricCard title="SO2" value={liveData.live.so2} unit="µg/m³" icon={Wind} colorClass="blue" />
        <MetricCard title="CO" value={liveData.live.co} unit="mg/m³" icon={Wind} colorClass="cyan" />
        <MetricCard title="O3" value={liveData.live.o3} unit="µg/m³" icon={Wind} colorClass="purple" />
        <MetricCard title="NH3" value={liveData.live.nh3} unit="µg/m³" icon={Wind} colorClass="blue" />
        <MetricCard title="Pb" value={liveData.live.pb} unit="µg/m³" icon={Wind} colorClass="cyan" />
        <MetricCard title="Temperature" value={liveData.live.temperature} unit="°C" icon={Thermometer} colorClass="cyan" />
        <MetricCard title="Humidity" value={liveData.live.humidity} unit="%" icon={Droplets} colorClass="purple" />
      </div>

      <h3 className="section-title mt-8">Historical Data Trends</h3>
      <div className="charts-grid">
        <div className="chart-card glass-panel">
          <h4 className="chart-title">Particulate Matter (PM2.5 & PM10)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={liveData.history}>
                <defs>
                  <linearGradient id="barPM25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F4E8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#00F4E8" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="barPM10" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3E8BFF" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#3E8BFF" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{background: '#0F172A', border: 'none', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', color: '#fff'}}
                />
                <Bar dataKey="pm25" fill="url(#barPM25)" radius={[6, 6, 0, 0]} name="PM 2.5" />
                <Bar dataKey="pm10" fill="url(#barPM10)" radius={[6, 6, 0, 0]} name="PM 10" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card glass-panel">
          <h4 className="chart-title">AQI Trend</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={liveData.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#90A0B7" fontSize={12} />
                <YAxis stroke="#90A0B7" fontSize={12} />
                <Tooltip 
                  contentStyle={{background: '#161C2D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px'}}
                />
                <Line type="monotone" dataKey="aqi" stroke="#B647FF" strokeWidth={3} dot={{r: 4, fill: '#161C2D', strokeWidth: 2}} name="AQI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card glass-panel">
          <h4 className="chart-title">Gaseous Pollutants (NO2, SO2, O3)</h4>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={liveData.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="#90A0B7" fontSize={12} />
                <YAxis stroke="#90A0B7" fontSize={12} />
                <Tooltip contentStyle={{background: '#161C2D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px'}} />
                <Line type="monotone" dataKey="no2" stroke="#B647FF" strokeWidth={2} dot={false} name="NO2" />
                <Line type="monotone" dataKey="so2" stroke="#3E8BFF" strokeWidth={2} dot={false} name="SO2" />
                <Line type="monotone" dataKey="o3" stroke="#00F4E8" strokeWidth={2} dot={false} name="O3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailView;
