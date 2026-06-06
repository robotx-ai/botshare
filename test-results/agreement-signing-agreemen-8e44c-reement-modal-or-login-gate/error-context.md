# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agreement-signing.spec.ts >> agreement signing gate >> Reserve surfaces the agreement modal or login gate
- Location: e2e/agreement-signing.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /reserve|book/i }).first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e5]:
    - img "logo" [ref=e7] [cursor=pointer]
    - generic [ref=e10] [cursor=pointer]:
      - generic [ref=e11]: Any Area
      - generic [ref=e12]: Any Dates
      - img [ref=e15]
    - generic [ref=e17]:
      - link "Robot Types" [active] [ref=e18] [cursor=pointer]:
        - /url: /robot-types
      - generic [ref=e21] [cursor=pointer]:
        - img [ref=e22]
        - img "Avatar" [ref=e25]
  - generic [ref=e27]:
    - generic [ref=e29]:
      - generic [ref=e30]: Browse Robot Types
      - generic [ref=e31]: Compare robot models by per-day pricing.
    - generic [ref=e32]:
      - generic [ref=e33]:
        - img "AGIBOT D1 Edu" [ref=e35]
        - generic [ref=e36]:
          - generic [ref=e37]:
            - paragraph [ref=e38]: AGIBOT D1 Edu
            - paragraph [ref=e39]: Single Type Deal · 1 service package available
          - generic [ref=e41]: Showcase & Performance
          - generic [ref=e43]:
            - generic [ref=e44]: Per day
            - generic [ref=e45]: $100
          - generic [ref=e46]:
            - link "Book by type" [ref=e47] [cursor=pointer]:
              - /url: /robot-types/agibot-d1-edu
            - link "View bundle deals" [ref=e48] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+D1+Edu
      - generic [ref=e49]:
        - img "AGIBOT D1 Ultra" [ref=e51]
        - generic [ref=e52]:
          - generic [ref=e53]:
            - paragraph [ref=e54]: AGIBOT D1 Ultra
            - paragraph [ref=e55]: Single Type Deal · 1 service package available
          - generic [ref=e57]: Showcase & Performance
          - generic [ref=e59]:
            - generic [ref=e60]: Per day
            - generic [ref=e61]: $200
          - generic [ref=e62]:
            - link "Book by type" [ref=e63] [cursor=pointer]:
              - /url: /robot-types/agibot-d1-ultra
            - link "View bundle deals" [ref=e64] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+D1+Ultra
      - generic [ref=e65]:
        - img "AGIBOT X2" [ref=e67]
        - generic [ref=e68]:
          - generic [ref=e69]:
            - paragraph [ref=e70]: AGIBOT X2
            - paragraph [ref=e71]: Single Type Deal · 5 service packages available
          - generic [ref=e73]: Showcase & Performance
          - generic [ref=e75]:
            - generic [ref=e76]: Per day
            - generic [ref=e77]: $300
          - generic [ref=e78]:
            - link "Book by type" [ref=e79] [cursor=pointer]:
              - /url: /robot-types/agibot-x2
            - link "View bundle deals" [ref=e80] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+X2
      - generic [ref=e81]:
        - img "AgiBot G2" [ref=e83]
        - generic [ref=e84]:
          - generic [ref=e85]:
            - paragraph [ref=e86]: AgiBot G2
            - paragraph [ref=e87]: Single Type Deal · 1 service package available
          - generic [ref=e89]: Warehouse
          - generic [ref=e91]:
            - generic [ref=e92]: Per day
            - generic [ref=e93]: $450
          - generic [ref=e94]:
            - link "Book by type" [ref=e95] [cursor=pointer]:
              - /url: /robot-types/agibot-g2
            - link "View bundle deals" [ref=e96] [cursor=pointer]:
              - /url: /services?robotModel=AgiBot+G2
      - generic [ref=e97]:
        - img "AGIBOT X2 Ultra" [ref=e99]
        - generic [ref=e100]:
          - generic [ref=e101]:
            - paragraph [ref=e102]: AGIBOT X2 Ultra
            - paragraph [ref=e103]: Single Type Deal · 3 service packages available
          - generic [ref=e105]: Showcase & Performance
          - generic [ref=e107]:
            - generic [ref=e108]: Per day
            - generic [ref=e109]: $500
          - generic [ref=e110]:
            - link "Book by type" [ref=e111] [cursor=pointer]:
              - /url: /robot-types/agibot-x2-ultra
            - link "View bundle deals" [ref=e112] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+X2+Ultra
      - generic [ref=e113]:
        - img "AgiBot A2" [ref=e115]
        - generic [ref=e116]:
          - generic [ref=e117]:
            - paragraph [ref=e118]: AgiBot A2
            - paragraph [ref=e119]: Single Type Deal · 1 service package available
          - generic [ref=e121]: Showcase & Performance
          - generic [ref=e123]:
            - generic [ref=e124]: Per day
            - generic [ref=e125]: $580
          - generic [ref=e126]:
            - link "Book by type" [ref=e127] [cursor=pointer]:
              - /url: /robot-types/agibot-a2
            - link "View bundle deals" [ref=e128] [cursor=pointer]:
              - /url: /services?robotModel=AgiBot+A2
      - generic [ref=e129]:
        - img "AGIBOT A2 Ultra" [ref=e131]
        - generic [ref=e132]:
          - generic [ref=e133]:
            - paragraph [ref=e134]: AGIBOT A2 Ultra
            - paragraph [ref=e135]: Single Type Deal · 1 service package available
          - generic [ref=e137]: Showcase & Performance
          - generic [ref=e139]:
            - generic [ref=e140]: Per day
            - generic [ref=e141]: $800
          - generic [ref=e142]:
            - link "Book by type" [ref=e143] [cursor=pointer]:
              - /url: /robot-types/agibot-a2-ultra
            - link "View bundle deals" [ref=e144] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+A2+Ultra
      - generic [ref=e145]:
        - img "AGIBOT C5" [ref=e147]
        - generic [ref=e148]:
          - generic [ref=e149]:
            - paragraph [ref=e150]: AGIBOT C5
            - paragraph [ref=e151]: Single Type Deal · 1 service package available
          - generic [ref=e153]: Showcase & Performance
          - generic [ref=e155]:
            - generic [ref=e156]: Per day
            - generic [ref=e157]: $1000
          - generic [ref=e158]:
            - link "Book by type" [ref=e159] [cursor=pointer]:
              - /url: /robot-types/agibot-c5
            - link "View bundle deals" [ref=e160] [cursor=pointer]:
              - /url: /services?robotModel=AGIBOT+C5
  - alert [ref=e161]
  - generic [ref=e162]:
    - generic [ref=e163]:
      - heading "BOTSHARING US" [level=5] [ref=e164]
      - paragraph [ref=e165]: About BotSharing US
      - paragraph [ref=e166]: Service categories
      - paragraph [ref=e167]: Company updates
      - paragraph [ref=e168]: Careers
      - paragraph [ref=e169]: Partnerships
    - generic [ref=e170]:
      - heading "Support" [level=5] [ref=e171]
      - paragraph [ref=e172]: Help Center
      - paragraph [ref=e173]: BotSharing US Service Assurance
      - paragraph [ref=e174]: Booking options
      - paragraph [ref=e175]: Safety information
      - paragraph [ref=e176]: Report an issue
    - generic [ref=e177]:
      - heading "Services" [level=5] [ref=e178]
      - paragraph [ref=e179]: Showcase & Performance
      - paragraph [ref=e180]: Warehouse
      - paragraph [ref=e181]: Restaurant
      - paragraph [ref=e182]: Deployment guides
    - generic:
      - paragraph
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("agreement signing gate", () => {
  4  |   test("Reserve surfaces the agreement modal or login gate", async ({
  5  |     page,
  6  |   }) => {
  7  |     await page.goto("/");
  8  |     // Navigate to the first service detail page.
  9  |     await page.getByRole("link").first().click();
  10 | 
  11 |     const reserve = page.getByRole("button", { name: /reserve|book/i });
> 12 |     await reserve.first().click();
     |                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  13 | 
  14 |     // Authenticated → agreement modal; unauthenticated → login modal.
  15 |     // Either proves Reserve no longer jumps straight to Stripe.
  16 |     const agreementHeading = page.getByText(/Sign rental agreement/i);
  17 |     const loginHeading = page.getByText(/login|sign in|continue with/i);
  18 |     await expect(agreementHeading.or(loginHeading)).toBeVisible();
  19 |   });
  20 | 
  21 |   test("full signing flow enables Sign only when complete", async ({
  22 |     page,
  23 |   }) => {
  24 |     // Requires an authenticated context (NextAuth test login).
  25 |     // Steps once auth fixture exists:
  26 |     // 1. open listing, pick dates, click Reserve
  27 |     // 2. assert "Sign & continue to payment" is disabled
  28 |     // 3. fill Party C fields, scroll agreement to bottom, type name/title, check agree
  29 |     // 4. assert the button becomes enabled
  30 |     test.skip(
  31 |       !process.env.E2E_AUTH_READY,
  32 |       "Set E2E_AUTH_READY + an auth fixture to run the authenticated signing flow."
  33 |     );
  34 |   });
  35 | });
  36 | 
```