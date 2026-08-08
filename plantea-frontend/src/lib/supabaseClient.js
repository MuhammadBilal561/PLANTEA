// Supabase uses URL APIs that may be missing in some React Native environments.
// This polyfill is recommended for Expo/React Native.
// We keep it wrapped so a missing install doesn't hard-crash the whole app.
try {
  // eslint-disable-next-line import/no-unresolved
  require('react-native-url-polyfill/auto');
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[Supabase] react-native-url-polyfill not loaded:', e?.message ?? e);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast with a clear message. Expo won't show thrown errors nicely at boot,
  // so we also log to console.
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in plantea-frontend/.env'
  );
}

// On web, Supabase expects a synchronous storage (localStorage-like). AsyncStorage is async
// and can cause sessions to not clear correctly on signOut.
const webStorage = {
  getItem: (key) => {
    try {
      return window?.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window?.localStorage?.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      window?.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
