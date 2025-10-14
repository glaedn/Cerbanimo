from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in
    page.goto("http://localhost:3000/login")
    page.wait_for_timeout(5000)  # Wait for 5 seconds
    page.screenshot(path="jules-scratch/verification/login-page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)