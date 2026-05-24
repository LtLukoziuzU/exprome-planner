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

  $: tipLines = [
    skill.name,
    `${rank} / ${skill.maxRank}`,
    skill.description,
    !tierUnlocked ? '\nLocked: ' + (inc.reason ?? '') : '',
    rank === 0 && inc.reason ? `\n${inc.reason}` : '',
  ]
    .filter(Boolean)
    .join('\n');
</script>

<button
  class="cell"
  class:shake={shaking}
  class:maxed={rank > 0 && rank >= skill.maxRank}
  class:filled={rank > 0}
  class:locked={!tierUnlocked}
  class:has-prereq={hasPrereqParent}
  class:prereq-satisfied={prereqSatisfied}
  on:click={onClick}
  on:contextmenu={onContext}
  on:dblclick={(e) => e.preventDefault()}
  title={tipLines}
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
</style>
