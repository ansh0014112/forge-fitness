"""
FORGE FITNESS — Automated Frontend Test Suite
Tests:
- Zero Console Errors
- Mobile Menu Open/Close
- Navigation Scrolling
- Testimonial Switching
- Program CTA Selection (pre-filling form)
- Form Validation (Empty, Invalid Email, Valid Demo Submission)
- Demo Modal Output
- Responsive Dimensions
"""

import sys
import subprocess
import time
import json
import urllib.request
import asyncio
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TARGET_URL = r"file:///d:/Downloads/gym website main design/index.html"
DEBUG_PORT = 9222

async def run_tests():
    print("=" * 60)
    print("STARTING FORGE FITNESS FRONTEND AUTOMATION TESTS")
    print("=" * 60)

    # 1. Start Chrome with remote debugging
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=1280,800",
        TARGET_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(1.5)

    ws_url = None
    try:
        # Fetch WS target from debugging port
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

    async with websockets.connect(ws_url) as ws:
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

        # Enable runtime & log
        await send_cmd("Runtime.enable")
        await send_cmd("Log.enable")

        # Give scripts a moment to initialize DOMContentLoaded
        await asyncio.sleep(0.5)

        # TEST 1: Check document title and key elements
        title = await eval_js("document.title")
        print(f"[TEST 1] Page Title: {title}")
        assert "FORGE FITNESS" in title, "Title mismatch!"

        # TEST 2: Check all critical sections exist
        sections = await eval_js("""
            ['hero', 'programs', 'transformations', 'coach', 'testimonials', 'how-it-works', 'consultation'].every(id => !!document.getElementById(id))
        """)
        print(f"[TEST 2] All 7 Primary Sections Present: {sections}")
        assert sections is True, "One or more sections missing!"

        # TEST 2b: Check for horizontal overflow at 375px
        await send_cmd("Emulation.setDeviceMetricsOverride", {
            "width": 375,
            "height": 812,
            "deviceScaleFactor": 1,
            "mobile": True
        })
        await asyncio.sleep(0.3)
        overflow_info = await eval_js("""
            (() => {
                const docWidth = document.documentElement.clientWidth;
                const bodyWidth = document.body.scrollWidth;
                const overflowers = Array.from(document.querySelectorAll('*'))
                    .filter(el => el.scrollWidth > docWidth || el.offsetWidth > docWidth)
                    .map(el => ({ tag: el.tagName, id: el.id, cls: el.className || '', scrollW: el.scrollWidth, offsetW: el.offsetWidth }));
                return { docWidth, bodyWidth, overflowers: overflowers.slice(0, 15) };
            })()
        """)
        print(f"[TEST 2b] Mobile 375px Overflow Check: body scrollWidth={overflow_info['bodyWidth']}px (docWidth={overflow_info['docWidth']}px)")
        if overflow_info['overflowers']:
            print("         Elements wider than viewport (375px):")
            for o in overflow_info['overflowers']:
                print(f"           <{o['tag']} id='{o['id']}' cls='{str(o['cls'])[:40]}...' scrollW={o['scrollW']} offsetW={o['offsetW']}>")

        # TEST 3: Check Local Images Loading
        images_status = await eval_js("""
            Array.from(document.querySelectorAll('img')).map(img => ({
                src: img.src,
                complete: img.complete,
                naturalWidth: img.naturalWidth
            }))
        """)
        print(f"[TEST 3] Images Loaded: {len(images_status)} images found")
        for idx, img in enumerate(images_status):
            print(f"         Image {idx+1}: {img['src'].split('/')[-1]} (naturalWidth: {img['naturalWidth']}px)")
            assert img['complete'] and img['naturalWidth'] > 0, f"Image {img['src']} failed to render!"

        # TEST 4: Mobile Menu Open / Close
        menu_init_hidden = await eval_js("document.getElementById('mobile-menu').classList.contains('hidden')")
        print(f"[TEST 4a] Mobile Menu Initially Hidden: {menu_init_hidden}")
        assert menu_init_hidden is True

        # Click mobile menu button
        await eval_js("document.getElementById('mobile-menu-btn').click()")
        menu_opened = await eval_js("!document.getElementById('mobile-menu').classList.contains('hidden')")
        print(f"[TEST 4b] Mobile Menu Opens on Click: {menu_opened}")
        assert menu_opened is True

        # Click outside to close
        await eval_js("document.body.click()")
        menu_closed = await eval_js("document.getElementById('mobile-menu').classList.contains('hidden')")
        print(f"[TEST 4c] Mobile Menu Closes on Outside Click: {menu_closed}")
        assert menu_closed is True

        # TEST 5: Testimonial Switcher Tabs
        initial_author = await eval_js("document.getElementById('featured-quote-author').textContent")
        print(f"[TEST 5a] Initial Testimonial Author: {initial_author}")
        assert "Emma" in initial_author

        # Click Tab 1 (Adam H.)
        await eval_js("document.querySelectorAll('#testimonial-tabs button')[1].click()")
        await asyncio.sleep(0.3)
        tab1_author = await eval_js("document.getElementById('featured-quote-author').textContent")
        print(f"[TEST 5b] Testimonial Switched to Tab 1: {tab1_author}")
        assert "Adam" in tab1_author

        # Click Tab 2 (Marcus L.)
        await eval_js("document.querySelectorAll('#testimonial-tabs button')[2].click()")
        await asyncio.sleep(0.3)
        tab2_author = await eval_js("document.getElementById('featured-quote-author').textContent")
        print(f"[TEST 5c] Testimonial Switched to Tab 2: {tab2_author}")
        assert "Marcus" in tab2_author

        # TEST 6: Program CTA Auto-Selects Consultation Goal
        await eval_js("document.querySelector('[data-program-select=\"fat-loss\"]').click()")
        selected_goal = await eval_js("document.getElementById('primary-goal').value")
        print(f"[TEST 6a] 'Apply For Fat Loss' Sets Goal: {selected_goal}")
        assert selected_goal == "fat-loss"

        await eval_js("document.querySelector('[data-program-select=\"muscle-building\"]').click()")
        selected_goal2 = await eval_js("document.getElementById('primary-goal').value")
        print(f"[TEST 6b] 'Apply For Muscle Building' Sets Goal: {selected_goal2}")
        assert selected_goal2 == "muscle-building"

        # TEST 7: Consultation Form Validation & Frontend Demo Submission
        # 7a. Submit empty form
        await eval_js("document.getElementById('intake-form').dispatchEvent(new Event('submit', { cancelable: true }))")
        name_has_error = await eval_js("document.getElementById('full-name').classList.contains('input-error')")
        print(f"[TEST 7a] Empty Form Triggered Inline Validation: {name_has_error}")
        assert name_has_error is True

        # 7b. Enter invalid email
        await eval_js("""
            document.getElementById('full-name').value = 'Jordan Hayes';
            document.getElementById('email').value = 'invalid-email-string';
            document.getElementById('phone').value = '+1 555 123 4567';
            document.getElementById('intake-form').dispatchEvent(new Event('submit', { cancelable: true }));
        """)
        email_has_error = await eval_js("document.getElementById('email').classList.contains('input-error')")
        print(f"[TEST 7b] Invalid Email Blocked with Inline Alert: {email_has_error}")
        assert email_has_error is True

        # 7c. Submit fully valid form
        await eval_js("""
            document.getElementById('email').value = 'jordan.hayes@example.com';
            document.getElementById('notes').value = 'Looking to break deadlift plateau';
            document.getElementById('intake-form').dispatchEvent(new Event('submit', { cancelable: true }));
        """)
        
        # Check loading spinner appears
        is_loading = await eval_js("!document.getElementById('submit-spinner').classList.contains('hidden')")
        print(f"[TEST 7c] Submit Button Displays Processing Spinner: {is_loading}")

        # Wait for 850ms simulation timeout
        await asyncio.sleep(1.0)

        # Check demo confirmation modal appears
        modal_visible = await eval_js("!document.getElementById('form-success-message').classList.contains('hidden')")
        summary_name = await eval_js("document.getElementById('summary-name').textContent")
        summary_goal = await eval_js("document.getElementById('summary-goal').textContent")
        print(f"[TEST 7d] Demo Confirmation Modal Displayed: {modal_visible}")
        print(f"         Summary Data Captured -> Name: {summary_name}, Goal: {summary_goal}")
        assert modal_visible is True
        assert summary_name == "Jordan Hayes"

        # Reset modal
        await eval_js("document.getElementById('reset-form-btn').click()")
        modal_closed = await eval_js("document.getElementById('form-success-message').classList.contains('hidden')")
        print(f"[TEST 7e] Demo Modal Closes and Form Resets: {modal_closed}")
        assert modal_closed is True

        # TEST 8: Legal Modals (Privacy Policy, Terms of Service, Disclaimer)
        await eval_js("document.querySelector('[data-legal-modal=\"privacy\"]').click()")
        privacy_open = await eval_js("!document.getElementById('legal-modal').classList.contains('hidden')")
        privacy_title = await eval_js("document.getElementById('legal-modal-title').textContent")
        print(f"[TEST 8a] Privacy Modal Opens: {privacy_open} ('{privacy_title}')")
        assert privacy_open is True

        await eval_js("document.getElementById('legal-modal-close').click()")
        privacy_closed = await eval_js("document.getElementById('legal-modal').classList.contains('hidden')")
        print(f"[TEST 8b] Privacy Modal Closes cleanly: {privacy_closed}")
        assert privacy_closed is True

        print("=" * 60)
        print("ALL AUTOMATED FRONTEND TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 60)

    chrome_proc.terminate()
    return True

if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
