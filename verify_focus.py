import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/home/jules/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome')
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Bypass auth
        await page.add_init_script("window.localStorage.setItem('token', 'mock-token');")
        await page.add_init_script("window.sessionStorage.setItem('has_been_redirected_to_profile', 'true');")

        # Go to Home (landing) - should not have side panel
        await page.goto('http://localhost:3000/')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification/home_page.png')

        # Go to Orbit - should have side panel
        await page.goto('http://localhost:3000/orbit')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification/orbit_page.png')

        # Go to Profile - check Resume section
        await page.goto('http://localhost:3000/orbit/profile')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification/profile_page.png')

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
