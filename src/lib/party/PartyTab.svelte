<script lang="ts">
  import { activeBuild, addPraetorian, loyalRoster } from '../state/builds';
  import RosterRow from './RosterRow.svelte';
  import CharacterSheet from './CharacterSheet.svelte';

  type Slot = { kind: 'pc' | 'loyal' | 'praetorian'; id?: string };

  let selected: Slot = { kind: 'pc' };

  $: build = $activeBuild;

  $: selectedChar = (() => {
    if (!build) return null;
    if (selected.kind === 'pc') return build.pc;
    if (!selected.id) return null;
    if (selected.kind === 'loyal') return build.loyals[selected.id] ?? null;
    return build.praetorians.find((p) => p.id === selected.id) ?? null;
  })();

  $: selectedLabel = (() => {
    if (!build) return '';
    if (selected.kind === 'pc') return 'Player Character';
    if (selected.kind === 'loyal') {
      const l = loyalRoster.find((x) => x.id === selected.id);
      return l ? `${l.name} (Loyal)` : 'Loyal';
    }
    return 'Praetorian';
  })();

  function selectLoyal(id: string) {
    selected = { kind: 'loyal', id };
  }
  function selectPraetorian(id: string) {
    selected = { kind: 'praetorian', id };
  }
  function selectPC() {
    selected = { kind: 'pc' };
  }
  function onAddPraetorian() {
    addPraetorian();
    if (build) {
      const last = build.praetorians[build.praetorians.length - 1];
      if (last) selected = { kind: 'praetorian', id: last.id };
    }
  }

  // If the selected praetorian was deleted, fall back to PC.
  $: if (build && selected.kind === 'praetorian' && !build.praetorians.some((p) => p.id === selected.id)) {
    selected = { kind: 'pc' };
  }
</script>

{#if build}
  <div class="party">
    <aside class="rail">
      <div class="section-label">Player Character</div>
      <RosterRow
        character={build.pc}
        editableClass
        editableName
        active={selected.kind === 'pc'}
        on:click={selectPC}
      />

      <div class="section-label">Loyal Companions</div>
      {#each loyalRoster as loyal (loyal.id)}
        {@const char = build.loyals[loyal.id]}
        {#if char}
          <RosterRow
            character={char}
            active={selected.kind === 'loyal' && selected.id === loyal.id}
            on:click={() => selectLoyal(loyal.id)}
          />
        {/if}
      {/each}

      <div class="section-label">
        Praetorians
        <button class="add-btn" on:click={onAddPraetorian} title="Add a praetorian">+ Add</button>
      </div>
      {#each build.praetorians as p (p.id)}
        <RosterRow
          character={p}
          praetorianId={p.id}
          editableClass
          editableName
          deletable
          active={selected.kind === 'praetorian' && selected.id === p.id}
          on:click={() => selectPraetorian(p.id)}
        />
      {:else}
        <div class="empty">No praetorians yet.</div>
      {/each}
    </aside>

    <section class="sheet">
      {#if selectedChar}
        <CharacterSheet
          character={selectedChar}
          label={selectedLabel}
          editable={selected.kind !== 'loyal'}
          praetorianId={selected.kind === 'praetorian' ? selected.id ?? null : null}
        />
      {:else}
        <div class="empty">Select a character on the left.</div>
      {/if}
    </section>
  </div>
{:else}
  <div class="empty">No active build.</div>
{/if}

<style>
  .party {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1rem;
    align-items: start;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.75rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 4px;
    position: sticky;
    top: 80px;
    max-height: calc(100vh - 110px);
    overflow-y: auto;
  }

  .section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.72rem;
    font-variant: small-caps;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    padding: 0.5rem 0.25rem 0.1rem;
    border-bottom: 1px solid var(--border);
  }
  .section-label:first-child {
    padding-top: 0;
  }

  .add-btn {
    font-size: 0.7rem;
    padding: 2px 8px;
    background: transparent;
    border: 1px solid var(--border-strong);
  }

  .empty {
    color: var(--text-faint);
    font-style: italic;
    padding: 0.4rem 0.25rem;
    font-size: 0.85rem;
  }

  .sheet {
    min-width: 0; /* let inner content shrink in grid */
  }

  @media (max-width: 900px) {
    .party {
      grid-template-columns: 1fr;
    }
    .rail {
      position: static;
      max-height: none;
      flex-direction: row;
      flex-wrap: wrap;
      overflow-x: auto;
    }
    .section-label {
      flex: 0 0 100%;
    }
  }
</style>
