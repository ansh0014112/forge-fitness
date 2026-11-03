/**
 * FORGE FITNESS — Trainer Portal Authentication (Supabase Integration)
 * Handles Supabase Auth session management, login state, and route protection.
 */

(function () {
  'use strict';

  window.TrainerAuth = {
    // Current authenticated state (synchronous check for guards)
    isAuthenticated: function () {
      const auth = window.TrainerStore.getAuth();
      return !!(auth && auth.isAuthenticated);
    },

    // Asynchronous authenticated check against Supabase
    isAuthenticatedAsync: async function () {
      if (window.supabaseClient && window.forgeSupabaseConfig && window.forgeSupabaseConfig.isConfigured) {
        try {
          const { data, error } = await window.supabaseClient.auth.getSession();
          if (error || !data || !data.session) {
            window.TrainerStore.logout();
            return false;
          }
          return true;
        } catch (e) {
          console.warn('[FORGE Auth] Error validating Supabase session:', e);
          window.TrainerStore.logout();
          return false;
        }
      }
      return this.isAuthenticated();
    },

    // Current trainer profile
    getTrainer: function () {
      const auth = window.TrainerStore.getAuth();
      return auth ? auth.trainer : null;
    },

    // Login Method
    login: async function (email, password, rememberMe) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      if (!cleanEmail || !cleanPass) {
        throw new Error('Please provide both your trainer email and password.');
      }

      // Check if Supabase client is initialized
      if (window.supabaseClient && window.forgeSupabaseConfig && window.forgeSupabaseConfig.isConfigured) {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPass
        });

        if (error) {
          throw new Error(error.message || 'Authentication failed. Please verify credentials.');
        }

        const user = data.user;
        let trainerProfile = {
          id: user.id,
          name: user.user_metadata?.full_name || 'Coach Haisam',
          title: 'Head Strength Coach & Biomechanics Specialist',
          email: user.email,
          phone: user.user_metadata?.phone || '+91 98765 43210',
          avatar: '../assets/images/coach-haisam.jpg'
        };

        // Try to fetch profile from public.trainer_profiles table
        try {
          const { data: profileRow, error: pError } = await window.supabaseClient
            .from('trainer_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!pError && profileRow) {
            trainerProfile = {
              id: profileRow.id,
              name: profileRow.full_name,
              title: profileRow.title,
              email: profileRow.email,
              phone: profileRow.phone,
              businessName: profileRow.business_name,
              bio: profileRow.bio,
              avatar: profileRow.avatar_url || '../assets/images/coach-haisam.jpg'
            };
          }
        } catch (e) {
          console.warn('[FORGE Auth] Could not fetch trainer_profiles row:', e);
        }

        window.TrainerStore.setAuth({
          isAuthenticated: true,
          rememberMe: !!rememberMe,
          loginTimestamp: new Date().toISOString(),
          userId: user.id,
          trainer: trainerProfile
        });

        return {
          success: true,
          trainer: trainerProfile,
          message: 'Authentication successful. Redirecting to dashboard...'
        };
      }

      // Fallback: If Supabase credentials are not configured yet, notify user with demo option
      if (cleanEmail === 'coach.haisam@forgefitness.com' && cleanPass === 'forge2026') {
        const demoTrainer = {
          id: 'demo-trainer-uuid',
          name: 'Coach Haisam',
          title: 'Head Strength Coach & Biomechanics Specialist',
          email: cleanEmail,
          phone: '+91 98765 43210',
          avatar: '../assets/images/coach-haisam.jpg'
        };

        window.TrainerStore.setAuth({
          isAuthenticated: true,
          rememberMe: !!rememberMe,
          loginTimestamp: new Date().toISOString(),
          isDemoSession: true,
          trainer: demoTrainer
        });

        return {
          success: true,
          trainer: demoTrainer,
          message: 'Logged in with local demo credentials (Supabase config required for cloud database).'
        };
      }

      throw new Error('Supabase project credentials not configured in assets/js/supabase-config.js. (Enter coach.haisam@forgefitness.com / forge2026 for local demo).');
    },

    // Logout
    logout: async function () {
      if (window.supabaseClient && window.forgeSupabaseConfig && window.forgeSupabaseConfig.isConfigured) {
        try {
          const { error } = await window.supabaseClient.auth.signOut();
          if (error) {
            console.warn('[FORGE Auth] Supabase global signOut warning:', error.message);
            // Ensure local session is cleared if global revocation fails
            await window.supabaseClient.auth.signOut({ scope: 'local' });
          }
        } catch (e) {
          console.warn('[FORGE Auth] Supabase signOut exception:', e);
          try {
            await window.supabaseClient.auth.signOut({ scope: 'local' });
          } catch (_) {}
        }
      }

      // Terminate all local application state and cached data
      window.TrainerStore.logout();

      // Redirect to login using location.replace to prevent back-navigation to dashboard
      window.location.replace('login.html?logged_out=true');
    },

    // Route guard for protected pages
    requireAuth: async function () {
      const isAuth = await this.isAuthenticatedAsync();
      if (!isAuth) {
        const currentPath = window.location.pathname;
        const page = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        window.location.replace(`login.html?redirect=${encodeURIComponent(page || 'dashboard.html')}`);
        return false;
      }
      return true;
    },

    // Route guard for login page (if already logged in, go to dashboard)
    redirectIfAuthenticated: async function () {
      const params = new URLSearchParams(window.location.search);
      if (params.get('logged_out') === 'true') {
        return;
      }
      const isAuth = await this.isAuthenticatedAsync();
      if (isAuth) {
        const redirectUrl = params.get('redirect') || 'dashboard.html';
        window.location.replace(redirectUrl);
      }
    }
  };
})();
