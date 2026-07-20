import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';

// Parameter metadata: label, unit, typical ranges
const PARAM_META = {
  co2:  { label: 'CO₂',   unit: 'ppm',    defaultFixed: 420,  defaultMin: 380,  defaultMax: 1000 },
  no2:  { label: 'NO₂',   unit: 'µg/m³',  defaultFixed: 0.04, defaultMin: 0.01, defaultMax: 0.20 },
  so2:  { label: 'SO₂',   unit: 'µg/m³',  defaultFixed: 0.02, defaultMin: 0.01, defaultMax: 0.10 },
  o3:   { label: 'O₃',    unit: 'µg/m³',  defaultFixed: 0.05, defaultMin: 0.02, defaultMax: 0.15 },
  pm25: { label: 'PM2.5', unit: 'µg/m³',  defaultFixed: 25,   defaultMin: 10,   defaultMax: 60   },
  pm10: { label: 'PM10',  unit: 'µg/m³',  defaultFixed: 45,   defaultMin: 20,   defaultMax: 100  },
};

// Default param per display slot (1-indexed)
const DEFAULT_PARAMS = ['co2', 'no2', 'so2', 'o3', 'pm25', 'pm10'];

const AqmsDisplayRow = ({ config, displayIndex, systemId, onSave }) => {
  const param = config?.parameter || DEFAULT_PARAMS[displayIndex - 1];
  const meta = PARAM_META[param] || {};

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    mode: config?.mode || 'fixed',
    fixed_value: config?.fixed_value ?? meta.defaultFixed ?? 0,
    range_min: config?.range_min ?? meta.defaultMin ?? 0,
    range_max: config?.range_max ?? meta.defaultMax ?? 0,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(systemId, displayIndex, param, form);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save display config:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      mode: config?.mode || 'fixed',
      fixed_value: config?.fixed_value ?? meta.defaultFixed ?? 0,
      range_min: config?.range_min ?? meta.defaultMin ?? 0,
      range_max: config?.range_max ?? meta.defaultMax ?? 0,
    });
    setIsEditing(false);
  };

  const displayValue = () => {
    if (!config) return '—';
    if (config.mode === 'fixed') return `${config.fixed_value} ${meta.unit}`;
    return `${config.range_min} – ${config.range_max} ${meta.unit}`;
  };

  const modeColor = (m) => form.mode === m ? 'var(--accent-primary)' : 'transparent';
  const modeTextColor = (m) => form.mode === m ? '#fff' : 'var(--text-secondary)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'var(--bg-base)',
      borderRadius: 8,
      border: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      transition: 'border-color 0.2s',
      ...(isEditing ? { borderColor: 'var(--accent-primary)' } : {}),
    }}>
      {/* Display index badge */}
      <div style={{
        minWidth: 28, height: 28, borderRadius: 6,
        background: 'rgba(62,139,255,0.15)',
        color: 'var(--accent-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
      }}>
        {displayIndex}
      </div>

      {/* Parameter label */}
      <div style={{ minWidth: 80 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{meta.label || param.toUpperCase()}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Display {displayIndex}</div>
      </div>

      {/* Value display / edit */}
      {!isEditing ? (
        <>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: config?.mode === 'range' ? 'rgba(182,71,255,0.15)' : 'rgba(0,244,232,0.1)',
              color: config?.mode === 'range' ? '#B647FF' : '#00F4E8',
            }}>
              {config?.mode?.toUpperCase() || 'NOT SET'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>
              {displayValue()}
            </span>
          </div>
          {config?.updated_at && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Updated {new Date(config.updated_at).toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Edit2 size={12} /> Edit
          </button>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel)', padding: 3, borderRadius: 6 }}>
            {['fixed', 'range'].map(m => (
              <button key={m} onClick={() => setForm(f => ({ ...f, mode: m }))} style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: modeColor(m), color: modeTextColor(m),
                border: 'none', cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s',
              }}>{m}</button>
            ))}
          </div>

          {/* Value inputs */}
          {form.mode === 'fixed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Value</label>
              <input
                type="number" step="any"
                value={form.fixed_value}
                onChange={e => setForm(f => ({ ...f, fixed_value: parseFloat(e.target.value) || 0 }))}
                style={{
                  width: 90, padding: '5px 8px', fontSize: 13, borderRadius: 6,
                  background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontFamily: 'monospace',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{meta.unit}</span>
            </div>
          ) : (
            <>
              {['range_min', 'range_max'].map(field => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {field === 'range_min' ? 'Min' : 'Max'}
                  </label>
                  <input
                    type="number" step="any"
                    value={form[field]}
                    onChange={e => setForm(f => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: 90, padding: '5px 8px', fontSize: 13, borderRadius: 6,
                      background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', fontFamily: 'monospace',
                    }}
                  />
                </div>
              ))}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{meta.unit}</span>
            </>
          )}

          {/* Save / Cancel */}
          <button onClick={handleSave} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px',
            borderRadius: 6, fontSize: 12, fontWeight: 700,
            background: 'var(--accent-primary)', color: '#fff',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            <Check size={13} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={handleCancel} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
            borderRadius: 6, fontSize: 12, background: 'transparent',
            border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            <X size={13} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AqmsDisplayRow;
