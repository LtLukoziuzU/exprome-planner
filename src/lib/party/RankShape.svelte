<script lang="ts">
  import type { SkillKind } from '../types';
  export let kind: SkillKind;
  export let rank: number;
  export let max: 1 | 2 | 3;
  export let locked = false;

  // Segments: each rank slot is a chip. Filled = gold, empty = slate, locked = dim.
  $: segments = Array.from({ length: max }, (_, i) => i < rank);
</script>

{#if kind === 'active'}
  <span class="shape square" class:locked>
    <span class="bars">
      {#each segments as on, i (i)}
        <span class="seg" class:on></span>
      {/each}
    </span>
  </span>
{:else}
  <span class="shape circle" class:locked>
    <span class="bars">
      {#each segments as on, i (i)}
        <span class="seg" class:on></span>
      {/each}
    </span>
  </span>
{/if}

<style>
  .shape {
    --size: 44px;
    position: relative;
    width: var(--size);
    height: var(--size);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    border: 2px solid var(--bronze);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  }
  .shape.square {
    border-radius: 5px;
  }
  .shape.circle {
    border-radius: 50%;
  }

  .shape.locked {
    background: var(--bg);
    border-color: var(--text-faint);
    opacity: 0.7;
  }

  .bars {
    display: flex;
    gap: 2px;
    width: calc(var(--size) - 16px);
    height: 6px;
  }
  .seg {
    flex: 1;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 1px;
    border: 1px solid var(--bronze);
  }
  .seg.on {
    background: var(--gold-bright);
    border-color: var(--gold);
    box-shadow: 0 0 4px rgba(236, 198, 128, 0.55);
  }
  .shape.locked .seg {
    background: rgba(0, 0, 0, 0.3);
    border-color: var(--text-faint);
  }
</style>
