/**
 * FORGE FITNESS — Supabase Client Configuration
 * Initializes the central Supabase client instance (window.supabaseClient)
 * using the official Supabase JavaScript SDK.
 */

(function () {
  'use strict';

  // =========================================================================
  // SUPABASE CREDENTIALS CONFIGURATION
  // Enter your Supabase Project URL and Public Anon Key below:
  // =========================================================================
  const DEFAULT_URL = 'https://fyhodevbkmteyrzpphis.supabase.co';
  // NOTE: Use the legacy JWT anon key for Edge Function authorization.
  // The sb_publishable_ format is rejected by Edge Functions with verify_jwt: true.
  const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aG9kZXZia210ZXlyenBwaGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0NDc2OTYsImV4cCI6MjEwOTAyMzY5Nn0.2yiDHssEPiFHkiFqJsC_-oJaviUzTl0-zicpBiINDEc';

  // Allow environment/runtime overrides (e.g. from localStorage or window)
  const SUPABASE_URL = (window.FORGE_SUPABASE_URL || localStorage.getItem('forge_supabase_url') || DEFAULT_URL).trim();
  const SUPABASE_ANON_KEY = (window.FORGE_SUPABASE_ANON_KEY || localStorage.getItem('forge_supabase_anon_key') || DEFAULT_ANON_KEY).trim();

  const isConfigured = Boolean(
    SUPABASE_URL && 
    SUPABASE_ANON_KEY && 
    !SUPABASE_URL.includes('YOUR_PROJECT_ID') && 
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_PUBLISHABLE_ANON_KEY')
  );

  window.forgeSupabaseConfig = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConfigured: isConfigured
  };

  // Graceful initialization check
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('[FORGE Supabase] Supabase JS SDK not detected on window. Ensure CDN script tag loads before supabase-config.js.');
    window.supabaseClient = null;
    return;
  }

  if (!isConfigured) {
    console.info('[FORGE Supabase] Supabase credentials not set yet. Replace the placeholders in assets/js/supabase-config.js with your Supabase Project URL and Publishable Anon Key.');
    window.supabaseClient = null;
    return;
  }

  try {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'forge_trainer_supabase_session'
      }
    });
    console.log('[FORGE Supabase] Client successfully initialized.');
  } catch (err) {
    console.error('[FORGE Supabase] Client initialization failed:', err);
    window.supabaseClient = null;
  }
})();
