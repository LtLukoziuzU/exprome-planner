# Progress Log

A chronological record of what was built, decisions made, and why. Companion to `PLAN.md` (the locked-in spec) — this is the narrative.

---

## Goal

A static web app for planning party skill trees and outpost upgrades for *Expeditions: Rome*. Hosted free on GitHub Pages, no backend, no paid services. Skill data comes from a community wiki scrape; outpost data will be hand-authored later.

---

## 1. Planning phase

Started from a blank directory plus `scraped_skills.md` (wiki dump of all 96 skills) and two in-game screenshots (party skills screen + outpost tree). Worked through a Q&A sequence to lock in every meaningful design decision before writing code.

### Decisions reached

| Topic | Decision | Why |
|---|---|---|
| **Tech stack** | Vite + Svelte + TypeScript, static build | Svelte's reactivity fits interconnected state (tier locks, point counters, refund cascades) without the React boilerplate; ~20KB bundle; GH Pages-friendly with `base: './'`. |
| **Persistence** | `localStorage`, multiple named builds, auto-save on every change | No backend; the user wanted a manager for several saved parties. Auto-save matches what users expect from a planner. |
| **Party scope** | 1 PC (any class, named) + 5 canonical loyals (fixed names/classes) + unlimited praetorians | Mirrors the in-game roster: PC + 5 named companions + freely-recruited praetorians. |
| **Loyal roster** | Caeso Quinctius Aquilinius (Princeps), Syneros (Triarius), Bestia Tabat (Veles), Julia Calida (Sagittarius), Deaineira (Princeps) | User-supplied. Verginia Assilia in the source screenshot was actually the PC slot, not a loyal. |
| **Skill budget** | 20 points per character (was 19) | Game gives 19 from level-ups plus 1 pre-spent at character creation = 20 total available to plan. |
| **Skill ranks** | Each rank = 1 point; max ranks vary 1–3 per skill | Matches in-game `X / Y` cell display. |
| **Tier rules** | Tier 2 needs ≥1 / tier 3 ≥4 / tier 4 ≥7 points *per specialization* | Per-spec, not per-class — confirmed against the source screenshot (Assassin tier 2 was locked while Duelist/Brawler tier 2 was open in the same character). |
| **Per-skill prereqs** | 11 child→parent pairs (Fortress←Brace, etc.) | Wiki doesn't capture these; user dictated them. They show as connector lines in-game. |
| **Enforcement** | Hard-enforce all rules — illegal clicks refused | User wanted invalid builds to be impossible, not just flagged. |
| **Refund cascade** | Block the refund if it would invalidate any allocated child or drop the spec below a tier threshold | Auto-cascading silently wipes planning work; soft-warning contradicts "hard enforce". |
| **Visual style** | Squares for active skills, circles for passive, segmented rank fill | User asked for shape distinction with rank progress visible. Mapping comes from the scrape's `active`/`passive` label (verified faithful to the game). |
| **Tooltips** | Hover on desktop, tap-to-open-card on mobile | Touch has no hover; decoupling read-about-it from allocate-it on mobile prevents accidental edits. |
| **Out of scope** | Equipped/hotbar bar, build comparison, image export, URL share | Kept MVP tight. |
| **Traits (HEROIC, DEVOTED, etc.)** | Ignored entirely | User clarified these are morale state, not character build data. |
| **Devices** | Desktop + responsive mobile | Game itself is desktop, but the planner should still work on phones. |
| **Outpost** | Deferred entire workstream | User would gather outpost data separately. Party-side ships first. |

### Reference screenshots saved

Cropped per-class skill-tree shots into `reference/` (e.g., `02-princeps-tree.png`) so the data can be re-verified against the game UI without re-spelunking the chat history.

---

## 2. Data validation

User dictated the canonical max-rank table column-by-column for all 12 specs. Compared against the scrape parser's heuristic (`Upgrade:` → 2 ranks, `Upgrade 1: ... Upgrade 2:` → 3 ranks, `Rank 1/2` → 2 ranks, none → 1 rank).

**Result**: 96/96 match. The parser's heuristic was correct on every skill — my earlier flagged "mismatches" turned out to be me misreading the small `X/Y` numbers in the screenshots. No override table needed.

Also dictated: the 11 per-skill prereqs (parent must have ≥1 rank to unlock child) since the wiki doesn't capture those.

---

## 3. Initial implementation

Built in shippable slices per `PLAN.md` §5.

### 3.1 Data pipeline (`scripts/parse-skills.ts`)

- Reads `scraped_skills.md`, walks the structured headers (`## CLASS`, `### Spec`, `**Column 1/2:**`, numbered skill bullets).
- Applies the canonical max-rank table positionally (class → spec → column → row).
- Wires up the 11 `requiresSkillId` prereqs.
- Outputs `src/data/skills.json` — 4 classes × 3 specs × 8 skills = 96 entries.
- Sanity check: every prereq's child and parent must exist as a real skill id.

### 3.2 Rules engine (`src/lib/rules.ts`)

Pure functions used by both UI and store:
- `totalPointsSpent`, `remainingPoints`, `pointsInSpec`
- `tierUnlocked` (per-spec point threshold check)
- `canIncrease` — returns `{ ok, reason }`; covers budget cap, tier rule, per-skill prereq, max-rank cap.
- `canDecrease` — covers two cascade checks: (a) would the refund drop the spec below a threshold required by some other allocated skill in that spec; (b) is this the last rank of a parent that some child currently depends on.

### 3.3 State (`src/lib/state/builds.ts`)

Svelte store backed by `localStorage` with key `exprome:builds:v1`. Builds are `PartyBuild` records (PC + loyals map + praetorians array). Auto-persists on every change via `store.subscribe`. Initial load seeds an empty "My Party" build if none exist. Versioned key for future schema migrations.

### 3.4 UI components

Layered Svelte components:
- `App.svelte` — header (brand, tab switcher, build manager), main, footer.
- `PartyTab.svelte` — two-pane: roster rail (left) + character sheet (right). Tracks the selected character slot.
- `RosterRow.svelte` — one row per character with class-tinted avatar, name, class label, points counter.
- `CharacterSheet.svelte` — header (name, class, points) + 3-spec grid + the modal detail card on touch.
- `SpecColumn.svelte` — header (spec name, invested points) + 4×2 grid of cells, with tier-lock overlay per row.
- `SkillCell.svelte` — one cell. Click increments (right-click / shift-click decrements); illegal clicks shake briefly. Hover triggers the custom tooltip. Touch dispatches a `focusskill` event that surfaces the detail card.
- `SkillDetailCard.svelte` — bottom-sheet modal on mobile (centered popover on tablets+) with name/desc and explicit ＋/− buttons.
- `RankShape.svelte` — visual primitive (square for active, circle for passive, segmented rank fill).

### 3.5 Deployment

`.github/workflows/deploy.yml` — on push to `main`, runs `npm ci → npm run parse-skills → npm run build → upload-pages-artifact → deploy-pages`. GH Pages enabled with `build_type: workflow` via `gh api`. Live at https://ltlukoziuzu.github.io/exprome-planner/.

### 3.6 Verification

Smoke test (`scripts/smoke-test.mjs`) uses Playwright with system Chromium:
1. Clears `localStorage`, reloads.
2. Clicks the first cell (Brace 0/2 → 1/2), asserts the rank actually incremented via the `aria-label`.
3. Captures desktop + mobile-viewport screenshots into `screenshots/`.
4. Asserts zero console errors.

Final check before pushing: `npx svelte-check` clean (only autofocus a11y warnings, intentional for the rename flow); production build is 63KB JS + 12KB CSS (20KB + 3KB gzipped).

---

## 4. Post-launch refinements

Iterated after seeing the live site.

### 4.1 Renamable PC + praetorians (visible affordance)

**Issue**: rename was only reachable via double-clicking the name span — not discoverable. User asked for proper rename.

**Fix**: added a ✎ pencil button next to editable names:
- In `RosterRow.svelte`: visible on hover or when the row is active.
- In `CharacterSheet.svelte`: visible next to the big header name for PC and praetorians (loyals stay non-editable to keep canonical names intact).

Clicking the pencil swaps to an inline input. Enter saves; Escape cancels; blur saves.

### 4.2 Faster tooltips

**Issue**: native HTML `title` tooltips have a browser-controlled ~500ms+ delay that can't be configured. Felt sluggish when browsing the tree.

**Fix**: custom CSS-driven tooltip on `SkillCell`. Appears at **80ms** after hover (and 80ms fade-out, which avoids flicker when crossing between cells quickly). Same content as before (name, kind, tier, full description, plus any block reason in crimson) with a gold-bordered card and pointer triangle. Suppressed via `@media (pointer: coarse)` on touch — mobile keeps the tap-card pattern.

### 4.3 Sheet-header label cleanup

**Issue**: the label slot read `"Caeso Quinctius Aquilinius (Loyal)"` right next to the big `"CAESO QUINCTIUS AQUILINIUS"` header — redundant.

**Fix**: label now just says `"Loyal"`, matching how PC and Praetorian labels worked from the start.

---

## 5. Repo layout (final, party-side)

```
exprome/
├── PLAN.md, progress.md, scraped_skills.md
├── package.json, vite.config.ts, tsconfig.json, svelte.config.js
├── index.html
├── .github/workflows/deploy.yml   ← GH Pages build + deploy
├── .gitignore
├── public/favicon.svg
├── reference/                     ← in-game screenshots (source of truth)
├── screenshots/                   ← smoke-test output (gitignored)
├── scripts/
│   ├── parse-skills.ts            ← markdown → skills.json
│   └── smoke-test.mjs             ← Playwright UI probe
└── src/
    ├── main.ts, App.svelte, app.css
    ├── data/
    │   ├── skills.json            ← generated, 96 entries
    │   └── loyals.json            ← 5 canonical loyals
    └── lib/
        ├── types.ts               ← shared TS types + constants
        ├── rules.ts               ← rules engine (pure functions)
        ├── state/builds.ts        ← Svelte store + localStorage
        └── party/                 ← UI components
```

---

## 6. What's left

- **Outpost data + tab** — entire workstream deferred until the user collects outpost upgrade names, branches (medical/housing/etc.), prereqs (OR semantics), and the 4-resource cost per node.
- **DLC** — explicitly not planned for.
