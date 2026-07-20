import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Auto-logout after 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null means unauthenticated
  const [loading, setLoading] = useState(true); // Start loading while checking session
  const timeoutRef = useRef(null);

  // Reset the inactivity timer
  const resetIdleTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!user) return;
    timeoutRef.current = setTimeout(() => {
      console.warn('Session timed out due to inactivity.');
      logout();
    }, SESSION_TIMEOUT_MS);
  }, [user]);

  // Listen for user activity to reset timer
  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start the first timer
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, resetIdleTimer]);

  // Check active sessions and sets the user
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch additional user data (role, phone) from a 'users' table
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        // Fallback if users table isn't set up yet
        setUser({ id: userId, role: 'USER', name: 'Unknown User' });
      } else {
        setUser(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Login with Phone/Password
  const login = async (emailOrPhone, password) => {
    setLoading(true);

    // WORKAROUND: If they type a phone number, convert it to our fake email format
    // so Supabase Auth accepts it without needing an SMS provider configured!
    const cleaned = emailOrPhone.trim();
    const isEmail = cleaned.includes('@');
    const fakeEmail = isEmail ? cleaned : `${cleaned.replace(/[^0-9]/g, '')}@satturn.local`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      // Explicitly fetch user profile before returning so the UI doesn't bounce back
      if (data?.session?.user) {
        await fetchUserProfile(data.session.user.id);
      } else {
        setLoading(false);
      }

      return { success: true };
    } catch (err) {
      setLoading(false);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const logout = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
