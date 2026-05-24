<script lang="ts">
  import type { NodeStatus, OutpostNode } from '../types';
  import { outpostData, costAsString } from '../outpost-rules';
  import type { AllocateCheck } from '../outpost-rules';

  export let node: OutpostNode;
  export let status: NodeStatus;
  export let buildable: AllocateCheck;
  export let removable: AllocateCheck;
  export let rect: DOMRect;

  const DATA = outpostData();
  const TIER_NUMERAL = { 1: 'I', 2: 'II', 3: 'III' } as const;

  $: groupName = DATA.groups[node.group]?.name ?? node.group;
  $: tierBadge = TIER_NUMERAL[node.tier];
  $: locked = !node.isRoot && status === 'none' && !buildable.ok;
  $: refundBlocked = status !== 'none' && !node.isRoot && !removable.ok;

  // Flip below the node when there isn't enough room above the viewport,
  // and shift horizontally to keep it inside the viewport. Measured after
  // mount; defaults to "above"/"no-shift" until size is known.
  let innerEl: HTMLDivElement | undefined;
  let placeBelow = false;
  let shiftX = 0;
  const GAP = 12;
  const EDGE = 8;

  $: if (innerEl && rect) {
    const h = innerEl.offsetHeight;
    const w = innerEl.offsetWidth;
    placeBelow = rect.top < h + GAP + 4;

    const centerX = rect.left + rect.width / 2;
    const leftEdge = centerX - w / 2;
    const rightEdge = centerX + w / 2;
    const vw = window.innerWidth;
    if (leftEdge < EDGE) shiftX = EDGE - leftEdge;
    else if (rightEdge > vw - EDGE) shiftX = vw - EDGE - rightEdge;
    else shiftX = 0;
  }

  $: left = rect.left + rect.width / 2 + window.scrollX;
  $: top = placeBelow
    ? rect.bottom + window.scrollY
    : rect.top + window.scrollY;
</script>

<div class="tip"
  class:below={placeBelow}
  style="left: {left}px; top: {top}px; --shift: {shiftX}px;"
  role="tooltip"
>
  <div class="tip-inner" bind:this={innerEl}>
    <div class="tip-head">
      <strong>{node.name}</strong>
      <span class="tip-status">{status === 'none' ? 'Not built' : status === 'planned' ? 'Planned' : 'Owned'}</span>
    </div>
    <div class="tip-meta">{groupName} · Tier {tierBadge}</div>
    <p class="tip-desc">{node.description}</p>
    {#if !node.isRoot}
      <div class="tip-cost">Cost: {costAsString(node.cost)}</div>
    {/if}
    {#if locked}<div class="tip-warn">{buildable.reason}</div>{/if}
    {#if refundBlocked}<div class="tip-warn">{removable.reason}</div>{/if}
  </div>
</div>

<style>
  .tip {
    position: absolute;
    z-index: 60;
    pointer-events: none;
    /* Centre horizontally on the node, sit just above its top edge with an arrow */
    transform: translate(calc(-50% + var(--shift, 0px)), -100%) translateY(-12px);
  }
  .tip.below {
    transform: translate(calc(-50% + var(--shift, 0px)), 0) translateY(12px);
  }
  .tip-inner {
    position: relative;
    width: 300px;
    max-width: 92vw;
    padding: 0.6rem 0.75rem;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--gold);
    border-radius: 4px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
    text-align: left;
    font-family: sans-serif;
    animation: tip-in 80ms ease-out;
  }
  .tip-inner::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(calc(-50% - var(--shift, 0px)));
    border: 6px solid transparent;
    border-top-color: var(--gold);
  }
  .tip.below .tip-inner::after {
    top: auto;
    bottom: 100%;
    border-top-color: transparent;
    border-bottom-color: var(--gold);
  }
  @keyframes tip-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .tip-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }
  .tip-head strong {
    color: var(--gold-bright);
    font-variant: small-caps;
    letter-spacing: 0.04em;
    font-size: 1rem;
  }
  .tip-status {
    font-size: 0.74rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .tip-meta {
    font-size: 0.74rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.06em;
    margin-bottom: 0.45rem;
  }
  .tip-desc {
    margin: 0;
    font-family: 'Georgia', serif;
    font-size: 0.86rem;
    line-height: 1.4;
  }
  .tip-cost {
    margin-top: 0.45rem;
    font-size: 0.82rem;
    color: var(--gold-bright);
    font-variant: small-caps;
    letter-spacing: 0.05em;
  }
  .tip-warn {
    margin-top: 0.45rem;
    padding-top: 0.45rem;
    border-top: 1px solid var(--border);
    font-size: 0.8rem;
    color: var(--crimson-bright);
  }

  /* Touch / coarse pointer: this component shouldn't even mount on coarse —
     the OutpostTab skips dispatching enter events there — but be defensive. */
  @media (pointer: coarse) {
    .tip { display: none; }
  }
</style>
