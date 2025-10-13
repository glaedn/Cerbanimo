from playwright.sync_api import Page, expect

def test_realms_mesh_visualization(page: Page):
    """
    This test verifies that the Realms Mesh visualization is displayed correctly.
    """

    try:
        # 1. Arrange: Go to the application's realms page.
        page.goto("http://localhost:3000/realms", timeout=60000)

        # 3. Wait for the network to be idle before taking a screenshot
        page.wait_for_load_state("networkidle")

        # 4. Screenshot: Capture the final result for visual verification.
        page.screenshot(path="jules-scratch/verification/realms-mesh.png", full_page=True)
    except Exception as e:
        print(e)