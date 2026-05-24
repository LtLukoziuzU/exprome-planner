# Expeditions: Rome Planner — Plan

A static web app for planning party skill trees and outpost upgrades for *Expeditions: Rome*. Hosted on GitHub Pages, no backend, no paid services.

---

## 1. Scope (confirmed)

- **Party planner** (one tab/page): track the whole party in a single save.
  - 1 **PC**: any of the 4 classes, player-named.
  - 5 **loyal companions**: fixed name + class (hard-coded canonical roster, list TBD).
  - **Praetorian companions** (unlimited): any class, any name; user adds/removes slots freely.
- **Outpost planner** (separate tab/page): one shared tree.
- **Persistence**: `localStorage`, supports multiple named builds (each build = full party + outpost state). Load/rename/duplicate/delete from a build manager. **Auto-save on every change** — no manual save button, no dirty state.
- **Skill mechanics**:
  - Each skill rank costs 1 point.
  - Multi-rank skills exist (max 1, 2, or 3 ranks per skill, varies).
  - Tier unlock per **specialization**: tier 2 needs ≥1 point in that spec, tier 3 needs ≥4, tier 4 needs ≥7.
  - Hard enforce all rules (no invalid clicks).
  - A small number of skills have an additional **previous-skill prerequisite** (specific skill must have ≥1 rank) on top of the tier rule. These are **visible as connector lines between cells in the in-game screenshots** (e.g. Defender's Brace → Fortress). The scrape doesn't include them, but they can be transcribed from the reference screenshots.
  - **Refund cascade**: refunding a point is blocked if it would invalidate any other allocated skill (drop a spec below 4/7 with tier-3/4 skills allocated, or remove a skill another depends on). Click is refused with a tooltip naming the blocking skills, so the user unwinds in order. No silent cascade refunds.
- **Traits** shown under each character's class in-game (HEROIC, DEVOTED, UNWAVERING, etc.) are morale state, not character build data — **not tracked or displayed** by the planner.
  - Budget: **20 points per character** (hard cap, displayed as "X / 20 spent"). Reflects 19 from level-ups + 1 always-pre-spent point. No level concept — planner can allocate freely up to 20. Revisit if game cap is ever confirmed different.
- **Outpost mechanics**:
  - Node prerequisites use **OR semantics**: a node unlocks as soon as *any one* listed parent is owned/planned (not all). Mirrors the in-game outpost where multiple paths converge on a single node.
  - 4 resource types per node (specific amounts TBD per node).
  - No global budget — display totals required for current selection.
  - Two states per node: **planned** and **already owned** (tri-state: none / planned / owned).
- **Devices**: desktop + responsive mobile.
- **Out of scope** (explicitly): equipped/hotbar skills, build comparison, image export, URL-share, build diffs.

---

## 2. Tech stack

**Recommended: Vite + Svelte + TypeScript.**

Reasons:
- Reactive state is a natural fit — recomputing tier locks, point totals, and resource costs across many small interactive cells gets messy in vanilla. Svelte gives this for free without React's overhead/boilerplate.
- Bundle is tiny (~5–15 KB framework), works on slow connections and mobile.
- `vite build` produces a fully static `dist/` directory; GitHub Pages serves it directly. Set `base: './'` in `vite.config.ts` to make asset paths work under `/exprome/`.
- TypeScript keeps skill/outpost data shapes honest as the data grows.

**Fallback:** Vanilla HTML/CSS/JS is viable but you'll be re-implementing reactivity by hand (point recomputation, tier-lock recalculation, save/load). Not recommended given the planner's interconnected state, but possible if you want zero build step.

**Deployment**: `gh-pages` branch from `dist/`, or GitHub Actions workflow that builds and deploys on push to `main`.

---

## 3. Data model

### 3.1 Skills data (`src/data/skills.json`)

Generated **once** from `scraped_skills.md` by a small Node script (`scripts/parse-skills.ts`). Heuristics for `maxRank`:

- No "Upgrade" / "Rank" text → `maxRank: 1`
- One `Upgrade:` (singular) → `maxRank: 2`
- `Upgrade 1: ... Upgrade 2:` → `maxRank: 3`
- `Rank 1: ... Rank 2:` → `maxRank: 2`

Edge cases (e.g., Sneak Attack has "+50% first 2 turns. Upgrade: +100%" → 2 ranks; Walk Your Shots has Upgrade 1 + Upgrade 2 → 3 ranks). The parser logs anything ambiguous so you can hand-correct.

Schema:

```ts
type SkillKind = 'active' | 'passive';

interface Skill {
  id: string;              // "princeps.defender.brace"
  name: string;            // "Brace"
  kind: SkillKind;
  column: 1 | 2;
  row: 1 | 2 | 3 | 4;      // tier
  maxRank: 1 | 2 | 3;
  description: string;     // full text inc. upgrades
  requiresSkillId?: string; // optional: id of a skill that must have ≥1 rank
                            // before this one can be allocated (in addition
                            // to the tier rule). Canonical list in §3.5.
  // Optional structured cost (later): focus, charges, action type
}

interface Specialization {
  id: string;              // "defender"
  name: string;            // "Defender"
  skills: Skill[];         // exactly 8
}

interface ClassDef {
  id: 'princeps' | 'sagittarius' | 'triarius' | 'veles';
  name: string;
  specs: [Specialization, Specialization, Specialization];
}
```

### 3.2 Loyal roster (`src/data/loyals.json`)

```ts
interface LoyalCompanion {
  id: string;
  name: string;            // e.g. "Syneros"
  class: ClassId;          // e.g. "triarius"
  // Optional flavor: trait label like "Unwavering", portrait placeholder
}
```

Canonical roster (confirmed):

| Name                       | Class       |
|----------------------------|-------------|
| Caeso Quinctius Aquilinius | Princeps    |
| Syneros                    | Triarius    |
| Bestia Tabat               | Veles       |
| Julia Calida               | Sagittarius |
| Deaineira                  | Princeps    |

Verginia Assilia is the PC slot in the source screenshot — not a loyal.

### 3.3 Outpost data (`src/data/outpost.json`)

Resource types (confirmed, left-to-right in the in-game top bar):
1. **Lumber Mill** (`lumber`)
2. **Farm** (`food`)
3. **Tannery** (`leather`)
4. **Iron Mine** (`iron`)

```ts
type ResourceId = 'lumber' | 'food' | 'leather' | 'iron';

interface OutpostNode {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3;         // I / II / III gating row
  branch: string;          // e.g. "medical", "housing", "knowledge"
  prerequisites: string[]; // node ids; OR semantics (any one parent owned/planned unlocks this node)
  cost: Record<ResourceId, number>;
  // Optional: x,y for hand-laid layout, or auto-layout from branch+tier
}

interface OutpostData {
  resources: Record<ResourceId, { name: string; icon?: string }>;
  nodes: OutpostNode[];
}
```

I'll author this JSON from your rough list. Layout strategy: hand-place `x,y` to match the game screenshot rather than auto-layout (auto-layout for branching trees rarely matches reference art).

### 3.5 Per-skill prerequisites (canonical)

11 skills require a sibling skill (in the same spec) to have ≥1 rank, in addition to the spec's tier rule. Rank count of the parent beyond 1 doesn't matter — 1 is enough.

| Class       | Spec       | Child skill        | Requires parent ≥1 rank |
|-------------|------------|--------------------|--------------------------|
| Princeps    | Defender   | Fortress           | Brace                    |
| Princeps    | Defender   | Guardian Angel     | Protect                  |
| Triarius    | Medic      | Good as New        | Cure                     |
| Triarius    | Flagbearer | Embarrassing Ruse  | Ruse                     |
| Triarius    | Flagbearer | Orator             | Inspire                  |
| Veles       | Assassin   | Rush               | Focus Master             |
| Veles       | Duelist    | Slippery           | Dodge                    |
| Sagittarius | Marksman   | Vigilant           | Interrupt                |
| Sagittarius | Marksman   | Powerful Kick      | Rebuke                   |
| Sagittarius | Hunter     | Skirmisher         | Versatile                |
| Sagittarius | Sniper     | Spotter            | Ranging Shot             |

These also extend the refund-cascade rule: refunding the last rank of a parent skill is blocked while any child is allocated.

### 3.6 Canonical max-rank table

Authoritative max-rank per skill (supplied by user, column by column). Overrides the scrape's heuristic. Layout: `Col 1 R1..R4 | Col 2 R1..R4`.

**Princeps**

| Spec     | Col 1 (R1→R4)                              | Col 2 (R1→R4)                                |
|----------|--------------------------------------------|----------------------------------------------|
| Defender | Brace 2, Fortress 1, Protect 1, Guardian Angel 1 | Bastion 1, Repair 1, Bulwark 2, Shield Wall 1 |
| Vanguard | Hardened 2, The Best Defense 3, Taunt 1, Bull Rush 1 | Frighten 1, Flawless Defence 2, Adrenaline Junkie 1, Avenger 1 |
| Veteran  | Nimble 2, Headbutt 1, Battering Ram 2, War Cry 2 | Knockdown 1, Opportunist 2, Stand Fast 1, Immoveable 1 |

**Triarius**

| Spec       | Col 1 (R1→R4)                              | Col 2 (R1→R4)                                |
|------------|--------------------------------------------|----------------------------------------------|
| Medic      | Field Medic 2, Cure 1, Good as New 1, Interference 1 | Logistics 2, Poisoner 2, Revive 2, Curse 1 |
| Flagbearer | War Horn 2, Guidance 2, Ruse 1, Embarrassing Ruse 2 | Bolstering presence 1, Inspire 1, Orator 1, Rousing speech 2 |
| Destroyer  | Deathblow 2, Shredder 1, Reckless 2, Sunder 1 | Fortune favoured 2, Quick lunge 1, Quick feet 1, Finisher 2 |

**Veles**

| Spec     | Col 1 (R1→R4)                              | Col 2 (R1→R4)                                |
|----------|--------------------------------------------|----------------------------------------------|
| Assassin | Cheap shot 1, Assassinate 1, Focus Master 2, Rush 2 | Lone Wolf 1, Sneak Attack 2, Marathon 1, First strike 1 |
| Duelist  | Shiv 1, Bloodthirsty 2, Kill on Ground 1, Quick-witted 1 | Born ready 3, Dodge 1, Slippery 1, Duel 1 |
| Brawler  | Tactical advance 2, Clear Path 1, Pugilist 1, Reaper 1 | Pankration 1, Feint 1, Boast 2, Heavy skirmisher 2 |

**Sagittarius**

| Spec     | Col 1 (R1→R4)                              | Col 2 (R1→R4)                                |
|----------|--------------------------------------------|----------------------------------------------|
| Marksman | Interrupt 2, Vigilant 1, Gracing shot 2, Steady Hands 1 | Point Blank 1, Rebuke 2, Powerful Kick 2, Overwatch 1 |
| Hunter   | Quick Shot 1, Lure 1, Pinning shots 3, Barrage 1 | Versatile 2, Skirmisher 1, Arrow Stab 1, Find weakness 1 |
| Sniper   | Ranging shot 1, Spotter 1, Eagle Eye 1, Seize ground 1 | Marksman 2, Mark target 2, Walk Your Shots 3, Assist 1 |

**Totals**: Princeps 34 ranks, Triarius 36, Veles 33, Sagittarius 35 — well above the 20-point budget, so allocation forces meaningful choices.

### 3.7 Save state (per build, in localStorage)

```ts
interface PartyBuild {
  id: string;              // uuid
  name: string;            // user-given build name
  createdAt: number;
  updatedAt: number;
  pc: CharacterState;
  loyals: Record<string, CharacterState>;   // keyed by loyal id
  praetorians: PraetorianState[];
  outpost: OutpostState;
}

interface CharacterState {
  classId: ClassId;        // PC only; loyals fixed; praetorians user-set
  name: string;            // PC + praetorians editable; loyals fixed
  skillRanks: Record<string, number>; // skill.id -> rank invested (0..maxRank)
}

interface PraetorianState extends CharacterState {
  id: string;              // uuid for ordering/deletion
}

interface OutpostState {
  status: Record<string, 'none' | 'planned' | 'owned'>; // node.id -> state
}
```

localStorage key: `exprome:builds:v1` → `{ activeBuildId, builds: PartyBuild[] }`. Bump the `v1` suffix on schema changes.

---

## 4. UI layout

### 4.1 Top-level shell

- Header: app title, **build manager** (dropdown: list builds, new, rename, delete, duplicate), active build name.
- Tabs: **Party** | **Outpost**.
- Footer/aside: link to wiki source, GitHub repo.

### 4.2 Party tab

Two-pane layout (collapses to stacked on mobile):

- **Left rail**: vertical list of characters (PC → 5 loyals → praetorians → "+ Add praetorian"). Each row: portrait placeholder (initials in a class-tinted circle), name, class label, points-spent counter (e.g. "12 / 19"). Click to select. Active row highlighted. Row menu: rename PC or praetorian; change PC class; delete praetorian.
- **Right pane**: selected character's skill tree.
  - Header: name (editable inline for PC/praetorians), class dropdown (PC + praetorians only), points counter ("X / 19 spent").
  - 3 columns side-by-side, one per specialization (Defender / Vanguard / Veteran, etc.).
  - Each column: 4 rows × 2 cells. Cell = **square (active)** or **circle (passive)** with `maxRank` slots that fill as ranks are invested.
  - Hover tooltip: full skill text + cost rules + current/max rank.
  - **Desktop**: click cell = +1 rank if legal (otherwise subtle shake/red flash); right-click / shift-click = −1 rank if legal.
  - **Mobile / touch**: tap cell = open a detail card (bottom sheet on phones, popover on tablets) with the full description, current rank, and explicit ＋ / − buttons. Decouples "read about it" from "allocate it" since hover doesn't exist on touch.
  - Locked tier rows render grayed-out with a lock indicator and tooltip explaining how to unlock ("invest 4 more in this specialization").
  - "Reset character" button.

### 4.3 Outpost tab

- Render nodes by hand-placed `x,y` on an SVG canvas, with edges drawn between prerequisites.
- Tri-state click cycle on each node: none → planned → owned → none.
- Sidebar / overlay: hovered node details (name, description, cost, prereq status).
- Top bar: running total of resources needed for **planned** nodes (excluding owned), e.g. "Iron 12 · Wood 8 · Coin 240 · Influence 5".
- Toggle to show/hide locked nodes (those whose prereqs aren't met by planned+owned).
- "Reset outpost" button.

### 4.4 Visual language for skill cells

```
Active skill (square)        Passive skill (circle)
┌─────┐                      ╭─────╮
│░░░░░│  0/2                 │░░░░░│  0/3
└─────┘                      ╰─────╯
┌─────┐                      ╭─────╮
│█░░░░│  1/2                 │██░░░│  2/3
└─────┘                      ╰─────╯
┌─────┐                      ╭─────╮
│█████│  2/2 (maxed)         │█████│  3/3 (maxed)
└─────┘                      ╰─────╯
Locked (any shape):  outlined, dim, padlock glyph centered.
```

Fill is a horizontal progress bar inside the square/circle, divided into `maxRank` segments. Color: filled = gold/bronze (game palette), empty = dark slate, locked = dim gray.

Shape is derived directly from each skill's `active`/`passive` label in the scrape: **active → square**, **passive → circle**. This mapping is faithful to the in-game UI (verified against reference screenshots).

---

## 5. Implementation order

Build in slices that each end shippable:

1. **Data pipeline** — write `scripts/parse-skills.ts`, generate `skills.json`, hand-verify ranks against the wiki. Tag ambiguous skills in a TODO list.
2. **App skeleton** — Vite + Svelte + TS, two empty tabs, build-manager stub backed by localStorage.
3. **Party tab v1** — PC only, 4 classes selectable, skill tree renders, click to allocate, tier rules enforced, point cap enforced. No loyals yet, no praetorians.
4. **Loyals + praetorians** — wire in `loyals.json`, "+ Add praetorian" flow, per-character state in save.
5. **Save/load polish** — multiple builds, rename, duplicate, delete, "active build" indicator. Versioned localStorage key.
6. **Outpost data structuring** — you give me the rough list, I produce `outpost.json` and confirm layout matches the screenshot.
7. **Outpost tab** — render graph, tri-state nodes, resource totals, prereq enforcement.
8. **Responsive pass** — mobile breakpoints: party tab stacks (character list becomes a top scroll bar), skill columns can scroll horizontally, outpost zoom/pan on touch.
9. **Polish** — game-ish palette (deep blue + bronze/gold), keyboard shortcuts (1/2/3 to switch spec column on selected character), final tooltips.
10. **Deploy** — GitHub Action: on push to `main`, build and publish `dist/` to `gh-pages` branch.

Each step is a viable stopping point.

---

## 6. Open questions

_(none — party-side data is complete. Outpost is a separate workstream.)_

---

## 7. Repo layout (proposed)

```
exprome/
├── PLAN.md                        ← this file
├── scraped_skills.md              ← raw wiki dump
├── package.json
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   └── parse-skills.ts            ← markdown → skills.json
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── lib/
│   │   ├── state/                 ← stores: activeBuild, allBuilds
│   │   ├── party/                 ← CharacterTree.svelte, SkillCell.svelte
│   │   └── outpost/               ← OutpostGraph.svelte, OutpostNode.svelte
│   └── data/
│       ├── skills.json            ← generated, committed
│       ├── loyals.json            ← hand-authored
│       └── outpost.json           ← hand-authored
├── public/                        ← favicon, static assets
├── reference/                     ← screenshots from in-game (source of truth for ranks/prereqs)
│   ├── 00-overview-veles.png
│   ├── 01-outpost-tree.png
│   ├── 02-princeps.png  + 02-princeps-tree.png (cropped)
│   ├── 03-triarius.png  + 03-triarius-tree.png
│   ├── 04-veles.png     + 04-veles-tree.png
│   └── 05-sagittarius.png + 05-sagittarius-tree.png
└── .github/workflows/deploy.yml   ← GH Pages deploy
```

---

## 8. Risks & notes

- **Skill rank heuristics validated against canonical user-supplied data**: 96 / 96 match. The scrape parser (Upgrade → 2, Upgrade 1/2 → 3, Rank 1/2 → 2, none → 1) is correct for the dataset. Base-game only; no DLC support planned.
- **Outpost layout is bespoke.** Auto-layout libraries (dagre, elkjs) won't reproduce the screenshot. Plan to hand-place coordinates. ~25 nodes is fine to do manually.
- **Schema migrations.** Builds saved today must still load tomorrow. The `:v1` localStorage suffix + a migration function (`migrate(stored): currentSchema`) covers most cases without losing user data.
- **No offline icons.** Squares/circles are good. If you ever scrape icons from the game files, drop them in `public/icons/` and reference by skill id.
