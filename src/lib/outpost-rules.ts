import type {
  NodeStatus,
  OutpostData,
  OutpostNode,
  OutpostState,
  ResourceCost,
  ResourceId,
} from './types';
import { RESOURCE_ORDER } from './types';
import outpostJson from '../data/outpost.json';

const DATA = outpostJson as OutpostData;

export const outpostData = (): OutpostData => DATA;
export const allNodes = (): OutpostNode[] => DATA.nodes;
export const nodeById = (id: string): OutpostNode | undefined =>
  DATA.nodes.find((n) => n.id === id);

const STATUS_RANK: Record<NodeStatus, number> = { none: 0, planned: 1, owned: 2 };
/** Anything at or above this counts as "built" for prereq satisfaction. */
const BUILT: NodeStatus[] = ['planned', 'owned'];

export const statusOf = (state: OutpostState, id: string): NodeStatus =>
  state.status[id] ?? 'none';

/** Roots are always considered built (they exist at game start). */
const isEffectivelyBuilt = (node: OutpostNode, state: OutpostState): boolean =>
  node.isRoot || BUILT.includes(statusOf(state, node.id));

const previousTierInGroup = (node: OutpostNode): OutpostNode | undefined => {
  if (node.tier === 1) return undefined;
  return DATA.nodes.find((n) => n.group === node.group && n.tier === node.tier - 1);
};

/** Children whose unlockedBy includes `id`. */
const childrenOf = (id: string): OutpostNode[] =>
  DATA.nodes.filter((n) => n.unlockedBy.includes(id));

/** Tier-N+1 node of the same building group, if any. */
const nextTierInGroup = (node: OutpostNode): OutpostNode | undefined =>
  DATA.nodes.find((n) => n.group === node.group && n.tier === node.tier + 1);

export interface AllocateCheck {
  ok: boolean;
  reason?: string;
}

/** Can this node be moved into the 'planned' or 'owned' state? */
export const canBuild = (node: OutpostNode, state: OutpostState): AllocateCheck => {
  if (node.isRoot) return { ok: false, reason: 'Roots are always built.' };

  // Rule 1: at least one unlock-parent must be built (OR semantics).
  if (node.unlockedBy.length > 0) {
    const anyParentBuilt = node.unlockedBy.some((pid) => {
      const p = nodeById(pid);
      return p ? isEffectivelyBuilt(p, state) : false;
    });
    if (!anyParentBuilt) {
      const parentNames = node.unlockedBy
        .map((pid) => nodeById(pid)?.name ?? pid)
        .join(' / ');
      return { ok: false, reason: `Needs one of these built first: ${parentNames}.` };
    }
  }

  // Rule 2: previous tier of same building group must be built.
  const prev = previousTierInGroup(node);
  if (prev && !isEffectivelyBuilt(prev, state)) {
    return { ok: false, reason: `Needs tier ${node.tier - 1} of ${DATA.groups[node.group].name} (${prev.name}) built first.` };
  }

  return { ok: true };
};

/**
 * Can this node be moved BACK to 'none'?
 * Blocked when any dependent (child in unlock graph OR same-group higher tier)
 * is currently planned/owned.
 */
export const canUnbuild = (node: OutpostNode, state: OutpostState): AllocateCheck => {
  if (node.isRoot) return { ok: false, reason: 'Roots cannot be removed.' };

  const blockers: string[] = [];

  // Child unlock-graph dependents: a child is only blocked by us if WE are the
  // ONLY built unlock-parent. If any other parent is built, removing us is OK.
  for (const child of childrenOf(node.id)) {
    if (!BUILT.includes(statusOf(state, child.id))) continue;
    const otherParentBuilt = child.unlockedBy
      .filter((pid) => pid !== node.id)
      .some((pid) => {
        const p = nodeById(pid);
        return p ? isEffectivelyBuilt(p, state) : false;
      });
    if (!otherParentBuilt) blockers.push(child.name);
  }

  // Same-group higher tier: that tier requires this one as its previous tier.
  const next = nextTierInGroup(node);
  if (next && BUILT.includes(statusOf(state, next.id))) {
    blockers.push(next.name);
  }

  if (blockers.length > 0) {
    return {
      ok: false,
      reason: `Would invalidate: ${blockers.join(', ')}. Remove those first.`,
    };
  }
  return { ok: true };
};

/** Sum the costs of all 'planned' nodes (excludes 'owned' — those are already paid). */
export const plannedCostTotal = (state: OutpostState): Record<ResourceId, number> => {
  const totals: Record<ResourceId, number> = { lumber: 0, food: 0, leather: 0, iron: 0 };
  for (const node of DATA.nodes) {
    if (statusOf(state, node.id) !== 'planned') continue;
    for (const r of RESOURCE_ORDER) {
      totals[r] += node.cost[r] ?? 0;
    }
  }
  return totals;
};

/** Cost across both planned + owned — useful for "total invested" displays. */
export const totalInvested = (state: OutpostState): Record<ResourceId, number> => {
  const totals: Record<ResourceId, number> = { lumber: 0, food: 0, leather: 0, iron: 0 };
  for (const node of DATA.nodes) {
    const s = statusOf(state, node.id);
    if (s === 'none') continue;
    for (const r of RESOURCE_ORDER) {
      totals[r] += node.cost[r] ?? 0;
    }
  }
  return totals;
};

export const costAsString = (cost: ResourceCost): string => {
  const parts: string[] = [];
  for (const r of RESOURCE_ORDER) {
    const v = cost[r] ?? 0;
    if (v > 0) parts.push(`${v} ${DATA.resources[r].name}`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Free';
};

/** Cycle order for tri-state clicks: none → planned → owned → none. */
export const NEXT_STATUS: Record<NodeStatus, NodeStatus> = {
  none: 'planned',
  planned: 'owned',
  owned: 'none',
};

/** Status the node ought to become given a click, considering legality.
 *  Returns null if the desired transition is blocked. */
export const nextLegalStatus = (
  node: OutpostNode,
  state: OutpostState,
): { next: NodeStatus; check: AllocateCheck } => {
  const current = statusOf(state, node.id);
  const desired = NEXT_STATUS[current];
  if (desired === 'planned' || desired === 'owned') {
    // From none → planned, or planned → owned. Both require the build rules.
    // (Going planned→owned doesn't change satisfaction of parents — still must
    //  be legal. canBuild is the same check for both.)
    if (current === 'none') return { next: desired, check: canBuild(node, state) };
    // planned → owned: always allowed (we're just confirming it's paid for).
    return { next: desired, check: { ok: true } };
  }
  // owned → none: removal check.
  return { next: desired, check: canUnbuild(node, state) };
};

// Used by STATUS_RANK consumers if needed externally.
export { STATUS_RANK };
