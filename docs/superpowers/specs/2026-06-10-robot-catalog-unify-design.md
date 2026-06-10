# Robot Catalog Unification — Design Spec

**Date:** 2026-06-10
**Status:** Approved design → ready for implementation plan

## Goal

Turn a messy, 34-sheet vendor Excel workbook (`Shopify Robot Sheet.xlsx`, 66 MB, 888 embedded
images) into **one clean, unified product table** of main robots, plus an extracted image folder.
The unified catalog becomes the source of truth a provider can later pick from when listing a robot
service on BotShare.

This spec covers only the data-unification deliverable. App/DB integration (a Products table,
the provider picker UI) is explicitly **out of scope** and handled in a later cycle.

## Source Data Reality

- **34 sheets**, ~18 main-robot sheets + ~16 accessory/parts/vendor sheets.
- **Every brand uses a different column layout.** Examples:
  - Agibot: `Style | Product Model | Picture | Description | MSRP | SKU No. | Remark`
  - Keenon: `Product Model | Picture | Description | Specification | MSRP | SKU No. | Remark`
  - Unitree G1: `Pictures | Model | Description | Target market | MSRP (USD) | Notes`
  - Go2: title banner rows, then `Package | Model | Appearance | Description | MSRP(USD)`
  - K1 / T1: `Type | Parameters | FOB Price (USD)` with "Hardware/Software Platform" sub-headers
  - Pudu: sub-category header rows ("Service Robot", "Cleaning Robot") interleaved with products
- **Brand name lives in the sheet name**, not a column.
- **Descriptions span many rows** — one spec per row, product cell merged vertically (e.g. Unitree
  G1 merges `A2:A31`, `B2:B31`, `D2:D31`).
- **SKUs only exist for some brands** (Agibot, Pudu, Keenon partial).
- **Pictures are floating drawing images** anchored to cells. openpyxl fails to read these anchors,
  but parsing `xl/drawings/drawingN.xml` + its `.rels` directly yields a reliable
  `(row, col) → media/imageNN.png` mapping (verified on Agibot: Picture col=2, rows align to products).

## Scope Decisions (locked)

| Decision | Choice |
|---|---|
| Rows included | **Main robots only** (~18 sheets). Accessories/parts/vendor sheets excluded. |
| Tagging | **Two columns**: `ServiceCategory` (BotShare's 3 canonical) + `CapabilityTag` (richer). |
| Pictures | **Extract to `robot-images/` folder**, reference relative path in the Picture cell. |
| Output location | **In repo: `data/robot-catalog/`**. |
| Ambiguous tags | **Best-guess + a `NeedsReview` flag column** marking uncertain rows. |

## Deliverables

1. `data/robot-catalog/RobotCatalog.xlsx` — single sheet, unified columns, one row per robot model.
2. `data/robot-catalog/robot-images/` — extracted images, named `brand_model.png` (slugified).
3. `scripts/build-robot-catalog.py` — the one-off generator (repeatable; lives in `scripts/`).

## Unified Schema (output columns)

| Column | Rule |
|---|---|
| `BrandName` | Derived from sheet name via a brand map (Unitree, Agibot, Keenon, Pudu, Noetix, Zeroth, …). |
| `SKU` | From the sheet's SKU column where present; blank otherwise. |
| `Picture` | Relative path `robot-images/<brand>_<model>.png` (extracted via drawing-anchor parsing). Blank if no image anchored. |
| `Product name` | `BrandName + " " + Model` by default, or a distinct marketing name when the sheet provides one. |
| `Model` | Raw model string (e.g. `G1 Basic`, `X2 Lite`, `T8 Delivery Robot`). |
| `Description` | Multi-row specs collapsed into one cell, newline-joined, using merged-cell ranges to group rows under their product. |
| `MSRP (USD)` | Normalized numeric value; sourced from `MSRP` / `MSRP (USD)` / `FOB Price (USD)` depending on sheet. |
| `ServiceCategory` | One of `Showcase & Performance` / `Warehouse` / `Restaurant`. |
| `CapabilityTag` | One of: `humanoid`, `quadruped`, `delivery`, `cleaning`, `reception`, `industrial`, `education`. |
| `NeedsReview` | `TRUE` when category/tag (or any field) was a low-confidence best guess. |

## Tagging Rules (defaults — editable in the output sheet)

`CapabilityTag` is assigned per model from name/description keywords. `ServiceCategory` is derived
from the capability:

- **Restaurant** ← `delivery`, `reception` (Keenon T-series; Pudu BellaBot/KettyBot/FlashBot/PuduBot).
- **Warehouse** ← `industrial`, `cleaning`, logistics quadrupeds (B2 series; cleaning robots; A2).
- **Showcase & Performance** ← `humanoid`, consumer `quadruped` (Unitree G1/R1/Go2; Agibot X2; K1; T1; Noetix; Zeroth).

Any model whose capability/category is inferred with low confidence gets `NeedsReview = TRUE`.

## Architecture

`scripts/build-robot-catalog.py`, structured as small, independently-understandable units:

1. **Workbook reader** — opens the `.xlsx`; exposes per-sheet cell grids and merged ranges.
2. **Drawing/image extractor** — parses `xl/drawings/*` + `.rels` to map `(sheet, row) → media file`;
   writes deduped images to `robot-images/` with slugified names.
3. **Per-sheet adapters** — a small config per main-robot sheet describing: header row index,
   column roles (model/desc/sku/msrp/picture), where products start, and which rows are
   sub-category headers to skip. This is where the irregularity is absorbed.
4. **Row normalizer** — collapses multi-row descriptions, normalizes MSRP, builds Product name,
   attaches the image path.
5. **Tagger** — keyword-based capability → category mapping; sets `NeedsReview`.
6. **Writer** — emits `RobotCatalog.xlsx` with the 10 columns.

## Open Items to Resolve During Build

- **Noetix松延动力** sheet appeared empty in its top rows — inspect closely; it may use a different
  layout or be genuinely empty (then it's dropped with a logged note).
- **K1 / T1** sheet names carry no brand — confirm the correct brand (check `Vendor List` sheet)
  before assigning `BrandName`.
- Final per-sheet column maps for the sheets not yet sampled (R1, B2, G1-D, A2-W, Zeroth) — confirmed
  during implementation against each sheet's actual header row.

## Out of Scope (later cycles)

- Uploading images to Cloudinary.
- A Prisma `Product`/catalog model and the provider "pick a robot" listing flow.
- Accessories / spare parts / consumables catalog.

## Success Criteria

- One `.xlsx` with every main robot as a single row, all 10 columns populated (Picture/SKU may be
  legitimately blank).
- Each row's image, when present, correctly corresponds to that robot.
- Descriptions are readable single cells, not fragmented across rows.
- Every row has a ServiceCategory + CapabilityTag, with uncertain ones flagged for quick review.
- Re-running the script reproduces the same output (deterministic).
