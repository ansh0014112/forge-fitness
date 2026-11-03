/**
 * FORGE FITNESS — Trainer Portal Data Layer & Store
 * Full Supabase Integration with Cloud Persistence & Local Fallback
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    AUTH: 'forge_trainer_auth',
    BOOKINGS: 'forge_trainer_bookings',
    LEADS: 'forge_trainer_leads',
    AVAILABILITY: 'forge_trainer_availability',
    SETTINGS: 'forge_trainer_settings',
    NOTIFICATIONS: 'forge_trainer_notifications',
    ACTIVITY: 'forge_trainer_activity'
  };

  // Default Trainer Profile Fallback
  const DEFAULT_TRAINER = {
    name: 'Coach Haisam',
    title: 'Head Strength Coach & Biomechanics Specialist',
    email: 'coach.haisam@forgefitness.com',
    phone: '+91 98765 43210',
    businessName: 'FORGE FITNESS Elite Coaching',
    bio: 'Biomechanics specialist developing scientific strength engineering, hypertrophy periodization, and bespoke body recomposition protocols.',
    avatar: '../assets/images/coach-haisam.jpg',
    timezone: 'Asia/Kolkata',
    defaultDuration: '45',
    bufferTime: '15',
    consultationType: 'Video Call (Google Meet / Zoom)',
    maxPerDay: '6'
  };

  // Demo Bookings (used ONLY when Supabase is unconfigured in local demo mode)
  const DEMO_BOOKINGS = [
    {
      id: 'BK-8901',
      clientName: 'Alexander Hayes',
      email: 'a.hayes@investorcapital.com',
      phone: '+91 98765 23488',
      goal: 'Hypertrophy & Muscle Gain',
      experience: 'Intermediate (1–3 years)',
      date: '2026-11-02',
      time: '10:00 AM',
      status: 'Pending',
      submittedAt: '2026-10-29 14:20',
      notes: 'Plateaued on bench press and overhead pressing.',
      programInterest: 'Iron & Hypertrophy',
      modality: '100% Remote Video Call (Google Meet / Zoom)',
      isDemo: true
    },
    {
      id: 'BK-8902',
      clientName: 'Dr. Sarah Lin',
      email: 'sarah.lin.md@healthnet.org',
      phone: '+91 98765 91244',
      goal: 'Fat Loss & Conditioning',
      experience: 'Advanced (3+ years)',
      date: '2026-11-02',
      time: '02:30 PM',
      status: 'Confirmed',
      submittedAt: '2026-10-28 09:15',
      notes: 'Needs strict micro-cycle periodization and nutrition guidance.',
      programInterest: 'Metabolic Conditioning',
      modality: '100% Remote Video Call (Google Meet / Zoom)',
      isDemo: true
    }
  ];

  // In-Memory Data Cache
  let _cachedBookings = null;
  let _cachedLeads = null;
  let _cachedNotifications = null;
  let _cachedActivity = null;
  let _cachedAvailability = null;
  let _cachedSettings = null;

  // Storage Helpers
  function getItem(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setItem(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage quota exceeded or private mode active');
    }
  }

  // Check if Supabase client is actively configured
  function isSupabaseAvailable() {
    return Boolean(
      window.supabaseClient && 
      window.forgeSupabaseConfig && 
      window.forgeSupabaseConfig.isConfigured
    );
  }

  // Helper to map a Supabase DB row to the UI Booking format
  function mapDbBookingToUi(row) {
    if (!row) return null;
    return {
      dbId: row.id,
      id: row.booking_code || ('BK-' + row.id.substring(0, 4).toUpperCase()),
      clientName: row.client_name,
      email: row.client_email,
      phone: row.client_phone,
      goal: row.primary_goal,
      experience: row.experience_level,
      date: row.booking_date,
      time: row.booking_time,
      status: row.status,
      notes: row.notes || '',
      submittedAt: row.submitted_at || row.created_at,
      modality: row.modality || '100% Remote Video Call (Google Meet / Zoom)',
      programInterest: row.primary_goal,
      isDemo: false
    };
  }

  function isUuid(val) {
    return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
  }

  function parseTimeStringToMinutes(tStr) {
    if (!tStr) return null;
    const clean = tStr.trim();
    const match12 = clean.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM)$/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    }
    const match24 = clean.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (match24) {
      return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
    }
    return null;
  }

  function formatMinutesTo12Hour(totalMin) {
    let h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return `${pad(h)}:${pad(m)} ${ampm}`;
  }

  function generateSlotsFromRanges(timeRanges, stepMinutes = 60, durationMinutes = 45) {
    if (!Array.isArray(timeRanges) || timeRanges.length === 0) return [];
    const result = [];
    timeRanges.forEach(rangeStr => {
      const parts = String(rangeStr || '').split('-');
      if (parts.length !== 2) return;
      const startMin = parseTimeStringToMinutes(parts[0]);
      const endMin = parseTimeStringToMinutes(parts[1]);
      if (startMin === null || endMin === null || startMin >= endMin) return;

      for (let cur = startMin; cur + durationMinutes <= endMin; cur += stepMinutes) {
        result.push(formatMinutesTo12Hour(cur));
      }
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Email Confirmation Helper
  // Calls the Supabase Edge Function "send-email" (generic relay deployed via Dashboard).
  // Builds FORGE FITNESS branded HTML + plain text here, then sends to the function.
  // This is fire-and-forget — callers must .catch() to prevent unhandled rejections.
  // ---------------------------------------------------------------------------

  function buildConfirmationEmailHtml(d) {
    var isPending = d.status !== 'Confirmed';
    var statusLabel = isPending ? 'Request Received' : 'Booking Confirmed';
    var statusColor = isPending ? '#F59E0B' : '#B8FF38';
    var statusBg    = isPending ? '#1c1500'  : '#0d1a00';
    var statusBorder= isPending ? '#78350f'  : '#365314';

    // Format date readable
    var displayDate = d.bookingDate || '';
    try {
      var parts = (d.bookingDate || '').split('-');
      if (parts.length === 3) {
        var dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        displayDate = dt.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
      }
    } catch(_) {}

    var instructions = isPending
      ? 'Your consultation request has been received and is pending review by ' + d.trainerName + '. You will be contacted once your session is approved. Please keep this time slot free.'
      : 'Your consultation with ' + d.trainerName + ' has been confirmed. Please be ready 5 minutes early — a meeting link will be sent before your session.';

    var notesBlock = d.notes ? (
      '<tr><td style="padding:0 28px 24px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a1500;border:1px solid #1a3a00;border-radius:10px;">' +
      '<tr><td style="padding:14px 18px;"><p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:2px;color:#6B7280;text-transform:uppercase;">Your Notes</p>' +
      '<p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.5;">' + d.notes + '</p></td></tr>' +
      '</table></td></tr>'
    ) : '';

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>' +
      '<title>FORGE FITNESS \u2014 ' + statusLabel + '</title></head>' +
      '<body style="margin:0;padding:0;background-color:#090B0A;font-family:\'Segoe UI\',Arial,sans-serif;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#090B0A;padding:32px 16px;">' +
      '<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">' +

      // Logo
      '<tr><td style="padding-bottom:28px;" align="center">' +
      '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="background-color:#B8FF38;padding:6px 18px;border-radius:4px;">' +
      '<span style="font-size:18px;font-weight:900;letter-spacing:3px;color:#090B0A;text-transform:uppercase;">FORGE FITNESS</span>' +
      '</td></tr></table>' +
      '<p style="margin:10px 0 0;font-size:11px;color:#6B7280;letter-spacing:2px;text-transform:uppercase;">Elite Coaching &amp; Biomechanics</p>' +
      '</td></tr>' +

      // Card
      '<tr><td style="background-color:#111311;border:1px solid #1f2420;border-radius:16px;overflow:hidden;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +

      // Status banner
      '<tr><td style="background-color:' + statusBg + ';border-bottom:1px solid ' + statusBorder + ';padding:14px 28px;">' +
      '<span style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + statusColor + ';">\u25cf ' + statusLabel + '</span>' +
      '</td></tr>' +

      // Greeting
      '<tr><td style="padding:28px 28px 0;">' +
      '<h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;">Hi ' + d.clientName + ',</h1>' +
      '<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#9CA3AF;">' + instructions + '</p>' +
      '</td></tr>' +

      // Details table
      '<tr><td style="padding:22px 28px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F1210;border:1px solid #1f2420;border-radius:12px;overflow:hidden;">' +
      '<tr><td colspan="2" style="padding:12px 20px;border-bottom:1px solid #1f2420;">' +
      '<span style="font-size:10px;font-weight:700;letter-spacing:2px;color:#6B7280;text-transform:uppercase;">Booking Summary</span>' +
      '</td></tr>' +
      '<tr><td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;width:42%;">Reference</td>' +
      '<td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:700;color:#B8FF38;font-family:monospace;">' + d.bookingCode + '</td></tr>' +
      '<tr><td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Date</td>' +
      '<td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">' + displayDate + '</td></tr>' +
      '<tr><td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Time</td>' +
      '<td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#B8FF38;">' + d.bookingTime + ' (IST)</td></tr>' +
      '<tr><td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Goal</td>' +
      '<td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">' + d.primaryGoal + '</td></tr>' +
      '<tr><td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:12px;color:#6B7280;">Format</td>' +
      '<td style="padding:11px 20px;border-bottom:1px solid #1a1d1b;font-size:13px;font-weight:600;color:#FFFFFF;">100% Remote Video Call (Google Meet / Zoom)</td></tr>' +
      '<tr><td style="padding:11px 20px;font-size:12px;color:#6B7280;">Coach</td>' +
      '<td style="padding:11px 20px;font-size:13px;font-weight:600;color:#FFFFFF;">' + d.trainerName + '</td></tr>' +
      '</table></td></tr>' +

      notesBlock +

      // Footer inside card
      '<tr><td style="padding:0 28px 28px;">' +
      '<p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#FFFFFF;text-transform:uppercase;letter-spacing:1px;">Prepare for Your Session</p>' +
      '<p style="margin:4px 0;font-size:12px;color:#9CA3AF;">\u25cf Note your current training routine and any injury history</p>' +
      '<p style="margin:4px 0;font-size:12px;color:#9CA3AF;">\u25cf Test your microphone and camera beforehand</p>' +
      '<p style="margin:4px 0;font-size:12px;color:#9CA3AF;">\u25cf Be ready 5 minutes early \u2014 a meeting link will be sent before your session</p>' +
      '<p style="margin:4px 0;font-size:12px;color:#9CA3AF;">\u25cf Bring your questions and training history</p>' +
      '</td></tr>' +

      '</table></td></tr>' +

      // Footer
      '<tr><td style="padding:24px 0 0;" align="center">' +
      '<p style="margin:0 0 6px;font-size:12px;color:#4B5563;">Questions? Contact Coach Haisam:</p>' +
      '<p style="margin:0;font-size:12px;"><a href="mailto:coach.haisam@forgefitness.com" style="color:#B8FF38;text-decoration:none;">coach.haisam@forgefitness.com</a></p>' +
      '<hr style="border:none;border-top:1px solid #1f2420;margin:20px 0;"/>' +
      '<p style="margin:0;font-size:11px;color:#374151;">FORGE FITNESS Elite Coaching &bull; Booking: <strong>' + d.bookingCode + '</strong></p>' +
      '</td></tr>' +

      '</table></td></tr></table></body></html>';
  }

  function buildConfirmationEmailText(d) {
    var isPending = d.status !== 'Confirmed';
    return 'FORGE FITNESS \u2014 ' + (isPending ? 'REQUEST RECEIVED' : 'BOOKING CONFIRMED') + '\n\n' +
      'Hi ' + d.clientName + ',\n\n' +
      (isPending
        ? 'Your consultation request has been received and is pending review by ' + d.trainerName + '.'
        : 'Your consultation with ' + d.trainerName + ' has been confirmed.') + '\n\n' +
      'BOOKING DETAILS\n---------------\n' +
      'Reference: ' + d.bookingCode + '\n' +
      'Date:      ' + (d.bookingDate || '') + '\n' +
      'Time:      ' + (d.bookingTime || '') + ' (IST)\n' +
      'Goal:      ' + (d.primaryGoal || '') + '\n' +
      'Format:    100% Remote Video Call (Google Meet / Zoom)\n' +
      'Coach:     ' + d.trainerName + '\n' +
      (d.notes ? 'Notes:     ' + d.notes + '\n' : '') + '\n' +
      'Questions? Email: coach.haisam@forgefitness.com\n\n' +
      'FORGE FITNESS Elite Coaching\n' +
      'Booking: ' + d.bookingCode;
  }

  async function sendBookingConfirmationEmail(emailData) {
    if (!isSupabaseAvailable() || !window.forgeSupabaseConfig || !window.forgeSupabaseConfig.url) {
      console.info('[FORGE Email] Supabase not configured \u2014 skipping confirmation email.');
      return;
    }

    // Call the "send-email" Edge Function deployed via Supabase Dashboard
    var projectUrl = window.forgeSupabaseConfig.url.replace(/\/$/, '');
    var edgeFunctionUrl = projectUrl + '/functions/v1/send-email';
    var anonKey = window.forgeSupabaseConfig.anonKey || '';

    var d = {
      clientName:     emailData.clientName    || 'Athlete',
      bookingCode:    emailData.bookingCode   || '',
      bookingDate:    emailData.bookingDate   || '',
      bookingTime:    emailData.bookingTime   || '',
      primaryGoal:    emailData.primaryGoal   || 'Consultation',
      experienceLevel:emailData.experienceLevel || '',
      status:         emailData.status        || 'Pending',
      trainerName:    'Coach Haisam',
      notes:          emailData.notes         || ''
    };

    var isPending = d.status !== 'Confirmed';
    var subject = isPending
      ? 'Your consultation request has been received \u2014 ' + d.bookingCode + ' | FORGE FITNESS'
      : 'Your consultation is confirmed \u2014 ' + d.bookingCode + ' | FORGE FITNESS';

    var response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + anonKey,
        'apikey': anonKey
      },
      body: JSON.stringify({
        to: emailData.clientEmail || '',
        subject: subject,
        html: buildConfirmationEmailHtml(d),
        text: buildConfirmationEmailText(d)
      })
    });

    if (!response.ok) {
      var errBody = await response.text();
      throw new Error('[FORGE Email] Edge Function returned ' + response.status + ': ' + errBody);
    }

    var result = await response.json();
    if (result.id) {
      console.info('[FORGE Email] Confirmation sent to', emailData.clientEmail, 'for booking', emailData.bookingCode, '(Resend ID:', result.id + ')');
    } else if (result.error) {
      throw new Error('[FORGE Email] Email send failed: ' + result.error);
    }
  }

  // Public Trainer Store API
  window.TrainerStore = {
    // -----------------------------------------------------------------------
    // Authentication State
    // -----------------------------------------------------------------------
    getAuth: function () {
      return getItem(STORAGE_KEYS.AUTH, {
        isAuthenticated: false,
        trainer: DEFAULT_TRAINER
      });
    },

    setAuth: function (authObj) {
      setItem(STORAGE_KEYS.AUTH, authObj);
    },

    logout: function () {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
      localStorage.removeItem(STORAGE_KEYS.LEADS);
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEYS.ACTIVITY);
      sessionStorage.clear();
      _cachedBookings = null;
      _cachedLeads = null;
      _cachedNotifications = null;
      _cachedActivity = null;
    },

    // -----------------------------------------------------------------------
    // Bookings Management (Supabase + Memory Cache)
    // -----------------------------------------------------------------------
    getBookings: function () {
      // If we have an active memory cache, return it immediately
      if (_cachedBookings !== null) {
        return _cachedBookings;
      }

      // If Supabase is configured, return empty while loading to avoid flashing demo data
      if (isSupabaseAvailable()) {
        const stored = getItem(STORAGE_KEYS.BOOKINGS, null);
        if (stored) {
          _cachedBookings = stored;
          return stored;
        }
        return [];
      }

      // Local demo mode fallback
      return getItem(STORAGE_KEYS.BOOKINGS, DEMO_BOOKINGS);
    },

    loadBookingsAsync: async function () {
      if (!isSupabaseAvailable()) {
        _cachedBookings = this.getBookings();
        return _cachedBookings;
      }

      try {
        const { data, error } = await window.supabaseClient
          .from('consultation_bookings')
          .select('*')
          .order('booking_date', { ascending: false })
          .order('booking_time_start', { ascending: false });

        if (error) {
          console.error('[FORGE Supabase] Error loading bookings:', error);
          throw error;
        }

        const uiBookings = (data || []).map(mapDbBookingToUi);
        _cachedBookings = uiBookings;
        setItem(STORAGE_KEYS.BOOKINGS, uiBookings);
        return uiBookings;
      } catch (err) {
        console.error('[FORGE Supabase] Failed to fetch bookings from cloud:', err);
        return _cachedBookings || [];
      }
    },

    saveBookings: function (bookings) {
      _cachedBookings = bookings;
      setItem(STORAGE_KEYS.BOOKINGS, bookings);
    },

    // Add Consultation Booking (Used by public booking form)
    addBooking: async function (bookingData) {
      // If Supabase is available, call the secure RPC function
      if (isSupabaseAvailable()) {
        const payload = {
          p_client_name: (bookingData.fullName || bookingData.clientName || '').trim(),
          p_client_email: (bookingData.email || '').trim(),
          p_client_phone: (bookingData.phone || '').trim(),
          p_primary_goal: bookingData.goalLabel || bookingData.goal || 'Hypertrophy & Muscle Gain',
          p_experience_level: bookingData.experience || 'Beginner (< 1 year)',
          p_booking_date: bookingData.date,
          p_booking_time: bookingData.time,
          p_notes: (bookingData.notes || '').trim() || null
        };

        const { data, error } = await window.supabaseClient.rpc('submit_consultation_booking', payload);

        if (error) {
          console.error('[FORGE Supabase] Booking submission RPC error:', error);
          throw new Error(error.message || 'Failed to submit consultation request. Please try again.');
        }

        if (data && data.success === false) {
          throw new Error(data.error || 'Consultation booking could not be completed.');
        }

        const newBooking = {
          id: data.booking_code,
          dbId: data.booking_id,
          clientName: payload.p_client_name,
          email: payload.p_client_email,
          phone: payload.p_client_phone,
          goal: payload.p_primary_goal,
          experience: payload.p_experience_level,
          date: data.date || payload.p_booking_date,
          time: data.time || payload.p_booking_time,
          status: 'Pending',
          submittedAt: new Date().toISOString(),
          notes: payload.p_notes || '',
          modality: '100% Remote Video Call (Google Meet / Zoom)',
          isDemo: false
        };

        // Prepend to local memory cache so dashboard updates smoothly
        if (_cachedBookings) {
          _cachedBookings.unshift(newBooking);
          setItem(STORAGE_KEYS.BOOKINGS, _cachedBookings);
        }

        // Send confirmation email to client (non-blocking — failure does NOT affect the booking)
        sendBookingConfirmationEmail({
          clientName: payload.p_client_name,
          clientEmail: payload.p_client_email,
          bookingCode: data.booking_code || newBooking.id,
          bookingDate: data.date || payload.p_booking_date,
          bookingTime: data.time || payload.p_booking_time,
          primaryGoal: payload.p_primary_goal,
          experienceLevel: payload.p_experience_level,
          status: 'Pending',
          notes: payload.p_notes || undefined
        }).catch(function (emailErr) {
          // Email failure is intentionally silent — booking is already saved successfully
          console.warn('[FORGE Email] Confirmation email failed (booking is still saved):', emailErr);
        });

        return newBooking;
      }

      // Fallback: Local demo simulation when Supabase is unconfigured
      console.info('[FORGE Demo] Supabase unconfigured. Recording booking in local browser storage.');
      const localBookings = this.getBookings();
      const nextId = 'BK-' + (Math.floor(8900 + Math.random() * 1000));
      const now = new Date();
      const pad = n => (n < 10 ? '0' + n : '' + n);
      const submittedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      const newBooking = {
        id: nextId,
        clientName: bookingData.fullName || bookingData.clientName || 'Anonymous Athlete',
        email: bookingData.email || '',
        phone: bookingData.phone || '',
        goal: bookingData.goalLabel || bookingData.goal || 'General Assessment',
        experience: bookingData.experience || 'Beginner (< 1 year)',
        date: bookingData.date,
        time: bookingData.time,
        status: 'Pending',
        submittedAt: submittedAt,
        notes: bookingData.notes || '',
        programInterest: bookingData.programInterest || bookingData.goalLabel || 'Intake Consultation',
        modality: '100% Remote Video Call (Google Meet / Zoom)',
        isDemo: true
      };

      localBookings.unshift(newBooking);
      this.saveBookings(localBookings);
      return newBooking;
    },

    // Update Booking Status (Confirm, Reject, Cancel, Reschedule)
    updateBookingStatus: async function (id, newStatus, extraData) {
      if (isSupabaseAvailable()) {
        try {
          const updateObj = { status: newStatus };

          if (extraData && extraData.date) {
            updateObj.booking_date = extraData.date;
          }
          if (extraData && extraData.time) {
            updateObj.booking_time_start = extraData.time;
          }

          // Update in Supabase by booking_code (or id if UUID)
          const isIdUuid = isUuid(id);
          let query = window.supabaseClient.from('consultation_bookings').update(updateObj);
          if (isIdUuid) {
            query = query.eq('id', id);
          } else {
            query = query.eq('booking_code', id);
          }
          const { data, error } = await query.select().single();

          if (error) {
            console.error('[FORGE Supabase] Error updating booking status:', error);
            throw error;
          }

          const updatedUi = mapDbBookingToUi(data);

          // Update local memory cache
          if (_cachedBookings) {
            const idx = _cachedBookings.findIndex(b => b.id === id || b.dbId === id);
            if (idx !== -1) {
              _cachedBookings[idx] = updatedUi;
              setItem(STORAGE_KEYS.BOOKINGS, _cachedBookings);
            }
          }

          return updatedUi;
        } catch (err) {
          console.error('[FORGE Supabase] Failed to update status in database:', err);
          throw err;
        }
      }

      // Local storage fallback for offline demo
      const bookings = this.getBookings();
      const idx = bookings.findIndex(b => b.id === id || b.dbId === id);
      if (idx !== -1) {
        bookings[idx].status = newStatus;
        if (extraData) {
          Object.assign(bookings[idx], extraData);
        }
        this.saveBookings(bookings);
        return bookings[idx];
      }
      return null;
    },

    // -----------------------------------------------------------------------
    // Leads CRM Pipeline
    // -----------------------------------------------------------------------
    getLeads: function () {
      if (_cachedLeads !== null) return _cachedLeads;
      if (isSupabaseAvailable()) {
        const stored = getItem(STORAGE_KEYS.LEADS, null);
        if (stored) {
          _cachedLeads = stored;
          return stored;
        }
        return [];
      }
      return getItem(STORAGE_KEYS.LEADS, []);
    },

    loadLeadsAsync: async function () {
      if (!isSupabaseAvailable()) {
        _cachedLeads = this.getLeads();
        return _cachedLeads;
      }

      try {
        const { data, error } = await window.supabaseClient
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const uiLeads = (data || []).map(row => ({
          dbId: row.id,
          id: row.lead_code || ('LD-' + row.id.substring(0, 3)),
          name: row.full_name,
          email: row.email,
          phone: row.phone,
          goal: row.goal,
          experience: row.experience,
          enquiryDate: row.enquiry_date,
          status: row.status,
          notes: row.notes || '',
          isDemo: false
        }));

        _cachedLeads = uiLeads;
        setItem(STORAGE_KEYS.LEADS, uiLeads);
        return uiLeads;
      } catch (err) {
        console.error('[FORGE Supabase] Failed to fetch leads:', err);
        return _cachedLeads || [];
      }
    },

    saveLeads: function (leads) {
      _cachedLeads = leads;
      setItem(STORAGE_KEYS.LEADS, leads);
    },

    addLead: async function (leadData) {
      if (isSupabaseAvailable()) {
        try {
          const authUser = window.TrainerAuth.getTrainer();
          const { data, error } = await window.supabaseClient
            .from('leads')
            .insert({
              trainer_id: authUser?.id || (await window.supabaseClient.auth.getUser())?.data?.user?.id,
              full_name: leadData.name || leadData.fullName,
              email: leadData.email,
              phone: leadData.phone,
              goal: leadData.goal,
              experience: leadData.experience,
              status: leadData.status || 'New',
              notes: leadData.notes || ''
            })
            .select()
            .single();

          if (error) throw error;

          const newLead = {
            dbId: data.id,
            id: data.lead_code,
            name: data.full_name,
            email: data.email,
            phone: data.phone,
            goal: data.goal,
            experience: data.experience,
            enquiryDate: data.enquiry_date,
            status: data.status,
            notes: data.notes || '',
            isDemo: false
          };

          if (_cachedLeads) {
            _cachedLeads.unshift(newLead);
            setItem(STORAGE_KEYS.LEADS, _cachedLeads);
          }
          return newLead;
        } catch (e) {
          console.error('[FORGE Supabase] Error creating lead in Supabase:', e);
        }
      }

      // Local fallback
      const leads = this.getLeads();
      const nextId = 'LD-' + (Math.floor(100 + Math.random() * 900));
      const now = new Date();
      const pad = n => (n < 10 ? '0' + n : '' + n);
      const enquiryDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      const newLead = {
        id: nextId,
        name: leadData.name || leadData.fullName || 'Anonymous',
        email: leadData.email || '',
        phone: leadData.phone || '',
        goal: leadData.goal || 'General Fitness',
        experience: leadData.experience || 'Beginner (< 1 year)',
        enquiryDate: enquiryDate,
        status: leadData.status || 'New',
        notes: leadData.notes || '',
        isDemo: true
      };

      leads.unshift(newLead);
      this.saveLeads(leads);
      return newLead;
    },

    updateLeadStatus: async function (id, newStatus) {
      if (isSupabaseAvailable()) {
        try {
          const isIdUuid = isUuid(id);
          let query = window.supabaseClient.from('leads').update({ status: newStatus });
          if (isIdUuid) {
            query = query.eq('id', id);
          } else {
            query = query.eq('lead_code', id);
          }
          const { data, error } = await query.select().single();

          if (error) throw error;

          if (_cachedLeads) {
            const idx = _cachedLeads.findIndex(l => l.id === id || l.dbId === id);
            if (idx !== -1) {
              _cachedLeads[idx].status = newStatus;
              setItem(STORAGE_KEYS.LEADS, _cachedLeads);
            }
          }
          return data;
        } catch (e) {
          console.error('[FORGE Supabase] Error updating lead in Supabase:', e);
        }
      }

      const leads = this.getLeads();
      const idx = leads.findIndex(l => l.id === id || l.dbId === id);
      if (idx !== -1) {
        leads[idx].status = newStatus;
        this.saveLeads(leads);
        return leads[idx];
      }
      return null;
    },

    // -----------------------------------------------------------------------
    // Availability & Dynamic Available Slot Generator
    // -----------------------------------------------------------------------
    generateAvailableSlots: function (dateString) {
      if (!dateString) return [];
      const parts = dateString.split('-');
      if (parts.length !== 3) return [];
      const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = dayNames[targetDate.getDay()];
      
      const avail = this.getAvailability();
      const dayConf = avail.weekly && avail.weekly[dayKey];
      if (!dayConf || !dayConf.enabled || !Array.isArray(dayConf.slots) || dayConf.slots.length === 0) {
        return [];
      }

      // Generate dynamic slots directly from the trainer's availability time blocks
      const generated = generateSlotsFromRanges(dayConf.slots, 60, 45);

      // Exclude already booked times on this date
      const bookingsOnDate = this.getBookings().filter(b => b.date === dateString && (b.status === 'Pending' || b.status === 'Confirmed'));
      const bookedTimeSet = new Set(bookingsOnDate.map(b => b.time));
      return generated.filter(s => !bookedTimeSet.has(s));
    },

    generateAvailableSlotsAsync: async function (dateString) {
      if (!dateString) return [];

      // 1. If Supabase is available, call the public database RPC
      if (isSupabaseAvailable()) {
        try {
          const { data, error } = await window.supabaseClient.rpc('get_public_available_slots', {
            p_date: dateString
          });

          if (!error && Array.isArray(data)) {
            if (data.length > 0) {
              return data.map(item => (typeof item === 'string' ? item : item.slot_time));
            }

            // data is empty from RPC. Check why:
            try {
              const { count, error: countErr } = await window.supabaseClient
                .from('public_trainer_profiles')
                .select('*', { count: 'exact', head: true });

              if (!countErr && count === 0) {
                // No trainer provisioned yet — use local fallback
                console.warn('[FORGE Supabase] Notice: No active trainer profile found in database. Run supabase/seed_trainer.sql in Supabase SQL Editor. Using fallback availability.');
                // fall through to local calculation below
              } else {
                // Trainer IS provisioned but RPC returned 0 slots.
                // This can mean: weekend, fully booked, or an override blocks the date.
                // Try local availability as a safety net before showing "no slots".
                const localSlots = this.generateAvailableSlots(dateString);
                if (localSlots.length > 0) {
                  // Local config still has slots — prefer these over empty RPC result
                  // (may happen when DB availability and local config differ slightly)
                  console.info('[FORGE Supabase] RPC returned 0 slots but local config has slots. Using local config.');
                  return localSlots;
                }
                // Both RPC and local say no slots on this date
                return [];
              }
            } catch (errCheck) {
              // If count check fails, continue to fallback
            }
          }

          if (error) {
            console.warn('[FORGE Supabase] Error querying get_public_available_slots RPC:', error);
          }
        } catch (e) {
          console.warn('[FORGE Supabase] RPC call failed:', e);
        }
      }

      // 2. Fall back to local calculation driven strictly by configured availability
      return this.generateAvailableSlots(dateString);
    },

    isSlotAvailable: function (dateString, timeString) {
      if (!dateString || !timeString) return false;
      const bookingsOnDate = this.getBookings().filter(b => b.date === dateString && (b.status === 'Pending' || b.status === 'Confirmed'));
      const bookedTimeSet = new Set(bookingsOnDate.map(b => b.time));
      const available = this.generateAvailableSlots(dateString);
      return available.includes(timeString) && !bookedTimeSet.has(timeString);
    },

    getAvailability: function () {
      return getItem(STORAGE_KEYS.AVAILABILITY, {
        timezone: 'Asia/Kolkata',
        defaultDuration: 45,
        bufferTime: 15,
        maxPerDay: 6,
        weekly: {
          monday: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 18:00'] },
          tuesday: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 18:00'] },
          wednesday: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 17:00'] },
          thursday: { enabled: true, slots: ['09:00 - 12:00', '14:00 - 18:00'] },
          friday: { enabled: true, slots: ['09:00 - 13:00'] },
          saturday: { enabled: false, slots: ['10:00 - 13:00'] },
          sunday: { enabled: false, slots: [] }
        },
        dateOverrides: []
      });
    },

    loadAvailabilityAsync: async function () {
      if (isSupabaseAvailable()) {
        try {
          const { data, error } = await window.supabaseClient
            .from('trainer_availability')
            .select('*')
            .order('day_of_week', { ascending: true });

          if (!error && Array.isArray(data) && data.length > 0) {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const currentAvail = this.getAvailability();
            data.forEach(row => {
              const dName = dayNames[row.day_of_week];
              if (dName && currentAvail.weekly) {
                currentAvail.weekly[dName] = {
                  enabled: !!row.is_enabled,
                  slots: Array.isArray(row.time_ranges) ? row.time_ranges : []
                };
              }
            });
            setItem(STORAGE_KEYS.AVAILABILITY, currentAvail);
            return currentAvail;
          }
        } catch (e) {
          console.warn('[FORGE Supabase] Error loading availability from cloud:', e);
        }
      }
      return this.getAvailability();
    },

    saveAvailability: async function (avail) {
      setItem(STORAGE_KEYS.AVAILABILITY, avail);

      if (isSupabaseAvailable()) {
        try {
          const { data: profile } = await window.supabaseClient
            .from('trainer_profiles')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (profile && profile.id && avail && avail.weekly) {
            const dayMap = [
              { key: 'sunday', dow: 0 },
              { key: 'monday', dow: 1 },
              { key: 'tuesday', dow: 2 },
              { key: 'wednesday', dow: 3 },
              { key: 'thursday', dow: 4 },
              { key: 'friday', dow: 5 },
              { key: 'saturday', dow: 6 }
            ];

            const rows = dayMap.map(d => ({
              trainer_id: profile.id,
              day_of_week: d.dow,
              is_enabled: !!(avail.weekly[d.key] && avail.weekly[d.key].enabled),
              time_ranges: (avail.weekly[d.key] && avail.weekly[d.key].slots) || [],
              updated_at: new Date().toISOString()
            }));

            await window.supabaseClient
              .from('trainer_availability')
              .upsert(rows, { onConflict: 'trainer_id,day_of_week' });
          }
        } catch (e) {
          console.warn('[FORGE Supabase] Could not sync availability to Supabase:', e);
        }
      }
    },

    // -----------------------------------------------------------------------
    // Settings & Profile
    // -----------------------------------------------------------------------
    getSettings: function () {
      return getItem(STORAGE_KEYS.SETTINGS, {
        profile: DEFAULT_TRAINER,
        notifications: {
          emailNewBookings: true,
          emailConfirmations: true,
          emailCancellations: true,
          smsAlerts: false,
          weeklySummary: true
        }
      });
    },

    saveSettings: async function (settings) {
      setItem(STORAGE_KEYS.SETTINGS, settings);
    },

    // -----------------------------------------------------------------------
    // In-Portal Notifications
    // -----------------------------------------------------------------------
    getNotifications: function () {
      if (_cachedNotifications !== null) return _cachedNotifications;
      if (isSupabaseAvailable()) {
        const stored = getItem(STORAGE_KEYS.NOTIFICATIONS, null);
        if (stored) {
          _cachedNotifications = stored;
          return stored;
        }
        return [];
      }
      return getItem(STORAGE_KEYS.NOTIFICATIONS, []);
    },

    loadNotificationsAsync: async function () {
      if (!isSupabaseAvailable()) {
        _cachedNotifications = this.getNotifications();
        return _cachedNotifications;
      }

      try {
        const { data, error } = await window.supabaseClient
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const uiNotifs = (data || []).map(row => ({
          dbId: row.id,
          id: row.id,
          type: row.type,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          relatedId: row.related_booking_id
        }));

        _cachedNotifications = uiNotifs;
        setItem(STORAGE_KEYS.NOTIFICATIONS, uiNotifs);
        return uiNotifs;
      } catch (err) {
        console.error('[FORGE Supabase] Failed to fetch notifications:', err);
        return _cachedNotifications || [];
      }
    },

    markNotificationAsRead: async function (id) {
      if (isSupabaseAvailable()) {
        try {
          await window.supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        } catch (e) {
          console.warn('[FORGE Supabase] Error updating notification:', e);
        }
      }
      const notifs = this.getNotifications();
      const item = notifs.find(n => n.id === id || n.dbId === id);
      if (item) {
        item.isRead = true;
        _cachedNotifications = notifs;
        setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
      }
    },

    markAllNotificationsAsRead: async function () {
      if (isSupabaseAvailable()) {
        try {
          const authUser = window.TrainerAuth.getTrainer();
          if (authUser?.id) {
            await window.supabaseClient
              .from('notifications')
              .update({ is_read: true })
              .eq('trainer_id', authUser.id);
          }
        } catch (e) {
          console.warn('[FORGE Supabase] Error marking all notifications read:', e);
        }
      }
      const notifs = this.getNotifications();
      notifs.forEach(n => { n.isRead = true; });
      _cachedNotifications = notifs;
      setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    },

    // -----------------------------------------------------------------------
    // Append-Only Activity Log (Audit Trail)
    // -----------------------------------------------------------------------
    getActivity: function () {
      if (_cachedActivity !== null) return _cachedActivity;
      if (isSupabaseAvailable()) {
        const stored = getItem(STORAGE_KEYS.ACTIVITY, null);
        if (stored) {
          _cachedActivity = stored;
          return stored;
        }
        return [];
      }
      return getItem(STORAGE_KEYS.ACTIVITY, []);
    },

    loadActivityAsync: async function () {
      if (!isSupabaseAvailable()) {
        _cachedActivity = this.getActivity();
        return _cachedActivity;
      }

      try {
        const { data, error } = await window.supabaseClient
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        const uiActivities = (data || []).map(row => ({
          dbId: row.id,
          title: row.title,
          detail: row.detail,
          type: row.type,
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        _cachedActivity = uiActivities;
        setItem(STORAGE_KEYS.ACTIVITY, uiActivities);
        return uiActivities;
      } catch (err) {
        console.error('[FORGE Supabase] Failed to fetch activity logs:', err);
        return _cachedActivity || [];
      }
    }
  };
})();
