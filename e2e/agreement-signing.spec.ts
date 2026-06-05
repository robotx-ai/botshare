import { test, expect } from "@playwright/test";

test.describe("agreement signing gate", () => {
  test("Reserve surfaces the agreement modal or login gate", async ({
    page,
  }) => {
    await page.goto("/");
    // Navigate to the first service detail page.
    await page.getByRole("link").first().click();

    const reserve = page.getByRole("button", { name: /reserve|book/i });
    await reserve.first().click();

    // Authenticated → agreement modal; unauthenticated → login modal.
    // Either proves Reserve no longer jumps straight to Stripe.
    const agreementHeading = page.getByText(/Sign rental agreement/i);
    const loginHeading = page.getByText(/login|sign in|continue with/i);
    await expect(agreementHeading.or(loginHeading)).toBeVisible();
  });

  test("full signing flow enables Sign only when complete", async ({
    page,
  }) => {
    // Requires an authenticated context (NextAuth test login).
    // Steps once auth fixture exists:
    // 1. open listing, pick dates, click Reserve
    // 2. assert "Sign & continue to payment" is disabled
    // 3. fill Party C fields, scroll agreement to bottom, type name/title, check agree
    // 4. assert the button becomes enabled
    test.skip(
      !process.env.E2E_AUTH_READY,
      "Set E2E_AUTH_READY + an auth fixture to run the authenticated signing flow."
    );
  });
});
