import { writable, derived, get } from 'svelte/store';
import type {
  ClassId,
  CharacterState,
  PartyBuild,
  PraetorianState,
} from '../types';
import loyalsData from '../../data/loyals.json';
import type { LoyalCompanion } from '../types';

const STORAGE_KEY = 'exprome:builds:v1';

interface StoredState {
  activeBuildId: string | null;
  builds: PartyBuild[];
}

const LOYALS = loyalsData as LoyalCompanion[];

const uuid = (): string =>
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const makeCharacter = (classId: ClassId, name: string): CharacterState => ({
  classId,
  name,
  skillRanks: {},
});

const makeLoyalsMap = (): Record<string, CharacterState> => {
  const map: Record<string, CharacterState> = {};
  for (const loyal of LOYALS) {
    map[loyal.id] = makeCharacter(loyal.class, loyal.name);
  }
  return map;
};

export const makeBuild = (name: string): PartyBuild => {
  const now = Date.now();
  return {
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    pc: makeCharacter('princeps', 'Player'),
    loyals: makeLoyalsMap(),
    praetorians: [],
    outpost: { status: {} },
  };
};

// Migrate any pre-outpost builds loaded from storage so they have the field.
const ensureOutpost = (b: PartyBuild): void => {
  if (!b.outpost) {
    b.outpost = { status: {} };
  }
};

const load = (): StoredState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeBuildId: null, builds: [] };
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || !Array.isArray(parsed.builds)) {
      return { activeBuildId: null, builds: [] };
    }
    return parsed;
  } catch {
    return { activeBuildId: null, builds: [] };
  }
};

const persist = (state: StoredState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const initial = load();
for (const b of initial.builds) ensureOutpost(b);
if (initial.builds.length === 0) {
  const first = makeBuild('My Party');
  initial.builds.push(first);
  initial.activeBuildId = first.id;
  persist(initial);
} else if (!initial.activeBuildId || !initial.builds.some((b) => b.id === initial.activeBuildId)) {
  initial.activeBuildId = initial.builds[0].id;
  persist(initial);
}

const store = writable<StoredState>(initial);
store.subscribe((s) => persist(s));

export const builds = derived(store, ($s) => $s.builds);
export const activeBuildId = derived(store, ($s) => $s.activeBuildId);
export const activeBuild = derived(store, ($s) =>
  $s.builds.find((b) => b.id === $s.activeBuildId) ?? null,
);

export const setActiveBuild = (id: string): void => {
  store.update((s) => ({ ...s, activeBuildId: id }));
};

export const updateActiveBuild = (mutate: (b: PartyBuild) => void): void => {
  store.update((s) => {
    const idx = s.builds.findIndex((b) => b.id === s.activeBuildId);
    if (idx === -1) return s;
    const next = structuredClone(s.builds[idx]);
    mutate(next);
    next.updatedAt = Date.now();
    const builds = s.builds.slice();
    builds[idx] = next;
    return { ...s, builds };
  });
};

export const createBuild = (name: string): string => {
  const b = makeBuild(name);
  store.update((s) => ({
    activeBuildId: b.id,
    builds: [...s.builds, b],
  }));
  return b.id;
};

export const renameBuild = (id: string, name: string): void => {
  store.update((s) => ({
    ...s,
    builds: s.builds.map((b) => (b.id === id ? { ...b, name, updatedAt: Date.now() } : b)),
  }));
};

export const duplicateBuild = (id: string): string | null => {
  const state = get(store);
  const src = state.builds.find((b) => b.id === id);
  if (!src) return null;
  const copy: PartyBuild = {
    ...structuredClone(src),
    id: uuid(),
    name: `${src.name} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.update((s) => ({ activeBuildId: copy.id, builds: [...s.builds, copy] }));
  return copy.id;
};

export const deleteBuild = (id: string): void => {
  store.update((s) => {
    const builds = s.builds.filter((b) => b.id !== id);
    let activeBuildId = s.activeBuildId;
    if (activeBuildId === id) {
      activeBuildId = builds[0]?.id ?? null;
    }
    if (builds.length === 0) {
      const seed = makeBuild('My Party');
      return { activeBuildId: seed.id, builds: [seed] };
    }
    return { activeBuildId, builds };
  });
};

export const addPraetorian = (): void => {
  updateActiveBuild((b) => {
    const p: PraetorianState = {
      id: uuid(),
      classId: 'princeps',
      name: `Praetorian ${b.praetorians.length + 1}`,
      skillRanks: {},
    };
    b.praetorians.push(p);
  });
};

export const removePraetorian = (id: string): void => {
  updateActiveBuild((b) => {
    b.praetorians = b.praetorians.filter((p) => p.id !== id);
  });
};

export const loyalRoster: LoyalCompanion[] = LOYALS;

// ── Export / Import ─────────────────────────────────────────────────────────
// Encode a build to a copyable string. We deliberately omit id/createdAt/
// updatedAt — those get regenerated on import so the imported copy is its own
// distinct build. Format is base64(JSON), prefixed with a version tag so we
// can evolve the schema later without silently breaking older payloads.

const EXPORT_VERSION = 1;
const EXPORT_PREFIX = 'exprome:';

interface ExportPayload {
  v: number;
  name: string;
  pc: CharacterState;
  loyals: Record<string, CharacterState>;
  praetorians: PraetorianState[];
  outpost: { status: Record<string, 'planned' | 'owned'> };
}

const b64encode = (s: string): string => {
  // btoa requires Latin-1 — round-trip through TextEncoder + binary mapping
  // so non-ASCII names (Caeso, Verginia, etc.) survive.
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const b64decode = (s: string): string => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export const exportActiveBuild = (): string | null => {
  const s = get(store);
  const b = s.builds.find((x) => x.id === s.activeBuildId);
  if (!b) return null;
  const payload: ExportPayload = {
    v: EXPORT_VERSION,
    name: b.name,
    pc: b.pc,
    loyals: b.loyals,
    praetorians: b.praetorians,
    outpost: (b.outpost ?? { status: {} }) as ExportPayload['outpost'],
  };
  return EXPORT_PREFIX + b64encode(JSON.stringify(payload));
};

/** Import a build from an exported string. Returns the new build id on
 *  success, or an error message on failure. The new build is added and
 *  becomes active. */
export const importBuild = (encoded: string): { ok: true; id: string } | { ok: false; reason: string } => {
  const raw = encoded.trim();
  if (!raw.startsWith(EXPORT_PREFIX)) {
    return { ok: false, reason: 'Not a valid exprome build string (missing prefix).' };
  }
  let payload: ExportPayload;
  try {
    payload = JSON.parse(b64decode(raw.slice(EXPORT_PREFIX.length)));
  } catch {
    return { ok: false, reason: 'Could not decode build — string is corrupted or truncated.' };
  }
  if (payload.v !== EXPORT_VERSION) {
    return { ok: false, reason: `Unsupported build version ${payload.v} (expected ${EXPORT_VERSION}).` };
  }
  if (!payload.pc || typeof payload.pc.classId !== 'string') {
    return { ok: false, reason: 'Build payload is missing required PC data.' };
  }
  const now = Date.now();
  const newBuild: PartyBuild = {
    id: uuid(),
    name: payload.name ? `${payload.name} (imported)` : 'Imported',
    createdAt: now,
    updatedAt: now,
    pc: payload.pc,
    loyals: payload.loyals ?? makeLoyalsMap(),
    praetorians: payload.praetorians ?? [],
    outpost: payload.outpost ?? { status: {} },
  };
  store.update((s) => ({
    activeBuildId: newBuild.id,
    builds: [...s.builds, newBuild],
  }));
  return { ok: true, id: newBuild.id };
};
