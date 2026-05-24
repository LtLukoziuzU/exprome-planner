<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CharacterState, Skill, Specialization } from '../types';
  import { canIncrease, canDecrease, skillById } from '../rules';
  import { updateActiveBuild } from '../state/builds';
  import RankShape from './RankShape.svelte';

  export let skill: Skill;
  export let spec: Specialization;
  export let character: CharacterState;
  export let praetorianId: string | null;

  const dispatch = createEventDispatcher();

  $: rank = character.skillRanks[skill.id] ?? 0;
  $: inc = canIncrease(character, spec, skill);
  $: dec = canDecrease(character, spec, skill);
  $: parent = skill.requiresSkillId ? skillById(skill.requiresSkillId) ?? null : null;

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

  function close() {
    dispatch('close');
  }
  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

<div class="backdrop" on:click={onBackdropClick} role="presentation">
  <div class="card" role="dialog" aria-label={skill.name}>
    <header>
      <div class="title">
        <RankShape kind={skill.kind} rank={rank} max={skill.maxRank} />
        <div>
          <h3 class="flourish">{skill.name}</h3>
          <span class="kind">{skill.kind === 'active' ? 'Active' : 'Passive'} · Tier {skill.row} · {spec.name}</span>
        </div>
      </div>
      <button class="close" on:click={close} aria-label="Close">×</button>
    </header>

    <p class="desc">{skill.description}</p>

    {#if parent}
      <div class="note">Requires at least 1 rank in <strong>{parent.name}</strong>.</div>
    {/if}

    <div class="rank-row">
      <span class="rank-label">Rank</span>
      <button on:click={() => applyDelta(-1)} disabled={!dec.ok} class="rank-btn">−</button>
      <span class="rank-now">{rank} / {skill.maxRank}</span>
      <button on:click={() => applyDelta(1)} disabled={!inc.ok} class="rank-btn">+</button>
    </div>

    {#if !inc.ok && rank < skill.maxRank}
      <div class="reason">{inc.reason}</div>
    {/if}
    {#if !dec.ok && rank > 0}
      <div class="reason warn">{dec.reason}</div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    backdrop-filter: blur(2px);
  }

  .card {
    background: var(--bg-elevated);
    border: 1px solid var(--gold);
    border-radius: 6px 6px 0 0;
    padding: 1.1rem 1.2rem 1.4rem;
    width: 100%;
    max-width: 540px;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.6rem;
    margin-bottom: 0.6rem;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }
  h3 {
    font-size: 1.1rem;
    margin: 0;
    color: var(--gold-bright);
  }
  .kind {
    font-size: 0.78rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .close {
    background: transparent;
    border: 1px solid var(--border);
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
  }

  .desc {
    margin: 0.4rem 0 0.8rem;
    color: var(--text);
    font-family: 'Georgia', serif;
    font-size: 0.95rem;
  }

  .note {
    font-size: 0.82rem;
    color: var(--text-dim);
    background: rgba(214, 168, 90, 0.06);
    border-left: 3px solid var(--bronze);
    padding: 0.4rem 0.6rem;
    margin-bottom: 0.6rem;
  }

  .rank-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  .rank-label {
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .rank-btn {
    width: 38px;
    height: 38px;
    font-size: 1.2rem;
    padding: 0;
  }
  .rank-now {
    font-size: 1.1rem;
    color: var(--gold-bright);
    font-variant-numeric: tabular-nums;
    min-width: 4em;
    text-align: center;
  }

  .reason {
    margin-top: 0.5rem;
    font-size: 0.82rem;
    color: var(--text-dim);
  }
  .reason.warn {
    color: var(--crimson-bright);
  }

  @media (min-width: 700px) {
    .backdrop {
      align-items: center;
    }
    .card {
      border-radius: 6px;
      max-height: 80vh;
      overflow-y: auto;
    }
  }
</style>
