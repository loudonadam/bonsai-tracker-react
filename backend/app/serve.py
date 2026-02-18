from __future__ import annotations

import threading
import webbrowser

import uvicorn

from .config import settings


def _launch_browser(url: str) -> None:
    try:
        webbrowser.open(url)
    except Exception:
        # Browser launch is best-effort; continue serving the API if it fails.
        pass


def main() -> None:
    url = f"http://{settings.host}:{settings.app_port}/"
    if settings.auto_open_browser:
        threading.Timer(1.5, _launch_browser, args=(url,)).start()

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.app_port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
