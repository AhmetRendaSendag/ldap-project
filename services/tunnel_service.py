import time
import json
import urllib.request
import subprocess


METRICS_ADDR = "127.0.0.1:2000"
_process = None

def is_running() -> bool:
    if _process is not None:
        if _process.poll() is not None:
            return False
        return True
    return False

def _read_hostname(timeout) -> str | None:
    try:
        url = f"http://{METRICS_ADDR}/quicktunnel"
        with urllib.request.urlopen(url, timeout=timeout) as response:
            body = response.read()
        data = json.loads(body)
        return(data["hostname"])
    except Exception:
        return None

def start() -> str:
    global _process
    if is_running():
       return get_public_url() 
    _process = subprocess.Popen(
        ["cloudflared", "tunnel", "--no-autoupdate", "--url",
        "http://localhost:8000", "--metrics", METRICS_ADDR],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ) 
    for _ in range(20):
        hostname = _read_hostname(1)
        if hostname is not None:
            return f"https://{hostname}"
        time.sleep(1)
    stop()
    raise RuntimeError("Tunnel did not respond in time")

def stop():
    global _process
    if _process is not None:
         _process.terminate()
         _process.wait(timeout=5)
    _process = None
    return

def get_public_url() -> str | None:
    if not is_running():
        return None
    url = _read_hostname(1)
    if url is not None:
        return f"https://{url}"
    return None
    