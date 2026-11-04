// Mondo: terreno procedurale a zone, props istanziati, villaggio e Fossa
import * as THREE from './vendor/three.module.min.js';
import { createNoise, mulberry32, smoothstep, lerp, clamp } from './noise.js';
import { ZONES, SECTORS, pol, TAMERS, LEGENDARY_SPOTS } from './data.js';
import { toon, GEO } from './models.js';

const SIZE = 640, SEG = 256, HALF = SIZE / 2;
export const WORLD_RADIUS = 268;
export const VILLAGE_R = 44;
export const ARENA = { x: 0, z: -6, r: 13 };

const N = createNoise(4242);
const N2 = createNoise(777);
const VOLC = pol(60, 205);
const LAKE = pol(240, 172);

function sectorInfo(x, z) {
  let a = Math.atan2(x, -z);
  if (a < 0) a += Math.PI * 2;
  a += N.noise(x * 0.008, z * 0.008) * 0.35;
  const u = ((a / (Math.PI * 2)) * 6 + 6) % 6;
  const k = Math.round(u);
  const d = u - k;
  const prim = ((k % 6) + 6) % 6;
  const nb = (((d > 0 ? k + 1 : k - 1) % 6) + 6) % 6;
  const wn = smoothstep(0.32, 0.5, Math.abs(d)) * 0.5;
  return { prim, nb, wn };
}
function meadowWeight(x, z) {
  const r = Math.hypot(x, z) + N2.noise(x * 0.02, z * 0.02) * 12;
  return 1 - smoothstep(58, 88, r);
}

function zoneH(zone, x, z) {
  switch (zone) {
    case 'meadow': return 1.4 + N.fbm(x * 0.02, z * 0.02, 3) * 2.6;
    case 'forest': return 2.4 + N.fbm(x * 0.018, z * 0.018, 4) * 8;
    case 'swamp': {
      const d = Math.hypot(x - LAKE.x, z - LAKE.z);
      return -0.1 + N.fbm(x * 0.03, z * 0.03, 3) * 2.6 - 5.5 * Math.exp(-(d * d) / (24 * 24));
    }
    case 'desert': return 1.6 + Math.abs(Math.sin(x * 0.045 + N.noise(x * 0.01, z * 0.01) * 3)) * 3.6 + N.fbm(x * 0.01, z * 0.01, 2) * 3;
    case 'tundra': return 3.5 + N.fbm(x * 0.012, z * 0.012, 5) * 13;
    case 'volcano': {
      const d = Math.hypot(x - VOLC.x, z - VOLC.z);
      let h = 3 + N.fbm(x * 0.02, z * 0.02, 4) * 5;
      const c = Math.max(0, 1 - d / 78);
      h += 48 * Math.pow(c, 1.4);
      if (d < 12) h -= (12 - d) * 1.6;
      return h;
    }
    case 'ruins': return 2 + N.fbm(x * 0.015, z * 0.015, 3) * 1.8;
  }
  return 0;
}

export function rawHeight(x, z) {
  const s = sectorInfo(x, z);
  const wm = meadowWeight(x, z);
  const hp = zoneH(SECTORS[s.prim], x, z), hn = zoneH(SECTORS[s.nb], x, z);
  let h = lerp(hp, hn, s.wn);
  h = lerp(h, zoneH('meadow', x, z), wm);
  const r = Math.hypot(x, z);
  h += smoothstep(250, 300, r) * (35 + N.fbm(x * 0.03, z * 0.03, 3) * 20);
  const vk = smoothstep(VILLAGE_R + 8, VILLAGE_R - 6, r);
  h = lerp(h, 1.2, vk);
  // spianate per allenatori
  for (const p of FLATS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < 12) h = lerp(h, p.h, smoothstep(12, 6, d));
  }
  return h;
}

const FLATS = [];
function computeFlats() {
  const pts = [];
  for (const t of TAMERS) if (t.at) pts.push(pol(t.at[0], t.at[1]));
  for (const z of SECTORS) pts.push(pol(ZONES[z].angle + 18, 118));
  for (const p of pts) {
    const hh = rawHeightNoFlat(p.x, p.z);
    FLATS.push({ x: p.x, z: p.z, h: Math.max(hh, 0.6) });
  }
}
function rawHeightNoFlat(x, z) {
  const save = FLATS.splice(0, FLATS.length);
  const h = rawHeight(x, z);
  FLATS.push(...save);
  return h;
}
computeFlats();

export function zoneAt(x, z) {
  if (meadowWeight(x, z) > 0.5) return 'meadow';
  return SECTORS[sectorInfo(x, z).prim];
}

const ZC = {
  meadow: new THREE.Color(0x74c24c), forest: new THREE.Color(0x3a7a30), swamp: new THREE.Color(0x5a6a3a),
  desert: new THREE.Color(0xe6c57c), tundra: new THREE.Color(0xeef4fb), volcano: new THREE.Color(0x4e3e38),
  ruins: new THREE.Color(0x857aa0),
};
const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
function colorAt(x, z, h, out) {
  const s = sectorInfo(x, z), wm = meadowWeight(x, z);
  out.copy(ZC[SECTORS[s.prim]]).lerp(ZC[SECTORS[s.nb]], s.wn);
  out.lerp(ZC.meadow, wm);
  const n = N2.fbm(x * 0.05, z * 0.05, 2);
  out.multiplyScalar(0.92 + n * 0.16);
  const zone = zoneAt(x, z);
  if (zone === 'volcano') {
    const d = Math.hypot(x - VOLC.x, z - VOLC.z);
    if (d < 30) out.lerp(tmpC2.setHex(0x7a2a1a), smoothstep(30, 12, d) * 0.7);
  }
  if (zone === 'tundra' && h < 6) out.lerp(tmpC2.setHex(0xc8dff0), 0.25);
  if (h < 0.15) out.lerp(tmpC2.setHex(0xb5a477), smoothstep(0.15, -0.6, h) * 0.85);
  const r = Math.hypot(x, z);
  if (r > 252) {
    out.lerp(tmpC2.setHex(0x8a8580), smoothstep(252, 275, r));
    if (h > 30) out.lerp(tmpC2.setHex(0xffffff), smoothstep(30, 40, h));
  }
  if (r < VILLAGE_R) {
    // sentieri del villaggio
    const path = Math.min(Math.abs(x), Math.abs(z + 2));
    if (path < 2.4) out.lerp(tmpC2.setHex(0xc8b088), 0.8);
  }
  if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.r + 3) out.lerp(tmpC2.setHex(0xc8a878), 0.9);
  return out;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = new Map(); // cella -> [{x,z,r}]
    this.heights = new Float32Array((SEG + 1) * (SEG + 1));
    this.animated = [];
    this.npcSpots = [];
    this.buildTerrain();
    this.buildWater();
    this.buildProps();
    this.buildVillage();
  }

  height(x, z) {
    const fx = ((x + HALF) / SIZE) * SEG, fz = ((z + HALF) / SIZE) * SEG;
    const ix = clamp(Math.floor(fx), 0, SEG - 1), iz = clamp(Math.floor(fz), 0, SEG - 1);
    const tx = clamp(fx - ix, 0, 1), tz = clamp(fz - iz, 0, 1);
    const W = SEG + 1;
    const h00 = this.heights[iz * W + ix], h10 = this.heights[iz * W + ix + 1];
    const h01 = this.heights[(iz + 1) * W + ix], h11 = this.heights[(iz + 1) * W + ix + 1];
    // stessa triangolazione di PlaneGeometry
    if (tx + tz <= 1) return h00 + (h10 - h00) * tx + (h01 - h00) * tz;
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz);
  }
  groundY(x, z) { return Math.max(this.height(x, z), -0.25); }
  zoneAt(x, z) { return zoneAt(x, z); }

  buildTerrain() {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = rawHeight(x, z);
      pos.setY(i, h);
      const ix = Math.round(((x + HALF) / SIZE) * SEG), iz = Math.round(((z + HALF) / SIZE) * SEG);
      this.heights[iz * (SEG + 1) + ix] = h;
      colorAt(x, z, h, c);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.terrain = mesh;
  }

  buildWater() {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, 1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshPhongMaterial({ color: 0x3a8ad0, transparent: true, opacity: 0.72, shininess: 90, specular: 0x9ad8ff });
    const w = new THREE.Mesh(g, m); w.position.y = -0.05; w.receiveShadow = true;
    this.scene.add(w); this.water = w;
    // lava nel cratere
    const lg = new THREE.CircleGeometry(13, 32); lg.rotateX(-Math.PI / 2);
    const lm = new THREE.MeshBasicMaterial({ color: 0xff5a10 });
    const lava = new THREE.Mesh(lg, lm);
    const ch = rawHeight(VOLC.x, VOLC.z);
    lava.position.set(VOLC.x, ch + 2.2, VOLC.z);
    this.scene.add(lava);
    this.lava = lava;
    const pl = new THREE.PointLight(0xff6a20, 60, 60, 1.6); pl.position.set(VOLC.x, ch + 8, VOLC.z); this.scene.add(pl);
  }

  addCollider(x, z, r) {
    const k = `${Math.floor(x / 10)},${Math.floor(z / 10)}`;
    if (!this.colliders.has(k)) this.colliders.set(k, []);
    this.colliders.get(k).push({ x, z, r });
  }
  collide(pos, radius = 0.5) {
    const cx = Math.floor(pos.x / 10), cz = Math.floor(pos.z / 10);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = this.colliders.get(`${cx + i},${cz + j}`);
      if (!list) continue;
      for (const c of list) {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const d = Math.hypot(dx, dz), m = c.r + radius;
        if (d < m && d > 0.0001) { pos.x = c.x + (dx / d) * m; pos.z = c.z + (dz / d) * m; }
      }
    }
  }

  // quanti ostacoli (alberi, rocce...) ci sono lungo il segmento a->b
  blockers(ax, az, bx, bz, radius = 2.2) {
    let n = 0;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const cx = Math.floor(x / 10), cz = Math.floor(z / 10);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const list = this.colliders.get(`${cx + a},${cz + b}`);
        if (list) for (const c of list) if (Math.hypot(c.x - x, c.z - z) < c.r + radius) n++;
      }
    }
    return n;
  }

  buildProps() {
    const rnd = mulberry32(99);
    const D = {};
    const add = (type, x, y, z, s, rot = 0, col = null) => { (D[type] ||= []).push({ x, y, z, s, rot, col }); };
    const avoid = [];
    for (const t of TAMERS) if (t.at) avoid.push(pol(t.at[0], t.at[1]));
    for (const L of LEGENDARY_SPOTS) avoid.push(pol(L.at[0], L.at[1]));
    for (const z of SECTORS) avoid.push(pol(ZONES[z].angle + 18, 118));
    const near = (x, z) => avoid.some((p) => Math.hypot(p.x - x, p.z - z) < 9);
    const STEP = 5;
    for (let x = -260; x <= 260; x += STEP) {
      for (let z = -260; z <= 260; z += STEP) {
        const px = x + (rnd() - 0.5) * STEP * 0.9, pz = z + (rnd() - 0.5) * STEP * 0.9;
        const r = Math.hypot(px, pz);
        if (r < VILLAGE_R + 4 || r > 262) continue;
        if (near(px, pz)) continue;
        const h = rawHeight(px, pz);
        const zone = zoneAt(px, pz);
        const q = rnd();
        if (h < 0.15) {
          if (h > -0.6 && q < 0.25) add('reed', px, h, pz, 0.7 + rnd() * 0.6, rnd() * 6);
          continue;
        }
        const s = 0.8 + rnd() * 0.7;
        switch (zone) {
          case 'meadow':
            if (q < 0.05) add('tree', px, h, pz, s, rnd() * 6, 0x5cb83a);
            else if (q < 0.08) add('rock', px, h, pz, s * 0.6, rnd() * 6);
            else if (q < 0.45) add('flower', px, h, pz, 1, rnd() * 6);
            else if (q < 0.75) add('tuft', px, h, pz, 1, rnd() * 6);
            break;
          case 'forest':
            if (q < 0.42) add('tree', px, h, pz, s * 1.25, rnd() * 6, rnd() < 0.5 ? 0x2f7a2a : 0x3e8a32);
            else if (q < 0.5) add('rock', px, h, pz, s * 0.7, rnd() * 6);
            else if (q < 0.62) add('mushroom', px, h, pz, s, rnd() * 6);
            else if (q < 0.85) add('tuft', px, h, pz, 1.2, rnd() * 6);
            break;
          case 'swamp':
            if (q < 0.12) add('deadtree', px, h, pz, s, rnd() * 6);
            else if (q < 0.2) add('tree', px, h, pz, s, rnd() * 6, 0x4a6a2a);
            else if (q < 0.5) add('reed', px, h, pz, s, rnd() * 6);
            break;
          case 'desert':
            if (q < 0.05) add('cactus', px, h, pz, s, rnd() * 6);
            else if (q < 0.09) add('rock', px, h, pz, s * 0.9, rnd() * 6, 0xc09a6a);
            else if (q < 0.1) add('bones', px, h, pz, s, rnd() * 6);
            break;
          case 'tundra':
            if (q < 0.18) add('pine', px, h, pz, s * 1.2, rnd() * 6);
            else if (q < 0.25) add('rock', px, h, pz, s * 0.8, rnd() * 6, 0xb8c8d8);
            else if (q < 0.28) add('crystal', px, h, pz, s * 0.7, rnd() * 6, 0x9ff0ff);
            break;
          case 'volcano':
            if (q < 0.1) add('rock', px, h, pz, s, rnd() * 6, 0x3a2a26);
            else if (q < 0.15) add('deadtree', px, h, pz, s, rnd() * 6);
            else if (q < 0.19) add('crystal', px, h, pz, s * 0.6, rnd() * 6, 0xff6a2a);
            break;
          case 'ruins':
            if (q < 0.05) add('pillar', px, h, pz, s, rnd() * 6);
            else if (q < 0.09) add('crystal', px, h, pz, s * 0.8, rnd() * 6, rnd() < 0.5 ? 0xb48cff : 0x7af0ff);
            else if (q < 0.14) add('rock', px, h, pz, s * 0.6, rnd() * 6, 0x8a8aa0);
            else if (q < 0.3) add('tuft', px, h, pz, 1, rnd() * 6);
            break;
        }
      }
    }
    // alberi di confine
    for (let a = 0; a < Math.PI * 2; a += 0.035) {
      const r = 258 + rnd() * 8;
      const x = Math.sin(a) * r, z = -Math.cos(a) * r;
      add('pine', x, rawHeight(x, z), z, 1.6 + rnd(), rnd() * 6);
    }
    this.instance(D);
  }

  instance(D) {
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const make = (geo, mat, list, fn, castShadow = true) => {
      if (!list || !list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.set(1, 1, 1);
        fn(dummy, p);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (p.col != null || p.tint) im.setColorAt(i, col.setHex(p.tint ?? p.col));
      });
      im.castShadow = castShadow; im.receiveShadow = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.scene.add(im);
    };
    const trunk = toon(0x7a5232), leaves = toon(0xffffff);
    const T = D.tree || [];
    T.forEach((p) => this.addCollider(p.x, p.z, 0.6 * p.s));
    make(new THREE.CylinderGeometry(0.25, 0.38, 3, 7), trunk, T, (d, p) => { d.position.y += 1.5 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.IcosahedronGeometry(1.7, 1), leaves, T, (d, p) => { d.position.y += 3.8 * p.s; d.scale.set(p.s, p.s * 0.9, p.s); });
    make(new THREE.IcosahedronGeometry(1.1, 1), leaves, T.map((p) => ({ ...p, tint: new THREE.Color(p.col).multiplyScalar(1.15).getHex() })), (d, p) => { d.position.y += 5 * p.s; d.position.x += 0.4 * p.s; d.scale.setScalar(p.s); });

    const P = D.pine || [];
    P.forEach((p) => this.addCollider(p.x, p.z, 0.55 * p.s));
    make(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6), trunk, P, (d, p) => { d.position.y += 0.8 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.ConeGeometry(1.6, 2.6, 8), toon(0x2e5a3e), P, (d, p) => { d.position.y += 2.4 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.ConeGeometry(1.15, 2.2, 8), toon(0x3a6a4a), P, (d, p) => { d.position.y += 3.7 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.ConeGeometry(0.7, 1.4, 8), toon(0xf4f8ff), P, (d, p) => { d.position.y += 4.8 * p.s; d.scale.setScalar(p.s); });

    const R = D.rock || [];
    R.forEach((p) => this.addCollider(p.x, p.z, 1.0 * p.s));
    make(new THREE.DodecahedronGeometry(1.2, 0), toon(0xffffff), R.map((p) => ({ ...p, col: p.col ?? 0x9a9a9a })), (d, p) => { d.position.y += 0.4 * p.s; d.scale.set(p.s * 1.2, p.s * 0.8, p.s); d.rotation.x = p.rot; });

    const C = D.cactus || [];
    C.forEach((p) => this.addCollider(p.x, p.z, 0.5 * p.s));
    const cm = toon(0x4a9a4a);
    make(new THREE.CylinderGeometry(0.35, 0.4, 3, 8), cm, C, (d, p) => { d.position.y += 1.5 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.CylinderGeometry(0.2, 0.22, 1.2, 7), cm, C, (d, p) => { d.position.y += 1.9 * p.s; d.position.x += Math.cos(p.rot) * 0.6 * p.s; d.position.z -= Math.sin(p.rot) * 0.6 * p.s; d.scale.setScalar(p.s); });
    make(new THREE.SphereGeometry(0.25, 8, 6), toon(0xff7aa8), C, (d, p) => { d.position.y += 3.05 * p.s; d.scale.setScalar(p.s); });

    const DT = D.deadtree || [];
    DT.forEach((p) => this.addCollider(p.x, p.z, 0.4 * p.s));
    const dtm = toon(0x4a3a2a);
    make(new THREE.CylinderGeometry(0.15, 0.32, 4, 6), dtm, DT, (d, p) => { d.position.y += 2 * p.s; d.scale.setScalar(p.s); d.rotation.z = 0.1; });
    make(new THREE.CylinderGeometry(0.06, 0.12, 1.8, 5), dtm, DT, (d, p) => { d.position.y += 3 * p.s; d.rotation.z = 0.9; d.scale.setScalar(p.s); });

    const PL = D.pillar || [];
    PL.forEach((p) => this.addCollider(p.x, p.z, 0.9 * p.s));
    const st = toon(0xb0a8c0);
    make(new THREE.CylinderGeometry(0.7, 0.8, 1, 10), st, PL, (d, p) => { const hh = 2 + (p.rot % 1) * 4; d.position.y += hh / 2 * p.s; d.scale.set(p.s, hh * p.s, p.s); d.rotation.z = (p.rot % 0.3) - 0.15; });
    make(new THREE.BoxGeometry(2, 0.5, 2), st, PL.filter((p) => p.rot % 1 > 0.5), (d, p) => { const hh = 2 + (p.rot % 1) * 4; d.position.y += hh * p.s + 0.2; d.scale.setScalar(p.s); });

    const CR = D.crystal || [];
    const crm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6a6a8a, emissiveIntensity: 0.6, transparent: true, opacity: 0.88 });
    make(new THREE.OctahedronGeometry(0.8, 0), crm, CR, (d, p) => { d.position.y += 0.9 * p.s; d.scale.set(p.s * 0.6, p.s * 1.6, p.s * 0.6); d.rotation.z = (p.rot % 0.6) - 0.3; });

    make(new THREE.ConeGeometry(0.15, 0.7, 4), toon(0x5cb83a), D.tuft, (d, p) => { d.position.y += 0.3; d.scale.set(1.4, 1 + (p.rot % 0.6), 1.4); }, false);
    make(new THREE.ConeGeometry(0.1, 0.8, 4), toon(0xffffff), (D.tuft || []).map((p) => ({ ...p, x: p.x + 0.3, col: 0x4aa832 })), (d) => { d.position.y += 0.35; }, false);
    const FL = D.flower || [];
    const fcols = [0xffe24a, 0xff7ab0, 0xffffff, 0xb07aff, 0xff6a4a];
    make(new THREE.SphereGeometry(0.16, 6, 5), toon(0xffffff), FL.map((p, i) => ({ ...p, col: fcols[i % 5] })), (d) => { d.position.y += 0.35; }, false);
    make(new THREE.ConeGeometry(0.12, 0.6, 4), toon(0x5cb83a), FL, (d) => { d.position.y += 0.15; }, false);

    const RE = D.reed || [];
    make(new THREE.CylinderGeometry(0.04, 0.06, 2, 4), toon(0x6a8a3a), RE, (d, p) => { d.position.y += 0.9 * p.s; d.scale.setScalar(p.s); d.rotation.z = (p.rot % 0.4) - 0.2; }, false);
    make(new THREE.CapsuleGeometry(0.09, 0.35, 2, 5), toon(0x6a4a2a), RE, (d, p) => { d.position.y += 1.9 * p.s; d.scale.setScalar(p.s); }, false);

    const MU = D.mushroom || [];
    make(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 6), toon(0xf0e8d0), MU, (d, p) => { d.position.y += 0.25 * p.s; d.scale.setScalar(p.s); }, false);
    make(new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffffff), MU.map((p, i) => ({ ...p, col: i % 3 ? 0xe03a3a : 0xb07aff })), (d, p) => { d.position.y += 0.5 * p.s; d.scale.setScalar(p.s); }, false);

    const BO = D.bones || [];
    make(new THREE.TorusGeometry(0.8, 0.12, 5, 10, Math.PI), toon(0xf4ecd8), BO, (d, p) => { d.position.y += 0.1; d.rotation.x = -Math.PI / 2 + 0.3; d.scale.setScalar(p.s); }, false);
  }

  // edifici semplici
  house(x, z, rot, wall, roof, w = 6, d = 5, label = null) {
    const g = new THREE.Group();
    const h = 3.2;
    const walls = new THREE.Mesh(GEO.box, toon(wall)); walls.scale.set(w, h, d); walls.position.y = h / 2;
    const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.4, 4), toon(roof));
    rf.position.y = h + 1.2; rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    const door = new THREE.Mesh(GEO.box, toon(0x6a4a2a)); door.scale.set(1.1, 2, 0.1); door.position.set(0, 1, d / 2 + 0.03);
    const win1 = new THREE.Mesh(GEO.box, toon(0xbfe8ff, 0x6a8aa0, 0.3)); win1.scale.set(0.9, 0.8, 0.1); win1.position.set(-w * 0.3, 1.9, d / 2 + 0.03);
    const win2 = win1.clone(); win2.position.x = w * 0.3;
    g.add(walls, rf, door, win1, win2);
    g.position.set(x, 1.2, z); g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g);
    // collisione approssimata
    const R = Math.max(w, d) / 2;
    for (let i = -1; i <= 1; i++) {
      const ox = Math.cos(rot) * i * (w / 3), oz = -Math.sin(rot) * i * (w / 3);
      this.addCollider(x + ox, z + oz, R * 0.75);
    }
    return g;
  }

  buildVillage() {
    // case
    this.house(-22, 16, Math.PI / 2 - 0.4, 0xfff0f4, 0xff6a9a, 7, 6);  // centro cura
    this.house(22, 16, -Math.PI / 2 + 0.4, 0xeef6ff, 0x3a7ad8, 7, 6);   // negozio
    this.house(-30, -14, Math.PI / 2 + 0.3, 0xf4e8d0, 0xb0502a);
    this.house(30, -14, -Math.PI / 2 - 0.3, 0xf4e8d0, 0x6a8a3a);
    this.house(-12, 34, Math.PI, 0xf0e0c0, 0x8a4a8a, 5, 5);
    this.house(14, 34, Math.PI, 0xf0e0c0, 0xc08a2a, 5, 5);
    // croce sul centro cura
    const cross = new THREE.Group();
    const cm = toon(0xff3a6a, 0xff3a6a, 0.3);
    const a = new THREE.Mesh(GEO.box, cm); a.scale.set(0.4, 1.4, 0.2);
    const b = new THREE.Mesh(GEO.box, cm); b.scale.set(1.4, 0.4, 0.2);
    cross.add(a, b); cross.position.set(-22, 8.2, 16); cross.rotation.y = Math.PI / 2 - 0.4;
    this.scene.add(cross);
    this.animated.push((t) => { cross.rotation.y = t; });
    // insegna negozio: sfera
    const orb = new THREE.Mesh(GEO.sphere, toon(0x3a8cff, 0x3a8cff, 0.3)); orb.scale.setScalar(0.7); orb.position.set(22, 8.2, 16);
    this.scene.add(orb);
    this.animated.push((t) => { orb.position.y = 8.2 + Math.sin(t * 2) * 0.3; });

    // LA FOSSA (arena)
    const A = ARENA;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(A.r, A.r, 0.4, 40), toon(0xd8b888));
    floor.position.set(A.x, 1.0, A.z); floor.receiveShadow = true; this.scene.add(floor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(A.r * 0.55, 0.12, 6, 48), toon(0xa03a2a));
    ring.rotation.x = Math.PI / 2; ring.position.set(A.x, 1.22, A.z); this.scene.add(ring);
    const stone = toon(0x8a7a6a), stone2 = toon(0x6a5a4a);
    const NSEG = 22;
    for (let i = 0; i < NSEG; i++) {
      const ang = (i / NSEG) * Math.PI * 2;
      if (i === 0 || i === 1 || i === NSEG - 1) continue; // varco d'ingresso verso sud (+z)
      const x = A.x + Math.sin(ang) * (A.r + 1), z = A.z + Math.cos(ang) * (A.r + 1);
      const w = new THREE.Mesh(GEO.box, i % 2 ? stone : stone2);
      const hh = 3 + (i % 3) * 0.6;
      w.scale.set(3.9, hh, 1.4); w.position.set(x, 1.2 + hh / 2, z); w.rotation.y = ang;
      w.castShadow = true; w.receiveShadow = true;
      this.scene.add(w);
      this.addCollider(x, z, 1.6);
      if (i % 4 === 1) {
        const torch = new THREE.Mesh(GEO.cyl, toon(0x4a3a2a)); torch.scale.set(0.12, 1.4, 0.12);
        torch.position.set(x, 1.2 + hh + 0.6, z); this.scene.add(torch);
        const fl = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: 0xffa02a }));
        fl.scale.set(0.25, 0.6, 0.25); fl.position.set(x, 1.2 + hh + 1.55, z); this.scene.add(fl);
        this.animated.push((t) => { fl.scale.y = 0.6 + Math.sin(t * 15 + i) * 0.12; });
      }
    }
    // stendardi all'ingresso
    for (const s of [-1, 1]) {
      const pole = new THREE.Mesh(GEO.cyl, toon(0x3a2a1a)); pole.scale.set(0.15, 7, 0.15);
      pole.position.set(A.x + s * 3.5, 4.7, A.z + A.r + 2); this.scene.add(pole);
      const flag = new THREE.Mesh(GEO.box, toon(0xb02a2a)); flag.scale.set(1.6, 2.4, 0.06);
      flag.position.set(A.x + s * 3.5 + s * 0.85, 6.6, A.z + A.r + 2); this.scene.add(flag);
      this.addCollider(A.x + s * 3.5, A.z + A.r + 2, 0.4);
    }
    // pozzo e lampioni
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 1.2, 12, 1, true), toon(0x9a9a9a));
    well.material.side = THREE.DoubleSide;
    well.position.set(-8, 1.8, 20); this.scene.add(well); this.addCollider(-8, 20, 1.5);
    const wroof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.2, 4), toon(0xb0502a)); wroof.position.set(-8, 4.2, 20); wroof.rotation.y = Math.PI / 4; this.scene.add(wroof);
    for (const [x, z] of [[-5, 10], [5, 10], [-5, 26], [5, 26], [-14, 4], [14, 4]]) {
      const p = new THREE.Mesh(GEO.cyl, toon(0x2a2a2a)); p.scale.set(0.1, 3.2, 0.1); p.position.set(x, 2.8, z); this.scene.add(p);
      const l = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); l.scale.setScalar(0.3); l.position.set(x, 4.5, z); this.scene.add(l);
      this.addCollider(x, z, 0.3);
    }
    // recinti/staccionate decorative
    const fence = toon(0xa07a4a);
    for (let i = 0; i < 10; i++) {
      const x = 26 + (i % 5) * 1.6, z = 26 + Math.floor(i / 5) * 6;
      const f = new THREE.Mesh(GEO.box, fence); f.scale.set(0.2, 1.1, 0.2); f.position.set(x, 1.75, z); this.scene.add(f);
    }

    // Santuari di cura nelle zone
    this.shrines = [];
    for (const zid of SECTORS) {
      const p = pol(ZONES[zid].angle + 18, 118);
      const y = rawHeight(p.x, p.z);
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 10), toon(0xa8a0b8)); base.position.y = 0.25;
      const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), new THREE.MeshLambertMaterial({ color: 0x9affd8, emissive: 0x3affb0, emissiveIntensity: 0.8 }));
      cry.position.y = 2.2; cry.scale.set(0.8, 1.4, 0.8);
      for (let i = 0; i < 4; i++) {
        const st = new THREE.Mesh(GEO.box, toon(0x8a8098)); st.scale.set(0.5, 2.2, 0.5);
        st.position.set(Math.cos(i * Math.PI / 2) * 2.6, 1.1, Math.sin(i * Math.PI / 2) * 2.6); g.add(st);
      }
      g.add(base, cry);
      g.position.set(p.x, y, p.z);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(g);
      this.animated.push((t) => { cry.rotation.y = t * 1.5; cry.position.y = 2.2 + Math.sin(t * 2) * 0.2; });
      this.shrines.push({ id: 'shrine_' + zid, zone: zid, x: p.x, z: p.z, y });
    }
  }

  update(t) {
    for (const f of this.animated) f(t);
    if (this.water) this.water.position.y = -0.05 + Math.sin(t * 0.8) * 0.04;
    if (this.lava) this.lava.material.color.setHSL(0.04 + Math.sin(t * 2) * 0.015, 1, 0.5);
  }
}

// mappa precalcolata per la minimappa
export function renderMapCanvas(size = 220) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const col = new THREE.Color();
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / size) * 560 - 280, z = (j / size) * 560 - 280;
      const h = rawHeight(x, z);
      colorAt(x, z, h, col);
      if (h < -0.05) col.setHex(0x3a8ad0);
      const k = (j * size + i) * 4;
      const sh = 0.85 + clamp(h / 40, 0, 0.3);
      img.data[k] = Math.min(255, col.r * 255 * sh); img.data[k + 1] = Math.min(255, col.g * 255 * sh);
      img.data[k + 2] = Math.min(255, col.b * 255 * sh); img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
