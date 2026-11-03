"""Quick hero screenshot capture using test suite CDP approach."""
import asyncio, json, base64, os, sys, subprocess, time

try:
    import websockets
except ImportError:
    os.system(f'"{sys.executable}" -m pip install websockets')
    import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
SSDIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SSDIR, exist_ok=True)
PORT = 9222

async def main():
    url = f"file:///{HTML.replace(chr(92), '/')}"
    
    # Kill Chrome
    subprocess.run(["taskkill", "/f", "/im", "chrome.exe"], capture_output=True)
    time.sleep(2)
    
    # Start fresh 
    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
         f"--remote-debugging-port={PORT}", "--window-size=1440,900", url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    time.sleep(3)
    
    import urllib.request
    try:
        resp = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=5)
    except:
        print("Cannot connect to Chrome")
        proc.terminate()
        return
        
    targets = json.loads(resp.read())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    
    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        _id = [0]
        async def cdp(method, params=None):
            _id[0] += 1
            m = {"id": _id[0], "method": method}
            if params: m["params"] = params
            await ws.send(json.dumps(m))
            while True:
                r = json.loads(await ws.recv())
                if r.get("id") == _id[0]:
                    return r.get("result", {})
        
        viewports = [
            ("hero_1440_desktop", 1440, 900),
            ("hero_768_tablet", 768, 1024),
            ("hero_375_mobile", 375, 812),
        ]
        
        for name, w, h in viewports:
            await cdp("Emulation.setDeviceMetricsOverride", {
                "width": w, "height": h, "deviceScaleFactor": 1, "mobile": w < 768
            })
            # Reload to get fresh paint
            await cdp("Page.reload")
            await asyncio.sleep(3)
            
            # Get body scrollWidth 
            info = await cdp("Runtime.evaluate", {
                "expression": "document.body.scrollWidth + 'x' + document.documentElement.clientWidth"
            })
            print(f"  {name}: bodyScrollW={info.get('result',{}).get('value','?')}")
            
            # Screenshot
            r = await cdp("Page.captureScreenshot", {
                "format": "png",
                "clip": {"x": 0, "y": 0, "width": w, "height": h, "scale": 1}
            })
            data = base64.b64decode(r["data"])
            out = os.path.join(SSDIR, f"{name}.png")
            with open(out, "wb") as f: f.write(data)
            print(f"  -> {name}.png ({len(data):,} bytes)")
    
    proc.terminate()
    print("\nAll screenshots captured!")

asyncio.run(main())
