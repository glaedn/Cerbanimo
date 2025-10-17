from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate directly to the manifestation session page
        page.goto("http://localhost:3000/manifestation-session/1", timeout=60000)
        page.wait_for_selector('.manifestation-session-container', timeout=60000)

        # Submit an intention
        page.locator('input[placeholder="Declare your intention..."]').fill("My test intention")
        page.locator('button:has-text("[ SUBMIT ]")').click()

        # Resonate with an intention
        page.locator('.live-constellation').click() # Clicks on the constellation background to de-select any node
        page.wait_for_timeout(1000)
        page.locator('canvas').click(position={'x': 250, 'y': 250}) # Click on a node
        page.locator('button:has-text("[ RESONATE ]")').click()

        page.screenshot(path="jules-scratch/verification/verification.png")

        # End the session
        page.locator('button:has-text("[ END SESSION ]")').click()

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)