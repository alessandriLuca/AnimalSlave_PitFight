// Creature selvatiche che vagano nel mondo (visibili, stile pet-battle)
import * as THREE from './vendor/three.module.min.js';
import { SPECIES, DEX, ZONES, RARITY_WEIGHT, LEGENDARY_SPOTS, pol } from './data.js';
import { buildCreature, animateModel, disposeModel, makeLabel } from './models.js';
import { createCreature } from './creature.js';
import { VILLAGE_R } from './world.js';

const POOLS = {};
for (const z of Object.keys(ZONES)) {
  POOLS[z] = DEX.map((id) => SPECIES[id]).filter((s) => s.zones.includes(z)).map((s) => ({ s, w: RARITY_WEIGHT[s.rarity] }));
}
const isAquatic = (s) => s.m.b === 'fish';
const PRE = {};
for (const id of DEX) { const e = SPECIES[id].evo; if (e) PRE[e.to] = { from: id, level: e.level }; }

// livelli che salgono con la distanza dal villaggio
export function levelRange(zone, x, z) {
  const [lo, hi] = ZONES[zone].lv;
  if (zone === 'meadow') return [lo, hi];
  const r = Math.hypot(x, z);
  const f = Math.max(0, Math.min(1, (r - 75) / 105));
  const k = f * f * (3 - 2 * f);
  return [Math.round(3 + (lo - 3) * k), Math.round(6 + (hi - 6) * k)];
}

export class WildManager {
  constructor(game) {
    this.g = game; this.list = []; this.max = 30; this.timer = 0;
  }
  pick(zone) {
    const pool = POOLS[zone];
    if (!pool || !pool.length) return null;
    const tot = pool.reduce((a, p) => a + p.w, 0);
    let r = Math.random() * tot;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.s; }
    return pool[0].s;
  }
  validSpot(s, x, z) {
    const h = this.g.world.height(x, z);
    return isAquatic(s) ? h < -0.3 : h > 0.15;
  }
  spawnOne() {
    const p = this.g.player.pos;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2, d = 32 + Math.random() * 70;
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      const r = Math.hypot(x, z);
      if (r < VILLAGE_R + 6 || r > 250) continue;
      const zone = this.g.world.zoneAt(x, z);
      let s = this.pick(zone);
      if (!s || !this.validSpot(s, x, z)) continue;
      const [lo, hi] = levelRange(zone, x, z);
      let level = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (s.rarity === 'rare') level += 2;
      // troppo basso per una forma evoluta? usa la pre-evoluzione
      while (PRE[s.id] && level < PRE[s.id].level) s = SPECIES[PRE[s.id].from];
      if (s.evo && level >= s.evo.level) level = s.evo.level - 1;
      if (!this.validSpot(s, x, z)) continue;
      this.add(s, Math.max(2, level), x, z);
      return;
    }
  }
  add(s, level, x, z, legendary = false) {
    const model = buildCreature(s);
    const w = {
      sid: s.id, level, model, legendary, cooldown: 0,
      pos: new THREE.Vector3(x, 0, z), home: { x, z }, target: null, wait: Math.random() * 3, facing: Math.random() * 6.28,
    };
    if (legendary) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffe070 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.1;
      ring.scale.setScalar(1 / model.scale.x);
      model.add(ring); w.ring = ring;
    }
    this.g.scene.add(model);
    this.refreshLabel(w);
    w.pos.y = this.groundFor(w);
    model.position.copy(w.pos);
    this.list.push(w);
    return w;
  }
  refreshLabel(w) {
    if (w.label) { w.model.remove(w.label); w.label.material.map.dispose(); w.label.material.dispose(); }
    const s = SPECIES[w.sid];
    const caught = this.g.data.caught[w.sid];
    const text = `${w.legendary ? '★ ' : ''}${s.name}  Lv.${w.level}`;
    const k = w.model.scale.x;
    const label = makeLabel(text, { color: w.legendary ? '#ffe070' : caught ? '#ffffff' : '#9fffa0', size: 34, scale: 0.012 / k });
    label.position.y = (w.model.userData.height + 0.45) / k;
    w.model.add(label); w.label = label;
  }
  groundFor(w) {
    const h = this.g.world.height(w.pos.x, w.pos.z);
    return Math.max(h, -0.1);
  }
  spawnLegendaries() {
    for (const L of LEGENDARY_SPOTS) {
      if (this.g.data.caught[L.sid] || this.list.some((w) => w.sid === L.sid && w.legendary)) continue;
      const p = pol(L.at[0], L.at[1]);
      this.add(SPECIES[L.sid], L.level, p.x, p.z, true);
    }
  }
  remove(w) {
    const i = this.list.indexOf(w);
    if (i >= 0) this.list.splice(i, 1);
    this.g.scene.remove(w.model);
    disposeModel(w.model);
  }
  clearAll() { for (const w of [...this.list]) this.remove(w); }
  makeInstance(w) { return createCreature(w.sid, w.level); }

  nearest(pos, maxD = 4) {
    let best = null, bd = Infinity;
    for (const w of this.list) {
      if (w.cooldown > 0 || !w.model.visible) continue;
      const reach = maxD + w.model.scale.x * 0.8 + (w.legendary ? 4 : 0);
      const d = Math.hypot(w.pos.x - pos.x, w.pos.z - pos.z);
      if (d < reach && d < bd) { bd = d; best = w; }
    }
    return best;
  }

  update(dt, t, active) {
    const p = this.g.player.pos;
    if (active) {
      this.timer -= dt;
      const normal = this.list.filter((w) => !w.legendary).length;
      if (this.timer <= 0 && normal < this.max) { this.timer = 0.25; this.spawnOne(); }
    }
    for (const w of [...this.list]) {
      const d = Math.hypot(w.pos.x - p.x, w.pos.z - p.z);
      if (!w.legendary && d > 130 && active) { this.remove(w); continue; }
      if (w.cooldown > 0) w.cooldown -= dt;
      w.label.visible = d < 30 && w.model.visible;
      if (w.frozen) { animateModel(w.model, t, dt, false); continue; }
      let moving = false;
      if (w.legendary) {
        w.facing += dt * 0.3;
        if (w.ring) w.ring.rotation.z = t;
      } else if (w.wait > 0) {
        w.wait -= dt;
      } else {
        if (!w.target) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 9;
          w.target = { x: w.home.x + Math.sin(a) * r, z: w.home.z + Math.cos(a) * r };
          if (!this.g.world.zoneAt || !this.validSpot(SPECIES[w.sid], w.target.x, w.target.z)) { w.target = null; w.wait = 1; }
        }
        if (w.target) {
          const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z, dd = Math.hypot(dx, dz);
          if (dd < 0.3) { w.target = null; w.wait = 2 + Math.random() * 5; }
          else {
            const sp = 1.8 * Math.min(1.6, SPECIES[w.sid].m.s + 0.4);
            w.pos.x += (dx / dd) * sp * dt; w.pos.z += (dz / dd) * sp * dt;
            const ta = Math.atan2(dx, dz);
            let a = ta - w.facing; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
            w.facing += a * Math.min(1, dt * 5);
            moving = true;
          }
        }
      }
      if (d < 140) {
        w.pos.y += (this.groundFor(w) - w.pos.y) * Math.min(1, dt * 10);
        w.model.position.copy(w.pos);
        w.model.rotation.y = w.facing;
        if (d < 90) animateModel(w.model, t, dt, moving);
      }
    }
  }
}
