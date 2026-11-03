"""Check hero section overflow at 375px mobile viewport."""
import asyncio, json, base64, os, sys, subprocess, time

try:
    import websockets
except ImportError:
    os.system(f'"{sys.executable}" -m pip install websockets')
    import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
PORT = 9226

async def check():
    url = f"file:///{HTML_FILE.replace(os.sep, '/')}"
    # Start Chrome with about:blank first
    proc = subprocess.Popen([
        CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
        f"--remote-debugging-port={PORT}", "--window-size=375,812", "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    await asyncio.sleep(2)
    
    import urllib.request
    resp = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")
    targets = json.loads(resp.read())
    ws_url = targets[0]["webSocketDebuggerUrl"]
    
    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        msg_id = 1
        async def send_cmd(method, params=None):
            nonlocal msg_id
            cmd = {"id": msg_id, "method": method}
            if params: cmd["params"] = params
            msg_id += 1
            await ws.send(json.dumps(cmd))
            while True:
                r = json.loads(await ws.recv())
                if r.get("id") == cmd["id"]:
                    return r.get("result", {})
        
        # Set device metrics FIRST
        await send_cmd("Emulation.setDeviceMetricsOverride", {
            "width": 375, "height": 812, "deviceScaleFactor": 2, "mobile": True
        })
        
        # Now navigate to our page
        await send_cmd("Page.enable")
        await send_cmd("Page.navigate", {"url": url})
        await asyncio.sleep(3)  # Wait for fonts and rendering
        
        # Check overflow
        result = await send_cmd("Runtime.evaluate", {
            "expression": """
                (function() {
                    var body = document.body;
                    var html = document.documentElement;
                    var hero = document.getElementById('hero');
                    var headline = document.querySelector('.hero-headline');
                    var cs = headline ? getComputedStyle(headline) : null;
                    var lines = document.querySelectorAll('.hero-headline__line');
                    var lineData = [];
                    for (var i = 0; i < lines.length; i++) {
                        lineData.push({
                            text: lines[i].textContent.trim(),
                            width: lines[i].offsetWidth
                        });
                    }
                    var bottomContent = document.querySelector('.hero-bottom-content');
                    return JSON.stringify({
                        bodyScrollWidth: body.scrollWidth,
                        htmlScrollWidth: html.scrollWidth,
                        docClientWidth: html.clientWidth,
                        heroOffsetWidth: hero ? hero.offsetWidth : null,
                        heroScrollWidth: hero ? hero.scrollWidth : null,
                        heroOverflowCSS: hero ? getComputedStyle(hero).overflow : null,
                        headlineFontSize: cs ? cs.fontSize : null,
                        headlineWidth: headline ? headline.offsetWidth : null,
                        bottomContentWidth: bottomContent ? bottomContent.offsetWidth : null,
                        lines: lineData
                    });
                })()
            """,
            "returnByValue": True
        })
        
        if "result" in result and "value" in result["result"]:
            data = json.loads(result["result"]["value"])
            for key, val in data.items():
                print(f"  {key}: {val}")
        else:
            print("Result:", json.dumps(result, indent=2)[:500])
        
        # Also capture a screenshot
        ss = await send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {"x": 0, "y": 0, "width": 375, "height": 812, "scale": 1}
        })
        img = base64.b64decode(ss["data"])
        path = os.path.join(os.path.dirname(__file__), "screenshots", "hero_375_debug.png")
        with open(path, "wb") as f:
            f.write(img)
        print(f"\n  Screenshot saved: {path} ({len(img)} bytes)")
    
    proc.terminate()

asyncio.run(check())
