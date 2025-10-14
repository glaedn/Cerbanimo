from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to a realm page (assuming realm with ID 1 exists)
    page.goto("http://localhost:3000/realm/1")

    # Click the "Rituals" tab
    rituals_tab = page.get_by_role("tab", name="Rituals")
    rituals_tab.click()

    # Click the "Schedule New Manifestation" button
    schedule_button = page.get_by_role("button", name="Schedule New Manifestation")
    schedule_button.click()

    # Wait for the dialog to appear and take a screenshot
    expect(page.get_by_role("dialog")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)