"""
FORGE FITNESS — Trainer Portal & Dashboard Automated Test Suite
Tests:
- Public Homepage Header Trainer Login links (Desktop & Mobile)
- Trainer Login Page Elements & Validation
- Password Show/Hide Toggle
- Forgot Password Demo Modal
- Invalid Credentials Error Banner
- Successful Demo Login Flow & Session Storage
- Protected Route Guards (Redirects unauthenticated users)
- Dashboard Overview: Stats Cards, Recent Bookings, Live Activity Feed
- Sidebar Navigation across all 6 Views:
    * Overview
    * Booking Requests
    * Upcoming Consultations
    * Client Leads Pipeline
    * Availability Management
    * Trainer Settings
- Interactive Actions:
    * Confirm Pending Booking
    * Reschedule Modal & Submission
    * Reject Booking Confirmation Modal
    * Client Lead Status Inline Update
    * Availability Weekday Toggle & Time Block Management
    * Settings Profile Update
    * Notification Center: Dropdown Toggle & Mark All as Read
- Logout Flow & Session Destruction
- Responsive Verification at 375px (Zero horizontal overflow & mobile sidebar drawer)
"""

import sys
import subprocess
import time
import json
import urllib.request
import asyncio
import os
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_DIR = r"d:\Downloads\gym website main design"
HOME_URL = f"file:///{BASE_DIR.replace(os.sep, '/')}/index.html"
LOGIN_URL = f"file:///{BASE_DIR.replace(os.sep, '/')}/trainer/login.html"
DASHBOARD_URL = f"file:///{BASE_DIR.replace(os.sep, '/')}/trainer/dashboard.html"
DEBUG_PORT = 9223

async def run_portal_tests():
    print("=" * 65)
    print("STARTING FORGE FITNESS TRAINER PORTAL AUTOMATED TESTS")
    print("=" * 65)

    # 1. Start Chrome
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=1280,850",
        HOME_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    await asyncio.sleep(2.0)

    ws_url = None
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json")
        targets = json.loads(req.read().decode())
        for t in targets:
            if t.get("type") == "page":
                ws_url = t.get("webSocketDebuggerUrl")
                break
    except Exception as e:
        print(f"Failed to connect to Chrome debugging port: {e}")
        chrome_proc.terminate()
        return False

    if not ws_url:
        print("No page target found.")
        chrome_proc.terminate()
        return False

    print(f"Connected to Chrome page: {ws_url}")

    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        msg_id = 0

        async def send_cmd(method, params=None):
            nonlocal msg_id
            msg_id += 1
            payload = {"id": msg_id, "method": method}
            if params:
                payload["params"] = params
            await ws.send(json.dumps(payload))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get("id") == msg_id:
                    return resp.get("result", {})

        async def eval_js(expr):
            res = await send_cmd("Runtime.evaluate", {
                "expression": expr,
                "returnByValue": True,
                "awaitPromise": True
            })
            return res.get("result", {}).get("value")

        await send_cmd("Runtime.enable")
        await send_cmd("Page.enable")
        await asyncio.sleep(0.5)

        # ---------------------------------------------------------------------
        # TEST 1: Public Homepage Header has Trainer Login links
        # ---------------------------------------------------------------------
        desktop_link = await eval_js("document.querySelector('header a[href*=\"trainer/login.html\"]') !== null")
        mobile_link = await eval_js("document.querySelector('#mobile-menu a[href*=\"trainer/login.html\"]') !== null")
        print(f"[TEST 1] Public Header Trainer Login Link (Desktop: {desktop_link}, Mobile: {mobile_link})")
        assert desktop_link and mobile_link, "Trainer login link missing from header!"

        # ---------------------------------------------------------------------
        # TEST 2: Navigate to Trainer Login Page
        # ---------------------------------------------------------------------
        await send_cmd("Page.navigate", {"url": LOGIN_URL})
        await asyncio.sleep(1.0)
        login_title = await eval_js("document.title")
        print(f"[TEST 2] Trainer Login Page Title: '{login_title}'")
        assert "Trainer Portal Login" in login_title

        # Check critical login page elements
        login_elements_exist = await eval_js("""
            !!document.getElementById('trainer-email') &&
            !!document.getElementById('trainer-password') &&
            !!document.getElementById('login-submit-btn') &&
            !!document.getElementById('toggle-password-btn') &&
            !!document.getElementById('remember-me')
        """)
        print(f"[TEST 2b] All Login Form Elements Present: {login_elements_exist}")
        assert login_elements_exist is True

        # ---------------------------------------------------------------------
        # TEST 3: Password Show/Hide Toggle
        # ---------------------------------------------------------------------
        initial_type = await eval_js("document.getElementById('trainer-password').type")
        await eval_js("document.getElementById('toggle-password-btn').click()")
        toggled_type = await eval_js("document.getElementById('trainer-password').type")
        await eval_js("document.getElementById('toggle-password-btn').click()")
        reverted_type = await eval_js("document.getElementById('trainer-password').type")
        print(f"[TEST 3] Password Toggle: {initial_type} -> {toggled_type} -> {reverted_type}")
        assert initial_type == "password" and toggled_type == "text" and reverted_type == "password"

        # ---------------------------------------------------------------------
        # TEST 4: Forgot Password Demo Modal
        # ---------------------------------------------------------------------
        await eval_js("document.getElementById('forgot-password-trigger').click()")
        modal_open = await eval_js("document.getElementById('forgot-modal').classList.contains('active')")
        print(f"[TEST 4a] Forgot Password Modal Opens: {modal_open}")
        assert modal_open is True

        await eval_js("document.getElementById('forgot-modal-close').click()")
        modal_closed = await eval_js("!document.getElementById('forgot-modal').classList.contains('active')")
        print(f"[TEST 4b] Forgot Password Modal Closes: {modal_closed}")
        assert modal_closed is True

        # ---------------------------------------------------------------------
        # TEST 5: Login Validation & Failed Attempt
        # ---------------------------------------------------------------------
        await eval_js("""
            document.getElementById('trainer-email').value = 'wrong@email.com';
            document.getElementById('trainer-password').value = '123';
            document.getElementById('trainer-login-form').dispatchEvent(new Event('submit', { cancelable: true }));
        """)
        await asyncio.sleep(0.8)
        error_visible = await eval_js("!document.getElementById('login-error').classList.contains('hidden')")
        print(f"[TEST 5] Invalid Credentials Displays Error Alert: {error_visible}")
        assert error_visible is True

        # ---------------------------------------------------------------------
        # TEST 6: Successful Demo Login Flow
        # ---------------------------------------------------------------------
        await eval_js("""
            document.getElementById('trainer-email').value = 'coach.haisam@forgefitness.com';
            document.getElementById('trainer-password').value = 'forge2026';
            document.getElementById('trainer-login-form').dispatchEvent(new Event('submit', { cancelable: true }));
        """)
        await asyncio.sleep(1.2)

        current_url = await eval_js("window.location.href")
        print(f"[TEST 6] Redirected After Login to: {current_url}")
        assert "dashboard.html" in current_url

        # Verify auth state in localStorage
        auth_state = await eval_js("JSON.parse(localStorage.getItem('forge_trainer_auth') || '{}')")
        print(f"[TEST 6b] Auth State Authenticated: {auth_state.get('isAuthenticated')}")
        assert auth_state.get("isAuthenticated") is True

        # ---------------------------------------------------------------------
        # TEST 7: Dashboard Overview View & Statistics
        # ---------------------------------------------------------------------
        overview_visible = await eval_js("!document.getElementById('view-overview').classList.contains('hidden')")
        total_enquiries = await eval_js("document.getElementById('stat-total-enquiries').textContent")
        pending_bookings = await eval_js("document.getElementById('stat-pending-bookings').textContent")
        confirmed_calls = await eval_js("document.getElementById('stat-confirmed-consultations').textContent")
        print(f"[TEST 7] Dashboard Overview Active: {overview_visible}")
        print(f"         Stats -> Total Enquiries: {total_enquiries}, Pending: {pending_bookings}, Confirmed: {confirmed_calls}")
        assert overview_visible is True
        assert int(total_enquiries) > 0 and int(pending_bookings) > 0

        # ---------------------------------------------------------------------
        # TEST 8: Sidebar Navigation across all 6 Views
        # ---------------------------------------------------------------------
        views = ['bookings', 'consultations', 'leads', 'availability', 'settings', 'overview']
        for v in views:
            await eval_js(f"document.querySelector('[data-view=\"{v}\"]').click()")
            await asyncio.sleep(0.2)
            panel_active = await eval_js(f"!document.getElementById('view-{v}').classList.contains('hidden')")
            hash_val = await eval_js("window.location.hash")
            assert panel_active, f"View panel {v} failed to activate!"
            assert v in hash_val, f"URL hash mismatch for {v}"
        print("[TEST 8] All 6 Dashboard Views Navigate & Switch Correctly: True")

        # ---------------------------------------------------------------------
        # TEST 9: Booking Requests Management (Confirm, Reject, Reschedule)
        # ---------------------------------------------------------------------
        await eval_js("document.querySelector('[data-view=\"bookings\"]').click()")
        await asyncio.sleep(0.3)

        # 9a. Confirm a pending booking (e.g. BK-8901)
        initial_confirmed = int(await eval_js("window.TrainerStore.getBookings().filter(b => b.status === 'Confirmed').length"))
        await eval_js("window.confirmBookingAction('BK-8901')")
        await asyncio.sleep(0.3)
        updated_status = await eval_js("window.TrainerStore.getBookings().find(b => b.id === 'BK-8901').status")
        new_confirmed = int(await eval_js("window.TrainerStore.getBookings().filter(b => b.status === 'Confirmed').length"))
        print(f"[TEST 9a] Confirm Booking BK-8901: Status={updated_status}, Confirmed Count: {initial_confirmed} -> {new_confirmed}")
        assert updated_status == "Confirmed"
        assert new_confirmed == initial_confirmed + 1

        # 9b. Reschedule Modal
        await eval_js("window.openRescheduleModal('BK-8903')")
        reschedule_open = await eval_js("document.getElementById('reschedule-modal').classList.contains('active')")
        print(f"[TEST 9b] Reschedule Modal Opens: {reschedule_open}")
        assert reschedule_open is True

        await eval_js("""
            document.getElementById('reschedule-date-input').value = '2026-11-12';
            document.getElementById('reschedule-time-select').value = '04:00 PM';
            window.submitRescheduleAction();
        """)
        await asyncio.sleep(0.3)
        rescheduled_item = await eval_js("window.TrainerStore.getBookings().find(b => b.id === 'BK-8903')")
        print(f"[TEST 9c] Rescheduled BK-8903 to: {rescheduled_item['date']} at {rescheduled_item['time']}")
        assert rescheduled_item['date'] == '2026-11-12' and rescheduled_item['time'] == '04:00 PM'

        # 9d. Reject Confirmation Modal
        await eval_js("window.openRejectConfirmModal('BK-8905')")
        reject_modal_open = await eval_js("document.getElementById('reject-confirm-modal').classList.contains('active')")
        print(f"[TEST 9d] Reject Confirm Modal Opens: {reject_modal_open}")
        assert reject_modal_open is True

        await eval_js("window.confirmRejectAction()")
        await asyncio.sleep(0.3)
        rejected_item = await eval_js("window.TrainerStore.getBookings().find(b => b.id === 'BK-8905')")
        print(f"[TEST 9e] Rejected BK-8905 Status: {rejected_item['status']}")
        assert rejected_item['status'] == 'Rejected'

        # 9e. Search Bookings
        await eval_js("""
            const input = document.getElementById('bookings-search-input');
            input.value = 'Sarah Lin';
            if (window.handleBookingsSearch) {
                window.handleBookingsSearch('Sarah Lin');
            } else {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        """)
        await asyncio.sleep(0.3)
        filtered_rows = await eval_js("document.querySelectorAll('#bookings-table-body tr').length")
        print(f"[TEST 9f] Bookings Search 'Sarah Lin' Result Count: {filtered_rows}")
        assert filtered_rows == 1

        # Clear search
        await eval_js("document.getElementById('bookings-clear-filter').click()")

        # ---------------------------------------------------------------------
        # TEST 10: Client Leads Management
        # ---------------------------------------------------------------------
        await eval_js("document.querySelector('[data-view=\"leads\"]').click()")
        await asyncio.sleep(0.3)

        # Update Lead Status
        await eval_js("window.updateLeadStatusAction('LD-101', 'Contacted')")
        await asyncio.sleep(0.2)
        lead_status = await eval_js("window.TrainerStore.getLeads().find(l => l.id === 'LD-101').status")
        print(f"[TEST 10a] Lead LD-101 Status Updated to: '{lead_status}'")
        assert lead_status == "Contacted"

        # Search Leads
        await eval_js("""
            const lInput = document.getElementById('leads-search-input');
            lInput.value = 'Rostova';
            if (window.handleLeadsSearch) {
                window.handleLeadsSearch('Rostova');
            } else {
                lInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        """)
        await asyncio.sleep(0.2)
        lead_rows = await eval_js("document.querySelectorAll('#leads-table-body tr').length")
        print(f"[TEST 10b] Leads Search 'Rostova' Result Count: {lead_rows}")
        assert lead_rows == 1

        # ---------------------------------------------------------------------
        # TEST 11: Availability Management
        # ---------------------------------------------------------------------
        await eval_js("document.querySelector('[data-view=\"availability\"]').click()")
        await asyncio.sleep(0.3)

        # Toggle Saturday availability
        sat_before = await eval_js("window.TrainerStore.getAvailability().weekly.saturday.enabled")
        await eval_js("window.toggleDayAvailability('saturday', true)")
        sat_after = await eval_js("window.TrainerStore.getAvailability().weekly.saturday.enabled")
        print(f"[TEST 11a] Toggle Saturday Availability: {sat_before} -> {sat_after}")
        assert sat_before is False and sat_after is True

        # Save settings form
        await eval_js("""
            document.getElementById('avail-duration').value = '60';
            document.getElementById('avail-buffer').value = '30';
            window.saveAvailabilitySettingsAction();
        """)
        duration_saved = await eval_js("window.TrainerStore.getAvailability().defaultDuration")
        print(f"[TEST 11b] Availability Duration Saved: {duration_saved} minutes")
        assert duration_saved == 60

        # ---------------------------------------------------------------------
        # TEST 12: Trainer Settings & Profile Update
        # ---------------------------------------------------------------------
        await eval_js("document.querySelector('[data-view=\"settings\"]').click()")
        await asyncio.sleep(0.3)

        await eval_js("""
            document.getElementById('settings-name').value = 'Coach Haisam (Lead)';
            document.getElementById('settings-business').value = 'FORGE FITNESS APEX';
            window.saveSettingsAction();
        """)
        saved_name = await eval_js("window.TrainerStore.getSettings().profile.name")
        print(f"[TEST 12] Trainer Settings Saved Profile Name: '{saved_name}'")
        assert saved_name == "Coach Haisam (Lead)"

        # ---------------------------------------------------------------------
        # TEST 13: Notification Center
        # ---------------------------------------------------------------------
        # Open Dropdown
        await eval_js("document.getElementById('notifications-btn').click()")
        dropdown_open = await eval_js("document.getElementById('notifications-dropdown').classList.contains('open')")
        print(f"[TEST 13a] Notifications Dropdown Opens: {dropdown_open}")
        assert dropdown_open is True

        # Mark all as read
        await eval_js("document.getElementById('notif-mark-all-read').click()")
        unread_count = await eval_js("window.TrainerStore.getNotifications().filter(n => !n.isRead).length")
        badge_hidden = await eval_js("document.getElementById('header-notif-badge').classList.contains('hidden')")
        print(f"[TEST 13b] Mark All Read -> Unread Count: {unread_count}, Badge Hidden: {badge_hidden}")
        assert unread_count == 0 and badge_hidden is True

        # Close dropdown
        await eval_js("document.body.click()")

        # ---------------------------------------------------------------------
        # TEST 14: Mobile 375px Responsiveness & Sidebar Drawer
        # ---------------------------------------------------------------------
        await send_cmd("Emulation.setDeviceMetricsOverride", {
            "width": 375,
            "height": 812,
            "deviceScaleFactor": 1,
            "mobile": True
        })
        await asyncio.sleep(0.5)

        # Check horizontal overflow
        overflow_body = await eval_js("document.body.scrollWidth <= 375")
        print(f"[TEST 14a] Mobile 375px Zero Horizontal Overflow: {overflow_body}")
        assert overflow_body is True, "Horizontal overflow detected on mobile dashboard!"

        # Open mobile sidebar drawer
        sidebar_hidden_before = await eval_js("document.getElementById('dashboard-sidebar').classList.contains('-translate-x-full')")
        await eval_js("document.getElementById('mobile-sidebar-toggle').click()")
        sidebar_opened = await eval_js("!document.getElementById('dashboard-sidebar').classList.contains('-translate-x-full')")
        print(f"[TEST 14b] Mobile Sidebar Drawer Toggles: Initially Hidden={sidebar_hidden_before}, Opened={sidebar_opened}")
        assert sidebar_hidden_before and sidebar_opened

        # Close mobile sidebar
        await eval_js("document.getElementById('mobile-sidebar-close').click()")
        sidebar_closed = await eval_js("document.getElementById('dashboard-sidebar').classList.contains('-translate-x-full')")
        print(f"[TEST 14c] Mobile Sidebar Closes: {sidebar_closed}")
        assert sidebar_closed is True

        # ---------------------------------------------------------------------
        # TEST 15: Logout Flow & Session Destruction
        # ---------------------------------------------------------------------
        await eval_js("window.TrainerAuth.logout()")
        await asyncio.sleep(0.8)

        after_logout_url = await eval_js("window.location.href")
        auth_cleared = await eval_js("window.TrainerAuth.isAuthenticated()")
        print(f"[TEST 15] Logout Executed -> Redirected to: '{after_logout_url}', IsAuthenticated: {auth_cleared}")
        assert "login.html" in after_logout_url
        assert auth_cleared is False

        # ---------------------------------------------------------------------
        # TEST 16: Protected Route Guard (Direct Dashboard Access while logged out)
        # ---------------------------------------------------------------------
        await send_cmd("Page.navigate", {"url": DASHBOARD_URL})
        await asyncio.sleep(0.8)
        guarded_url = await eval_js("window.location.href")
        print(f"[TEST 16] Route Guard Protection: Attempted dashboard.html -> Redirected to: '{guarded_url}'")
        assert "login.html" in guarded_url

        print("=" * 65)
        print("ALL TRAINER PORTAL TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 65)

    chrome_proc.terminate()
    return True

if __name__ == "__main__":
    success = asyncio.run(run_portal_tests())
    sys.exit(0 if success else 1)
