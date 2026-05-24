<script lang="ts">
  /**
   * Small inline-SVG glyph for an outpost building group. Drawn centred on
   * (0,0) so it can be dropped into the parent <g> that already transforms
   * the node to its position. Stroke uses currentColor so the consumer can
   * tint it via the surrounding fill/stroke styling.
   */
  export let group: string;
  export let size: number = 28;

  $: half = size / 2;
</script>

{#if group === 'medical'}
  <!-- Plus / cross -->
  <g class="glyph">
    <rect x={-half * 0.6} y={-half * 0.18} width={half * 1.2} height={half * 0.36} rx="1" />
    <rect x={-half * 0.18} y={-half * 0.6} width={half * 0.36} height={half * 1.2} rx="1" />
  </g>
{:else if group === 'market'}
  <!-- Two overlapping coins -->
  <g class="glyph stroked">
    <circle cx={-half * 0.28} cy={-half * 0.18} r={half * 0.45} />
    <circle cx={half * 0.28} cy={half * 0.18} r={half * 0.45} />
  </g>
{:else if group === 'recruitment'}
  <!-- Tent: triangle with a vertical pole -->
  <g class="glyph stroked">
    <path d="M{-half * 0.7},{half * 0.55} L0,{-half * 0.65} L{half * 0.7},{half * 0.55} Z" />
    <line x1="0" y1={-half * 0.65} x2="0" y2={half * 0.55} />
  </g>
{:else if group === 'tactical'}
  <!-- Grenade: circle with small fuse -->
  <g class="glyph">
    <circle cx="0" cy={half * 0.18} r={half * 0.52} />
    <rect x={-half * 0.18} y={-half * 0.55} width={half * 0.36} height={half * 0.28} />
    <line class="stroked" x1={half * 0.18} y1={-half * 0.55} x2={half * 0.5} y2={-half * 0.85} />
  </g>
{:else if group === 'blacksmith'}
  <!-- Anvil: trapezoid body with horn -->
  <g class="glyph">
    <rect x={-half * 0.7} y={-half * 0.1} width={half * 1.4} height={half * 0.28} />
    <path d="M{-half * 0.5},{half * 0.18} L{half * 0.5},{half * 0.18} L{half * 0.35},{half * 0.6} L{-half * 0.35},{half * 0.6} Z" />
    <rect x={-half * 0.85} y={-half * 0.2} width={half * 0.3} height={half * 0.15} />
  </g>
{:else if group === 'morale'}
  <!-- Aqueduct: row of arches -->
  <g class="glyph stroked">
    <path d="M{-half * 0.85},{half * 0.55} L{-half * 0.85},{-half * 0.15} a{half * 0.28},{half * 0.28} 0 0 1 {half * 0.56},0 L{-half * 0.29},{half * 0.55}" fill="none" />
    <path d="M{-half * 0.28},{half * 0.55} L{-half * 0.28},{-half * 0.15} a{half * 0.28},{half * 0.28} 0 0 1 {half * 0.56},0 L{half * 0.28},{half * 0.55}" fill="none" />
    <path d="M{half * 0.29},{half * 0.55} L{half * 0.29},{-half * 0.15} a{half * 0.28},{half * 0.28} 0 0 1 {half * 0.56},0 L{half * 0.85},{half * 0.55}" fill="none" />
    <line x1={-half * 0.9} y1={-half * 0.55} x2={half * 0.9} y2={-half * 0.55} />
  </g>
{:else if group === 'defence'}
  <!-- Brick wall: staggered rectangles -->
  <g class="glyph">
    <rect x={-half * 0.75} y={-half * 0.6} width={half * 0.6} height={half * 0.32} />
    <rect x={-half * 0.1} y={-half * 0.6} width={half * 0.85} height={half * 0.32} />
    <rect x={-half * 0.6} y={-half * 0.2} width={half * 0.85} height={half * 0.32} />
    <rect x={half * 0.3} y={-half * 0.2} width={half * 0.45} height={half * 0.32} />
    <rect x={-half * 0.75} y={half * 0.2} width={half * 0.5} height={half * 0.32} />
    <rect x={-half * 0.2} y={half * 0.2} width={half * 0.95} height={half * 0.32} />
  </g>
{:else if group === 'stratagems'}
  <!-- Two overlapping playing cards -->
  <g class="glyph stroked">
    <rect x={-half * 0.55} y={-half * 0.6} width={half * 0.7} height={half * 1.0} rx="2" transform="rotate(-12)" />
    <rect x={-half * 0.15} y={-half * 0.6} width={half * 0.7} height={half * 1.0} rx="2" transform="rotate(12)" />
  </g>
{:else if group === 'offence'}
  <!-- Shelves: three horizontal bars with crate notches -->
  <g class="glyph">
    <rect x={-half * 0.75} y={-half * 0.55} width={half * 1.5} height={half * 0.18} />
    <rect x={-half * 0.55} y={-half * 0.35} width={half * 0.35} height={half * 0.25} />
    <rect x={half * 0.05} y={-half * 0.35} width={half * 0.45} height={half * 0.25} />
    <rect x={-half * 0.75} y={-half * 0.05} width={half * 1.5} height={half * 0.18} />
    <rect x={-half * 0.55} y={half * 0.15} width={half * 0.55} height={half * 0.25} />
    <rect x={half * 0.15} y={half * 0.15} width={half * 0.35} height={half * 0.25} />
    <rect x={-half * 0.75} y={half * 0.45} width={half * 1.5} height={half * 0.18} />
  </g>
{:else}
  <!-- Fallback: a small dot -->
  <circle class="glyph" cx="0" cy="0" r="3" />
{/if}

<style>
  .glyph {
    fill: currentColor;
    stroke: none;
    pointer-events: none;
  }
  .glyph.stroked,
  :global(.glyph.stroked *) {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
