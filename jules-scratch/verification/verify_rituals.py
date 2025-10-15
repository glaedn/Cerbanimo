from playwright.sync_api import sync_playwright, expect
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Log in
    page.goto("http://localhost:3001/login")
    page.get_by_label("Email address").fill(os.environ.get("AUTH0_USERNAME"))
    page.get_by_label("Password").fill(os.environ.get("AUTH0_PASSWORD"))
    page.get_by_role("button", name="Continue").click()

    # Navigate to a realm
    page.goto("http://localhost:3001/realms")
    page.get_by_role("link", name="Soluna").click()

    # Go to rituals tab
    page.get_by_role("tab", name="Rituals").click()

    # Schedule a new ritual
    page.get_by_label("Title").fill("Test Ritual")
    page.get_by_label("Description").fill("This is a test ritual.")
    page.get_by_role("button", name="Schedule Ritual").click()

    # Verify the ritual is in the list
    expect(page.get_by_text("Test Ritual")).to_be_visible()

    page.screenshot(path="jules-scratch/verification/rituals.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)