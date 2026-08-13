import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Restore a previously stored JWT session on boot.
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const token = await ApiService.getToken();
        if (!token) {
          if (mounted) setIsAuthenticated(false);
          return;
        }

        setProfileLoading(true);
        const profile = await ApiService.getProfile();
        if (mounted) {
          setUser(profile.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.warn('Failed to restore session (token may be invalid):', error.message);
        await ApiService.removeToken();
        if (mounted) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setProfileLoading(false);
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async ({ email, password }) => {
    const response = await ApiService.login({ email, password });
    if (response.success && response.data) {
      setUser(response.data.user);
      setIsAuthenticated(true);
      return { success: true, data: { user: response.data.user } };
    }
    return response;
  };

  const register = async (userData) => {
    const response = await ApiService.register(userData);
    if (response.success && response.data) {
      setUser(response.data.user);
      setIsAuthenticated(true);
      return {
        success: true,
        data: { user: response.data.user },
        message: response.message || 'Registration successful.',
      };
    }
    return response;
  };

  const logout = async () => {
    try {
      await ApiService.logout();
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = async (userData) => {
    const response = await ApiService.updateProfile(userData);
    if (response.success && response.data) {
      setUser(response.data);
    }
    return response;
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      profileLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, isLoading, profileLoading, isAuthenticated]
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
