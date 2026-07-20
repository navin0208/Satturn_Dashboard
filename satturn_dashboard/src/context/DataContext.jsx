import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Default parameter per display slot (1-indexed)
const DEFAULT_PARAMS = ['co2', 'no2', 'so2', 'o3', 'pm25', 'pm10'];

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── AQMS State ──────────────────────────────────────────────
  const [aqmsSystems, setAqmsSystems] = useState([]);
  const [aqmsConfigs, setAqmsConfigs] = useState([]);
  const [aqmsLoading, setAqmsLoading] = useState(false);

  // Fetch initial data AND subscribe to realtime changes when user logs in
  useEffect(() => {
    if (!user) {
      setDevices([]);
      setUsers([]);
      return;
    }

    fetchData();

    // Subscribe to ALL changes on the devices table in real-time
    // This means when admin changes sim_config/status from their browser,
    // the user's browser gets notified instantly without needing to reload.
    const channel = supabase
      .channel('devices-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'devices' },
        (payload) => {
          const updatedDevice = payload.new;
          setDevices(prev => {
            // Only update if the device is already in our local state
            // (i.e., the user is allowed to see it)
            const exists = prev.find(d => d.id === updatedDevice.id);
            if (!exists) return prev;
            return prev.map(d => d.id === updatedDevice.id ? updatedDevice : d);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'devices' },
        (payload) => {
          const newDevice = payload.new;
          // For non-admins, only add the device if it's assigned to them
          if (user.role !== 'ADMIN' && newDevice.assignedUserId !== user.id) return;
          setDevices(prev => {
            // Avoid duplicates from optimistic updates
            if (prev.find(d => d.id === newDevice.id)) return prev;
            return [...prev, newDevice];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'devices' },
        (payload) => {
          const deletedId = payload.old.id;
          setDevices(prev => prev.filter(d => d.id !== deletedId));
        }
      )
      .subscribe();

    // Cleanup subscription when user logs out or component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── AQMS: Fetch + Realtime ────────────────────────────────────
  const fetchAqmsData = useCallback(async () => {
    if (!user) return;
    setAqmsLoading(true);
    try {
      const [{ data: systems, error: sErr }, { data: configs, error: cErr }] = await Promise.all([
        supabase.from('aqms_systems').select('*').order('created_at', { ascending: true }),
        supabase.from('aqms_display_configs').select('*'),
      ]);
      if (!sErr && systems) setAqmsSystems(systems);
      if (!cErr && configs) setAqmsConfigs(configs);
    } catch (err) {
      console.error('Error fetching AQMS data:', err);
    } finally {
      setAqmsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAqmsSystems([]);
      setAqmsConfigs([]);
      return;
    }
    fetchAqmsData();

    // Realtime: aqms_systems
    const aqmsSystemsChannel = supabase
      .channel('aqms-systems-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aqms_systems' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAqmsSystems(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setAqmsSystems(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setAqmsSystems(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    // Realtime: aqms_display_configs
    const aqmsConfigsChannel = supabase
      .channel('aqms-configs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aqms_display_configs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAqmsConfigs(prev => {
            if (prev.find(c => c.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'UPDATE') {
          setAqmsConfigs(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setAqmsConfigs(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(aqmsSystemsChannel);
      supabase.removeChannel(aqmsConfigsChannel);
    };
  }, [user?.id]);

  // ── AQMS CRUD ─────────────────────────────────────────────────

  /**
   * Add a new AQMS system and auto-create 6 default display config rows.
   * Returns the newly created system object.
   */
  const addAqmsSystem = async (name, location = '') => {
    const { data: system, error } = await supabase
      .from('aqms_systems')
      .insert([{ name, location }])
      .select()
      .single();
    if (error) throw error;

    // Auto-create 6 display config rows with defaults
    const defaultConfigs = DEFAULT_PARAMS.map((param, i) => ({
      system_id: system.id,
      display_index: i + 1,
      parameter: param,
      mode: 'fixed',
      fixed_value: getDefaultFixed(param),
      range_min: 0,
      range_max: getDefaultFixed(param) * 2,
    }));
    const { error: cfgErr } = await supabase.from('aqms_display_configs').insert(defaultConfigs);
    if (cfgErr) console.error('Failed to create default configs:', cfgErr);

    return system;
  };

  const deleteAqmsSystem = async (systemId) => {
    // Cascade delete handles display configs via FK
    const prevSystems = [...aqmsSystems];
    const prevConfigs = [...aqmsConfigs];
    setAqmsSystems(prev => prev.filter(s => s.id !== systemId));
    setAqmsConfigs(prev => prev.filter(c => c.system_id !== systemId));
    const { error } = await supabase.from('aqms_systems').delete().eq('id', systemId);
    if (error) {
      setAqmsSystems(prevSystems);
      setAqmsConfigs(prevConfigs);
      alert('Failed to delete system: ' + error.message);
    }
  };

  /**
   * Upsert a display config row. Creates it if not yet in DB.
   * @param {string} systemId
   * @param {number} displayIndex - 1..6
   * @param {string} parameter - 'co2' | 'no2' | etc.
   * @param {{ mode, fixed_value, range_min, range_max }} config
   */
  const updateAqmsDisplayConfig = async (systemId, displayIndex, parameter, config) => {
    const row = {
      system_id: systemId,
      display_index: displayIndex,
      parameter,
      mode: config.mode,
      fixed_value: config.fixed_value,
      range_min: config.range_min,
      range_max: config.range_max,
    };

    // Optimistic update
    setAqmsConfigs(prev => {
      const existing = prev.find(c => c.system_id === systemId && c.display_index === displayIndex);
      if (existing) return prev.map(c => c.system_id === systemId && c.display_index === displayIndex ? { ...c, ...row, updated_at: new Date().toISOString() } : c);
      return [...prev, { ...row, id: `temp_${systemId}_${displayIndex}`, updated_at: new Date().toISOString() }];
    });

    // 1. Save to DB for the dashboard UI state
    const { error } = await supabase
      .from('aqms_display_configs')
      .upsert(row, { onConflict: 'system_id,display_index' })
      .select();

    if (error) {
      console.error('Failed to update display config DB:', error);
      fetchAqmsData(); // revert
      throw error;
    }

    // 2. Export to Supabase Storage (Public CDN for the ESP32s)
    // Uploaded as an array with one object so the ESP32 parser doesn't need to change
    const jsonPayload = JSON.stringify([{
      mode: config.mode,
      fixed_value: config.fixed_value,
      range_min: config.range_min,
      range_max: config.range_max
    }]);
    
    // We use a Blob to upload to Supabase Storage via JS client
    const jsonBlob = new Blob([jsonPayload], { type: 'application/json' });
    const { error: storageError } = await supabase
      .storage
      .from('aqms_config')
      .upload(`${systemId}/${displayIndex}.json`, jsonBlob, {
        cacheControl: '10', // Short cache (10s) so ESP32s see updates quickly
        upsert: true
      });

    if (storageError) {
      console.error('Failed to upload config to Storage:', storageError);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users (if admin)
      if (user.role === 'ADMIN') {
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (!usersError && usersData) setUsers(usersData);
      }

      // 2. Fetch Devices
      // If admin, fetch all devices. If regular user, fetch only assigned devices
      let query = supabase.from('devices').select('*');
      if (user.role !== 'ADMIN') {
        query = query.eq('assignedUserId', user.id);
      }
      
      const { data: devicesData, error: devicesError } = await query;
      if (!devicesError && devicesData) setDevices(devicesData);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (newDevice) => {
    // Generate readable device code (e.g. sensor_841)
    const baseCode = newDevice.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const deviceCode = `${baseCode}_${Math.floor(100 + Math.random() * 900)}`;
    const deviceWithCode = { ...newDevice, device_code: deviceCode };

    // Generate a temporary ID for optimistic UI update
    const tempId = `ST_DEV_${Math.floor(Math.random() * 10000)}`;
    const optimisticDevice = { ...deviceWithCode, id: tempId };
    setDevices(prev => [...prev, optimisticDevice]);

    try {
      const { data, error } = await supabase.from('devices').insert([deviceWithCode]).select().single();
      if (error) throw error;
      
      // Update with actual DB record (which will have the real serial/id)
      setDevices(prev => prev.map(d => d.id === tempId ? data : d));
    } catch (err) {
      console.error("Failed to add device:", err);
      // Revert optimistic update
      setDevices(prev => prev.filter(d => d.id !== tempId));
      alert("Failed to save device to database.");
    }
  };

  const deleteDevice = async (id) => {
    // Optimistic delete
    const previousDevices = [...devices];
    setDevices(prev => prev.filter(d => d.id !== id));

    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete device:", err);
      // Revert optimistic delete
      setDevices(previousDevices);
      alert("Failed to delete device from database.");
    }
  };

  const addUser = async (newUser) => {
    try {
      // 1. Create the user in Supabase Auth using the secondary Admin client
      // WORKAROUND: Since SMS providers aren't set up, we fake an email using the phone number!
      const fakeEmail = `${newUser.phone.replace('+', '')}@satturn.local`;
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email: fakeEmail,
        password: newUser.password,
      });

      if (authError) throw authError;
      
      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("Failed to retrieve new user ID");

      // 2. Insert the user's profile into our public.users table
      const userProfile = {
        id: newUserId,
        name: newUser.name,
        phone: newUser.phone,
        role: newUser.role,
        company_name: newUser.company_name,
        company_logo_url: newUser.company_logo_url
      };

      const { data, error } = await supabase.from('users').insert([userProfile]).select().single();
      if (error) throw error;
      
      setUsers(prev => [...prev, data]);
      alert("User successfully created!");

    } catch (err) {
      console.error("Failed to add user:", err);
      alert(`Failed to create user: ${err.message}`);
    }
  };

  const deleteUser = async (id) => {
    const previousUsers = [...users];
    setUsers(prev => prev.filter(u => u.id !== id));

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete user:", err);
      setUsers(previousUsers);
      alert("Failed to delete user from database.");
    }
  };

  const assignGlobalDeviceToUser = async (globalDeviceId, userId) => {
    const globalDevice = devices.find(d => d.id === globalDeviceId);
    if (!globalDevice) return;

    // Count clones to generate sequential device_code
    const cloneCount = devices.filter(d => d.parent_device_id === globalDeviceId).length;
    const baseCode = globalDevice.device_code || globalDevice.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const newDeviceCode = `${baseCode}.${cloneCount + 1}`;

    const newClone = {
      name: globalDevice.name,
      type: globalDevice.type,
      company: globalDevice.company,
      status: globalDevice.status,
      sim_config: globalDevice.sim_config,
      assignedUserId: userId,
      parent_device_id: globalDeviceId,
      device_code: newDeviceCode
    };

    const tempId = `ST_CLONE_${Math.floor(Math.random() * 10000)}`;
    setDevices(prev => [...prev, { ...newClone, id: tempId }]);

    try {
      const { data, error } = await supabase.from('devices').insert([newClone]).select().single();
      if (error) throw error;
      setDevices(prev => prev.map(d => d.id === tempId ? data : d));
    } catch (err) {
      console.error("Failed to assign device:", err);
      setDevices(prev => prev.filter(d => d.id !== tempId));
      alert("Failed to assign device.");
    }
  };

  const unassignUserDevice = async (userDeviceId) => {
    // We treat unassigning as deleting the clone entirely to prevent ghost data
    deleteDevice(userDeviceId);
  };

  const updateDeviceSimConfig = async (deviceId, simConfig) => {
    const isGlobal = !devices.find(d => d.id === deviceId)?.parent_device_id;
    // Optimistic update
    setDevices(prev => prev.map(d => {
      if (d.id === deviceId || (isGlobal && d.parent_device_id === deviceId)) {
        return { ...d, sim_config: simConfig };
      }
      return d;
    }));
    
    let error;
    if (isGlobal) {
      const res = await supabase.from('devices').update({ sim_config: simConfig }).or(`id.eq.${deviceId},parent_device_id.eq.${deviceId}`);
      error = res.error;
    } else {
      const res = await supabase.from('devices').update({ sim_config: simConfig }).eq('id', deviceId);
      error = res.error;
    }
    if (error) {
      console.error("Failed to update device sim config:", error);
      fetchData(); // revert optimistic update
      throw error; // re-throw so the UI can show an error state
    }
  };

  const bulkUpdateDeviceSimConfig = async (simConfig) => {
    // Optimistic update
    setDevices(prev => prev.map(d => ({ ...d, sim_config: simConfig })));
    
    try {
      const { error } = await supabase.from('devices').update({ sim_config: simConfig }).not('id', 'is', null);
      if (error) throw error;
      alert("Globally updated all device simulation settings!");
    } catch (err) {
      console.error("Failed to bulk update device sim config:", err);
      alert("Failed to update global simulation settings.");
      fetchData();
    }
  };

  const updateDeviceStatus = async (deviceId, newStatus) => {
    const isGlobal = !devices.find(d => d.id === deviceId)?.parent_device_id;
    // Optimistic update
    setDevices(prev => prev.map(d => {
      if (d.id === deviceId || (isGlobal && d.parent_device_id === deviceId)) {
        return { ...d, status: newStatus };
      }
      return d;
    }));
    
    try {
      let error;
      if (isGlobal) {
        // Update the global device AND all its clones
        const res = await supabase.from('devices').update({ status: newStatus }).or(`id.eq.${deviceId},parent_device_id.eq.${deviceId}`);
        error = res.error;
      } else {
        const res = await supabase.from('devices').update({ status: newStatus }).eq('id', deviceId);
        error = res.error;
      }
      if (error) throw error;
    } catch (err) {
      console.error("Failed to update device status:", err);
      alert("Failed to update device status.");
      fetchData();
    }
  };

  return (
    <DataContext.Provider value={{ 
      devices, 
      addDevice, 
      deleteDevice, 
      assignGlobalDeviceToUser,
      unassignUserDevice,
      updateDeviceSimConfig,
      bulkUpdateDeviceSimConfig,
      updateDeviceStatus,
      users, 
      addUser, 
      deleteUser, 
      loading,
      searchQuery,
      setSearchQuery,
      // AQMS
      aqmsSystems,
      aqmsConfigs,
      aqmsLoading,
      addAqmsSystem,
      deleteAqmsSystem,
      updateAqmsDisplayConfig,
      refreshAqms: fetchAqmsData,
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Helper: default fixed value per parameter
function getDefaultFixed(param) {
  const defaults = { co2: 420, no2: 0.04, so2: 0.02, o3: 0.05, pm25: 25, pm10: 45 };
  return defaults[param] ?? 0;
}
