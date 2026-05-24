export type ClassId = 'princeps' | 'sagittarius' | 'triarius' | 'veles';
export type SkillKind = 'active' | 'passive';

export interface Skill {
  id: string;
  name: string;
  kind: SkillKind;
  column: 1 | 2;
  row: 1 | 2 | 3 | 4;
  maxRank: 1 | 2 | 3;
  description: string;
  requiresSkillId?: string;
}

export interface Specialization {
  id: string;
  name: string;
  skills: Skill[];
}

export interface ClassDef {
  id: ClassId;
  name: string;
  specs: [Specialization, Specialization, Specialization];
}

export interface LoyalCompanion {
  id: string;
  name: string;
  class: ClassId;
}

export interface CharacterState {
  classId: ClassId;
  name: string;
  skillRanks: Record<string, number>;
}

export interface PraetorianState extends CharacterState {
  id: string;
}

export interface PartyBuild {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pc: CharacterState;
  loyals: Record<string, CharacterState>;
  praetorians: PraetorianState[];
}

export const SKILL_POINT_BUDGET = 20;
export const TIER_THRESHOLDS = { 2: 1, 3: 4, 4: 7 } as const;
