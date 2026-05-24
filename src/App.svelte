<script lang="ts">
  import { activeBuild, builds, setActiveBuild, createBuild, renameBuild, duplicateBuild, deleteBuild } from './lib/state/builds';
  import PartyTab from './lib/party/PartyTab.svelte';

  type Tab = 'party' | 'outpost';
  let activeTab: Tab = 'party';
  let renaming = false;
  let renameValue = '';

  $: build = $activeBuild;

  function startRename() {
    if (!build) return;
    renameValue = build.name;
    renaming = true;
  }
  function commitRename() {
    if (build && renameValue.trim()) {
      renameBuild(build.id, renameValue.trim());
    }
    renaming = false;
  }
  function onNewBuild() {
    const name = prompt('New build name?', 'New Party');
    if (name?.trim()) createBuild(name.trim());
  }
  function onDuplicate() {
    if (build) duplicateBuild(build.id);
  }
  function onPickBuild(e: Event) {
    const target = e.target as HTMLSelectElement;
    setActiveBuild(target.value);
  }
  function onDelete() {
    if (!build) return;
    if (confirm(`Delete build "${build.name}"? This cannot be undone.`)) {
      deleteBuild(build.id);
    }
  }
</script>

<header class="app-header">
  <div class="brand">
    <span class="flourish">Expeditions: Rome</span>
    <span class="brand-sub">Party &amp; Outpost Planner</span>
  </div>

  <nav class="tabs">
    <button class="tab" class:active={activeTab === 'party'} on:click={() => (activeTab = 'party')}>Party</button>
    <button class="tab" class:active={activeTab === 'outpost'} on:click={() => (activeTab = 'outpost')}>Outpost</button>
  </nav>

  <div class="build-manager">
    {#if build}
      {#if renaming}
        <input
          bind:value={renameValue}
          on:blur={commitRename}
          on:keydown={(e) => e.key === 'Enter' && commitRename()}
          autofocus
        />
      {:else}
        <select value={build.id} on:change={onPickBuild}>
          {#each $builds as b (b.id)}
            <option value={b.id}>{b.name}</option>
          {/each}
        </select>
        <button on:click={startRename} title="Rename build">Rename</button>
      {/if}
      <button on:click={onNewBuild} title="Create a new build">New</button>
      <button on:click={onDuplicate} title="Duplicate current build">Copy</button>
      <button on:click={onDelete} title="Delete current build">Delete</button>
    {/if}
  </div>
</header>

<main class="app-main">
  {#if activeTab === 'party'}
    <PartyTab />
  {:else}
    <section class="placeholder">
      <h2 class="flourish">Outpost</h2>
      <p>The outpost planner will go here once the upgrade tree data is in.</p>
    </section>
  {/if}
</main>

<footer class="app-footer">
  <span>Skill data scraped from the
    <a href="https://expeditions-viking.fandom.com/wiki/Class_skills_(Rome)" target="_blank" rel="noreferrer">Expeditions wiki</a>.
    Base game only.
  </span>
</footer>

<style>
  .app-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(180deg, #1a2949 0%, #14223e 100%);
    border-bottom: 2px solid var(--gold);
    box-shadow: var(--shadow);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-wrap: wrap;
  }

  .brand {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  .brand .flourish {
    font-size: 1.15rem;
  }
  .brand-sub {
    font-size: 0.8rem;
    color: var(--text-dim);
    letter-spacing: 0.04em;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    margin-left: auto;
  }
  .tab {
    font-variant: small-caps;
    letter-spacing: 0.08em;
    padding: 8px 18px;
    background: transparent;
    border: 1px solid transparent;
    border-bottom: 2px solid transparent;
    border-radius: 0;
  }
  .tab:hover {
    background: var(--bg-card);
    color: var(--gold-bright);
  }
  .tab.active {
    color: var(--gold-bright);
    border-bottom-color: var(--gold);
  }

  .build-manager {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .build-manager select {
    min-width: 12em;
  }
  .build-manager input {
    min-width: 12em;
  }

  .app-main {
    padding: 1rem 1.5rem 5rem;
    min-height: calc(100vh - 110px);
  }

  .placeholder {
    max-width: 50em;
    margin: 4rem auto;
    text-align: center;
    color: var(--text-dim);
  }
  .placeholder h2 {
    font-size: 2rem;
  }

  .app-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.5rem 1.5rem;
    font-size: 0.78rem;
    color: var(--text-faint);
    background: rgba(15, 26, 46, 0.92);
    border-top: 1px solid var(--border);
    backdrop-filter: blur(4px);
  }
  .app-footer a {
    color: var(--gold);
  }

  @media (max-width: 720px) {
    .app-header {
      gap: 0.6rem;
      padding: 0.6rem 0.9rem;
    }
    .tabs {
      margin-left: 0;
      order: 3;
      width: 100%;
    }
    .build-manager {
      order: 4;
      width: 100%;
    }
    .build-manager select,
    .build-manager input {
      flex: 1;
      min-width: 0;
    }
  }
</style>
