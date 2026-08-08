import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let mounted = true;

  const init = async () => {
      try {
        setInitError(null);
        // Failsafe: never block the whole app on auth init forever (common on web when storage misbehaves).
        const timeoutMs = 8000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth init timeout')), timeoutMs)
        );

        const { data, error } = await Promise.race([supabase.auth.getSession(), timeoutPromise]);
        if (error) throw error;

        if (!mounted) return;
        setSession(data.session);
        setIsAuthenticated(Boolean(data.session));

        if (data.session?.user) {
          setProfileLoading(true);
          const profile = await fetchMyProfile();
          if (mounted) setUser(profile);
          setProfileLoading(false);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to init Supabase session:', e);
  setInitError(e);
  // Ensure we at least render the Auth flow instead of spinning forever.
  setUser(null);
  setSession(null);
  setIsAuthenticated(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

  const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsAuthenticated(Boolean(nextSession));

      if (nextSession?.user) {
    setProfileLoading(true);
    const profile = await fetchMyProfile();
    if (mounted) setUser(profile);
    setProfileLoading(false);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  const fetchMyProfile = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

  const { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, city, is_active')
      .eq('id', authUser.id)
      .single();

    if (error) {
      // If profile row doesn't exist yet, return a minimal object.
      console.warn('Failed to load profile row:', error.message);
      return {
        id: authUser.id,
        role: authUser.user_metadata?.role ?? 'buyer',
        full_name: authUser.user_metadata?.full_name ?? '',
        phone: authUser.user_metadata?.phone,
        city: authUser.user_metadata?.city ?? 'Lahore',
        is_active: true,
      };
    }

    return data;
  };

  // Ensure the app always has a role immediately after auth to prevent navigation falling back to Auth.
  // If profile hasn't loaded yet, expose a safe fallback from Supabase user metadata.
  const effectiveUser = useMemo(() => {
    if (user?.role) return user;
    const meta = session?.user?.user_metadata;
    if (!session?.user) return user;
    return {
      id: session.user.id,
      role: meta?.role ?? 'buyer',
      full_name: meta?.full_name ?? '',
      phone: meta?.phone,
      city: meta?.city ?? 'Lahore',
      is_active: true,
    };
  }, [user, session]);

  const login = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    setSession(data.session);
    setIsAuthenticated(Boolean(data.session));

    const profile = await fetchMyProfile();
    setUser(profile);
    return { success: true, data: { user: profile } };
  };

  const register = async ({ email, password, full_name, phone, city, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
          city,
          role,
        },
      },
    });
    if (error) throw error;

    // If email confirmations are ON, session may be null. That's OK.
    setSession(data.session);
    setIsAuthenticated(Boolean(data.session));

    // Ensure profiles row is updated with signup fields (trigger creates row but may force role='buyer').
    if (data.user) {
      const payload = {
        id: data.user.id,
        full_name: full_name ?? '',
        phone: phone ?? null,
        city: city ?? 'Lahore',
        role: role ?? 'buyer',
      };

      // If there's a session, this upsert should succeed under RLS.
      // If confirmations are enabled and session is null, it may fail; that's OK.
      const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
      if (upsertError) {
        console.warn('Profile upsert failed (likely due to missing session until email verified):', upsertError.message);
        // Still set local user object so the UI can route correctly for demos.
        setUser(payload);
      }
    }

    const profile = data.session ? await fetchMyProfile() : (data.user ? {
      id: data.user.id,
      role: role ?? 'buyer',
      full_name: full_name ?? '',
      phone: phone ?? null,
      city: city ?? 'Lahore',
      is_active: true,
    } : null);
    setUser(profile);

    return {
      success: true,
      data: { user: profile },
      message: data.session
        ? 'Registration successful.'
        : 'Registration successful. Please verify your email to continue.',
    };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();

      // Belt-and-suspenders for web: ensure the client has truly dropped the session.
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setIsAuthenticated(Boolean(data.session));
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear app state so the UI flips back to Auth immediately.
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);

      // Extra cleanup so web testing can switch accounts reliably.
      try {
        if (Platform.OS === 'web') {
          // Supabase stores auth in localStorage using project-scoped keys.
          // To guarantee a clean logout for demos, remove any likely Supabase keys.
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (!k) continue;
            if (k.startsWith('sb-')) keysToRemove.push(k);
            if (k.includes('supabase')) keysToRemove.push(k);
          }
          Array.from(new Set(keysToRemove)).forEach((k) => window.localStorage.removeItem(k));

          // No hard refresh here: reload can rehydrate session and confuse testing.
        } else {
          // Older builds might have stored tokens under custom keys.
          await AsyncStorage.removeItem('jwt_token');
        }
      } catch (e) {
        // ignore cleanup failures
      }
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...userData,
    }));
  };

  const value = useMemo(
    () => ({
      user: effectiveUser,
      session,
      isLoading,
      profileLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateUser,
    }),
    [effectiveUser, session, isLoading, profileLoading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
