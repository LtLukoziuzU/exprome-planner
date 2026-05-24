<script lang="ts">
  import type { CharacterState } from '../types';
  import { classById, totalPointsSpent, skillById } from '../rules';
  import { SKILL_POINT_BUDGET } from '../types';
  import { updateActiveBuild } from '../state/builds';
  import SpecColumn from './SpecColumn.svelte';
  import SkillDetailCard from './SkillDetailCard.svelte';

  export let character: CharacterState;
  export let label: string;
  export let editable: boolean = true;
  export let praetorianId: string | null;

  $: classDef = classById(character.classId);
  $: spent = totalPointsSpent(character);

  // Skill currently selected on mobile (tap-to-open-card pattern).
  let focusedSkillId: string | null = null;
  $: focusedSkill = focusedSkillId ? skillById(focusedSkillId) ?? null : null;
  $: focusedSpec = (() => {
    if (!focusedSkillId || !classDef) return null;
    for (const sp of classDef.specs) {
      if (sp.skills.some((s) => s.id === focusedSkillId)) return sp;
    }
    return null;
  })();

  function onFocusSkill(e: CustomEvent<string>) {
    focusedSkillId = e.detail;
  }

  let editingName = false;
  let nameDraft = character.name;
  $: if (!editingName) nameDraft = character.name;

  function startEditName() {
    if (!editable) return;
    nameDraft = character.name;
    editingName = true;
  }
  function commitName() {
    const v = nameDraft.trim();
    if (v && v !== character.name) {
      updateActiveBuild((b) => {
        if (praetorianId) {
          const p = b.praetorians.find((x) => x.id === praetorianId);
          if (p) p.name = v;
        } else {
          // PC path: editable + no praetorianId.
          b.pc.name = v;
        }
      });
    }
    editingName = false;
  }
  function cancelName() {
    editingName = false;
  }

  // Locate this character in the active build and reset their skill ranks.
  function resetCharacter() {
    if (!confirm(`Reset all skill ranks for ${character.name}?`)) return;
    updateActiveBuild((b) => {
      if (praetorianId) {
        const p = b.praetorians.find((x) => x.id === praetorianId);
        if (p) p.skillRanks = {};
        return;
      }
      if (b.pc.name === character.name && b.pc.classId === character.classId) {
        b.pc.skillRanks = {};
        return;
      }
      for (const k of Object.keys(b.loyals)) {
        if (b.loyals[k].name === character.name) {
          b.loyals[k].skillRanks = {};
          return;
        }
      }
    });
  }
</script>

<div class="sheet">
  <header class="sheet-head">
    <div class="who">
      <span class="label">{label}</span>
      {#if editingName}
        <input
          class="name-edit"
          bind:value={nameDraft}
          on:blur={commitName}
          on:keydown={(e) => {
            if (e.key === 'Enter') commitName();
            else if (e.key === 'Escape') cancelName();
          }}
          autofocus
        />
      {:else}
        <span class="name" class:can-edit={editable} on:click={startEditName} role="presentation">
          {character.name}
        </span>
        {#if editable}
          <button class="name-edit-btn" on:click={startEditName} title="Rename">✎</button>
        {/if}
      {/if}
      <span class="cls">{classDef?.name ?? character.classId}</span>
    </div>
    <div class="counter">
      <span class="big" class:full={spent >= SKILL_POINT_BUDGET}>{spent}</span>
      <span class="of">/ {SKILL_POINT_BUDGET} spent</span>
      <button class="reset" on:click={resetCharacter} title="Refund all skill points">Reset</button>
    </div>
  </header>

  {#if classDef}
    <div class="specs">
      {#each classDef.specs as spec (spec.id)}
        <SpecColumn
          spec={spec}
          character={character}
          praetorianId={praetorianId}
          on:focusskill={onFocusSkill}
        />
      {/each}
    </div>
  {/if}
</div>

{#if focusedSkill && focusedSpec}
  <SkillDetailCard
    skill={focusedSkill}
    spec={focusedSpec}
    character={character}
    praetorianId={praetorianId}
    on:close={() => (focusedSkillId = null)}
  />
{/if}

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .who {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .label {
    font-size: 0.72rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.1em;
  }
  .name {
    font-size: 1.4rem;
    color: var(--gold-bright);
    font-variant: small-caps;
    letter-spacing: 0.04em;
  }
  .name.can-edit {
    cursor: text;
    border-bottom: 1px dashed transparent;
  }
  .name.can-edit:hover {
    border-bottom-color: var(--bronze);
  }
  .name-edit {
    font-size: 1.4rem;
    color: var(--gold-bright);
    font-variant: small-caps;
    letter-spacing: 0.04em;
    background: var(--bg);
    border: 1px solid var(--gold);
    padding: 0 6px;
    min-width: 8em;
  }
  .name-edit-btn {
    font-size: 0.85rem;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-faint);
  }
  .name-edit-btn:hover {
    color: var(--gold-bright);
    border-color: var(--gold);
  }
  .cls {
    font-size: 0.95rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .counter {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .big {
    font-size: 2rem;
    color: var(--text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .big.full {
    color: var(--gold-bright);
  }
  .of {
    color: var(--text-dim);
  }
  .reset {
    margin-left: 0.5rem;
    font-size: 0.78rem;
    padding: 4px 10px;
  }

  .specs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 900px) {
    .specs {
      gap: 1rem;
    }
  }
  @media (max-width: 700px) {
    .specs {
      grid-template-columns: 1fr;
    }
  }
</style>
