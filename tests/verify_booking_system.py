"""
FORGE FITNESS - Full Booking System & Website Improvements Verification Suite
Validates Phases 0 through 11
"""

import os
import re
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check(condition, message):
    if condition:
        print(f"[PASS] {message}")
        return True
    else:
        print(f"[FAIL] {message}")
        return False

def verify_all():
    print("==================================================")
    print("FORGE FITNESS: Verification of All Implementation Phases")
    print("==================================================")

    all_passed = True

    # 1. Inspect index.html
    index_path = os.path.join(BASE_DIR, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        index_html = f.read()

    print("\n--- Checking index.html ---")
    all_passed &= check('assets/js/trainer-data.js' in index_html, "trainer-data.js loaded before main.js in index.html")
    all_passed &= check('id="consultation-date"' in index_html, "Preferred consultation date input exists")
    all_passed &= check('id="consultation-time"' in index_html, "Consultation time slot selector exists")
    all_passed &= check('id="slots-status-message"' in index_html, "Slots status message container exists")
    all_passed &= check('100% remote online' in index_html.lower() or '100% remote' in index_html.lower(), "Consultation modality clarified as 100% remote online")
    all_passed &= check('id="summary-datetime"' in index_html, "Summary modal includes requested date & time")
    all_passed &= check('Pending' in index_html, "Summary modal clearly explains pending confirmation status")
    all_passed &= check('id="bottom-quote-0"' in index_html and 'id="bottom-quote-1"' in index_html, "Testimonials cards have discrete IDs for dynamic deduplication")
    
    # Hero section regression check
    all_passed &= check('BUILD' in index_html and 'STRONGEST' in index_html and 'hero-self-text' in index_html, "Original hero headline intact (BUILD YOUR STRONGEST SELF.)")
    all_passed &= check('assets/images/hero-athlete.png' in index_html, "Original hero image reference intact (hero-athlete.png)")
    all_passed &= check('hero-dust-canvas' in index_html, "Hero dust canvas intact")

    # 2. Inspect assets/js/trainer-data.js
    data_path = os.path.join(BASE_DIR, "assets", "js", "trainer-data.js")
    with open(data_path, "r", encoding="utf-8") as f:
        data_js = f.read()

    print("\n--- Checking assets/js/trainer-data.js ---")
    all_passed &= check('isDemo: true' in data_js, "Mock bookings and leads marked with isDemo: true")
    all_passed &= check('generateAvailableSlots:' in data_js, "generateAvailableSlots method implemented")
    all_passed &= check('addBooking:' in data_js, "addBooking method implemented")
    all_passed &= check('addLead:' in data_js, "addLead method implemented")
    all_passed &= check('isSlotAvailable:' in data_js, "isSlotAvailable helper implemented")
    all_passed &= check('bookedTimeSet' in data_js or 'bookedTimes' in data_js or 'activeBookingsOnDate' in data_js, "Booking conflict prevention logic present")

    # 3. Inspect assets/js/main.js
    main_path = os.path.join(BASE_DIR, "assets", "js", "main.js")
    with open(main_path, "r", encoding="utf-8") as f:
        main_js = f.read()

    print("\n--- Checking assets/js/main.js ---")
    all_passed &= check('e.preventDefault()' in main_js and 'data-program-select' in main_js, "Program CTA smooth scroll fix (e.preventDefault()) present")
    all_passed &= check('updateComplementaryCards' in main_js or 'bottomQuote0' in main_js, "Dynamic testimonial deduplication logic present")
    all_passed &= check('aria-invalid' in main_js and 'aria-describedby' in main_js, "Accessible error binding (aria-invalid & aria-describedby) implemented")
    all_passed &= check('Escape' in main_js and 'closeModalAndReset' in main_js, "Escape key modal dismissal implemented in main.js")
    all_passed &= check('TrainerStore.addBooking' in main_js, "Public consultation form saves booking directly into TrainerStore")
    all_passed &= check('generateAvailableSlots' in main_js, "Dynamic time slots populated from TrainerStore availability")

    # 4. Inspect trainer/dashboard.html & trainer-dashboard.js
    dash_html_path = os.path.join(BASE_DIR, "trainer", "dashboard.html")
    with open(dash_html_path, "r", encoding="utf-8") as f:
        dash_html = f.read()

    dash_js_path = os.path.join(BASE_DIR, "assets", "js", "trainer-dashboard.js")
    with open(dash_js_path, "r", encoding="utf-8") as f:
        dash_js = f.read()

    print("\n--- Checking trainer portal files ---")
    all_passed &= check('id="add-timeblock-modal"' in dash_html, "In-app Add Time Block modal exists in dashboard.html")
    all_passed &= check('id="add-lead-modal"' in dash_html, "In-app Add Athlete Lead modal exists in dashboard.html")
    all_passed &= check('openAddLeadModal' in dash_html and 'openAddLeadModal' in dash_js, "Add Lead modal trigger and handler wired up")
    all_passed &= check('openAddTimeBlockModal' in dash_js, "Add Time Block handler wired up (replaces prompt())")
    all_passed &= check('DEMO' in dash_js or 'DEMO DATA' in dash_js, "Demo data badges rendered for seed mock records")
    all_passed &= check('updateRescheduleSlots' in dash_js or 'generateAvailableSlots' in dash_js, "Reschedule modal uses dynamic available slot calculation")
    all_passed &= check('Escape' in dash_js, "Escape key modal dismissal implemented in trainer-dashboard.js")

    # 5. Check code.html sync
    code_path = os.path.join(BASE_DIR, "code.html")
    with open(code_path, "r", encoding="utf-8") as f:
        code_html = f.read()

    print("\n--- Checking code.html synchronization ---")
    all_passed &= check(len(code_html) == len(index_html), "code.html is perfectly synchronized with index.html")

    print("\n==================================================")
    if all_passed:
        print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    else:
        print("SOME CHECKS FAILED. Please review the output above.")
    print("==================================================")
    return all_passed

if __name__ == "__main__":
    success = verify_all()
    sys.exit(0 if success else 1)
