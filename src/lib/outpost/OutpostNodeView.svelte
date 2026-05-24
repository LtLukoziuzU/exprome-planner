<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { NodeStatus, OutpostNode } from '../types';
  import type { AllocateCheck } from '../outpost-rules';
  import OutpostGroupIcon from './OutpostGroupIcon.svelte';

  export let node: OutpostNode;
  export let status: NodeStatus;
  export let buildable: AllocateCheck;
  // Passed for symmetry with buildable; the tooltip in the parent consumes it.
  export const removable: AllocateCheck = { ok: true };

  const dispatch = createEventDispatcher();

  let isCoarsePointer = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation();
    dispatch('click', { coarse: isCoarsePointer });
  }

  function onEnter(e: MouseEvent) {
    if (isCoarsePointer) return;
    const rect = (e.currentTarget as SVGGraphicsElement).getBoundingClientRect();
    dispatch('enter', { node, rect });
  }
  function onLeave() {
    if (isCoarsePointer) return;
    dispatch('leave');
  }

  // Tier numeral for the banner below each node.
  const TIER_NUMERAL = { 1: 'I', 2: 'II', 3: 'III' } as const;

  $: tierBadge = TIER_NUMERAL[node.tier];
  $: locked = !node.isRoot && status === 'none' && !buildable.ok;
</script>

<g class="node-g" class:locked transform="translate({node.x}, {node.y})"
   on:click={onClick}
   on:mouseenter={onEnter}
   on:mouseleave={onLeave}
   role="button"
   tabindex="0"
   aria-label={node.name}
>
  {#if node.isRoot}
    <!-- Root: colored by building group so the three roots look distinct -->
    <circle r="32" class="root-bg" class:r-medical={node.group === 'medical'} class:r-market={node.group === 'market'} class:r-recruitment={node.group === 'recruitment'} />
    <g class="root-icon">
      <OutpostGroupIcon group={node.group} size={32} />
    </g>
  {:else}
    <circle r="28"
      class="node-bg"
      class:planned={status === 'planned'}
      class:owned={status === 'owned'}
    />
    <g class="node-icon" class:planned={status === 'planned'} class:owned={status === 'owned'}>
      <OutpostGroupIcon group={node.group} size={26} />
    </g>
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
  .root-icon {
    color: var(--gold-bright);
    pointer-events: none;
  }
  .node-icon {
    color: var(--text);
    pointer-events: none;
    transition: color 100ms;
  }
  .node-icon.planned {
    color: var(--gold-bright);
  }
  .node-icon.owned {
    color: var(--bg);
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
