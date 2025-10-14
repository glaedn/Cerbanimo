from playwright.sync_api import sync_playwright, expect, TimeoutError

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Verify Home Page
        page.goto("http://localhost:3000/")
        expect(page.locator('.hero')).to_be_visible()
        expect(page.locator('.live-manifestations-list')).to_contain_text('resonating')
        page.screenshot(path="jules-scratch/verification/home-page.png")
    except (TimeoutError, AssertionError) as e:
        print(f"Home page verification failed: {e}")

    try:
        # Verify Intention Lotus Map
        page.goto("http://localhost:3000/lotus-map/1")
        expect(page.locator('.lotus-map-container')).to_be_visible()
        expect(page.locator('.node')).to_be_visible()
        page.screenshot(path="jules-scratch/verification/intention-lotus-map.png")
    except (TimeoutError, AssertionError) as e:
        print(f"Intention lotus map verification failed: {e}")

    try:
        # Verify Realms Mesh
        page.goto("http://localhost:3000/realms-mesh")
        expect(page.locator('.realms-mesh-container')).to_be_visible()
        expect(page.locator('.node')).to_be_visible()
        page.screenshot(path="jules-scratch/verification/realms-mesh.png")
    except (TimeoutError, AssertionError) as e:
        print(f"Realms mesh verification failed: {e}")


    browser.close()

with sync_playwright() as playwright:
    run(playwright)