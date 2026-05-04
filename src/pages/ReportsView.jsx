import React, { useState } from 'react';
import { FileText, Download, Calendar, Search, Filter, Settings } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateMockHistoricalData, exportDeviceToCSV } from '../utils/exportUtils';

const ReportsView = () => {
  const { devices } = useData();
  const { user } = useAuth();
  
  const [selectedDeviceId, setSelectedDeviceId] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter devices based on user role
  const filteredDevices = user?.role === 'ADMIN' 
    ? devices 
    : devices.filter(d => d.assignedUserId === user?.id);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = [2024, 2025, 2026];

  const handleExport = () => {
    setIsGenerating(true);
    
    // Artificial delay for UI feel
    setTimeout(() => {
      const devicesToExport = selectedDeviceId === 'all' 
        ? filteredDevices 
        : filteredDevices.filter(d => d.id === selectedDeviceId);

      if (devicesToExport.length === 0) {
        alert("No devices found to export.");
        setIsGenerating(false);
        return;
      }

      // Calculate start and end of selected month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      devicesToExport.forEach(device => {
        const data = generateMockHistoricalData(device, startDate, endDate);
        exportDeviceToCSV(device, data);
      });

      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="reports-view fade-in" style={{padding: '32px'}}>
      <div className="detail-header glass-panel" style={{padding: '24px 32px', marginBottom: '32px', borderRadius: 'var(--radius-lg)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
           <div style={{padding: '12px', background: 'var(--accent-primary)', borderRadius: '12px', color: '#fff'}}>
             <FileText size={24} />
           </div>
           <div>
             <h1 style={{fontSize: '24px', fontWeight: 800, margin: 0}}>System Reports & Analytics</h1>
             <p style={{margin: 0, fontSize: '14px', color: 'var(--text-tertiary)'}}>Generate regulatory compliance reports for your monitoring network.</p>
           </div>
        </div>
      </div>

      <div className="reports-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
        
        {/* Export Configuration Card */}
        <div className="panel" style={{padding: '24px'}}>
          <h3 style={{marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Settings size={18} />
            Report Configuration
          </h3>
          
          <div className="form-group" style={{marginBottom: '20px'}}>
            <label className="form-label">Select Device</label>
            <select 
              className="input-base" 
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {user?.role === 'ADMIN' && <option value="all">All Registered Devices</option>}
              {filteredDevices.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.device_code || 'No ID'})</option>
              ))}
            </select>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px'}}>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select 
                className="input-base" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select 
                className="input-base" 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}
            onClick={handleExport}
            disabled={isGenerating || filteredDevices.length === 0}
          >
            {isGenerating ? (
              <>Generating Report...</>
            ) : (
              <>
                <Download size={18} />
                Generate & Export (CSV/Excel)
              </>
            )}
          </button>
          
          {filteredDevices.length === 0 && (
            <p style={{marginTop: '12px', fontSize: '12px', color: 'var(--accent-danger)', textAlign: 'center'}}>
              No devices available for reporting.
            </p>
          )}
        </div>

        {/* Info Card */}
        <div className="panel" style={{padding: '24px', backgroundColor: 'rgba(59,130,246,0.04)', border: '1px solid var(--accent-secondary)'}}>
          <h3 style={{marginBottom: '16px'}}>Report Details</h3>
          <ul style={{fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0, listStyle: 'none'}}>
            <li style={{display: 'flex', gap: '10px'}}>
              <Calendar size={16} style={{color: 'var(--accent-primary)', flexShrink: 0}} />
              <span>Includes date-wise and time-wise readings at 4-hour intervals.</span>
            </li>
            <li style={{display: 'flex', gap: '10px'}}>
              <Filter size={16} style={{color: 'var(--accent-primary)', flexShrink: 0}} />
              <span>Captures PM2.5, PM10, AQI, Temperature, and Humidity stats.</span>
            </li>
            <li style={{display: 'flex', gap: '10px'}}>
              <Download size={16} style={{color: 'var(--accent-primary)', flexShrink: 0}} />
              <span>Compatible with Microsoft Excel, Google Sheets, and Numbers.</span>
            </li>
            <li style={{display: 'flex', gap: '10px'}}>
              <Search size={16} style={{color: 'var(--accent-primary)', flexShrink: 0}} />
              <span>{user?.role === 'ADMIN' ? 'Admin View: Access to global inventory reports.' : 'User View: Restricted to your assigned devices.'}</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="recent-activity panel" style={{marginTop: '32px', padding: '24px'}}>
        <h3 style={{marginBottom: '16px'}}>Report Summary</h3>
        <div style={{overflowX: 'auto'}}>
          <table className="data-table" style={{width: '100%'}}>
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Scope</th>
                <th>Data Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map(d => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.parent_device_id ? 'User Assigned' : 'Global Template'}</td>
                  <td>~180 readings/month</td>
                  <td><span className="badge badge-success">Ready</span></td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)'}}>
                    No records found to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
