<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { NodeStatus, OutpostNode } from '../types';
  import { RESOURCE_ORDER } from '../types';
  import { outpostData } from '../outpost-rules';

  export let node: OutpostNode;
  export let status: NodeStatus;

  const dispatch = createEventDispatcher();
  const DATA = outpostData();

  const TIER_NUMERAL = { 1: 'I', 2: 'II', 3: 'III' } as const;
  $: groupName = DATA.groups[node.group]?.name ?? node.group;

  function close() { dispatch('close'); }
  function setStatus(s: NodeStatus) { dispatch('setstatus', s); }
  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
</script>

<div class="backdrop" on:click={onBackdrop} role="presentation">
  <div class="card" role="dialog" aria-label={node.name}>
    <header>
      <div class="title">
        <h3 class="flourish">{node.name}</h3>
        <span class="sub">{groupName} · Tier {TIER_NUMERAL[node.tier]}</span>
      </div>
      <button class="close" on:click={close} aria-label="Close">×</button>
    </header>

    <p class="desc">{node.description}</p>

    {#if !node.isRoot}
      <div class="costs">
        <div class="costs-label">Cost</div>
        <div class="costs-rows">
          {#each RESOURCE_ORDER as r (r)}
            <div class="cost-row" class:zero={(node.cost[r] ?? 0) === 0}>
              <span class="cost-name">{DATA.resources[r].name}</span>
              <span class="cost-val">{node.cost[r] ?? 0}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if !node.isRoot}
      <div class="state-row">
        <button class:active={status === 'none'} on:click={() => setStatus('none')}>Not Built</button>
        <button class:active={status === 'planned'} on:click={() => setStatus('planned')}>Planned</button>
        <button class:active={status === 'owned'} on:click={() => setStatus('owned')}>Owned</button>
      </div>
    {:else}
      <div class="note">Root building — always present, no cost.</div>
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
  h3 {
    font-size: 1.15rem;
    margin: 0;
    color: var(--gold-bright);
  }
  .sub {
    font-size: 0.78rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.08em;
  }
  .close {
    background: transparent;
    border: 1px solid var(--border);
    width: 30px; height: 30px;
    padding: 0;
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
  }
  .desc {
    margin: 0.4rem 0 0.8rem;
    color: var(--text);
    font-family: Georgia, serif;
    font-size: 0.95rem;
  }
  .costs {
    margin: 0.6rem 0;
    padding: 0.5rem 0.7rem;
    background: rgba(0,0,0,0.2);
    border-left: 3px solid var(--bronze);
  }
  .costs-label {
    font-size: 0.72rem;
    color: var(--text-dim);
    font-variant: small-caps;
    letter-spacing: 0.1em;
    margin-bottom: 0.3rem;
  }
  .costs-rows {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 1rem;
  }
  .cost-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.88rem;
  }
  .cost-row.zero {
    opacity: 0.4;
  }
  .cost-name {
    color: var(--text-dim);
  }
  .cost-val {
    color: var(--gold-bright);
    font-variant-numeric: tabular-nums;
    font-weight: bold;
  }
  .cost-row.zero .cost-val {
    color: var(--text-faint);
    font-weight: normal;
  }
  .state-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.4rem;
    margin-top: 0.6rem;
  }
  .state-row button {
    padding: 8px 10px;
    font-variant: small-caps;
    letter-spacing: 0.06em;
  }
  .state-row button.active {
    border-color: var(--gold);
    background: rgba(214, 168, 90, 0.15);
    color: var(--gold-bright);
  }
  .note {
    margin-top: 0.5rem;
    color: var(--text-dim);
    font-style: italic;
    font-size: 0.85rem;
  }

  @media (min-width: 700px) {
    .backdrop { align-items: center; }
    .card { border-radius: 6px; max-height: 80vh; overflow-y: auto; }
  }
</style>
