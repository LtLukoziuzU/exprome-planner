<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CharacterState, Skill, Specialization } from '../types';
  import { canIncrease, canDecrease } from '../rules';
  import { updateActiveBuild } from '../state/builds';
  import RankShape from './RankShape.svelte';

  export let skill: Skill;
  export let spec: Specialization;
  export let character: CharacterState;
  export let praetorianId: string | null;
  export let tierUnlocked: boolean;
  /** Draws a vertical connector from this cell up to its prereq parent. */
  export let hasPrereqParent = false;
  /** Highlights the connector when the parent has ≥1 rank (i.e., the link is satisfied). */
  export let prereqSatisfied = false;

  const dispatch = createEventDispatcher();

  $: rank = character.skillRanks[skill.id] ?? 0;
  $: inc = canIncrease(character, spec, skill);
  $: dec = canDecrease(character, spec, skill);

  let shaking = false;
  function flash() {
    shaking = true;
    setTimeout(() => (shaking = false), 280);
  }

  function applyDelta(delta: 1 | -1) {
    updateActiveBuild((b) => {
      const target = praetorianId
        ? b.praetorians.find((p) => p.id === praetorianId)
        : b.pc.name === character.name && b.pc.classId === character.classId
          ? b.pc
          : Object.values(b.loyals).find((l) => l.name === character.name);
      if (!target) return;
      const curr = target.skillRanks[skill.id] ?? 0;
      target.skillRanks[skill.id] = curr + delta;
      if (target.skillRanks[skill.id] === 0) delete target.skillRanks[skill.id];
    });
  }

  function onPrimary(e: MouseEvent) {
    if (e.shiftKey) {
      tryDecrease();
    } else {
      tryIncrease();
    }
  }
  function onContext(e: MouseEvent) {
    e.preventDefault();
    tryDecrease();
  }
  function tryIncrease() {
    if (inc.ok) applyDelta(1);
    else flash();
  }
  function tryDecrease() {
    if (dec.ok) applyDelta(-1);
    else flash();
  }

  // Touch: open the detail card. Detection via `(pointer: coarse)` at runtime.
  let isCoarsePointer = false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  }
  function onClick(e: MouseEvent) {
    if (isCoarsePointer) {
      dispatch('focus');
    } else {
      onPrimary(e);
    }
  }

  $: lockReason = !tierUnlocked && inc.reason ? inc.reason : '';
  $: refundReason = rank > 0 && !dec.ok ? dec.reason : '';
  $: capReason = rank < skill.maxRank && tierUnlocked && !inc.ok ? inc.reason : '';

  // Tooltip is CSS-positioned but can clip at the viewport edge; on hover,
  // measure where the cell sits and nudge the tip horizontally to stay inside.
  let cellEl: HTMLButtonElement | undefined;
  let tipShift = 0;
  const EDGE = 8;
  const TIP_W = 280;
  function recomputeShift() {
    if (!cellEl) return;
    const r = cellEl.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const leftEdge = center - TIP_W / 2;
    const rightEdge = center + TIP_W / 2;
    const vw = window.innerWidth;
    if (leftEdge < EDGE) tipShift = EDGE - leftEdge;
    else if (rightEdge > vw - EDGE) tipShift = vw - EDGE - rightEdge;
    else tipShift = 0;
  }
</script>

<button
  bind:this={cellEl}
  class="cell"
  class:shake={shaking}
  class:maxed={rank > 0 && rank >= skill.maxRank}
  class:filled={rank > 0}
  class:locked={!tierUnlocked}
  class:has-prereq={hasPrereqParent}
  class:prereq-satisfied={prereqSatisfied}
  style="--tip-shift: {tipShift}px;"
  on:click={onClick}
  on:contextmenu={onContext}
  on:dblclick={(e) => e.preventDefault()}
  on:mouseenter={recomputeShift}
  on:focus={recomputeShift}
  aria-label="{skill.name}, rank {rank} of {skill.maxRank}"
  type="button"
>
  <RankShape kind={skill.kind} rank={rank} max={skill.maxRank} locked={!tierUnlocked} />
  <span class="ranklabel">
    {#if tierUnlocked}
      {rank} / {skill.maxRank}
    {:else}
      🔒
    {/if}
  </span>

  <!-- Custom desktop tooltip: appears ~80ms after hover, much faster than the
       native title attribute. Hidden on coarse-pointer devices (mobile uses
       the tap-card pattern instead). -->
  <div class="tip" role="tooltip">
    <div class="tip-head">
      <strong>{skill.name}</strong>
      <span class="tip-rank">{rank} / {skill.maxRank}</span>
    </div>
    <div class="tip-meta">{skill.kind === 'active' ? 'Active' : 'Passive'} · Tier {skill.row}</div>
    <p class="tip-desc">{skill.description}</p>
    {#if lockReason}<div class="tip-warn">{lockReason}</div>{/if}
    {#if capReason}<div class="tip-warn">{capReason}</div>{/if}
    {#if refundReason}<div class="tip-warn">Shift+click to refund — but: {refundReason}</div>{/if}
  </div>
</button>

<style>
  .cell {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 6px 4px 4px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    width: 64px;
    transition: background 100ms, border-color 100ms, transform 80ms;
  }

  /* Vertical connector drawn upward into the row-gap, linking this cell
     to its prereq parent directly above. */
  .cell.has-prereq::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: -10px;
    width: 2px;
    height: 10px;
    background: var(--text-faint);
  }
  .cell.has-prereq.prereq-satisfied::before {
    background: var(--gold);
    box-shadow: 0 0 4px rgba(236, 198, 128, 0.45);
  }
  .cell:hover {
    background: rgba(214, 168, 90, 0.06);
    border-color: var(--border);
  }
  .cell.filled {
    background: rgba(214, 168, 90, 0.08);
    border-color: var(--bronze);
  }
  .cell.maxed {
    border-color: var(--gold);
    background: rgba(214, 168, 90, 0.14);
  }
  .cell.locked {
    cursor: not-allowed;
  }
  .cell.locked:hover {
    background: transparent;
    border-color: transparent;
  }

  .ranklabel {
    font-size: 0.7rem;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .cell.filled .ranklabel {
    color: var(--gold-bright);
  }

  .shake {
    animation: shake 280ms;
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); border-color: var(--crimson); }
    75% { transform: translateX(3px); border-color: var(--crimson); }
  }

  /* Custom tooltip — fast appearance on hover (80ms), no flicker on quick
     mouse movement between cells. Suppressed on touch via @media. */
  .tip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(calc(-50% + var(--tip-shift, 0px)));
    width: 280px;
    max-width: 92vw;
    padding: 0.6rem 0.75rem;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--gold);
    border-radius: 4px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
    text-align: left;
    z-index: 30;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 80ms ease 80ms, visibility 0s linear 160ms;
  }
  .tip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(calc(-50% - var(--tip-shift, 0px)));
    border: 6px solid transparent;
    border-top-color: var(--gold);
  }
  .cell:hover .tip,
  .cell:focus-visible .tip {
    opacity: 1;
    visibility: visible;
    transition: opacity 80ms ease 80ms, visibility 0s linear 80ms;
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
    font-size: 0.98rem;
  }
  .tip-rank {
    font-size: 0.78rem;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .tip-meta {
    font-size: 0.72rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.06em;
    margin-bottom: 0.4rem;
  }
  .tip-desc {
    margin: 0;
    font-family: 'Georgia', serif;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .tip-warn {
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--border);
    font-size: 0.78rem;
    color: var(--crimson-bright);
  }

  /* Touch / coarse pointer: suppress hover tooltip — detail card takes over. */
  @media (pointer: coarse) {
    .tip {
      display: none;
    }
  }
</style>
