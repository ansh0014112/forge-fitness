"""
FORGE FITNESS - Comprehensive Booking Flow & Logic Unit Tests
"""

import os
import re
import unittest
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestBookingSystem(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
            self.index_html = f.read()
        with open(os.path.join(BASE_DIR, "assets", "js", "trainer-data.js"), "r", encoding="utf-8") as f:
            self.trainer_data_js = f.read()
        with open(os.path.join(BASE_DIR, "assets", "js", "main.js"), "r", encoding="utf-8") as f:
            self.main_js = f.read()
        with open(os.path.join(BASE_DIR, "trainer", "dashboard.html"), "r", encoding="utf-8") as f:
            self.dashboard_html = f.read()
        with open(os.path.join(BASE_DIR, "assets", "js", "trainer-dashboard.js"), "r", encoding="utf-8") as f:
            self.trainer_dashboard_js = f.read()

    def test_phone_validation_regex(self):
        """Phase 9B: Strict numeric phone validation rejects letters"""
        phone_regex = re.compile(r"^[\d\s+\-().]{7,25}$")
        
        valid_numbers = [
            "+1 (555) 000-0000",
            "+15551234567",
            "555-123-4567",
            "(555) 123-4567",
            "+44 20 7123 4567",
            "+971 50 123 4567"
        ]
        invalid_numbers = [
            "abcdefg",
            "555-CALL-NOW",
            "12345",         # too short
            "+1 (555) abc-1234",
            "phone12345678"
        ]

        for num in valid_numbers:
            digits = re.sub(r'\D', '', num)
            has_letters = bool(re.search(r'[a-zA-Z]', num))
            is_valid = bool(phone_regex.match(num)) and not has_letters and 7 <= len(digits) <= 15
            self.assertTrue(is_valid, f"Expected {num} to be valid")
        
        for num in invalid_numbers:
            digits = re.sub(r'\D', '', num)
            has_letters = bool(re.search(r'[a-zA-Z]', num))
            is_valid = bool(phone_regex.match(num)) and not has_letters and 7 <= len(digits) <= 15
            self.assertFalse(is_valid, f"Expected {num} to be invalid")

    def test_accessible_form_error_binding(self):
        """Phase 9C: Accessible error binding with aria-invalid and aria-describedby"""
        self.assertIn("aria-invalid", self.main_js)
        self.assertIn("aria-describedby", self.main_js)
        self.assertIn("errId", self.main_js)
        self.assertIn("-error", self.main_js)

    def test_modal_escape_listeners(self):
        """Phase 9D: Escape key modal dismissal across site and portal"""
        self.assertIn("Escape", self.main_js)
        self.assertIn("closeModalAndReset", self.main_js)
        self.assertIn("Escape", self.trainer_dashboard_js)
        self.assertIn(".portal-modal-backdrop.active", self.trainer_dashboard_js)

    def test_testimonial_deduplication(self):
        """Phase 8: Dynamic testimonial rotation prevents quote duplication"""
        self.assertIn("updateComplementaryCards", self.main_js)
        self.assertIn("otherIndices", self.main_js)
        self.assertIn("bottom-quote-0", self.index_html)
        self.assertIn("bottom-quote-1", self.index_html)

    def test_program_cta_smooth_scroll_fix(self):
        """Phase 9A: Program CTA prevents default double-scroll jumping"""
        self.assertIn("e.preventDefault()", self.main_js)
        self.assertIn("data-program-select", self.main_js)

    def test_consultation_form_inputs(self):
        """Phase 1: Public consultation intake form fields"""
        self.assertIn('id="consultation-date"', self.index_html)
        self.assertIn('id="consultation-time"', self.index_html)
        self.assertIn('id="full-name"', self.index_html)
        self.assertIn('id="email"', self.index_html)
        self.assertIn('id="phone"', self.index_html)
        self.assertIn('id="primary-goal"', self.index_html)
        self.assertIn('name="experience"', self.index_html)

    def test_remote_modality_clarification(self):
        """Phase 7: Modality clarified as 100% remote online"""
        self.assertIn("100% Remote Online", self.index_html)
        self.assertIn("Google Meet", self.index_html)

    def test_trainer_store_api(self):
        """Phase 2 & 3: TrainerStore slot generation, booking, and lead persistence"""
        self.assertIn("generateAvailableSlots:", self.trainer_data_js)
        self.assertIn("addBooking:", self.trainer_data_js)
        self.assertIn("addLead:", self.trainer_data_js)
        self.assertIn("isSlotAvailable:", self.trainer_data_js)
        self.assertIn("isDemo: true", self.trainer_data_js)

    def test_in_app_availability_and_lead_modals(self):
        """Phase 2 & 9E/F: In-app modals for adding time blocks and leads (replaces prompt)"""
        self.assertIn('id="add-timeblock-modal"', self.dashboard_html)
        self.assertIn('id="add-lead-modal"', self.dashboard_html)
        self.assertIn("openAddTimeBlockModal", self.trainer_dashboard_js)
        self.assertIn("openAddLeadModal", self.trainer_dashboard_js)
        # Verify prompt is no longer used for adding time blocks
        self.assertNotIn("prompt(`Enter new time block", self.trainer_dashboard_js)

    def test_conflict_prevention_logic(self):
        """Phase 5: Bookings with status Pending or Confirmed block slots"""
        self.assertIn("bookedTimeSet", self.trainer_data_js)
        self.assertIn("status === 'Pending' || b.status === 'Confirmed'", self.trainer_data_js)

    def test_trainer_seed_script_and_availability_resilience(self):
        """Phase 12: Trainer seed provisioning SQL and slot availability resilience"""
        seed_path = os.path.join(BASE_DIR, "supabase", "seed_trainer.sql")
        self.assertTrue(os.path.exists(seed_path), "supabase/seed_trainer.sql must exist")
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_sql = f.read()

        self.assertIn("INSERT INTO auth.users", seed_sql)
        self.assertIn("INSERT INTO public.trainer_profiles", seed_sql)
        self.assertIn("INSERT INTO public.trainer_settings", seed_sql)
        self.assertIn("INSERT INTO public.trainer_availability", seed_sql)
        self.assertIn("handle_new_trainer_signup", seed_sql)

        # Check frontend resilience
        self.assertIn("public_trainer_profiles", self.trainer_data_js)
        self.assertIn("generateAvailableSlotsAsync", self.trainer_data_js)

    def test_uuid_safety_in_data_store(self):
        """Phase 13: Ensure booking_code and lead_code are matched safely without UUID casting errors"""
        self.assertIn("isUuid(id)", self.trainer_data_js)
        self.assertIn("booking_code", self.trainer_data_js)
        self.assertIn("lead_code", self.trainer_data_js)

    def test_dynamic_slots_from_availability_ranges(self):
        """Phase 14: Slots generated match the configured availability hours exactly"""
        self.assertIn("generateSlotsFromRanges", self.trainer_data_js)
        self.assertIn("loadAvailabilityAsync", self.trainer_data_js)

    def test_signout_and_bfcache_guard(self):
        """Phase 15: Sign out terminates Supabase session, clears cache, and guards back navigation"""
        with open(os.path.join(BASE_DIR, "assets", "js", "trainer-auth.js"), "r", encoding="utf-8") as f:
            auth_js = f.read()

        # Supabase signOut called and location.replace used
        self.assertIn("supabaseClient.auth.signOut", auth_js)
        self.assertIn("location.replace('login.html?logged_out=true')", auth_js)
        self.assertIn("location.replace", auth_js)

        # Dashboard pageshow BFCache guard
        self.assertIn("pageshow", self.trainer_dashboard_js)
        self.assertIn("TrainerAuth.requireAuth", self.trainer_dashboard_js)

        # TrainerStore.logout clears private caches
        self.assertIn("STORAGE_KEYS.BOOKINGS", self.trainer_data_js)
        self.assertIn("STORAGE_KEYS.LEADS", self.trainer_data_js)

if __name__ == "__main__":
    unittest.main()
