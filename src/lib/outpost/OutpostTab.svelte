<script lang="ts">
  import { activeBuild, updateActiveBuild } from '../state/builds';
  import type { OutpostNode } from '../types';
  import { RESOURCE_ORDER } from '../types';
  import {
    outpostData,
    allNodes,
    statusOf,
    plannedCostTotal,
    totalInvested,
    nextLegalStatus,
    canBuild,
    canUnbuild,
    nodeById,
  } from '../outpost-rules';
  import OutpostNodeView from './OutpostNodeView.svelte';
  import OutpostDetailCard from './OutpostDetailCard.svelte';
  import OutpostTooltip from './OutpostTooltip.svelte';

  const DATA = outpostData();
  $: build = $activeBuild;
  $: state = build?.outpost ?? { status: {} };

  $: plannedCost = plannedCostTotal(state);
  $: totalCost = totalInvested(state);

  // Counts for the header
  $: counts = (() => {
    let planned = 0;
    let owned = 0;
    for (const n of allNodes()) {
      const s = statusOf(state, n.id);
      if (s === 'planned') planned++;
      else if (s === 'owned') owned++;
    }
    return { planned, owned };
  })();

  // Tap-card focus (mobile)
  let focusedId: string | null = null;
  $: focusedNode = focusedId ? nodeById(focusedId) ?? null : null;

  // Desktop hover tooltip — 80ms delay-in, instant hide.
  let hoveredNode: OutpostNode | null = null;
  let hoveredRect: DOMRect | null = null;
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  function onNodeEnter(e: CustomEvent<{ node: OutpostNode; rect: DOMRect }>) {
    if (showTimer) clearTimeout(showTimer);
    const { node, rect } = e.detail;
    showTimer = setTimeout(() => {
      hoveredNode = node;
      hoveredRect = rect;
    }, 80);
  }
  function onNodeLeave() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    hoveredNode = null;
    hoveredRect = null;
  }

  function onNodeClick(node: OutpostNode, isCoarsePointer: boolean) {
    if (isCoarsePointer) {
      focusedId = node.id;
      return;
    }
    cycleNode(node);
  }

  function cycleNode(node: OutpostNode) {
    if (node.isRoot) return;
    const { next, check } = nextLegalStatus(node, state);
    if (!check.ok) return; // illegal — silently rejected (cell could flash)
    updateActiveBuild((b) => {
      if (!b.outpost) b.outpost = { status: {} };
      if (next === 'none') delete b.outpost.status[node.id];
      else b.outpost.status[node.id] = next;
    });
  }

  function resetOutpost() {
    if (!confirm('Reset all outpost upgrades (planned + owned)?')) return;
    updateActiveBuild((b) => {
      b.outpost = { status: {} };
    });
  }

  // Node visual radius — kept here so edge-trimming and the renderer stay in sync.
  const ROOT_RADIUS = 32;
  const NODE_RADIUS = 28;
  const EDGE_PAD = 2; // gap between line tip and circle border, so they don't quite touch

  function trim(from: OutpostNode, to: OutpostNode) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    const ux = dx / len, uy = dy / len;
    const rFrom = (from.isRoot ? ROOT_RADIUS : NODE_RADIUS) + EDGE_PAD;
    const rTo   = (to.isRoot   ? ROOT_RADIUS : NODE_RADIUS) + EDGE_PAD;
    return {
      x1: from.x + rFrom * ux,
      y1: from.y + rFrom * uy,
      x2: to.x   - rTo * ux,
      y2: to.y   - rTo * uy,
    };
  }

  // Edge list: for each non-root node, draw a line from each unlock-parent.
  // Endpoints are trimmed so the line never enters either circle.
  $: edges = (() => {
    type Edge = {
      from: OutpostNode; to: OutpostNode; satisfied: boolean;
      x1: number; y1: number; x2: number; y2: number;
    };
    const out: Edge[] = [];
    for (const node of allNodes()) {
      for (const pid of node.unlockedBy) {
        const parent = nodeById(pid);
        if (!parent) continue;
        const parentBuilt =
          parent.isRoot || ['planned', 'owned'].includes(statusOf(state, parent.id));
        const childBuilt = ['planned', 'owned'].includes(statusOf(state, node.id));
        const coords = trim(parent, node);
        out.push({ from: parent, to: node, satisfied: parentBuilt && childBuilt, ...coords });
      }
    }
    return out;
  })();

  // Spine: vertical line linking the three roots. Split into two trimmed
  // segments (R1↔R2, R2↔R3) so it doesn't draw through any root circle.
  $: spineSegments = (() => {
    const r1 = nodeById('R1'), r2 = nodeById('R2'), r3 = nodeById('R3');
    if (!r1 || !r2 || !r3) return [];
    return [trim(r1, r2), trim(r2, r3)];
  })();
</script>

{#if build}
  <div class="outpost-wrap">
    <header class="bar">
      <div class="counts">
        <span class="big" class:has={counts.planned > 0}>{counts.planned}</span><span class="of">planned</span>
        <span class="sep">·</span>
        <span class="big" class:has={counts.owned > 0}>{counts.owned}</span><span class="of">owned</span>
      </div>

      <div class="resources">
        <span class="rlabel">Cost of planned upgrades:</span>
        {#each RESOURCE_ORDER as r (r)}
          <span class="res" class:zero={plannedCost[r] === 0}>
            <span class="rname">{DATA.resources[r].name}</span>
            <span class="rval">{plannedCost[r]}</span>
          </span>
        {/each}
      </div>

      <button class="reset" on:click={resetOutpost} title="Clear all planned and owned">Reset</button>
    </header>

    {#if counts.planned + counts.owned > 0}
      <div class="grand-total">
        Total invested (planned + owned):
        {#each RESOURCE_ORDER as r (r)}
          <span class="grand-res" class:zero={totalCost[r] === 0}>{totalCost[r]} {DATA.resources[r].name}</span>
        {/each}
      </div>
    {/if}

    <div class="canvas-wrap">
      <svg class="canvas" viewBox="40 150 1230 830" preserveAspectRatio="xMidYMid meet">
        <!-- spine between the three roots (two trimmed segments) -->
        {#each spineSegments as s, i (i)}
          <line class="spine" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}/>
        {/each}

        <!-- unlock-graph edges, trimmed to stop at circle borders -->
        {#each edges as e (e.from.id + '-' + e.to.id)}
          <line
            class="edge"
            class:satisfied={e.satisfied}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          />
        {/each}

        <!-- nodes -->
        {#each allNodes() as node (node.id)}
          <OutpostNodeView
            {node}
            status={statusOf(state, node.id)}
            buildable={canBuild(node, state)}
            removable={canUnbuild(node, state)}
            on:click={(e) => onNodeClick(node, e.detail.coarse)}
            on:enter={onNodeEnter}
            on:leave={onNodeLeave}
          />
        {/each}
      </svg>
    </div>

    <p class="hint">
      Click a node to plan it (bronze). Click again to mark it owned (gold). Once more removes it. Tier-2/3 buildings need the previous tier and one unlock-parent built first.
    </p>
  </div>
{:else}
  <div class="empty">No active build.</div>
{/if}

{#if hoveredNode && hoveredRect}
  <OutpostTooltip
    node={hoveredNode}
    status={statusOf(state, hoveredNode.id)}
    buildable={canBuild(hoveredNode, state)}
    removable={canUnbuild(hoveredNode, state)}
    rect={hoveredRect}
  />
{/if}

{#if focusedNode}
  <OutpostDetailCard
    node={focusedNode}
    status={statusOf(state, focusedNode.id)}
    on:setstatus={(e) => {
      const next = e.detail;
      const check = next === 'none'
        ? canUnbuild(focusedNode, state)
        : canBuild(focusedNode, state);
      if (!check.ok && next !== 'none') return;
      updateActiveBuild((b) => {
        if (!b.outpost) b.outpost = { status: {} };
        if (next === 'none') delete b.outpost.status[focusedNode.id];
        else b.outpost.status[focusedNode.id] = next;
      });
    }}
    on:close={() => (focusedId = null)}
  />
{/if}

<style>
  .outpost-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.75rem 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    flex-wrap: wrap;
  }
  .counts {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    font-variant: small-caps;
    letter-spacing: 0.04em;
  }
  .counts .big {
    font-size: 1.5rem;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .counts .big.has {
    color: var(--gold-bright);
  }
  .counts .of {
    color: var(--text-dim);
    font-size: 0.85rem;
  }
  .counts .sep {
    color: var(--text-faint);
    margin: 0 0.25rem;
  }

  .resources {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .rlabel {
    color: var(--text-dim);
    font-size: 0.82rem;
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .res {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
    padding: 4px 10px;
    background: var(--bg);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
  }
  .res.zero {
    opacity: 0.45;
  }
  .rname {
    font-size: 0.78rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.05em;
  }
  .rval {
    font-size: 1rem;
    color: var(--gold-bright);
    font-variant-numeric: tabular-nums;
    font-weight: bold;
  }
  .res.zero .rval {
    color: var(--text-dim);
  }
  .reset {
    margin-left: auto;
    font-size: 0.78rem;
    padding: 4px 12px;
  }

  .grand-total {
    padding: 0.4rem 0.8rem;
    color: var(--text-dim);
    font-size: 0.8rem;
    font-variant: small-caps;
    letter-spacing: 0.04em;
    border-left: 3px solid var(--bronze);
  }
  .grand-res {
    margin-left: 0.6rem;
    color: var(--text);
  }
  .grand-res.zero {
    color: var(--text-faint);
  }

  .canvas-wrap {
    background: linear-gradient(180deg, #0c1730 0%, #14223e 100%);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: auto;
    padding: 0.5rem;
  }
  .canvas {
    width: 100%;
    min-width: 720px;
    max-height: 72vh;
    height: auto;
    display: block;
  }

  .spine {
    stroke: var(--bronze);
    stroke-width: 4;
    opacity: 0.55;
  }
  .edge {
    stroke: var(--text-faint);
    stroke-width: 2.5;
    opacity: 0.55;
  }
  .edge.satisfied {
    stroke: var(--gold);
    opacity: 0.95;
  }
  .hint {
    color: var(--text-dim);
    font-size: 0.82rem;
    margin: 0 0.25rem;
    line-height: 1.5;
  }

  .empty {
    color: var(--text-faint);
    font-style: italic;
    text-align: center;
    padding: 3rem;
  }
</style>
