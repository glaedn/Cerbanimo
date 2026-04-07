from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err.message}"))

        print("Navigating to app...")
        try:
            # First try the default route (GuildsDashboard)
            page.goto("http://localhost:3000/", wait_until="networkidle", timeout=30000)
            time.sleep(10)
            page.screenshot(path="/home/jules/verification/guilds_dashboard_mock.png", full_page=True)

            # Then try a community hub
            print("Navigating to Community Hub...")
            page.goto("http://localhost:3000/communities/1", wait_until="networkidle", timeout=30000)
            time.sleep(10)
            page.screenshot(path="/home/jules/verification/community_hub_mock.png", full_page=True)

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    run_verification()
