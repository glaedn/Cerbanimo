from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # 1. Guilds Dashboard
        print("Navigating to Guilds Dashboard...")
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.goto("http://localhost:3000/", wait_until="networkidle", timeout=60000)
        time.sleep(10) # Give it plenty of time for animations and mocks
        page.screenshot(path="/home/jules/verification/guilds_dashboard_v3.png", full_page=True)
        print("Guilds Dashboard screenshot taken.")

        # 2. Guild Hub
        print("Navigating to Guild Hub...")
        try:
            # We don't wait for .guild-card, just find 'ENTER HUB'
            page.get_by_role("button", name="ENTER HUB").first.click()
            time.sleep(5) # Wait for navigation and fetch
            page.screenshot(path="/home/jules/verification/guild_hub_v3.png")
            print("Guild Hub screenshot taken.")
        except Exception as e:
            print(f"Error navigating to Guild Hub: {e}")

        # 3. Community Hub
        print("Navigating to Community Hub...")
        page.goto("http://localhost:3000/communities/1", wait_until="networkidle", timeout=60000)
        time.sleep(5)
        page.screenshot(path="/home/jules/verification/community_hub_v3.png")
        print("Community Hub screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run_verification()
