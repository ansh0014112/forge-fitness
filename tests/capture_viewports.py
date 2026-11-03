import asyncio
import websockets
import json
import subprocess
import time
import urllib.request
import base64
import os

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TARGET_URL = r"file:///d:/Downloads/gym website main design/index.html"
DEBUG_PORT = 9228

VIEWPORTS = [
    {"name": "hero_375px_mobile.png", "w": 375, "h": 812, "mobile": True},
    {"name": "hero_768px_tablet.png", "w": 768, "h": 1024, "mobile": False},
    {"name": "hero_1440px_desktop.png", "w": 1440, "h": 900, "mobile": False},
]

async def capture():
    proc = subprocess.Popen([
        CHROME_PATH,
        f"--remote-debugging-port={DEBUG_PORT}",
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=1440,900",
        TARGET_URL
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.0)

    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{DEBUG_PORT}/json")
        targets = json.loads(req.read().decode())
        ws_url = None
        for t in targets:
            if t.get("type") == "page":
                ws_url = t.get("webSocketDebuggerUrl")
                break

        if not ws_url:
            print("No page target.")
            return

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

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await asyncio.sleep(1.0)

            os.makedirs(r"d:\Downloads\gym website main design\tests\screenshots", exist_ok=True)

            for vp in VIEWPORTS:
                await send_cmd("Emulation.setDeviceMetricsOverride", {
                    "width": vp["w"],
                    "height": vp["h"],
                    "deviceScaleFactor": 1,
                    "mobile": vp["mobile"]
                })
                # Scroll to top to ensure hero is completely in view
                await send_cmd("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
                await asyncio.sleep(1.5)

                shot = await send_cmd("Page.captureScreenshot", {"format": "png"})
                if shot.get("data"):
                    out_path = os.path.join(r"d:\Downloads\gym website main design\tests\screenshots", vp["name"])
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(shot["data"]))
                    print(f"Captured {vp['name']}: {os.path.getsize(out_path)} bytes")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(capture())
