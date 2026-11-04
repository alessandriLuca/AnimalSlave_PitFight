import { SPECIES, MOVES, learnset } from './data.js';

let uidCounter = Math.floor(Math.random() * 1e6);
const r16 = () => Math.floor(Math.random() * 16);

export const xpForLevel = (L) => Math.floor(0.8 * L * L * L);
export const MAX_LEVEL = 60;

export function calcStats(c) {
  const b = SPECIES[c.sid].base, iv = c.iv, L = c.level;
  return {
    hp: Math.floor(((2 * b.hp + iv.hp) * L) / 100) + L + 10,
    atk: Math.floor(((2 * b.atk + iv.atk) * L) / 100) + 5,
    def: Math.floor(((2 * b.def + iv.def) * L) / 100) + 5,
    spd: Math.floor(((2 * b.spd + iv.spd) * L) / 100) + 5,
  };
}

export function movesAtLevel(sid, L) {
  const ls = learnset(SPECIES[sid].types).filter(([l]) => l <= L).map(([, m]) => m);
  return ls.slice(-4);
}

export function createCreature(sid, level) {
  const c = {
    uid: 'c' + (uidCounter++).toString(36) + Math.random().toString(36).slice(2, 6),
    sid, level, xp: xpForLevel(level), hp: 1, status: null, statusTurns: 0,
    iv: { hp: r16(), atk: r16(), def: r16(), spd: r16() },
    moves: movesAtLevel(sid, level),
  };
  c.hp = calcStats(c).hp;
  return c;
}

export const maxHp = (c) => calcStats(c).hp;
export const speciesOf = (c) => SPECIES[c.sid];
export const nameOf = (c) => SPECIES[c.sid].name;

export function healFull(c) {
  c.hp = maxHp(c); c.status = null; c.statusTurns = 0;
}

// Restituisce eventi: {type:'level', level} | {type:'learn', move}
export function gainXp(c, amount) {
  const events = [];
  if (c.level >= MAX_LEVEL) return events;
  c.xp += amount;
  while (c.level < MAX_LEVEL && c.xp >= xpForLevel(c.level + 1)) {
    const before = maxHp(c);
    c.level++;
    const after = maxHp(c);
    if (c.hp > 0) c.hp = Math.min(after, c.hp + (after - before));
    events.push({ type: 'level', level: c.level });
    for (const [l, m] of learnset(SPECIES[c.sid].types)) {
      if (l === c.level && !c.moves.includes(m)) events.push({ type: 'learn', move: m });
    }
  }
  return events;
}

export function xpProgress(c) {
  if (c.level >= MAX_LEVEL) return 1;
  const a = xpForLevel(c.level), b = xpForLevel(c.level + 1);
  return Math.max(0, Math.min(1, (c.xp - a) / (b - a)));
}

export function evolve(c) {
  const sp = SPECIES[c.sid];
  if (!sp.evo) return false;
  const ratio = c.hp / maxHp(c);
  c.sid = sp.evo.to;
  c.hp = Math.max(1, Math.round(maxHp(c) * ratio));
  return true;
}

export function canEvolve(c) {
  const sp = SPECIES[c.sid];
  return sp.evo && c.level >= sp.evo.level && c.hp > 0;
}

export function moveInfo(id) { return MOVES[id]; }
