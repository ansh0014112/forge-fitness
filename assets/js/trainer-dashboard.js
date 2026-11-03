/**
 * FORGE FITNESS — Trainer Dashboard Master Controller
 * Handles Navigation, State Management, View Rendering, Modals, and Interactive Actions
 * Pure frontend implementation with localStorage state persistence
 */

(function () {
  'use strict';

  // Ensure authentication
  (async function checkDashboardAuth() {
    if (window.TrainerAuth && typeof window.TrainerAuth.requireAuth === 'function') {
      const allowed = await window.TrainerAuth.requireAuth();
      if (!allowed) return;
    }
  })();

  // Handle Back-Forward Cache (BFCache) navigation protection
  window.addEventListener('pageshow', async function (event) {
    if (window.TrainerAuth && typeof window.TrainerAuth.isAuthenticatedAsync === 'function') {
      const isAuth = await window.TrainerAuth.isAuthenticatedAsync();
      if (!isAuth) {
        window.location.replace('login.html');
      }
    }
  });

  // State cache
  let currentView = 'overview';
  let activeBookingsFilter = 'all';
  let bookingsSearchTerm = '';
  let activeLeadsFilter = 'all';
  let leadsSearchTerm = '';
  let activeConsultationsFilter = 'all';
  let consultationsSearchTerm = '';

  // Toast Helper
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="w-5 h-5 text-brand-lime shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>`;
    } else {
      iconSvg = `<svg class="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="flex-grow text-xs sm:text-sm font-medium leading-snug">${message}</div>
      <button type="button" class="text-brand-muted hover:text-white p-0.5 ml-2 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round"></path></svg>
      </button>
    `;

    toast.querySelector('button').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    // Auto dismiss
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // =========================================================================
  // View Routing & Navigation
  // =========================================================================
  function initRouter() {
    function parseHash() {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      const validViews = ['overview', 'bookings', 'consultations', 'leads', 'availability', 'settings'];
      return validViews.includes(hash) ? hash : 'overview';
    }

    function switchView(viewName) {
      currentView = viewName;
      window.location.hash = viewName;

      // Update page title
      const titles = {
        overview: 'Dashboard Overview',
        bookings: 'Booking Requests',
        consultations: 'Upcoming Consultations',
        leads: 'Client Leads Pipeline',
        availability: 'Availability Management',
        settings: 'Trainer Profile & Settings'
      };
      const titleEl = document.getElementById('current-page-title');
      if (titleEl) titleEl.textContent = titles[viewName] || 'Trainer Dashboard';

      // Update active sidebar links
      document.querySelectorAll('.sidebar-link').forEach(link => {
        const targetView = link.getAttribute('data-view');
        link.classList.toggle('active', targetView === viewName);
      });

      // Show the matching section
      document.querySelectorAll('.dashboard-view-panel').forEach(panel => {
        panel.classList.add('hidden');
      });
      const targetPanel = document.getElementById(`view-${viewName}`);
      if (targetPanel) {
        targetPanel.classList.remove('hidden');
      }

      // Render view content
      renderCurrentView();

      // Close mobile drawer if open
      closeMobileSidebar();
    }

    // Hash change listener
    window.addEventListener('hashchange', () => {
      switchView(parseHash());
    });

    // Attach click listeners to sidebar links
    document.querySelectorAll('[data-view]').forEach(elem => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        const v = elem.getAttribute('data-view');
        switchView(v);
      });
    });

    // Initial load
    switchView(parseHash());
  }

  function renderCurrentView() {
    switch (currentView) {
      case 'overview':
        renderOverview();
        break;
      case 'bookings':
        renderBookings();
        break;
      case 'consultations':
        renderConsultations();
        break;
      case 'leads':
        renderLeads();
        break;
      case 'availability':
        renderAvailability();
        break;
      case 'settings':
        renderSettings();
        break;
    }
    updateNotificationsBadge();
  }

  // Mobile Sidebar Toggle
  window.openMobileSidebar = function () {
    const sidebar = document.getElementById('dashboard-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  };

  window.closeMobileSidebar = function () {
    const sidebar = document.getElementById('dashboard-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  };

  function initMobileSidebar() {
    const openBtn = document.getElementById('mobile-sidebar-toggle');
    const closeBtn = document.getElementById('mobile-sidebar-close');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (openBtn) openBtn.addEventListener('click', window.openMobileSidebar);
    if (closeBtn) closeBtn.addEventListener('click', window.closeMobileSidebar);
    if (backdrop) backdrop.addEventListener('click', window.closeMobileSidebar);
  }

  // =========================================================================
  // Phase 6: Overview View
  // =========================================================================
  function renderOverview() {
    const bookings = window.TrainerStore.getBookings();
    const leads = window.TrainerStore.getLeads();

    const totalEnquiries = leads.length + bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
    const confirmedConsultations = bookings.filter(b => b.status === 'Confirmed').length;
    const upcomingCalls = bookings.filter(b => b.status === 'Confirmed').length;

    // Update statistics
    const statEnquiries = document.getElementById('stat-total-enquiries');
    const statPending = document.getElementById('stat-pending-bookings');
    const statConfirmed = document.getElementById('stat-confirmed-consultations');
    const statUpcoming = document.getElementById('stat-upcoming-calls');

    if (statEnquiries) statEnquiries.textContent = totalEnquiries;
    if (statPending) statPending.textContent = pendingBookings;
    if (statConfirmed) statConfirmed.textContent = confirmedConsultations;
    if (statUpcoming) statUpcoming.textContent = upcomingCalls;

    // Render Recent Bookings Table
    const recentTableBody = document.getElementById('overview-recent-bookings-body');
    if (recentTableBody) {
      const recent = bookings.slice(0, 5);
      if (recent.length === 0) {
        recentTableBody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-brand-muted text-xs">No consultation requests recorded yet. Submissions through the website will appear here in real time.</td></tr>`;
      } else {
        recentTableBody.innerHTML = recent.map(b => `
          <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td class="py-3 px-4 font-mono text-xs text-brand-lime font-bold">
              ${b.id}
              <div class="mt-0.5">
                ${b.isDemo ? `<span class="inline-block px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">DEMO</span>` : `<span class="inline-block px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-brand-lime/15 text-brand-lime border border-brand-lime/30 uppercase tracking-wider">LIVE</span>`}
              </div>
            </td>
            <td class="py-3 px-4">
              <div class="font-bold text-white text-xs sm:text-sm">${b.clientName}</div>
              <div class="text-[11px] text-brand-muted">${b.email}</div>
            </td>
            <td class="py-3 px-4 text-xs text-brand-softWhite">${b.goal}</td>
            <td class="py-3 px-4 text-xs text-brand-muted whitespace-nowrap">
              <span class="font-medium text-white">${formatDate(b.date)}</span>
              <span class="text-[11px] block text-brand-lime/90 font-mono">${b.time}</span>
            </td>
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="badge-status badge-${b.status.toLowerCase()}">${b.status}</span>
            </td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
              <button type="button" onclick="window.openBookingDetailsModal('${b.id}')" class="text-xs text-brand-lime hover:underline font-semibold mr-3">View</button>
              ${b.status === 'Pending' ? `
                <button type="button" onclick="window.confirmBookingAction('${b.id}')" class="px-2.5 py-1 rounded bg-brand-lime text-brand-black text-[11px] font-bold uppercase tracking-wider hover:bg-brand-limeHover mr-1.5 transition-colors">Confirm</button>
                <button type="button" onclick="window.openRescheduleModal('${b.id}')" class="px-2 py-1 rounded bg-brand-surface border border-white/10 text-brand-muted hover:text-white text-[11px] transition-colors">Reschedule</button>
              ` : ''}
            </td>
          </tr>
        `).join('');
      }
    }

    // Render Recent Activity Stream
    const activityContainer = document.getElementById('overview-activity-feed');
    if (activityContainer) {
      const activities = window.TrainerStore.getActivity();
      activityContainer.innerHTML = activities.slice(0, 5).map(act => `
        <div class="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-b-0">
          <div class="w-2 h-2 rounded-full bg-brand-lime mt-1.5 shrink-0"></div>
          <div class="flex-grow">
            <div class="text-xs font-bold text-brand-softWhite">${act.title}</div>
            <div class="text-[11px] text-brand-muted leading-tight mt-0.5">${act.detail}</div>
          </div>
          <div class="text-[10px] text-brand-muted/70 font-mono shrink-0 whitespace-nowrap">${act.time}</div>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // Phase 7: Booking Requests Management
  // =========================================================================
  function renderBookings() {
    let bookings = window.TrainerStore.getBookings();

    // Filter by status tab
    if (activeBookingsFilter !== 'all') {
      bookings = bookings.filter(b => b.status.toLowerCase() === activeBookingsFilter.toLowerCase());
    }

    // Filter by search query
    if (bookingsSearchTerm) {
      const q = bookingsSearchTerm.toLowerCase();
      bookings = bookings.filter(b => 
        b.clientName.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.goal.toLowerCase().includes(q)
      );
    }

    // Date filter
    const dateInput = document.getElementById('bookings-date-filter');
    if (dateInput && dateInput.value) {
      bookings = bookings.filter(b => b.date === dateInput.value);
    }

    const tbody = document.getElementById('bookings-table-body');
    const mobileContainer = document.getElementById('bookings-mobile-cards');
    const countBadge = document.getElementById('bookings-count-badge');

    if (countBadge) countBadge.textContent = `${bookings.length} found`;

    if (bookings.length === 0) {
      const emptyHtml = `
        <div class="py-12 text-center text-brand-muted">
          <svg class="w-12 h-12 mx-auto text-brand-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="1.5"></path></svg>
          <div class="text-sm font-semibold text-white">No consultation requests match this filter</div>
          <div class="text-xs text-brand-muted mt-1 max-w-sm mx-auto">New consultation requests submitted through the public intake form will appear here with status Pending.</div>
        </div>
      `;
      if (tbody) tbody.innerHTML = `<tr><td colspan="8">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      return;
    }

    // Desktop Table
    if (tbody) {
      tbody.innerHTML = bookings.map(b => `
        <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
          <td class="py-3.5 px-4 font-mono text-xs text-brand-lime font-bold">
            ${b.id}
            <div class="mt-1">
              ${b.isDemo ? `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">DEMO DATA</span>` : `<span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-brand-lime/15 text-brand-lime border border-brand-lime/30 uppercase tracking-wider">WEBSITE INTAKE</span>`}
            </div>
          </td>
          <td class="py-3.5 px-4">
            <div class="font-bold text-white text-xs sm:text-sm">${b.clientName}</div>
            <div class="text-[11px] text-brand-muted">${b.email}</div>
            <div class="text-[11px] text-brand-muted font-mono">${b.phone}</div>
          </td>
          <td class="py-3.5 px-4">
            <div class="text-xs font-semibold text-brand-softWhite">${b.goal}</div>
            <div class="text-[11px] text-brand-muted">${b.experience}</div>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <div class="font-semibold text-white text-xs">${formatDate(b.date)}</div>
            <div class="text-[11px] text-brand-lime font-mono">${b.time}</div>
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap">
            <span class="badge-status badge-${b.status.toLowerCase()}">${b.status}</span>
          </td>
          <td class="py-3.5 px-4 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-1.5">
              <button type="button" onclick="window.openBookingDetailsModal('${b.id}')" class="p-1.5 rounded-lg bg-brand-surface border border-white/10 text-brand-muted hover:text-brand-lime hover:border-brand-lime/40 transition-colors" title="View Full Intake">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="2"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke-width="2"></path></svg>
              </button>
              ${b.status === 'Pending' ? `
                <button type="button" onclick="window.confirmBookingAction('${b.id}')" class="px-3 py-1.5 rounded-lg bg-brand-lime text-brand-black text-xs font-extrabold uppercase tracking-wider hover:bg-brand-limeHover shadow-glow-lime-sm transition-all" title="Confirm Booking">
                  Confirm
                </button>
                <button type="button" onclick="window.openRescheduleModal('${b.id}')" class="p-1.5 rounded-lg bg-brand-surface border border-white/10 text-brand-muted hover:text-white transition-colors" title="Reschedule">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2"></path></svg>
                </button>
                <button type="button" onclick="window.openRejectConfirmModal('${b.id}')" class="p-1.5 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/50 transition-colors" title="Decline">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"></path></svg>
                </button>
              ` : `
                <button type="button" onclick="window.openRescheduleModal('${b.id}')" class="px-2.5 py-1 text-xs text-brand-muted hover:text-white border border-white/10 rounded-lg">Reschedule</button>
              `}
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Mobile Cards View
    if (mobileContainer) {
      mobileContainer.innerHTML = bookings.map(b => `
        <div class="dashboard-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs font-bold text-brand-lime">${b.id}</span>
            <span class="badge-status badge-${b.status.toLowerCase()}">${b.status}</span>
          </div>
          <div>
            <div class="font-bold text-white text-sm">${b.clientName}</div>
            <div class="text-xs text-brand-muted">${b.email} • ${b.phone}</div>
          </div>
          <div class="p-2.5 rounded-lg bg-brand-surface border border-white/5 text-xs">
            <div class="text-brand-softWhite font-semibold">${b.goal}</div>
            <div class="text-brand-muted mt-0.5">${formatDate(b.date)} at <strong class="text-brand-lime">${b.time}</strong></div>
          </div>
          <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
            <button type="button" onclick="window.openBookingDetailsModal('${b.id}')" class="text-xs text-brand-muted hover:text-white">View Details</button>
            <div class="flex items-center gap-2">
              ${b.status === 'Pending' ? `
                <button type="button" onclick="window.confirmBookingAction('${b.id}')" class="px-3 py-1.5 rounded-lg bg-brand-lime text-brand-black text-xs font-extrabold uppercase">Confirm</button>
                <button type="button" onclick="window.openRescheduleModal('${b.id}')" class="px-2 py-1.5 rounded-lg bg-brand-surface border border-white/10 text-xs text-brand-muted">Reschedule</button>
                <button type="button" onclick="window.openRejectConfirmModal('${b.id}')" class="px-2 py-1.5 rounded-lg bg-red-950/40 text-xs text-red-400">Decline</button>
              ` : `
                <button type="button" onclick="window.openRescheduleModal('${b.id}')" class="px-2 py-1 text-xs text-brand-muted border border-white/10 rounded">Reschedule</button>
              `}
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // =========================================================================
  // Phase 8: Upcoming Consultations View
  // =========================================================================
  function renderConsultations() {
    let consultations = window.TrainerStore.getBookings().filter(b => b.status === 'Confirmed');

    // Filter by search query
    if (consultationsSearchTerm) {
      const q = consultationsSearchTerm.toLowerCase();
      consultations = consultations.filter(c => 
        c.clientName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.goal.toLowerCase().includes(q)
      );
    }

    const container = document.getElementById('consultations-cards-container');
    const badge = document.getElementById('consultations-count-badge');
    if (badge) badge.textContent = `${consultations.length} Confirmed`;

    if (!container) return;

    if (consultations.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-brand-muted dashboard-card p-8">
          <svg class="w-16 h-16 mx-auto text-brand-border mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke-width="1.5"></path></svg>
          <h3 class="text-base font-bold text-white uppercase tracking-tight">No Upcoming Consultations</h3>
          <p class="text-xs text-brand-muted mt-1 max-w-sm mx-auto">Pending consultation requests will appear here once you review and confirm them.</p>
          <button type="button" onclick="window.location.hash = 'bookings'" class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-lime text-brand-black text-xs font-bold uppercase tracking-wider">
            Review Booking Requests
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = consultations.map(c => `
      <div class="dashboard-card p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/30 text-[11px] font-bold font-mono">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-lime animate-pulse"></span>
              ${formatDate(c.date)} • ${c.time}
            </span>
            <div class="flex items-center gap-2">
              ${c.isDemo ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">DEMO</span>` : `<span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-brand-lime/15 text-brand-lime border border-brand-lime/30 uppercase tracking-wider">LIVE</span>`}
              <span class="badge-status badge-confirmed">Confirmed</span>
            </div>
          </div>

          <h3 class="font-display font-bold text-lg text-white">${c.clientName}</h3>
          <div class="text-xs text-brand-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
            <span>${c.email}</span>
            <span>•</span>
            <span>${c.phone}</span>
          </div>

          <div class="mt-4 p-3 rounded-xl bg-brand-surface border border-white/5 space-y-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider text-brand-muted">Target Objective</div>
            <div class="text-xs font-semibold text-brand-softWhite">${c.goal}</div>
            <div class="text-[11px] text-brand-muted">${c.notes || 'No custom notes provided.'}</div>
          </div>
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <a href="https://meet.google.com/new" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-lime text-brand-black font-extrabold text-xs uppercase tracking-wider hover:bg-brand-limeHover transition-colors shadow-glow-lime-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke-width="2"></path></svg>
            <span>Launch Video Call</span>
          </a>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.openRescheduleModal('${c.id}')" class="px-3 py-2 rounded-full bg-brand-surface border border-white/10 text-brand-softWhite text-xs font-semibold hover:border-brand-lime/40 transition-colors">
              Reschedule
            </button>
            <button type="button" onclick="window.openCancelConsultationModal('${c.id}')" class="p-2 rounded-full bg-red-950/40 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors" title="Cancel Consultation">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // Phase 9: Client Leads Pipeline
  // =========================================================================
  function renderLeads() {
    let leads = window.TrainerStore.getLeads();

    // Filter by status tab
    if (activeLeadsFilter !== 'all') {
      leads = leads.filter(l => l.status.toLowerCase() === activeLeadsFilter.toLowerCase());
    }

    // Filter by search term
    if (leadsSearchTerm) {
      const q = leadsSearchTerm.toLowerCase();
      leads = leads.filter(l => 
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.goal.toLowerCase().includes(q)
      );
    }

    const tbody = document.getElementById('leads-table-body');
    const badge = document.getElementById('leads-count-badge');
    if (badge) badge.textContent = `${leads.length} Leads`;

    if (!tbody) return;

    if (leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-brand-muted text-xs">No client leads match this filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = leads.map(l => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <td class="py-3.5 px-4 font-mono text-xs text-brand-lime">
          ${l.id}
          <div class="mt-0.5">
            ${l.isDemo ? `<span class="inline-block px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">DEMO</span>` : `<span class="inline-block px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-brand-lime/15 text-brand-lime border border-brand-lime/30 uppercase tracking-wider">NEW</span>`}
          </div>
        </td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-white text-xs sm:text-sm">${l.name}</div>
          <div class="text-[11px] text-brand-muted">${l.email}</div>
        </td>
        <td class="py-3.5 px-4 text-xs text-brand-muted font-mono">${l.phone}</td>
        <td class="py-3.5 px-4">
          <div class="text-xs font-semibold text-brand-softWhite">${l.goal}</div>
          <div class="text-[11px] text-brand-muted">${l.experience}</div>
        </td>
        <td class="py-3.5 px-4 text-xs text-brand-muted font-mono whitespace-nowrap">${formatDate(l.enquiryDate)}</td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <select onchange="window.updateLeadStatusAction('${l.id}', this.value)" class="text-xs bg-brand-surface border border-brand-border rounded-lg px-2.5 py-1 text-brand-softWhite focus:border-brand-lime focus:outline-none">
            <option value="New" ${l.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${l.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Interested" ${l.status === 'Interested' ? 'selected' : ''}>Interested</option>
            <option value="Converted" ${l.status === 'Converted' ? 'selected' : ''}>Converted</option>
            <option value="Not Interested" ${l.status === 'Not Interested' ? 'selected' : ''}>Not Interested</option>
          </select>
        </td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <button type="button" onclick="window.openLeadDetailsModal('${l.id}')" class="text-xs text-brand-lime hover:underline font-semibold">View History</button>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // Phase 10: Availability Management
  // =========================================================================
  function renderAvailability() {
    const avail = window.TrainerStore.getAvailability();

    // Populate weekly days list
    const weeklyContainer = document.getElementById('availability-weekly-container');
    if (weeklyContainer) {
      const days = [
        { key: 'monday', label: 'Monday' },
        { key: 'tuesday', label: 'Tuesday' },
        { key: 'wednesday', label: 'Wednesday' },
        { key: 'thursday', label: 'Thursday' },
        { key: 'friday', label: 'Friday' },
        { key: 'saturday', label: 'Saturday' },
        { key: 'sunday', label: 'Sunday' }
      ];

      weeklyContainer.innerHTML = days.map(d => {
        const conf = avail.weekly[d.key] || { enabled: false, slots: [] };
        return `
          <div class="p-4 rounded-xl bg-brand-surface border ${conf.enabled ? 'border-brand-lime/20' : 'border-white/5 opacity-60'} transition-all">
            <div class="flex items-center justify-between mb-3">
              <label class="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" data-day="${d.key}" ${conf.enabled ? 'checked' : ''} onchange="window.toggleDayAvailability('${d.key}', this.checked)" class="rounded bg-brand-black border-brand-border text-brand-lime focus:ring-brand-lime h-4 w-4">
                <span class="font-bold text-sm text-white">${d.label}</span>
              </label>
              <span class="text-xs font-semibold ${conf.enabled ? 'text-brand-lime' : 'text-brand-muted'}">
                ${conf.enabled ? `${conf.slots.length} time blocks` : 'Unavailable'}
              </span>
            </div>

            ${conf.enabled ? `
              <div class="space-y-2">
                ${conf.slots.map((slot, sIdx) => `
                  <div class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-brand-black/60 border border-white/5 text-xs font-mono">
                    <span class="text-brand-softWhite">${slot}</span>
                    <button type="button" onclick="window.removeTimeSlot('${d.key}', ${sIdx})" class="text-brand-muted hover:text-red-400 p-0.5" title="Remove Slot">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"></path></svg>
                    </button>
                  </div>
                `).join('')}
                <button type="button" onclick="window.openAddTimeBlockModal('${d.key}')" class="w-full mt-2 py-1.5 text-center text-xs font-semibold text-brand-lime border border-brand-lime/20 rounded-lg hover:bg-brand-lime/10 transition-colors">
                  + Add Time Block
                </button>
              </div>
            ` : `
              <div class="text-xs text-brand-muted italic py-1">Consultation booking disabled on this day.</div>
            `}
          </div>
        `;
      }).join('');
    }

    // Specific Date Overrides
    const overridesContainer = document.getElementById('availability-overrides-container');
    if (overridesContainer) {
      if (!avail.dateOverrides || avail.dateOverrides.length === 0) {
        overridesContainer.innerHTML = `<div class="text-xs text-brand-muted py-3">No specific holiday or vacation overrides set.</div>`;
      } else {
        overridesContainer.innerHTML = avail.dateOverrides.map((ov, oIdx) => `
          <div class="flex items-center justify-between p-3 rounded-xl bg-brand-surface border border-white/5 text-xs">
            <div>
              <div class="font-mono font-bold text-white">${formatDate(ov.date)}</div>
              <div class="text-[11px] text-brand-muted">${ov.reason}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="badge-status ${ov.available ? 'badge-confirmed' : 'badge-rejected'}">
                ${ov.available ? 'Special Hours' : 'Unavailable'}
              </span>
              <button type="button" onclick="window.removeDateOverride(${oIdx})" class="text-brand-muted hover:text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2"></path></svg>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    // Consultation Settings Inputs
    const durationInput = document.getElementById('avail-duration');
    const bufferInput = document.getElementById('avail-buffer');
    const timezoneInput = document.getElementById('avail-timezone');
    const maxPerDayInput = document.getElementById('avail-max-per-day');

    if (durationInput) durationInput.value = avail.defaultDuration || 45;
    if (bufferInput) bufferInput.value = avail.bufferTime || 15;
    if (timezoneInput) timezoneInput.value = avail.timezone || 'America/New_York (EST)';
    if (maxPerDayInput) maxPerDayInput.value = avail.maxPerDay || 6;
  }

  // =========================================================================
  // Phase 11: Trainer Settings
  // =========================================================================
  function renderSettings() {
    const settings = window.TrainerStore.getSettings();
    const profile = settings.profile || {};
    const notifs = settings.notifications || {};

    const nameInput = document.getElementById('settings-name');
    const emailInput = document.getElementById('settings-email');
    const phoneInput = document.getElementById('settings-phone');
    const businessInput = document.getElementById('settings-business');
    const bioInput = document.getElementById('settings-bio');

    if (nameInput) nameInput.value = profile.name || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (phoneInput) phoneInput.value = profile.phone || '';
    if (businessInput) businessInput.value = profile.businessName || '';
    if (bioInput) bioInput.value = profile.bio || '';

    // Notification Toggles
    const toggleNew = document.getElementById('notif-toggle-new');
    const toggleConfirm = document.getElementById('notif-toggle-confirm');
    const toggleCancel = document.getElementById('notif-toggle-cancel');
    const toggleWeekly = document.getElementById('notif-toggle-weekly');

    if (toggleNew) toggleNew.checked = !!notifs.emailNewBookings;
    if (toggleConfirm) toggleConfirm.checked = !!notifs.emailConfirmations;
    if (toggleCancel) toggleCancel.checked = !!notifs.emailCancellations;
    if (toggleWeekly) toggleWeekly.checked = !!notifs.weeklySummary;
  }

  // =========================================================================
  // Phase 12: Notification Center
  // =========================================================================
  function updateNotificationsBadge() {
    const notifs = window.TrainerStore.getNotifications();
    const unreadCount = notifs.filter(n => !n.isRead).length;

    const badge = document.getElementById('header-notif-badge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Populate dropdown list
    const list = document.getElementById('notifications-dropdown-list');
    if (list) {
      if (notifs.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-brand-muted text-xs">No notifications.</div>`;
      } else {
        list.innerHTML = notifs.map(n => `
          <div onclick="window.notificationItemClick('${n.id}', '${n.relatedId}')" class="p-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer flex items-start gap-2.5 ${n.isRead ? 'opacity-65' : ''}">
            <span class="w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-brand-lime'}"></span>
            <div class="flex-grow">
              <div class="text-xs font-bold text-white flex items-center justify-between">
                <span>${n.title}</span>
                <span class="text-[10px] text-brand-muted font-mono">${n.timestamp}</span>
              </div>
              <div class="text-[11px] text-brand-muted leading-tight mt-0.5">${n.message}</div>
            </div>
          </div>
        `).join('');
      }
    }
  }
  window.updateNotificationsBadge = updateNotificationsBadge;

  window.markAllNotificationsReadAction = function () {
    window.TrainerStore.markAllNotificationsAsRead();
    updateNotificationsBadge();
    showToast('All notifications marked as read.');
  };

  // =========================================================================
  // Global Interactive Actions
  // =========================================================================
  window.confirmBookingAction = async function (id) {
    try {
      const updated = await window.TrainerStore.updateBookingStatus(id, 'Confirmed');
      if (updated) {
        showToast(`Booking ${id} for ${updated.clientName} confirmed successfully!`);
        await window.TrainerStore.loadBookingsAsync();
        renderCurrentView();
      }
    } catch (err) {
      showToast(err.message || 'Failed to confirm booking.', 'error');
    }
  };

  // Reject Booking Confirmation Modal
  let pendingRejectId = null;
  window.openRejectConfirmModal = function (id) {
    pendingRejectId = id;
    const modal = document.getElementById('reject-confirm-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.confirmRejectAction = async function () {
    if (pendingRejectId) {
      try {
        const updated = await window.TrainerStore.updateBookingStatus(pendingRejectId, 'Rejected');
        if (updated) {
          showToast(`Booking ${pendingRejectId} has been declined.`, 'error');
          await window.TrainerStore.loadBookingsAsync();
          renderCurrentView();
        }
      } catch (err) {
        showToast(err.message || 'Failed to decline booking.', 'error');
      }
      pendingRejectId = null;
    }
    const modal = document.getElementById('reject-confirm-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  // Cancel Consultation Confirmation Modal
  let pendingCancelId = null;
  window.openCancelConsultationModal = function (id) {
    pendingCancelId = id;
    const modal = document.getElementById('cancel-consultation-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.confirmCancelConsultationAction = async function () {
    if (pendingCancelId) {
      try {
        const updated = await window.TrainerStore.updateBookingStatus(pendingCancelId, 'Cancelled');
        if (updated) {
          showToast(`Consultation ${pendingCancelId} cancelled.`, 'error');
          await window.TrainerStore.loadBookingsAsync();
          renderCurrentView();
        }
      } catch (err) {
        showToast(err.message || 'Failed to cancel consultation.', 'error');
      }
      pendingCancelId = null;
    }
    const modal = document.getElementById('cancel-consultation-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  // Reschedule Modal with Dynamic Slot Availability
  let pendingRescheduleId = null;
  window.openRescheduleModal = function (id) {
    pendingRescheduleId = id;
    const booking = window.TrainerStore.getBookings().find(b => b.id === id);
    if (!booking) return;

    const modal = document.getElementById('reschedule-modal');
    const clientNameEl = document.getElementById('reschedule-client-name');
    const dateInput = document.getElementById('reschedule-date-input');
    const timeSelect = document.getElementById('reschedule-time-select');

    if (clientNameEl) clientNameEl.textContent = `${booking.clientName} (${booking.id})`;

    function updateRescheduleSlots(selectedDate) {
      if (!timeSelect) return;
      timeSelect.innerHTML = '';

      if (!selectedDate) {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">Select a date first</option>';
        return;
      }

      const availableSlots = window.TrainerStore.generateAvailableSlots(selectedDate);
      // If same date as current booking, retain original time in choices
      if (booking.date === selectedDate && !availableSlots.includes(booking.time)) {
        availableSlots.unshift(booking.time);
      }

      if (availableSlots && availableSlots.length > 0) {
        timeSelect.disabled = false;
        availableSlots.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = `${s} EST`;
          if (s === booking.time) opt.selected = true;
          timeSelect.appendChild(opt);
        });
      } else {
        timeSelect.disabled = true;
        timeSelect.innerHTML = '<option value="">No available slots on this date</option>';
      }
    }

    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pad = n => (n < 10 ? '0' + n : '' + n);
      dateInput.min = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
      dateInput.value = booking.date;

      dateInput.onchange = () => {
        updateRescheduleSlots(dateInput.value);
      };

      updateRescheduleSlots(dateInput.value);
    }

    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.submitRescheduleAction = async function () {
    if (!pendingRescheduleId) return;

    const dateInput = document.getElementById('reschedule-date-input');
    const timeSelect = document.getElementById('reschedule-time-select');

    if (!dateInput.value || !timeSelect.value) {
      showToast('Please select a valid date and available time slot.', 'error');
      return;
    }

    try {
      const updated = await window.TrainerStore.updateBookingStatus(pendingRescheduleId, 'Confirmed', {
        date: dateInput.value,
        time: timeSelect.value
      });

      if (updated) {
        showToast(`Booking ${pendingRescheduleId} rescheduled to ${formatDate(updated.date)} at ${updated.time}.`);
        await window.TrainerStore.loadBookingsAsync();
        renderCurrentView();
      }
    } catch (err) {
      showToast(err.message || 'Failed to reschedule booking.', 'error');
    }

    const modal = document.getElementById('reschedule-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    pendingRescheduleId = null;
  };

  // Global Search Handlers
  window.handleBookingsSearch = function (val) {
    bookingsSearchTerm = (val || '').trim();
    renderBookings();
  };

  window.handleLeadsSearch = function (val) {
    leadsSearchTerm = (val || '').trim();
    renderLeads();
  };

  window.handleConsultationsSearch = function (val) {
    consultationsSearchTerm = (val || '').trim();
    renderConsultations();
  };

  window.toggleNotificationsDropdown = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const notifDropdown = document.getElementById('notifications-dropdown');
    if (notifDropdown) notifDropdown.classList.toggle('open');
  };

  // Booking Details Modal
  window.openBookingDetailsModal = function (id) {
    const booking = window.TrainerStore.getBookings().find(b => b.id === id);
    if (!booking) return;

    const modal = document.getElementById('booking-details-modal');
    const content = document.getElementById('booking-details-content');

    if (content) {
      content.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span class="font-mono text-brand-lime font-bold">${booking.id}</span>
              <h4 class="font-display font-bold text-lg text-white">${booking.clientName}</h4>
            </div>
            <span class="badge-status badge-${booking.status.toLowerCase()}">${booking.status}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-brand-surface border border-white/5">
              <span class="text-brand-muted block text-[11px] uppercase font-bold">Email Address</span>
              <a href="mailto:${booking.email}" class="text-brand-softWhite hover:text-brand-lime font-semibold break-all">${booking.email}</a>
            </div>
            <div class="p-3 rounded-xl bg-brand-surface border border-white/5">
              <span class="text-brand-muted block text-[11px] uppercase font-bold">Phone Number</span>
              <a href="tel:${booking.phone}" class="text-brand-softWhite font-mono font-semibold">${booking.phone}</a>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-brand-surface border border-white/5 space-y-1">
            <span class="text-brand-muted block text-[11px] uppercase font-bold">Scheduled Consultation</span>
            <div class="text-sm font-semibold text-white">
              ${formatDate(booking.date)} at <span class="text-brand-lime font-mono">${booking.time}</span>
            </div>
            <div class="text-[11px] text-brand-muted">Program Interest: <strong class="text-brand-softWhite">${booking.programInterest || 'General Assessment'}</strong></div>
          </div>

          <div class="p-3 rounded-xl bg-brand-surface border border-white/5 space-y-1">
            <span class="text-brand-muted block text-[11px] uppercase font-bold">Experience & Biomechanical Notes</span>
            <div class="text-brand-softWhite font-medium leading-relaxed">${booking.notes || 'No specific limitations noted.'}</div>
            <div class="text-[11px] text-brand-muted pt-1">Self-reported experience: <span class="text-brand-lime">${booking.experience}</span></div>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            ${booking.status === 'Pending' ? `
              <button type="button" onclick="window.confirmBookingAction('${booking.id}'); document.getElementById('booking-details-modal').classList.remove('active');" class="px-4 py-2 rounded-full bg-brand-lime text-brand-black font-extrabold text-xs uppercase tracking-wider">
                Confirm This Booking
              </button>
            ` : ''}
            <button type="button" onclick="document.getElementById('booking-details-modal').classList.remove('active')" class="px-4 py-2 rounded-full bg-brand-surface border border-white/10 text-white text-xs font-semibold">
              Close Details
            </button>
          </div>
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  // Lead Details Modal
  window.openLeadDetailsModal = function (id) {
    const lead = window.TrainerStore.getLeads().find(l => l.id === id);
    if (!lead) return;

    const modal = document.getElementById('lead-details-modal');
    const content = document.getElementById('lead-details-content');

    if (content) {
      content.innerHTML = `
        <div class="space-y-4 text-xs">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <span class="font-mono text-brand-lime font-bold">${lead.id}</span>
              <h4 class="font-display font-bold text-lg text-white">${lead.name}</h4>
            </div>
            <span class="badge-status badge-${lead.status.toLowerCase().replace(' ', '-')}">${lead.status}</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="p-3 rounded-xl bg-brand-surface border border-white/5">
              <span class="text-brand-muted block text-[11px] uppercase font-bold">Contact Email</span>
              <a href="mailto:${lead.email}" class="text-brand-softWhite hover:text-brand-lime font-semibold break-all">${lead.email}</a>
            </div>
            <div class="p-3 rounded-xl bg-brand-surface border border-white/5">
              <span class="text-brand-muted block text-[11px] uppercase font-bold">Phone</span>
              <a href="tel:${lead.phone}" class="text-brand-softWhite font-mono font-semibold">${lead.phone}</a>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-brand-surface border border-white/5 space-y-1">
            <span class="text-brand-muted block text-[11px] uppercase font-bold">Client Fitness Profile</span>
            <div class="text-xs font-semibold text-brand-softWhite">Goal: ${lead.goal}</div>
            <div class="text-[11px] text-brand-muted">Experience Level: <strong class="text-brand-lime">${lead.experience}</strong></div>
            <div class="text-[11px] text-brand-muted">First Submitted: ${formatDate(lead.enquiryDate)}</div>
          </div>

          <div class="p-3 rounded-xl bg-brand-surface border border-white/5 space-y-1">
            <span class="text-brand-muted block text-[11px] uppercase font-bold">Coach Private Log & Notes</span>
            <p class="text-brand-softWhite leading-relaxed">${lead.notes || 'No notes added yet.'}</p>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <a href="mailto:${lead.email}?subject=FORGE FITNESS Consultation Follow-Up" class="px-4 py-2 rounded-full bg-brand-lime text-brand-black font-extrabold text-xs uppercase tracking-wider">
              Send Email Follow-Up
            </a>
            <button type="button" onclick="document.getElementById('lead-details-modal').classList.remove('active')" class="px-4 py-2 rounded-full bg-brand-surface border border-white/10 text-white text-xs font-semibold">
              Close
            </button>
          </div>
        </div>
      `;
    }

    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  // Lead status inline update
  window.updateLeadStatusAction = async function (id, newStatus) {
    try {
      const updated = await window.TrainerStore.updateLeadStatus(id, newStatus);
      if (updated) {
        showToast(`Lead status updated to "${newStatus}".`);
        await window.TrainerStore.loadLeadsAsync();
        renderCurrentView();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update lead status.', 'error');
    }
  };

  // Availability Management Actions
  window.toggleDayAvailability = function (dayKey, isChecked) {
    const avail = window.TrainerStore.getAvailability();
    if (avail.weekly && avail.weekly[dayKey]) {
      avail.weekly[dayKey].enabled = isChecked;
      if (isChecked && (!avail.weekly[dayKey].slots || avail.weekly[dayKey].slots.length === 0)) {
        avail.weekly[dayKey].slots = ['09:00 - 12:00', '14:00 - 17:00'];
      }
      window.TrainerStore.saveAvailability(avail);
      showToast(`${capitalize(dayKey)} set to ${isChecked ? 'Available' : 'Unavailable'}.`);
      renderAvailability();
    }
  };

  window.removeTimeSlot = function (dayKey, slotIdx) {
    const avail = window.TrainerStore.getAvailability();
    if (avail.weekly && avail.weekly[dayKey] && avail.weekly[dayKey].slots) {
      avail.weekly[dayKey].slots.splice(slotIdx, 1);
      window.TrainerStore.saveAvailability(avail);
      showToast(`Time slot removed from ${capitalize(dayKey)}.`);
      renderAvailability();
    }
  };

  window.openAddTimeBlockModal = function (dayKey) {
    const modal = document.getElementById('add-timeblock-modal');
    const dayKeyInput = document.getElementById('timeblock-day-key');
    const dayNameEl = document.getElementById('timeblock-day-name');
    if (dayKeyInput) dayKeyInput.value = dayKey;
    if (dayNameEl) dayNameEl.textContent = capitalize(dayKey);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.openAddLeadModal = function () {
    const modal = document.getElementById('add-lead-modal');
    const form = document.getElementById('add-lead-form');
    if (form) form.reset();
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.promptAddTimeSlot = function (dayKey) {
    window.openAddTimeBlockModal(dayKey);
  };

  window.removeDateOverride = function (idx) {
    const avail = window.TrainerStore.getAvailability();
    if (avail.dateOverrides) {
      avail.dateOverrides.splice(idx, 1);
      window.TrainerStore.saveAvailability(avail);
      showToast('Date override removed.');
      renderAvailability();
    }
  };

  window.saveAvailabilitySettingsAction = function () {
    const avail = window.TrainerStore.getAvailability();
    avail.defaultDuration = parseInt(document.getElementById('avail-duration').value, 10) || 45;
    avail.bufferTime = parseInt(document.getElementById('avail-buffer').value, 10) || 15;
    avail.timezone = document.getElementById('avail-timezone').value || 'America/New_York (EST)';
    avail.maxPerDay = parseInt(document.getElementById('avail-max-per-day').value, 10) || 6;
    window.TrainerStore.saveAvailability(avail);
    showToast('Consultation availability preferences saved successfully!');
  };

  window.saveSettingsAction = function (e) {
    if (e) e.preventDefault();
    const settings = window.TrainerStore.getSettings();

    settings.profile = {
      name: document.getElementById('settings-name').value.trim() || 'Coach Haisam',
      email: document.getElementById('settings-email').value.trim() || 'coach.haisam@forgefitness.com',
      phone: document.getElementById('settings-phone').value.trim() || '+1 (555) 839-2041',
      businessName: document.getElementById('settings-business').value.trim() || 'FORGE FITNESS',
      bio: document.getElementById('settings-bio').value.trim(),
      avatar: '../assets/images/coach-haisam.jpg'
    };

    settings.notifications = {
      emailNewBookings: document.getElementById('notif-toggle-new').checked,
      emailConfirmations: document.getElementById('notif-toggle-confirm').checked,
      emailCancellations: document.getElementById('notif-toggle-cancel').checked,
      weeklySummary: document.getElementById('notif-toggle-weekly').checked
    };

    window.TrainerStore.saveSettings(settings);

    // Update trainer auth object
    const auth = window.TrainerStore.getAuth();
    auth.trainer = settings.profile;
    window.TrainerStore.setAuth(auth);

    // Update header name display
    const headerName = document.getElementById('header-trainer-name');
    if (headerName) headerName.textContent = settings.profile.name;

    showToast('Trainer profile and notification preferences updated!');
  };

  // Notification Item Click
  window.notificationItemClick = function (notifId, relatedId) {
    window.TrainerStore.markNotificationAsRead(notifId);
    updateNotificationsBadge();
    document.getElementById('notifications-dropdown').classList.remove('open');

    if (relatedId && relatedId.startsWith('BK-')) {
      window.location.hash = 'bookings';
      setTimeout(() => {
        window.openBookingDetailsModal(relatedId);
      }, 200);
    }
  };

  // Date Formatting Helper
  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  // Cloud Sync Handler
  async function syncDashboardWithCloud() {
    try {
      if (window.TrainerStore) {
        await Promise.allSettled([
          typeof window.TrainerStore.loadBookingsAsync === 'function' ? window.TrainerStore.loadBookingsAsync() : null,
          typeof window.TrainerStore.loadLeadsAsync === 'function' ? window.TrainerStore.loadLeadsAsync() : null,
          typeof window.TrainerStore.loadNotificationsAsync === 'function' ? window.TrainerStore.loadNotificationsAsync() : null,
          typeof window.TrainerStore.loadActivityAsync === 'function' ? window.TrainerStore.loadActivityAsync() : null,
          typeof window.TrainerStore.loadAvailabilityAsync === 'function' ? window.TrainerStore.loadAvailabilityAsync() : null
        ]);
        renderCurrentView();
      }
    } catch (err) {
      console.warn('[FORGE Dashboard] Background cloud sync warning:', err);
    }
  }

  // Dashboard Initialization Runner
  async function initDashboard() {
    // Route guard check before rendering any private data
    if (window.TrainerAuth && typeof window.TrainerAuth.requireAuth === 'function') {
      const allowed = await window.TrainerAuth.requireAuth();
      if (!allowed) return;
    }

    // Fill current user profile in header
    const currentTrainer = window.TrainerAuth.getTrainer() || { name: 'Coach Haisam' };
    const headerName = document.getElementById('header-trainer-name');
    const headerRole = document.getElementById('header-trainer-role');
    if (headerName) headerName.textContent = currentTrainer.name;
    if (headerRole) headerRole.textContent = currentTrainer.title || 'Head Coach';

    // Initialize Router
    initRouter();

    // Sync live cloud data from Supabase in background
    syncDashboardWithCloud();

    // Initialize Mobile Sidebar
    initMobileSidebar();

    // Initialize Notification Dropdown outside-click closer
    const notifDropdown = document.getElementById('notifications-dropdown');
    const notifBtn = document.getElementById('notifications-btn');

    document.addEventListener('click', (e) => {
      if (notifDropdown && notifBtn && !notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.remove('open');
      }
    });

    if (markAllReadBtn) {
      markAllReadBtn.addEventListener('click', () => {
        window.TrainerStore.markAllNotificationsAsRead();
        updateNotificationsBadge();
        showToast('All notifications marked as read.');
      });
    }

    // Bookings Search & Filter Listeners
    const bookingsSearchInput = document.getElementById('bookings-search-input');
    if (bookingsSearchInput) {
      bookingsSearchInput.addEventListener('input', (e) => {
        window.handleBookingsSearch(e.target.value);
      });
    }

    document.querySelectorAll('[data-bookings-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-bookings-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeBookingsFilter = btn.getAttribute('data-bookings-filter');
        renderBookings();
      });
    });

    const bookingsDateFilter = document.getElementById('bookings-date-filter');
    if (bookingsDateFilter) {
      bookingsDateFilter.addEventListener('change', () => {
        renderBookings();
      });
    }

    const clearBookingsFilterBtn = document.getElementById('bookings-clear-filter');
    if (clearBookingsFilterBtn) {
      clearBookingsFilterBtn.addEventListener('click', () => {
        if (bookingsSearchInput) bookingsSearchInput.value = '';
        if (bookingsDateFilter) bookingsDateFilter.value = '';
        bookingsSearchTerm = '';
        activeBookingsFilter = 'all';
        document.querySelectorAll('[data-bookings-filter]').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-bookings-filter') === 'all');
        });
        renderBookings();
      });
    }

    // Leads Search & Filter Listeners
    const leadsSearchInput = document.getElementById('leads-search-input');
    if (leadsSearchInput) {
      leadsSearchInput.addEventListener('input', (e) => {
        window.handleLeadsSearch(e.target.value);
      });
    }

    document.querySelectorAll('[data-leads-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-leads-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLeadsFilter = btn.getAttribute('data-leads-filter');
        renderLeads();
      });
    });

    // Consultations Search Listener
    const consultSearchInput = document.getElementById('consultations-search-input');
    if (consultSearchInput) {
      consultSearchInput.addEventListener('input', (e) => {
        window.handleConsultationsSearch(e.target.value);
      });
    }

    // Settings Form submit
    const settingsForm = document.getElementById('trainer-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', window.saveSettingsAction);
    }

    // Availability Settings Form submit
    const availForm = document.getElementById('trainer-availability-form');
    if (availForm) {
      availForm.addEventListener('submit', (e) => {
        e.preventDefault();
        window.saveAvailabilitySettingsAction();
      });
    }

    // Add Date Override Form
    const overrideForm = document.getElementById('add-override-form');
    if (overrideForm) {
      overrideForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('override-date').value;
        const reason = document.getElementById('override-reason').value.trim() || 'Unavailable';
        const isAvail = document.getElementById('override-available').value === 'true';

        if (!date) return;

        const avail = window.TrainerStore.getAvailability();
        if (!avail.dateOverrides) avail.dateOverrides = [];
        avail.dateOverrides.push({ date, reason, available: isAvail });
        window.TrainerStore.saveAvailability(avail);

        showToast(`Specific date override added for ${formatDate(date)}.`);
        overrideForm.reset();
        renderAvailability();
      });
    }

    // Add Time Block Form
    const timeblockForm = document.getElementById('add-timeblock-form');
    if (timeblockForm) {
      timeblockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dayKey = document.getElementById('timeblock-day-key').value;
        const start = document.getElementById('timeblock-start').value;
        const end = document.getElementById('timeblock-end').value;

        if (!dayKey || !start || !end) return;

        if (start >= end) {
          showToast('End time must be later than start time.', 'error');
          return;
        }

        const blockStr = `${start} - ${end}`;
        const avail = window.TrainerStore.getAvailability();
        if (!avail.weekly[dayKey]) avail.weekly[dayKey] = { enabled: true, slots: [] };
        if (!avail.weekly[dayKey].slots) avail.weekly[dayKey].slots = [];
        avail.weekly[dayKey].slots.push(blockStr);
        window.TrainerStore.saveAvailability(avail);

        showToast(`Added ${blockStr} to ${capitalize(dayKey)}.`);
        renderAvailability();

        const modal = document.getElementById('add-timeblock-modal');
        if (modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // Add Lead Form
    const addLeadForm = document.getElementById('add-lead-form');
    if (addLeadForm) {
      addLeadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('add-lead-name').value.trim();
        const email = document.getElementById('add-lead-email').value.trim();
        const phone = document.getElementById('add-lead-phone').value.trim();
        const goal = document.getElementById('add-lead-goal').value;
        const experience = document.getElementById('add-lead-exp').value;
        const notes = document.getElementById('add-lead-notes').value.trim();

        if (!name || !email || !phone) {
          showToast('Please fill all required lead fields.', 'error');
          return;
        }

        try {
          const newLead = await window.TrainerStore.addLead({
            name,
            email,
            phone,
            goal,
            experience,
            notes: notes || 'Manually logged by Coach.',
            isDemo: false
          });

          showToast(`Athlete lead ${newLead.name} (${newLead.id}) created!`);
          await window.TrainerStore.loadLeadsAsync();
          renderLeads();

          const modal = document.getElementById('add-lead-modal');
          if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
          }
        } catch (err) {
          showToast(err.message || 'Failed to save athlete lead.', 'error');
        }
      });
    }

    // Close Modals on backdrop click or close buttons
    document.querySelectorAll('.portal-modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    });

    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.portal-modal-backdrop');
        if (modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    });

    // Escape Key Listener to dismiss all open modals (Phase 9D)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.portal-modal-backdrop.active').forEach(modal => {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        });
        const notifDropdown = document.getElementById('notifications-dropdown');
        if (notifDropdown) notifDropdown.classList.remove('open');
      }
    });

    // Logout Handlers
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of the Trainer Portal?')) {
          try {
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';
            await window.TrainerAuth.logout();
          } catch (err) {
            console.error('[FORGE Dashboard] Logout failed:', err);
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            showToast('Failed to log out cleanly: ' + (err.message || 'Unknown error'), 'error');
          }
        }
      });
    });
  }

  // Run initialization regardless of whether DOMContentLoaded has already passed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

})();
