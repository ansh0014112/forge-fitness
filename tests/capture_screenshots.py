import sys
import subprocess
import time
import json
import urllib.request
import asyncio
import os
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_DIR = r"d:\Downloads\gym website main design"
LOGIN_URL = f"file:///{BASE_DIR.replace(os.sep, '/')}/trainer/login.html"
DASHBOARD_URL = f"file:///{BASE_DIR.replace(os.sep, '/')}/trainer/dashboard.html"
DEBUG_PORT = 9224
OUTPUT_DIR = os.path.join(BASE_DIR, "tests", "screenshots")

async def capture_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    chrome_proc = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=1440,900",
        LOGIN_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    await asyncio.sleep(2.0)

    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json")
        targets = json.loads(req.read().decode())
        ws_url = None
        for t in targets:
            if t.get("type") == "page":
                ws_url = t.get("webSocketDebuggerUrl")
                break

        if not ws_url:
            print("No WebSocket page target found")
            return

        async with websockets.connect(ws_url) as ws:
            msg_id = 1
            async def send_cmd(method, params=None):
                nonlocal msg_id
                cmd = {"id": msg_id, "method": method}
                if params: cmd["params"] = params
                msg_id += 1
                await ws.send(json.dumps(cmd))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == cmd["id"]:
                        return resp.get("result", {})

            # 1. Login Screenshot
            await send_cmd("Page.navigate", {"url": LOGIN_URL})
            await asyncio.sleep(1.2)
            shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUTPUT_DIR, "trainer_login.png"), "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Saved trainer_login.png")

            # 2. Log in and go to Dashboard
            await send_cmd("Runtime.evaluate", {
                "expression": "window.TrainerAuth.login('coach.haisam@forgefitness.com', 'Forg3Fitness2026!'); window.location.href = '" + DASHBOARD_URL + "';",
                "returnByValue": True
            })
            await asyncio.sleep(1.5)
            shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUTPUT_DIR, "trainer_dashboard_desktop.png"), "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Saved trainer_dashboard_desktop.png")

            # 3. Mobile View 375px
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 375,
                "height": 812,
                "deviceScaleFactor": 1,
                "mobile": True
            })
            await asyncio.sleep(0.8)
            shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUTPUT_DIR, "trainer_dashboard_mobile.png"), "wb") as f:
                f.write(base64.b64decode(shot["data"]))
            print("Saved trainer_dashboard_mobile.png")

    finally:
        chrome_proc.kill()

if __name__ == "__main__":
    asyncio.run(capture_all())
