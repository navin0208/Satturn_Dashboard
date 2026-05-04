import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      setSearchQuery
    }}>
      {children}
    </DataContext.Provider>
  );
};
