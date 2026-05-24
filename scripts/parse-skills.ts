import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClassDef, ClassId, Skill, SkillKind, Specialization } from '../src/lib/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── canonical max-rank table (from PLAN.md §3.6) ────────────────────────────
// Indexed by [class][spec][col-1][row-1]. The scrape order matches the in-game
// 2-column × 4-row layout, so we apply ranks positionally.
const MAX_RANKS: Record<ClassId, Record<string, number[][]>> = {
  princeps: {
    defender: [
      [2, 1, 1, 1], // col 1: Brace, Fortress, Protect, Guardian Angel
      [1, 1, 2, 1], // col 2: Bastion, Repair, Bulwark, Shield Wall
    ],
    vanguard: [
      [2, 3, 1, 1],
      [1, 2, 1, 1],
    ],
    veteran: [
      [2, 1, 2, 2],
      [1, 2, 1, 1],
    ],
  },
  triarius: {
    medic: [
      [2, 1, 1, 1],
      [2, 2, 2, 1],
    ],
    flagbearer: [
      [2, 2, 1, 2],
      [1, 1, 1, 2],
    ],
    destroyer: [
      [2, 1, 2, 1],
      [2, 1, 1, 2],
    ],
  },
  veles: {
    assassin: [
      [1, 1, 2, 2],
      [1, 2, 1, 1],
    ],
    duelist: [
      [1, 2, 1, 1],
      [3, 1, 1, 1],
    ],
    brawler: [
      [2, 1, 1, 1],
      [1, 1, 2, 2],
    ],
  },
  sagittarius: {
    marksman: [
      [2, 1, 2, 1],
      [1, 2, 2, 1],
    ],
    hunter: [
      [1, 1, 3, 1],
      [2, 1, 1, 1],
    ],
    sniper: [
      [1, 1, 1, 1],
      [2, 2, 3, 1],
    ],
  },
};

// ── per-skill prerequisites (PLAN.md §3.5) ──────────────────────────────────
// child skill id → required parent skill id
const PREREQS: Record<string, string> = {
  'princeps.defender.fortress': 'princeps.defender.brace',
  'princeps.defender.guardian-angel': 'princeps.defender.protect',
  'triarius.medic.good-as-new': 'triarius.medic.cure',
  'triarius.flagbearer.embarrassing-ruse': 'triarius.flagbearer.ruse',
  'triarius.flagbearer.orator': 'triarius.flagbearer.inspire',
  'veles.assassin.rush': 'veles.assassin.focus-master',
  'veles.duelist.slippery': 'veles.duelist.dodge',
  'sagittarius.marksman.vigilant': 'sagittarius.marksman.interrupt',
  'sagittarius.marksman.powerful-kick': 'sagittarius.marksman.rebuke',
  'sagittarius.hunter.skirmisher': 'sagittarius.hunter.versatile',
  'sagittarius.sniper.spotter': 'sagittarius.sniper.ranging-shot',
};

const CLASS_NAMES: Record<ClassId, string> = {
  princeps: 'Princeps',
  sagittarius: 'Sagittarius',
  triarius: 'Triarius',
  veles: 'Veles',
};

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface ParsedSkill {
  name: string;
  kind: SkillKind;
  description: string;
}

// Parse a single skill bullet, e.g. "**Brace** (Active, Action) — Regain 2 ..."
function parseSkillLine(line: string): ParsedSkill | null {
  const m = line.match(/^\d+\.\s+\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*[—-]\s*(.+)$/);
  if (!m) return null;
  const [, name, parens, desc] = m;
  const kind: SkillKind = /passive/i.test(parens) ? 'passive' : 'active';
  return { name: name.trim(), kind, description: desc.trim() };
}

function parse(): ClassDef[] {
  const md = readFileSync(resolve(ROOT, 'scraped_skills.md'), 'utf8');
  const lines = md.split('\n');

  const classes: ClassDef[] = [];
  let currentClass: ClassId | null = null;
  let currentSpec: { id: string; name: string } | null = null;
  let currentCol: 1 | 2 = 1;
  // accumulator: classId → specId → col → ParsedSkill[]
  const acc = new Map<ClassId, Map<string, ParsedSkill[][]>>();

  for (const raw of lines) {
    const line = raw.trim();

    const classMatch = line.match(/^##\s+([A-Z]+)\s*$/);
    if (classMatch) {
      const id = classMatch[1].toLowerCase() as ClassId;
      if (id in CLASS_NAMES) {
        currentClass = id;
        currentSpec = null;
        if (!acc.has(id)) acc.set(id, new Map());
      }
      continue;
    }

    const specMatch = line.match(/^###\s+(.+)\s*$/);
    if (specMatch && currentClass) {
      const name = specMatch[1].trim();
      currentSpec = { id: slugify(name), name };
      const specMap = acc.get(currentClass)!;
      if (!specMap.has(currentSpec.id)) specMap.set(currentSpec.id, [[], []]);
      currentCol = 1;
      continue;
    }

    const colMatch = line.match(/^\*\*Column\s*(\d)[:.]\*\*/i);
    if (colMatch) {
      currentCol = colMatch[1] === '2' ? 2 : 1;
      continue;
    }

    const skill = parseSkillLine(line);
    if (skill && currentClass && currentSpec) {
      const cols = acc.get(currentClass)!.get(currentSpec.id)!;
      cols[currentCol - 1].push(skill);
    }
  }

  for (const classId of Object.keys(CLASS_NAMES) as ClassId[]) {
    const specMap = acc.get(classId);
    if (!specMap) throw new Error(`No data parsed for ${classId}`);
    const specs: Specialization[] = [];

    for (const [specId, cols] of specMap) {
      const maxRankCols = MAX_RANKS[classId][specId];
      if (!maxRankCols) throw new Error(`Missing max-rank entry: ${classId}.${specId}`);

      const skills: Skill[] = [];
      for (let c = 0; c < 2; c++) {
        const col = (c + 1) as 1 | 2;
        if (cols[c].length !== 4) {
          throw new Error(
            `${classId}.${specId} col ${col}: expected 4 skills, got ${cols[c].length}`,
          );
        }
        for (let r = 0; r < 4; r++) {
          const parsed = cols[c][r];
          const row = (r + 1) as 1 | 2 | 3 | 4;
          const id = `${classId}.${specId}.${slugify(parsed.name)}`;
          const maxRank = maxRankCols[c][r] as 1 | 2 | 3;
          const skill: Skill = {
            id,
            name: parsed.name,
            kind: parsed.kind,
            column: col,
            row,
            maxRank,
            description: parsed.description,
          };
          if (PREREQS[id]) skill.requiresSkillId = PREREQS[id];
          skills.push(skill);
        }
      }

      const specName = skills.length > 0 ? cols.flat()[0] && capitalize(specId) : specId;
      specs.push({ id: specId, name: specName, skills });
    }

    if (specs.length !== 3) {
      throw new Error(`${classId}: expected 3 specs, got ${specs.length}`);
    }

    classes.push({
      id: classId,
      name: CLASS_NAMES[classId],
      specs: specs as ClassDef['specs'],
    });
  }

  // Sanity check: every PREREQS entry must reference real skill ids.
  const allIds = new Set(classes.flatMap((c) => c.specs.flatMap((s) => s.skills.map((sk) => sk.id))));
  for (const [child, parent] of Object.entries(PREREQS)) {
    if (!allIds.has(child)) throw new Error(`PREREQS: unknown child ${child}`);
    if (!allIds.has(parent)) throw new Error(`PREREQS: unknown parent ${parent}`);
  }

  return classes;
}

function capitalize(s: string): string {
  // Spec ids like "good-as-new" → "Good As New" not needed; spec names come straight
  // from the markdown's ### header which we captured earlier. We fall back to a slug
  // capitalization only as a defensive default.
  return s
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function main() {
  const md = readFileSync(resolve(ROOT, 'scraped_skills.md'), 'utf8');
  // Walk a second time to preserve the spec's display name from the markdown.
  const specNames = new Map<string, string>();
  let currentClass: string | null = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const c = line.match(/^##\s+([A-Z]+)\s*$/);
    if (c) {
      currentClass = c[1].toLowerCase();
      continue;
    }
    const s = line.match(/^###\s+(.+)\s*$/);
    if (s && currentClass) {
      specNames.set(`${currentClass}.${slugify(s[1])}`, s[1].trim());
    }
  }

  const classes = parse();
  for (const cls of classes) {
    for (const spec of cls.specs) {
      const key = `${cls.id}.${spec.id}`;
      const realName = specNames.get(key);
      if (realName) spec.name = realName;
    }
  }

  const skillCount = classes.flatMap((c) => c.specs.flatMap((s) => s.skills)).length;
  console.log(`Parsed ${classes.length} classes, ${skillCount} skills.`);
  const out = resolve(ROOT, 'src/data/skills.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(classes, null, 2) + '\n');
  console.log(`Wrote ${out}`);
}

main();
