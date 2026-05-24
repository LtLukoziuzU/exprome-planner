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

  // Edge list: for each non-root node, draw a faint line from each unlock-parent.
  $: edges = (() => {
    type Edge = { from: OutpostNode; to: OutpostNode; satisfied: boolean };
    const out: Edge[] = [];
    for (const node of allNodes()) {
      for (const pid of node.unlockedBy) {
        const parent = nodeById(pid);
        if (!parent) continue;
        const parentBuilt =
          parent.isRoot || ['planned', 'owned'].includes(statusOf(state, parent.id));
        const childBuilt = ['planned', 'owned'].includes(statusOf(state, node.id));
        out.push({ from: parent, to: node, satisfied: parentBuilt && childBuilt });
      }
    }
    return out;
  })();

  // Edge between consecutive tiers of the same group, drawn faintly to show the
  // tier-progression rule visually.
  $: tierEdges = (() => {
    type TierEdge = { from: OutpostNode; to: OutpostNode };
    const out: TierEdge[] = [];
    for (const node of allNodes()) {
      if (node.tier === 1) continue;
      const prev = allNodes().find((n) => n.group === node.group && n.tier === node.tier - 1);
      if (prev) out.push({ from: prev, to: node });
    }
    return out;
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
        <!-- tier-progression edges (faint, dashed) drawn first so they sit behind unlock edges -->
        {#each tierEdges as e (e.from.id + '-' + e.to.id)}
          <line
            class="tier-edge"
            x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
          />
        {/each}

        <!-- spine between the three roots -->
        <line class="spine" x1="130" y1="295" x2="130" y2="835"/>

        <!-- unlock-graph edges -->
        {#each edges as e (e.from.id + '-' + e.to.id)}
          <line
            class="edge"
            class:satisfied={e.satisfied}
            x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
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
  .tier-edge {
    stroke: var(--bronze);
    stroke-width: 1.5;
    stroke-dasharray: 4 6;
    opacity: 0.25;
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
