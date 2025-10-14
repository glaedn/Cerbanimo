from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:3000/login")

        # Wait for the login page to load
        page.wait_for_url("**/login**")

        # Fill in the login form
        page.locator('input[type="email"]').fill("test@example.com")
        page.locator('input[type="password"]').fill("password")
        page.get_by_role("button", name="Continue").click()

        # Wait for the home page to load
        page.wait_for_url("**/orbit**")

        # Navigate to the realm hub
        page.goto("http://localhost:3000/realm/1")
        page.wait_for_url("**/realm/1**")
        page.wait_for_selector(".hub-title")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)