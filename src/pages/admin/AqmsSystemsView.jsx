import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, Cpu, MapPin, Trash2, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import AqmsDisplayRow from '../../components/AqmsDisplayRow';

const DEFAULT_PARAMS = ['co2', 'no2', 'so2', 'o3', 'pm25', 'pm10'];

const AqmsSystemsView = () => {
  const {
    aqmsSystems,
    aqmsConfigs,
    addAqmsSystem,
    deleteAqmsSystem,
    updateAqmsDisplayConfig,
    aqmsLoading,
    refreshAqms,
  } = useData();

  const [expandedSystemId, setExpandedSystemId] = useState(null);
  const [isAddingSystem, setIsAddingSystem] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [newSystemLocation, setNewSystemLocation] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddSystem = async (e) => {
    e.preventDefault();
    if (!newSystemName.trim()) return;
    setAdding(true);
    try {
      const newSystem = await addAqmsSystem(newSystemName.trim(), newSystemLocation.trim());
      setNewSystemName('');
      setNewSystemLocation('');
      setIsAddingSystem(false);
      // Auto-expand the newly created system
      if (newSystem?.id) setExpandedSystemId(newSystem.id);
    } catch (err) {
      console.error('Failed to add system:', err);
      alert('Failed to create system: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const getConfigsForSystem = (systemId) =>
    aqmsConfigs.filter(c => c.system_id === systemId);

  const getConfigForDisplay = (systemId, displayIndex) =>
    aqmsConfigs.find(c => c.system_id === systemId && c.display_index === displayIndex);

  return (
    <div className="dashboard-view fade-in" style={{ padding: '24px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={22} style={{ color: 'var(--accent-primary)' }} />
            AQMS Display Systems
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage hardware rack configurations. Changes are pushed to ESP32 displays within 10 seconds.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={refreshAqms}
            title="Refresh"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setIsAddingSystem(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'var(--accent-primary)', color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Add New System
          </button>
        </div>
      </div>

      {/* Add System Form */}
      {isAddingSystem && (
        <div className="panel" style={{
          padding: 20, marginBottom: 24, borderRadius: 12,
          border: '1px solid var(--accent-primary)',
          background: 'rgba(62,139,255,0.04)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>New AQMS System</h4>
          <form onSubmit={handleAddSystem} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Name *</label>
              <input
                type="text"
                className="input-base"
                placeholder="e.g. System 1, Site Alpha"
                value={newSystemName}
                onChange={e => setNewSystemName(e.target.value)}
                required
                style={{ minWidth: 220 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location (optional)</label>
              <input
                type="text"
                className="input-base"
                placeholder="e.g. Sector 4, Building A"
                value={newSystemLocation}
                onChange={e => setNewSystemLocation(e.target.value)}
                style={{ minWidth: 220 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={adding} className="btn-primary" style={{ marginTop: 0, padding: '9px 18px', width: 'auto' }}>
                {adding ? 'Creating…' : 'Create System'}
              </button>
              <button type="button" className="btn-view" onClick={() => setIsAddingSystem(false)}>Cancel</button>
            </div>
          </form>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '12px 0 0' }}>
            This will create 6 display slots (CO₂, NO₂, SO₂, O₃, PM2.5, PM10). Commission each ESP32 with the system UUID shown after creation.
          </p>
        </div>
      )}

      {/* Systems List */}
      {aqmsLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading systems…
        </div>
      ) : aqmsSystems.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: 'center', borderRadius: 12 }}>
          <Cpu size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 12 }} />
          <h3 style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 6px' }}>No AQMS Systems Yet</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: 0 }}>
            Click "Add New System" to register your first hardware rack.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {aqmsSystems.map((system, idx) => {
            const isExpanded = expandedSystemId === system.id;
            const configs = getConfigsForSystem(system.id);
            const configuredCount = configs.length;

            return (
              <div key={system.id} className="panel" style={{
                borderRadius: 12,
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                ...(isExpanded ? { borderColor: 'rgba(62,139,255,0.4)' } : {}),
              }}>
                {/* System Header */}
                <div
                  onClick={() => setExpandedSystemId(v => v === system.id ? null : system.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', cursor: 'pointer',
                    background: isExpanded ? 'rgba(62,139,255,0.05)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Chevron */}
                  <div style={{ color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    <ChevronDown size={18} />
                  </div>

                  {/* System number badge */}
                  <div style={{
                    minWidth: 36, height: 36, borderRadius: 8,
                    background: 'linear-gradient(135deg, var(--accent-primary), #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>
                    {idx + 1}
                  </div>

                  {/* System info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{system.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {system.location && <><MapPin size={11} /> {system.location} · </>}
                      <span className="font-mono" style={{ fontSize: 11 }}>{system.id}</span>
                    </div>
                  </div>

                  {/* Status chips */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: configuredCount === 6 ? 'rgba(0,244,232,0.1)' : 'rgba(255,166,0,0.1)',
                      color: configuredCount === 6 ? '#00F4E8' : '#FFA600',
                    }}>
                      {configuredCount}/6 Configured
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${system.name}" and all its display configs?`)) deleteAqmsSystem(system.id); }}
                      title="Delete System"
                      style={{
                        padding: '5px', borderRadius: 6, border: 'none',
                        background: 'transparent', color: 'var(--text-tertiary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Expanded: Display Rows */}
                {isExpanded && (
                  <div style={{
                    padding: '0 20px 20px',
                    borderTop: '1px solid var(--border-color)',
                    background: 'rgba(0,0,0,0.15)',
                  }}>
                    {/* Commission hint */}
                    <div style={{
                      margin: '14px 0 12px',
                      padding: '10px 14px', borderRadius: 8,
                      background: 'rgba(62,139,255,0.08)',
                      border: '1px solid rgba(62,139,255,0.2)',
                      fontSize: 12, color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0 }}>ESP32 Setup:</span>
                      Flash each unit with{' '}
                      <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>
                        SYSTEM_ID = &quot;{system.id}&quot;
                      </code>
                      {' '}and <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>DISPLAY_INDEX = 1…6</code>
                    </div>

                    {/* Display rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2, 3, 4, 5, 6].map(displayIndex => (
                        <AqmsDisplayRow
                          key={displayIndex}
                          displayIndex={displayIndex}
                          systemId={system.id}
                          config={getConfigForDisplay(system.id, displayIndex)}
                          onSave={updateAqmsDisplayConfig}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AqmsSystemsView;
