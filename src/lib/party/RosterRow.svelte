<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CharacterState, ClassId } from '../types';
  import { classById, totalPointsSpent } from '../rules';
  import { SKILL_POINT_BUDGET } from '../types';
  import { updateActiveBuild, removePraetorian } from '../state/builds';

  export let character: CharacterState;
  export let praetorianId: string | null = null;
  export let active = false;
  export let editableName = false;
  export let editableClass = false;
  export let deletable = false;

  const dispatch = createEventDispatcher();

  $: classDef = classById(character.classId);
  $: spent = totalPointsSpent(character);

  // Class-tinted initials for the avatar.
  const CLASS_HUE: Record<ClassId, number> = {
    princeps: 0,        // crimson
    sagittarius: 130,   // green
    triarius: 200,      // teal-blue
    veles: 40,          // gold
  };
  $: hue = CLASS_HUE[character.classId];
  $: initials = character.name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  let editingName = false;
  let nameDraft = character.name;
  function startEditName(e: Event) {
    e.stopPropagation();
    if (!editableName) return;
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
          b.pc.name = v;
        }
      });
    }
    editingName = false;
  }

  function changeClass(e: Event) {
    e.stopPropagation();
    const newClass = (e.target as HTMLSelectElement).value as ClassId;
    updateActiveBuild((b) => {
      if (praetorianId) {
        const p = b.praetorians.find((x) => x.id === praetorianId);
        if (p) {
          p.classId = newClass;
          p.skillRanks = {}; // wipe on class change — different tree
        }
      } else {
        b.pc.classId = newClass;
        b.pc.skillRanks = {};
      }
    });
  }

  function onDelete(e: Event) {
    e.stopPropagation();
    if (praetorianId && confirm(`Delete ${character.name}?`)) {
      removePraetorian(praetorianId);
    }
  }
</script>

<button
  class="row"
  class:active
  on:click={() => dispatch('click')}
  type="button"
>
  <span class="avatar" style="--hue: {hue}">{initials || '?'}</span>

  <span class="info">
    {#if editingName}
      <input
        bind:value={nameDraft}
        on:blur={commitName}
        on:keydown={(e) => e.key === 'Enter' && commitName()}
        on:click={(e) => e.stopPropagation()}
        autofocus
      />
    {:else}
      <span class="name" on:dblclick={startEditName} role="presentation">{character.name}</span>
    {/if}

    <span class="meta">
      {#if editableClass}
        <select value={character.classId} on:change={changeClass} on:click={(e) => e.stopPropagation()}>
          <option value="princeps">Princeps</option>
          <option value="sagittarius">Sagittarius</option>
          <option value="triarius">Triarius</option>
          <option value="veles">Veles</option>
        </select>
      {:else}
        <span class="cls">{classDef?.name ?? character.classId}</span>
      {/if}
      <span class="points" class:full={spent >= SKILL_POINT_BUDGET}>{spent} / {SKILL_POINT_BUDGET}</span>
    </span>
  </span>

  {#if deletable}
    <button class="del" on:click={onDelete} title="Delete">×</button>
  {/if}
</button>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.5rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--bg-card);
    border-color: var(--border);
  }
  .row.active {
    background: var(--bg-card);
    border-color: var(--gold);
    box-shadow: inset 3px 0 0 var(--gold);
  }

  .avatar {
    flex: 0 0 32px;
    height: 32px;
    border-radius: 50%;
    background: hsl(var(--hue), 40%, 30%);
    border: 1.5px solid hsl(var(--hue), 60%, 55%);
    color: hsl(var(--hue), 90%, 90%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: bold;
    font-variant: small-caps;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .name {
    font-size: 0.92rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .info input {
    font-size: 0.92rem;
    padding: 2px 4px;
    width: 100%;
  }
  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    font-size: 0.72rem;
    color: var(--text-dim);
  }
  .meta select {
    font-size: 0.7rem;
    padding: 1px 4px;
    background: transparent;
    border: 1px solid var(--border);
  }
  .cls {
    font-variant: small-caps;
    letter-spacing: 0.06em;
  }
  .points {
    color: var(--text-faint);
    font-variant-numeric: tabular-nums;
  }
  .points.full {
    color: var(--gold-bright);
  }

  .del {
    flex: 0 0 auto;
    padding: 0 7px;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-faint);
    font-size: 1rem;
    line-height: 1.2;
  }
  .del:hover {
    color: var(--crimson-bright);
    border-color: var(--crimson);
  }
</style>
