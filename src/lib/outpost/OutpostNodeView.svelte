<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { NodeStatus, OutpostNode } from '../types';
  import { outpostData, costAsString } from '../outpost-rules';
  import type { AllocateCheck } from '../outpost-rules';

  export let node: OutpostNode;
  export let status: NodeStatus;
  export let buildable: AllocateCheck;
  export let removable: AllocateCheck;

  const dispatch = createEventDispatcher();
  const DATA = outpostData();

  let isCoarsePointer = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('click', { coarse: isCoarsePointer });
  }

  // Tier numeral for the banner below each node.
  const TIER_NUMERAL = { 1: 'I', 2: 'II', 3: 'III' } as const;

  $: groupName = DATA.groups[node.group]?.name ?? node.group;
  $: tierBadge = TIER_NUMERAL[node.tier];
  $: locked = !node.isRoot && status === 'none' && !buildable.ok;

  $: tipLines = [
    `${node.name}  ·  ${groupName} ${tierBadge}`,
    node.description,
    node.isRoot ? 'Root building — always built.' : `Cost: ${costAsString(node.cost)}`,
    locked ? (buildable.reason ?? '') : '',
    status !== 'none' && !node.isRoot && !removable.ok ? (removable.reason ?? '') : '',
  ].filter(Boolean).join('\n\n');
</script>

<g class="node-g" class:locked transform="translate({node.x}, {node.y})"
   on:click={onClick}
   role="button"
   tabindex="0"
   aria-label={node.name}
>
  <title>{tipLines}</title>

  {#if node.isRoot}
    <!-- Root: colored by building group so the three roots look distinct -->
    <circle r="32" class="root-bg" class:r-medical={node.group === 'medical'} class:r-market={node.group === 'market'} class:r-recruitment={node.group === 'recruitment'} />
    <text class="root-num" y="6">{node.id}</text>
  {:else}
    <circle r="28"
      class="node-bg"
      class:planned={status === 'planned'}
      class:owned={status === 'owned'}
    />
    <text class="num" y="5">{node.id}</text>
  {/if}

  <!-- Tier label below the node -->
  <text class="tier" y={node.isRoot ? 52 : 48}>{tierBadge}</text>
</g>

<style>
  .node-g {
    cursor: pointer;
  }
  .node-g.locked {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .root-bg {
    fill: #5d1d27;
    stroke: var(--gold);
    stroke-width: 3;
  }
  .root-bg.r-medical    { fill: #7a1f2c; stroke: #e15565; } /* crimson — Dispensary */
  .root-bg.r-market     { fill: #4a4030; stroke: #c9a86a; } /* bronze   — Market */
  .root-bg.r-recruitment { fill: #3a4a2d; stroke: #92b06a; } /* olive   — Barracks */
  .root-num {
    fill: var(--gold-bright);
    font-family: Georgia, serif;
    font-weight: bold;
    font-size: 20px;
    text-anchor: middle;
    pointer-events: none;
  }

  .node-bg {
    fill: rgba(20, 34, 62, 0.92);
    stroke: var(--text-faint);
    stroke-width: 2.5;
    transition: stroke 100ms, fill 100ms;
  }
  .node-bg.planned {
    fill: rgba(138, 98, 50, 0.45);
    stroke: var(--bronze);
    stroke-width: 3;
  }
  .node-bg.owned {
    fill: rgba(214, 168, 90, 0.55);
    stroke: var(--gold);
    stroke-width: 3.5;
  }
  .node-g:not(.locked):hover .node-bg {
    stroke: var(--gold-bright);
    stroke-width: 3;
  }

  .num {
    fill: var(--text);
    font-family: Georgia, serif;
    font-weight: bold;
    font-size: 18px;
    text-anchor: middle;
    pointer-events: none;
  }
  .node-bg.owned + .num {
    fill: var(--bg);
  }

  .tier {
    fill: var(--text-dim);
    font-family: Georgia, serif;
    font-size: 12px;
    text-anchor: middle;
    pointer-events: none;
    font-variant: small-caps;
    letter-spacing: 0.1em;
  }
</style>
