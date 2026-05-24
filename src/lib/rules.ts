import type { CharacterState, ClassDef, Skill, Specialization } from './types';
import { SKILL_POINT_BUDGET, TIER_THRESHOLDS } from './types';
import skillsData from '../data/skills.json';

const CLASSES = skillsData as ClassDef[];

export const allClasses = (): ClassDef[] => CLASSES;
export const classById = (id: string): ClassDef | undefined =>
  CLASSES.find((c) => c.id === id);

export const totalPointsSpent = (char: CharacterState): number => {
  let total = 0;
  for (const r of Object.values(char.skillRanks)) total += r;
  return total;
};

export const remainingPoints = (char: CharacterState): number =>
  SKILL_POINT_BUDGET - totalPointsSpent(char);

export const pointsInSpec = (char: CharacterState, spec: Specialization): number => {
  let total = 0;
  for (const skill of spec.skills) {
    total += char.skillRanks[skill.id] ?? 0;
  }
  return total;
};

export const tierUnlocked = (
  char: CharacterState,
  spec: Specialization,
  tier: 1 | 2 | 3 | 4,
): boolean => {
  if (tier === 1) return true;
  const threshold = TIER_THRESHOLDS[tier];
  return pointsInSpec(char, spec) >= threshold;
};

export const tierThreshold = (tier: 1 | 2 | 3 | 4): number =>
  tier === 1 ? 0 : TIER_THRESHOLDS[tier];

export interface AllocateCheck {
  ok: boolean;
  reason?: string;
}

export const canIncrease = (
  char: CharacterState,
  spec: Specialization,
  skill: Skill,
): AllocateCheck => {
  const current = char.skillRanks[skill.id] ?? 0;
  if (current >= skill.maxRank) return { ok: false, reason: 'Already at max rank.' };
  if (remainingPoints(char) <= 0) return { ok: false, reason: 'No points left.' };
  if (!tierUnlocked(char, spec, skill.row)) {
    const need = tierThreshold(skill.row) - pointsInSpec(char, spec);
    return { ok: false, reason: `Needs ${need} more point${need === 1 ? '' : 's'} in this specialization.` };
  }
  if (skill.requiresSkillId) {
    const parentRank = char.skillRanks[skill.requiresSkillId] ?? 0;
    if (parentRank < 1) {
      const parent = lookupSkill(skill.requiresSkillId);
      return { ok: false, reason: `Requires at least 1 rank in ${parent?.name ?? skill.requiresSkillId}.` };
    }
  }
  return { ok: true };
};

export const canDecrease = (
  char: CharacterState,
  spec: Specialization,
  skill: Skill,
): AllocateCheck => {
  const current = char.skillRanks[skill.id] ?? 0;
  if (current <= 0) return { ok: false, reason: 'No ranks to refund.' };

  // Cascade check 1: tier rule — would removing this point drop the spec below a
  // threshold needed by some other allocated skill in the same spec?
  const wouldBeSpecPoints = pointsInSpec(char, spec) - 1;
  const blockers: string[] = [];
  for (const sib of spec.skills) {
    if (sib.id === skill.id) continue;
    const rank = char.skillRanks[sib.id] ?? 0;
    if (rank > 0 && wouldBeSpecPoints < tierThreshold(sib.row)) {
      blockers.push(sib.name);
    }
  }

  // Cascade check 2: per-skill prereq — if we're refunding the LAST rank, would
  // any child skill be left orphaned?
  if (current === 1) {
    for (const cls of CLASSES) {
      for (const sp of cls.specs) {
        for (const sib of sp.skills) {
          if (sib.requiresSkillId === skill.id && (char.skillRanks[sib.id] ?? 0) > 0) {
            blockers.push(sib.name);
          }
        }
      }
    }
  }

  if (blockers.length > 0) {
    return {
      ok: false,
      reason: `Refund blocked — would invalidate: ${blockers.join(', ')}. Refund those first.`,
    };
  }
  return { ok: true };
};

const lookupSkill = (id: string): Skill | undefined => {
  for (const cls of CLASSES) {
    for (const sp of cls.specs) {
      const found = sp.skills.find((s) => s.id === id);
      if (found) return found;
    }
  }
  return undefined;
};

export const skillById = lookupSkill;
