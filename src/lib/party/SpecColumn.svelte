<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CharacterState, Skill, Specialization } from '../types';
  import { pointsInSpec, tierUnlocked, tierThreshold } from '../rules';
  import SkillCell from './SkillCell.svelte';

  export let spec: Specialization;
  export let character: CharacterState;
  export let praetorianId: string | null;

  const dispatch = createEventDispatcher();

  $: invested = pointsInSpec(character, spec);

  // Sorted layout: 4 rows × 2 cols (col 1 left, col 2 right).
  $: grid = ((): Skill[][] => {
    const out: Skill[][] = [[], [], [], []];
    for (const s of spec.skills) out[s.row - 1][s.column - 1] = s;
    return out;
  })();

  const TIERS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  function unlockHint(tier: 1 | 2 | 3 | 4): string {
    const need = tierThreshold(tier) - invested;
    return need > 0 ? `Needs ${need} more point${need === 1 ? '' : 's'} in ${spec.name}` : '';
  }
</script>

<div class="spec">
  <header>
    <h3 class="flourish">{spec.name}</h3>
    <span class="invested" title="Points in this specialization">{invested}</span>
  </header>

  <div class="grid">
    {#each grid as row, rIdx}
      {@const tier = TIERS[rIdx]}
      {@const unlocked = tierUnlocked(character, spec, tier)}
      <div class="row" class:locked={!unlocked} title={!unlocked ? unlockHint(tier) : ''}>
        {#each row as skill (skill?.id ?? rIdx)}
          {#if skill}
            {@const parentRank = skill.requiresSkillId ? (character.skillRanks[skill.requiresSkillId] ?? 0) : 0}
            <SkillCell
              {skill}
              {spec}
              {character}
              {praetorianId}
              tierUnlocked={unlocked}
              hasPrereqParent={!!skill.requiresSkillId}
              prereqSatisfied={parentRank > 0}
              on:focus={() => dispatch('focusskill', skill.id)}
            />
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .spec {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.25rem;
  }
  h3 {
    font-size: 1rem;
    margin: 0;
    color: var(--gold-bright);
  }
  .invested {
    font-size: 0.85rem;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }

  .grid {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
    justify-items: center;
  }
  .row.locked {
    opacity: 0.55;
  }
</style>
