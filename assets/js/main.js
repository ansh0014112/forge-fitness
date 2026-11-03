/**
 * FORGE FITNESS — Frontend Interactive Script
 * Phase 1: Pure Frontend Implementation
 * 
 * Modular components:
 * 1. Navigation & ScrollSpy
 * 2. Mobile Menu Controller
 * 3. Particle Dust Canvas (Hero Background)
 * 4. Ambient Cursor Follower Glow
 * 5. Scroll-Reveal Observer
 * 6. Animated Statistics Counters
 * 7. Testimonial Carousel / Tab Switcher
 * 8. Program Selection & Form Pre-filler
 * 9. Consultation Form Validation & Demo Submission Service
 * 10. Legal & Modal Dialog Handlers
 * 11. Back to Top Handlers
 */

(function () {
  'use strict';

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     1. Navigation & ScrollSpy
     ========================================================================== */
  function initNavigation() {
    const mainHeader = document.getElementById('main-header');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id], header[id]');

    function handleScroll() {
      const scrollY = window.scrollY;

      // Header background elevation
      if (mainHeader) {
        if (scrollY > 30) {
          mainHeader.classList.add('nav-scrolled');
        } else {
          mainHeader.classList.remove('nav-scrolled');
        }
      }

      // ScrollSpy: highlight active link
      const scrollPosition = scrollY + 120;
      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPosition >= top && scrollPosition < top + height) {
          navLinks.forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ==========================================================================
     2. Mobile Menu Controller
     ========================================================================== */
  function initMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileBtn || !mobileMenu) return;

    function openMenu() {
      mobileMenu.classList.remove('hidden');
      mobileBtn.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      mobileMenu.classList.add('hidden');
      mobileBtn.setAttribute('aria-expanded', 'false');
    }

    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mobileBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when a link inside mobile menu is clicked
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        closeMenu();
        mobileBtn.focus();
      }
    });
  }

  /* ==========================================================================
     3. Hero Particle Canvas (Energy Dust)
     ========================================================================== */
  function initHeroDustCanvas() {
    const dustCanvas = document.getElementById('hero-dust-canvas');
    if (!dustCanvas || prefersReducedMotion) return;

    const ctx = dustCanvas.getContext('2d');
    if (!ctx) return;

    let width = (dustCanvas.width = dustCanvas.parentElement ? dustCanvas.parentElement.offsetWidth : window.innerWidth);
    let height = (dustCanvas.height = dustCanvas.parentElement ? dustCanvas.parentElement.offsetHeight : 800);

    function onResize() {
      if (!dustCanvas.parentElement) return;
      width = dustCanvas.width = dustCanvas.parentElement.offsetWidth;
      height = dustCanvas.height = dustCanvas.parentElement.offsetHeight;
    }

    window.addEventListener('resize', onResize, { passive: true });

    const particleCount = window.innerWidth < 768 ? 16 : 32;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.6,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: -Math.random() * 0.45 - 0.15,
      opacity: Math.random() * 0.45 + 0.15,
    }));

    let animationFrameId;

    function renderDust() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(184, 255, 56, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(renderDust);
    }

    renderDust();
  }

  /* ==========================================================================
     4. Ambient Cursor Glow Follower
     ========================================================================== */
  function initCursorGlow() {
    const cursorGlow = document.getElementById('cursor-ambient-glow');
    if (!cursorGlow || prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) {
      if (cursorGlow) cursorGlow.style.display = 'none';
      return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let isMoving = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        isMoving = true;
        cursorGlow.style.opacity = '1';
      }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      cursorGlow.style.opacity = '0';
    });

    function animateCursor() {
      currentX += (mouseX - currentX) * 0.12;
      currentY += (mouseY - currentY) * 0.12;
      cursorGlow.style.left = `${currentX}px`;
      cursorGlow.style.top = `${currentY}px`;
      requestAnimationFrame(animateCursor);
    }

    requestAnimationFrame(animateCursor);
  }

  /* ==========================================================================
     5. Scroll-Reveal Observer
     ========================================================================== */
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  }

  /* ==========================================================================
     6. Animated Statistics Counters
     ========================================================================== */
  function initStatCounters() {
    const counters = document.querySelectorAll('.stat-counter');
    if (counters.length === 0) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      counters.forEach((counter) => {
        counter.textContent = counter.getAttribute('data-target') || counter.textContent;
      });
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = parseInt(entry.target.getAttribute('data-target'), 10);
            if (isNaN(target)) return;

            let current = 0;
            const duration = 1500;
            const stepTime = 25;
            const steps = duration / stepTime;
            const stepValue = Math.ceil(target / steps);

            const timer = setInterval(() => {
              current += stepValue;
              if (current >= target) {
                entry.target.textContent = target;
                clearInterval(timer);
              } else {
                entry.target.textContent = current;
              }
            }, stepTime);

            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  }

  /* ==========================================================================
     7. Testimonials Tab Switcher & Deduplication Handler
     ========================================================================== */
  function initTestimonials() {
    const testimonialData = [
      {
        quote: `"I've tried countless personal trainers and cookie-cutter apps, but nothing ever felt sustainable. With FORGE, everything clicked. I feel stronger, healthier, and more confident in my body than I have in 10 years."`,
        author: 'Emma R.',
        role: 'Executive & Marathon Athlete • 1-on-1 Coaching Client',
        initials: 'ER'
      },
      {
        quote: `"The weekly form reviews alone are worth every dollar. I resolved knee pain that had bothered me for 4 years on squats and added 30kg to my working sets in 4 months with Coach Haisam."`,
        author: 'Adam H.',
        role: 'Software Architect • Hypertrophy Protocol',
        initials: 'AH'
      },
      {
        quote: `"As someone who travels across timezones weekly, Coach Haisam built modular hotel-room & resistance band routines that kept my progress continuous. Unrivaled dedication and clarity."`,
        author: 'Marcus L.',
        role: 'Private Equity Partner • Executive Coaching',
        initials: 'ML'
      }
    ];

    const tabContainer = document.getElementById('testimonial-tabs');
    const quoteText = document.getElementById('featured-quote-text');
    const quoteAuthor = document.getElementById('featured-quote-author');
    const quoteRole = document.getElementById('featured-quote-role');
    const quoteAvatar = document.getElementById('featured-quote-avatar');
    const quoteContainer = document.getElementById('featured-quote-container');

    // Bottom cards
    const bottomQuote0 = document.getElementById('bottom-quote-0');
    const bottomAuthor0 = document.getElementById('bottom-author-0');
    const bottomRole0 = document.getElementById('bottom-role-0');
    const bottomAvatar0 = document.getElementById('bottom-avatar-0');

    const bottomQuote1 = document.getElementById('bottom-quote-1');
    const bottomAuthor1 = document.getElementById('bottom-author-1');
    const bottomRole1 = document.getElementById('bottom-role-1');
    const bottomAvatar1 = document.getElementById('bottom-avatar-1');

    if (!tabContainer || !quoteText) return;

    const tabs = tabContainer.querySelectorAll('button');

    function updateComplementaryCards(activeIndex) {
      const otherIndices = [0, 1, 2].filter(i => i !== activeIndex);
      if (otherIndices.length >= 2) {
        const first = testimonialData[otherIndices[0]];
        const second = testimonialData[otherIndices[1]];

        if (bottomQuote0 && first) bottomQuote0.textContent = first.quote;
        if (bottomAuthor0 && first) bottomAuthor0.textContent = first.author;
        if (bottomRole0 && first) bottomRole0.textContent = first.role;
        if (bottomAvatar0 && first) bottomAvatar0.textContent = first.initials;

        if (bottomQuote1 && second) bottomQuote1.textContent = second.quote;
        if (bottomAuthor1 && second) bottomAuthor1.textContent = second.author;
        if (bottomRole1 && second) bottomRole1.textContent = second.role;
        if (bottomAvatar1 && second) bottomAvatar1.textContent = second.initials;
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const index = parseInt(tab.getAttribute('data-index'), 10);
        const data = testimonialData[index];
        if (!data) return;

        // Update active tab styles & ARIA attributes
        tabs.forEach((t) => {
          t.classList.remove('bg-brand-lime', 'text-brand-black', 'shadow-glow-lime-sm');
          t.classList.add('bg-brand-surface', 'text-brand-muted', 'border', 'border-white/10');
          t.setAttribute('aria-selected', 'false');
        });

        tab.classList.add('bg-brand-lime', 'text-brand-black', 'shadow-glow-lime-sm');
        tab.classList.remove('bg-brand-surface', 'text-brand-muted', 'border', 'border-white/10');
        tab.setAttribute('aria-selected', 'true');

        // Smooth fade transition
        if (quoteContainer) {
          quoteContainer.style.opacity = '0';
          setTimeout(() => {
            quoteText.textContent = data.quote;
            if (quoteAuthor) quoteAuthor.textContent = data.author;
            if (quoteRole) quoteRole.textContent = data.role;
            if (quoteAvatar) quoteAvatar.textContent = data.initials;
            quoteContainer.style.opacity = '1';
          }, 180);
        }

        // Dynamically rotate bottom cards so no client quote is duplicated
        updateComplementaryCards(index);
      });
    });
  }

  /* ==========================================================================
     8. Program Selection & Form Pre-filler (Smooth Scroll Fix)
     ========================================================================== */
  function initProgramSelection() {
    const programButtons = document.querySelectorAll('[data-program-select]');
    const goalSelect = document.getElementById('primary-goal');
    const consultationSection = document.getElementById('consultation');

    if (!goalSelect) return;

    programButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // Prevent default anchor jump to avoid double-scroll / erratic jumping
        e.preventDefault();

        const targetGoal = btn.getAttribute('data-program-select');
        if (targetGoal) {
          goalSelect.value = targetGoal;
          
          // Flash animation to confirm selection
          goalSelect.classList.remove('highlight-selection');
          void goalSelect.offsetWidth; // trigger reflow
          goalSelect.classList.add('highlight-selection');

          // Smooth scroll to consultation
          if (consultationSection) {
            consultationSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  /* ==========================================================================
     9. Consultation Form Validation & Booking Submission Handler
     ========================================================================== */
  function initConsultationForm() {
    const intakeForm = document.getElementById('intake-form');
    const successModal = document.getElementById('form-success-message');
    const resetBtn = document.getElementById('reset-form-btn');
    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-btn-text');
    const submitArrow = document.getElementById('submit-btn-arrow');
    const submitSpinner = document.getElementById('submit-spinner');

    if (!intakeForm || !submitBtn) return;

    // Field references
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const goalSelect = document.getElementById('primary-goal');
    const dateInput = document.getElementById('consultation-date');
    const timeSelect = document.getElementById('consultation-time');
    const slotsStatusMsg = document.getElementById('slots-status-message');
    const notesInput = document.getElementById('notes');

    // Set min date to tomorrow
    if (dateInput) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const pad = n => (n < 10 ? '0' + n : '' + n);
      const minDateStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
      dateInput.min = minDateStr;
    }

    // Helper: populate available time slots for selected date
    async function updateAvailableSlots(selectedDate) {
      if (!timeSelect) return;

      timeSelect.innerHTML = '';

      if (!selectedDate) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select a date first...';
        timeSelect.appendChild(opt);
        timeSelect.disabled = true;
        if (slotsStatusMsg) slotsStatusMsg.classList.add('hidden');
        return;
      }

      // Show temporary loading indicator
      timeSelect.disabled = true;
      const loadingOpt = document.createElement('option');
      loadingOpt.value = '';
      loadingOpt.textContent = 'Checking real-time coach availability...';
      timeSelect.appendChild(loadingOpt);

      let availableSlots = [];
      try {
        if (window.TrainerStore && typeof window.TrainerStore.generateAvailableSlotsAsync === 'function') {
          availableSlots = await window.TrainerStore.generateAvailableSlotsAsync(selectedDate);
        } else if (window.TrainerStore && typeof window.TrainerStore.generateAvailableSlots === 'function') {
          availableSlots = window.TrainerStore.generateAvailableSlots(selectedDate);
        } else {
          availableSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
        }
      } catch (err) {
        console.warn('Could not query slots, using fallback schedule:', err);
        availableSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
      }

      timeSelect.innerHTML = '';

      if (availableSlots && availableSlots.length > 0) {
        timeSelect.disabled = false;
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Choose an available time slot...';
        timeSelect.appendChild(defaultOpt);

        availableSlots.forEach(slot => {
          const opt = document.createElement('option');
          opt.value = slot;
          opt.textContent = `${slot} (IST)`;
          timeSelect.appendChild(opt);
        });

        if (slotsStatusMsg) {
          slotsStatusMsg.classList.add('hidden');
          slotsStatusMsg.textContent = '';
        }
      } else {
        timeSelect.disabled = true;
        const noSlotOpt = document.createElement('option');
        noSlotOpt.value = '';
        noSlotOpt.textContent = 'No slots available on this date';
        timeSelect.appendChild(noSlotOpt);

        if (slotsStatusMsg) {
          slotsStatusMsg.textContent = 'No consultation openings on this date. Please pick another weekday.';
          slotsStatusMsg.classList.remove('hidden');
          slotsStatusMsg.className = 'text-[11px] text-amber-400 mt-1.5';
        }
      }
    }

    if (dateInput) {
      dateInput.addEventListener('change', () => {
        validateField(dateInput);
        updateAvailableSlots(dateInput.value);
        if (timeSelect) clearError(timeSelect);
      });
      dateInput.addEventListener('input', () => {
        updateAvailableSlots(dateInput.value);
      });
    }

    // Accessible Error helper functions
    function showError(input, message) {
      if (!input) return;
      input.classList.add('input-error');
      input.classList.remove('input-valid');
      input.setAttribute('aria-invalid', 'true');
      
      const errId = (input.id || 'field') + '-error';
      input.setAttribute('aria-describedby', errId);

      let errorEl = input.parentElement.querySelector('.error-message');
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'error-message';
        errorEl.id = errId;
        errorEl.setAttribute('role', 'alert');
        input.parentElement.appendChild(errorEl);
      }
      errorEl.textContent = message;
    }

    function clearError(input) {
      if (!input) return;
      input.classList.remove('input-error');
      input.classList.add('input-valid');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');

      const errorEl = input.parentElement.querySelector('.error-message');
      if (errorEl) {
        errorEl.remove();
      }
    }

    // Real-time clearance of errors on typing
    [fullNameInput, emailInput, phoneInput, dateInput, timeSelect].forEach((input) => {
      if (!input) return;
      input.addEventListener('input', () => {
        if (input.classList.contains('input-error')) {
          clearError(input);
        }
      });
      input.addEventListener('blur', () => {
        validateField(input);
      });
    });

    function validateField(input) {
      if (!input) return true;
      const val = input.value.trim();

      if (input === fullNameInput) {
        if (!val) {
          showError(input, 'Please enter your full name.');
          return false;
        } else if (val.length < 2) {
          showError(input, 'Name must be at least 2 characters.');
          return false;
        }
        clearError(input);
        return true;
      }

      if (input === emailInput) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!val) {
          showError(input, 'Please enter your email address.');
          return false;
        } else if (!emailRegex.test(val)) {
          showError(input, 'Please provide a valid email format (e.g., name@example.com).');
          return false;
        }
        clearError(input);
        return true;
      }

      if (input === phoneInput) {
        // Strict phone validation: digits, optional leading +, parentheses, dashes, spaces
        const phoneRegex = /^[\d\s+\-().]{7,25}$/;
        const hasLetters = /[a-zA-Z]/.test(val);
        const digitsOnly = val.replace(/\D/g, '');

        if (!val) {
          showError(input, 'Please enter your phone or WhatsApp number.');
          return false;
        } else if (hasLetters || !phoneRegex.test(val) || digitsOnly.length < 7 || digitsOnly.length > 15) {
          showError(input, 'Please enter a valid phone number with digits only (7–15 digits).');
          return false;
        }
        clearError(input);
        return true;
      }

      if (input === dateInput) {
        if (!val) {
          showError(input, 'Please select a preferred consultation date.');
          return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const parts = val.split('-');
        const selDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (selDate < today) {
          showError(input, 'Consultation date cannot be in the past.');
          return false;
        }
        clearError(input);
        return true;
      }

      if (input === timeSelect) {
        if (!val) {
          showError(input, 'Please select an available consultation time.');
          return false;
        }
        clearError(input);
        return true;
      }

      return true;
    }

    // Helper: format YYYY-MM-DD to readable date
    function formatReadableDate(dStr) {
      if (!dStr) return '';
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
        return dStr;
      } catch (e) {
        return dStr;
      }
    }

    // Main Form Submit Event
    intakeForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Validate all required fields
      const isNameValid = validateField(fullNameInput);
      const isEmailValid = validateField(emailInput);
      const isPhoneValid = validateField(phoneInput);
      const isDateValid = validateField(dateInput);
      const isTimeValid = validateField(timeSelect);

      if (!isNameValid || !isEmailValid || !isPhoneValid || !isDateValid || !isTimeValid) {
        // Focus the first invalid element
        if (!isNameValid) fullNameInput.focus();
        else if (!isEmailValid) emailInput.focus();
        else if (!isPhoneValid) phoneInput.focus();
        else if (!isDateValid) dateInput.focus();
        else if (!isTimeValid) timeSelect.focus();
        return;
      }

      // Collect sanitized form data
      const selectedExperience = intakeForm.querySelector('input[name="experience"]:checked');
      const goalText = goalSelect.options[goalSelect.selectedIndex].text;

      const formData = {
        fullName: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        goalValue: goalSelect.value,
        goalLabel: goalText,
        experience: selectedExperience ? selectedExperience.value : 'beginner',
        date: dateInput ? dateInput.value : '',
        time: timeSelect ? timeSelect.value : '',
        notes: notesInput ? notesInput.value.trim() : '',
        modality: '100% Remote Video Call (Google Meet / Zoom)',
        programInterest: goalText
      };

      // Execute structured submission with real TrainerStore persistence
      submitConsultationBooking(formData);
    });

    /**
     * Handles consultation booking submission and persists to Supabase (or fallback)
     */
    async function submitConsultationBooking(data) {
      // 1. Lock form & show loading state (prevents duplicate clicks)
      submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Scheduling Your Strategy Call...';
      if (submitArrow) submitArrow.classList.add('hidden');
      if (submitSpinner) submitSpinner.classList.remove('hidden');

      // Clear any prior submission error banner
      const existingErrorBanner = document.getElementById('intake-submit-error');
      if (existingErrorBanner) existingErrorBanner.remove();

      try {
        let createdBooking = null;
        if (window.TrainerStore && typeof window.TrainerStore.addBooking === 'function') {
          createdBooking = await window.TrainerStore.addBooking(data);
        }

        // Reset button state
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Submit & Request Free Intake Call';
        if (submitArrow) submitArrow.classList.remove('hidden');
        if (submitSpinner) submitSpinner.classList.add('hidden');

        // Populate dynamic data into Confirmation Modal
        const summaryName = document.getElementById('summary-name');
        const summaryEmail = document.getElementById('summary-email');
        const summaryPhone = document.getElementById('summary-phone');
        const summaryGoal = document.getElementById('summary-goal');
        const summaryDateTime = document.getElementById('summary-datetime');
        const summaryModality = document.getElementById('summary-modality');
        const summaryStatus = document.getElementById('summary-status');
        const summaryExp = document.getElementById('summary-experience');

        const bookingRefCode = createdBooking ? createdBooking.id : 'BK-PENDING';

        if (summaryName) summaryName.textContent = data.fullName;
        if (summaryEmail) summaryEmail.textContent = data.email;
        if (summaryPhone) summaryPhone.textContent = data.phone;
        if (summaryGoal) summaryGoal.textContent = data.goalLabel;
        if (summaryDateTime) summaryDateTime.textContent = `${formatReadableDate(data.date)} at ${data.time}`;
        if (summaryModality) summaryModality.textContent = '100% Remote Video Call (Google Meet)';
        if (summaryStatus) summaryStatus.textContent = `Pending Coach Confirmation (${bookingRefCode})`;
        if (summaryExp) summaryExp.textContent = data.experience.toUpperCase();

        // Reveal modal only upon confirmed success
        if (successModal) {
          successModal.classList.remove('hidden');
          successModal.setAttribute('aria-hidden', 'false');
          if (resetBtn) resetBtn.focus();
        }
      } catch (err) {
        // Unlock button and restore default label
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Submit & Request Free Intake Call';
        if (submitArrow) submitArrow.classList.remove('hidden');
        if (submitSpinner) submitSpinner.classList.add('hidden');

        console.error('[FORGE Booking] Submission error:', err);

        // Display user-friendly error banner without opening success modal
        const errorBanner = document.createElement('div');
        errorBanner.id = 'intake-submit-error';
        errorBanner.className = 'mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2 animate-fadeIn';
        errorBanner.setAttribute('role', 'alert');
        errorBanner.innerHTML = `
          <svg class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round"></path>
          </svg>
          <div class="flex-grow">${err.message || 'Could not schedule consultation. Please check your network or select an alternate date/time.'}</div>
        `;
        submitBtn.parentElement.appendChild(errorBanner);

        // Refresh available openings in case the slot was just claimed
        if (dateInput && dateInput.value) {
          updateAvailableSlots(dateInput.value);
        }
      }
    }

    // Modal Close Handler & Reset
    function closeModalAndReset() {
      if (successModal) {
        successModal.classList.add('hidden');
        successModal.setAttribute('aria-hidden', 'true');
      }
      intakeForm.reset();
      [fullNameInput, emailInput, phoneInput, dateInput, timeSelect].forEach((input) => {
        if (input) {
          input.classList.remove('input-valid', 'input-error');
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
          const err = input.parentElement.querySelector('.error-message');
          if (err) err.remove();
        }
      });
      if (timeSelect) {
        timeSelect.innerHTML = '<option value="">Select a date first...</option>';
        timeSelect.disabled = true;
      }
      if (slotsStatusMsg) {
        slotsStatusMsg.classList.add('hidden');
      }
    }

    if (resetBtn && successModal) {
      resetBtn.addEventListener('click', closeModalAndReset);
    }

    // Escape key closes success modal (Phase 9D)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && successModal && !successModal.classList.contains('hidden')) {
        closeModalAndReset();
      }
    });
  }

  /* ==========================================================================
     10. Legal & Modal Dialog Handlers
     ========================================================================== */
  function initLegalModals() {
    const modal = document.getElementById('legal-modal');
    const modalTitle = document.getElementById('legal-modal-title');
    const modalBody = document.getElementById('legal-modal-body');
    const closeBtn = document.getElementById('legal-modal-close');
    const triggers = document.querySelectorAll('[data-legal-modal]');

    if (!modal || !modalTitle || !modalBody || !closeBtn) return;

    const legalContent = {
      privacy: {
        title: 'Privacy Policy',
        content: `
          <p class="mb-4">At FORGE FITNESS, we treat your privacy and personal biometrics with surgical discretion.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">1. Information We Collect</h4>
          <p class="mb-4 text-brand-muted text-xs leading-relaxed">During intake and active coaching, we may collect your contact details, biometric measurements, training history, and lifestyle schedules to formulate your customized protocol.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">2. Confidentiality & Security</h4>
          <p class="mb-4 text-brand-muted text-xs leading-relaxed">Your progress photos, check-in data, and personal health metrics are never sold, rented, or distributed to third-party data brokers. All coaching data remains strictly confidential.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">3. Phase 1 Frontend Notice</h4>
          <p class="text-brand-muted text-xs leading-relaxed">This portfolio website is currently running in Phase 1 (Frontend Mode). Form submissions do not persist personal data to a remote database.</p>
        `
      },
      terms: {
        title: 'Terms of Service',
        content: `
          <p class="mb-4">Welcome to FORGE FITNESS. By engaging with our services, you acknowledge our professional training terms.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">1. Client Commitment</h4>
          <p class="mb-4 text-brand-muted text-xs leading-relaxed">Elite physical transformation requires consistent adherence to prescribed lifting volumes, cardiovascular thresholds, and nutritional targets. High accountability is a mutual standard.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">2. Intellectual Property</h4>
          <p class="mb-4 text-brand-muted text-xs leading-relaxed">All custom spreadsheets, training blueprints, exercise videos, and nutrition guides provided by FORGE FITNESS are proprietary intellectual property intended solely for client use.</p>
        `
      },
      disclaimer: {
        title: 'Health & Medical Disclaimer',
        content: `
          <p class="mb-4">Please read this disclaimer carefully before embarking on any physical transformation protocol.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">1. Medical Clearance</h4>
          <p class="mb-4 text-brand-muted text-xs leading-relaxed">FORGE FITNESS and its coaches are certified strength and conditioning specialists, not medical doctors or physical therapists. You should consult with your physician before beginning any strenuous resistance training or dietary intervention.</p>
          <h4 class="font-bold text-brand-lime text-sm uppercase mb-2">2. Voluntary Participation</h4>
          <p class="text-brand-muted text-xs leading-relaxed">Participation in barbell and cardiovascular exercise carries inherent physical risk. You assume full voluntary responsibility for performing lifts with proper biomechanics and within safe structural loads.</p>
        `
      }
    };

    function openLegalModal(type) {
      const data = legalContent[type];
      if (!data) return;
      modalTitle.textContent = data.title;
      modalBody.innerHTML = data.content;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }

    function closeLegalModal() {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = btn.getAttribute('data-legal-modal');
        openLegalModal(type);
      });
    });

    closeBtn.addEventListener('click', closeLegalModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeLegalModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeLegalModal();
      }
    });
  }

  /* ==========================================================================
     11. Back to Top Handlers
     ========================================================================== */
  function initBackToTop() {
    const floatingBtn = document.getElementById('floating-back-to-top');
    const footerBtn = document.getElementById('footer-top-btn');

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (floatingBtn) {
      floatingBtn.addEventListener('click', scrollToTop);

      window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
          floatingBtn.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
          floatingBtn.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
        } else {
          floatingBtn.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
          floatingBtn.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
        }
      }, { passive: true });
    }

    if (footerBtn) {
      footerBtn.addEventListener('click', scrollToTop);
    }
  }

  /* ==========================================================================
     DOM Ready Initialization
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // Current Year Stamp
    const yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Initialize all components
    initNavigation();
    initMobileMenu();
    initHeroDustCanvas();
    initCursorGlow();
    initScrollReveal();
    initStatCounters();
    initTestimonials();
    initProgramSelection();
    initConsultationForm();
    initLegalModals();
    initBackToTop();
  });
})();
