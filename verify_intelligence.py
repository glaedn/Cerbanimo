import os
from playwright.sync_api import sync_playwright

def verify_orbit_intelligence(page):
    # Set bypass auth flag in localStorage
    # The application might be using VITE_BYPASS_AUTH environment variable
    # but for a running build we might need to mock auth or use the bypass if it's implemented in the code

    # Go to Orbit page
    print("Navigating to http://localhost:3000/orbit")
    try:
        # Navigate and wait for content
        page.goto("http://localhost:3000/orbit", wait_until="networkidle", timeout=30000)
    except Exception as e:
        print(f"Navigation failed: {e}")

    # Wait for the intelligence signals to appear (or at least the sidebar)
    page.wait_for_timeout(5000)

    # Take screenshot of the Orbit page
    cwd = os.getcwd()
    screenshot_path = os.path.join(cwd, "orbit_intelligence.png")
    page.screenshot(path=screenshot_path, full_page=True)
    print(f"Screenshot saved to {screenshot_path}")

if __name__ == "__main__":
    with sync_playwright() as p:
        try:
            browser = p.firefox.launch(executable_path="/home/jules/.cache/ms-playwright/firefox-1509/firefox/firefox", headless=True)
        except:
            browser = p.firefox.launch(headless=True)

        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        # Add bypass auth environment variable for the browser session if possible
        # Or just hope it's picked up by the app if we set it in the environment
        page = context.new_page()
        try:
            verify_orbit_intelligence(page)
        finally:
            browser.close()
