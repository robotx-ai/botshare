# RobotX Term Map

## Canonical Product Framing
- Product: RobotX service rental marketplace (single provider: RobotX).
- Primary domain: `robotxshare.com`.
- Secondary commerce domain: `robotxshop.com`.

## Canonical Service Categories
- `Showcase & Performance` (`showcase-performance`)
- `Warehouse` (`warehouse`)
- `Restaurant` (`restaurant`)

## Replacement Table
| Legacy term | Canonical term | Usage guidance |
| --- | --- | --- |
| listing | service | Use in all customer-facing copy. |
| host | RobotX or service operator | Avoid marketplace/host language in MVP. |
| guest | customer | Use for booking actor. |
| home/place/property | service package or deployment | Choose based on sentence context. |
| reservation | booking | Use in visible labels and messages. |
| per night | per day | Pricing semantics are daily in MVP. |
| AirCover | RobotX Service Assurance | Placeholder policy name for UI text. |

## Banned customer-facing terms
These should not appear in new user-facing copy:
- Airbnb
- host
- guest
- property
- per night
- AirCover

## Naming guidance for code
- Prefer semantic naming in new code (`service`, `booking`) where safe.
- Route names and DB field names may stay legacy for compatibility.
- Do not rename stable API paths solely for terminology cleanup.
