// Modelli procedurali "cartoon" per creature, umani e oggetti
import * as THREE from './vendor/three.module.min.js';

export const GEO = {
  sphere: new THREE.SphereGeometry(1, 18, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
};

let gradientMap = null;
export function getGradient() {
  if (!gradientMap) {
    const d = new Uint8Array([70, 150, 220, 255]);
    gradientMap = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}
export function toon(color, emissive = 0x000000, ei = 0) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getGradient(), emissive, emissiveIntensity: ei });
}
const SHARED = {
  eye: toon(0xffffff),
  pupil: toon(0x15121c),
  shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  dark: toon(0x2a1f1f),
  flameO: new THREE.MeshBasicMaterial({ color: 0xffb21a, transparent: true, opacity: 0.92 }),
  flameY: new THREE.MeshBasicMaterial({ color: 0xfff6b8, transparent: true, opacity: 0.95 }),
  flameB: new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.9 }),
};

function M(geo, mat, sx, sy, sz, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
function G(x = 0, y = 0, z = 0, parent = null) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}

function addEyes(hg, r, big = 1) {
  const er = r * 0.27 * big;
  for (const s of [-1, 1]) {
    const x = s * r * 0.42, y = r * 0.16;
    const z = Math.sqrt(Math.max(0.01, r * r - x * x - y * y)) * 0.93;
    M(GEO.sphere, SHARED.eye, er, er * 1.15, er * 0.7, x, y, z, hg);
    M(GEO.sphere, SHARED.pupil, er * 0.62, er * 0.78, er * 0.5, x * 1.02, y - er * 0.05, z + er * 0.42, hg);
    M(GEO.sphere, SHARED.shine, er * 0.22, er * 0.22, er * 0.2, x * 1.02 + s * er * 0.18, y + er * 0.3, z + er * 0.7, hg);
  }
}

function addEars(hg, type, r, P) {
  for (const s of [-1, 1]) {
    if (type === 'pointy') {
      const e = M(GEO.cone, P.c1, 0.1, 0.26, 0.07, s * r * 0.52, r * 0.88, -0.02, hg);
      e.rotation.z = -s * 0.35;
      const i = M(GEO.cone, P.c3, 0.055, 0.17, 0.03, s * r * 0.5, r * 0.85, 0.035, hg);
      i.rotation.z = -s * 0.35;
    } else if (type === 'round') {
      M(GEO.sphere, P.c1, 0.13, 0.13, 0.05, s * r * 0.64, r * 0.74, 0, hg);
      M(GEO.sphere, P.c2, 0.08, 0.08, 0.03, s * r * 0.64, r * 0.74, 0.03, hg);
    } else if (type === 'long') {
      const e = M(GEO.sphere, P.c1, 0.075, 0.32, 0.05, s * r * 0.36, r * 1.2, -0.03, hg);
      e.rotation.z = -s * 0.18;
      const t = M(GEO.sphere, P.c2, 0.077, 0.11, 0.052, s * r * 0.47, r * 1.72, -0.03, hg);
      t.rotation.z = -s * 0.18;
    }
  }
}

function addHorns(hg, n, r, P) {
  if (!n) return;
  if (n === 1) {
    const h = M(GEO.cone, P.c2, 0.08, 0.28, 0.08, 0, r * 1.08, 0.04, hg);
    h.rotation.x = 0.15;
  } else {
    for (const s of [-1, 1]) {
      const h = M(GEO.cone, P.c2, 0.065, 0.32, 0.065, s * r * 0.45, r * 0.95, -0.02, hg);
      h.rotation.z = -s * 0.45; h.rotation.x = -0.35;
    }
  }
}

function addTail(parent, type, P, rig, x, y, z, scale = 1) {
  if (!type || type === 'none') return;
  const tg = G(x, y, z, parent);
  tg.scale.setScalar(scale);
  rig.tails.push(tg);
  if (type === 'thin') {
    const t = M(GEO.cyl, P.c1, 0.035, 0.6, 0.035, 0, 0.18, -0.24, tg); t.rotation.x = -0.9;
    M(GEO.sphere, P.c2, 0.06, 0.06, 0.06, 0, 0.37, -0.48, tg);
  } else if (type === 'fluffy') {
    const t = M(GEO.sphere, P.c1, 0.17, 0.17, 0.34, 0, 0.16, -0.24, tg); t.rotation.x = -0.7;
    M(GEO.sphere, P.c2, 0.13, 0.13, 0.15, 0, 0.36, -0.46, tg);
  } else if (type === 'flame') {
    const t = M(GEO.sphere, P.c1, 0.09, 0.09, 0.22, 0, 0.08, -0.14, tg); t.rotation.x = -0.6;
    const fg = G(0, 0.2, -0.26, tg);
    const blue = P.blueFlame;
    M(GEO.sphere, blue ? SHARED.flameB : SHARED.flameO, 0.15, 0.15, 0.15, 0, 0.02, 0, fg);
    M(GEO.cone, blue ? SHARED.flameB : SHARED.flameO, 0.15, 0.48, 0.15, 0, 0.26, 0, fg);
    M(GEO.cone, SHARED.flameY, 0.08, 0.3, 0.08, 0, 0.18, 0.03, fg);
    rig.flames.push(fg);
  } else if (type === 'leaf') {
    const t = M(GEO.sphere, P.leaf, 0.2, 0.03, 0.4, 0, 0.2, -0.28, tg); t.rotation.x = -0.75;
    const v = M(GEO.cyl, P.c2, 0.012, 0.6, 0.012, 0, 0.2, -0.28, tg); v.rotation.x = -0.75 + Math.PI / 2;
  } else if (type === 'fin') {
    M(GEO.sphere, P.c2, 0.04, 0.24, 0.3, 0, 0.1, -0.24, tg);
  } else if (type === 'spiky') {
    for (let i = 0; i < 3; i++) {
      const s = 1 - i * 0.22;
      M(GEO.sphere, P.c1, 0.12 * s, 0.12 * s, 0.16 * s, 0, 0.05 + i * 0.07, -0.14 - i * 0.2, tg);
      const sp = M(GEO.cone, P.c2, 0.05 * s, 0.14 * s, 0.05 * s, 0, 0.17 * s + 0.05 + i * 0.07, -0.14 - i * 0.2, tg);
      sp.rotation.x = -0.3;
    }
    const tip = M(GEO.cone, P.c2, 0.07, 0.2, 0.07, 0, 0.2, -0.78, tg); tip.rotation.x = -1.5;
  }
}

function addSpikes(parent, P, pts) {
  for (const [x, y, z, s, rx] of pts) {
    const c = M(GEO.cone, P.c2, 0.06 * s, 0.17 * s, 0.06 * s, x, y, z, parent);
    c.rotation.x = rx || 0;
  }
}

function addMane(parent, P, y, z, rad) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    M(GEO.sphere, P.c2, 0.13, 0.13, 0.1, Math.cos(a) * rad, y + Math.sin(a) * rad, z, parent);
  }
}

function addWings(parent, P, rig, y, z, size = 1) {
  for (const s of [-1, 1]) {
    const wg = G(s * 0.18, y, z, parent);
    const w = M(GEO.sphere, P.c2, 0.55 * size, 0.04, 0.28 * size, s * 0.5 * size, 0.08, -0.06, wg);
    w.rotation.z = s * 0.35;
    M(GEO.cyl, P.c1, 0.03, 1.0 * size, 0.03, s * 0.45 * size, 0.18, 0.12, wg).rotation.z = s * 1.2;
    rig.wings.push({ g: wg, side: s, kind: 'back' });
  }
}

// ---------------------------------------------------------- CREATURE
export const CREATURE_SCALE = 1.3;
export function buildCreature(species) {
  const m = species.m;
  const glow = m.g || 0;
  const P = {
    c1: toon(m.c[0], glow, glow ? 0.08 : 0),
    c2: toon(m.c[1], glow, glow ? 0.65 : 0),
    c3: toon(m.c[2]),
  };
  P.leaf = species.types.includes('grass') ? P.c1 : toon(0x5aaf3a);
  const root = new THREE.Group();
  const rig = { arch: m.b, legs: [], arms: [], wings: [], tails: [], flames: [], segs: [], hover: 0, mv: 0, torso: null };
  const torso = G(0, 0, 0, root);
  rig.torso = torso;
  let height = 1;

  if (m.b === 'quad') {
    const legH = 0.32, bodyY = legH + 0.32;
    M(GEO.sphere, P.c1, 0.42, 0.36, 0.58, 0, bodyY, 0, torso);
    M(GEO.sphere, P.c3, 0.34, 0.26, 0.46, 0, bodyY - 0.1, 0.05, torso);
    const hr = 0.32;
    const hg = G(0, bodyY + 0.3, 0.5, torso); rig.head = hg;
    M(GEO.sphere, P.c1, hr, hr * 0.95, hr, 0, 0, 0, hg);
    M(GEO.sphere, P.c3, 0.16, 0.12, 0.14, 0, -0.09, hr * 0.84, hg);
    M(GEO.sphere, SHARED.dark, 0.05, 0.04, 0.04, 0, -0.04, hr * 0.84 + 0.13, hg);
    addEyes(hg, hr);
    addEars(hg, m.e, hr, P);
    addHorns(hg, m.h, hr, P);
    [[-0.22, 0.32], [0.22, 0.32], [-0.22, -0.3], [0.22, -0.3]].forEach(([x, z], i) => {
      const lh = legH + 0.1;
      const lg = G(x, lh, z, root);
      M(GEO.cyl, P.c1, 0.1, lh, 0.1, 0, -lh / 2, 0, lg);
      M(GEO.sphere, P.c3, 0.12, 0.07, 0.14, 0, -lh + 0.04, 0.03, lg);
      rig.legs.push({ g: lg, ph: i === 0 || i === 3 ? 0 : Math.PI });
    });
    addTail(torso, m.t, P, rig, 0, bodyY + 0.05, -0.52);
    if (m.sp) addSpikes(torso, P, [[0, bodyY + 0.36, 0.15, 1, -0.3], [0, bodyY + 0.36, -0.08, 1.1, -0.3], [0, bodyY + 0.32, -0.3, 0.9, -0.5]]);
    if (m.mn) addMane(torso, P, bodyY + 0.22, 0.36, 0.28);
    if (m.w) addWings(torso, P, rig, bodyY + 0.3, 0.0, 1.0);
    height = bodyY + 0.3 + hr + 0.15;
  } else if (m.b === 'biped') {
    const legH = 0.28;
    [-1, 1].forEach((s, i) => {
      const lg = G(s * 0.17, legH, 0, root);
      M(GEO.cyl, P.c1, 0.1, legH, 0.1, 0, -legH / 2, 0, lg);
      M(GEO.sphere, P.c3, 0.13, 0.07, 0.18, 0, -legH + 0.04, 0.05, lg);
      rig.legs.push({ g: lg, ph: i * Math.PI });
    });
    M(GEO.sphere, P.c1, 0.38, 0.45, 0.34, 0, legH + 0.38, 0, torso);
    M(GEO.sphere, P.c3, 0.3, 0.36, 0.2, 0, legH + 0.34, 0.16, torso);
    const hr = 0.33;
    const hg = G(0, legH + 0.95, 0.03, torso); rig.head = hg;
    M(GEO.sphere, P.c1, hr, hr * 0.95, hr * 0.95, 0, 0, 0, hg);
    M(GEO.sphere, P.c3, 0.15, 0.08, 0.1, 0, -0.12, hr * 0.82, hg);
    addEyes(hg, hr);
    addEars(hg, m.e, hr, P);
    addHorns(hg, m.h, hr, P);
    [-1, 1].forEach((s, i) => {
      const ag = G(s * 0.37, legH + 0.62, 0, torso);
      const a = M(GEO.sphere, P.c1, 0.09, 0.24, 0.09, s * 0.04, -0.18, 0, ag); a.rotation.z = s * 0.25;
      M(GEO.sphere, P.c3, 0.08, 0.08, 0.08, s * 0.09, -0.4, 0.02, ag);
      rig.arms.push({ g: ag, ph: i * Math.PI + Math.PI, side: s });
    });
    addTail(torso, m.t, P, rig, 0, legH + 0.22, -0.28);
    if (m.sp) addSpikes(torso, P, [[0, legH + 0.75, -0.28, 1, -1.2], [0, legH + 0.52, -0.32, 1.1, -1.4], [0, legH + 0.3, -0.3, 0.9, -1.6]]);
    if (m.mn) addMane(torso, P, legH + 0.74, 0.08, 0.3);
    if (m.w) addWings(torso, P, rig, legH + 0.65, -0.25, 1.0);
    height = legH + 0.95 + hr + 0.1;
  } else if (m.b === 'bird') {
    rig.hover = 0.85; torso.position.y = rig.hover;
    M(GEO.sphere, P.c1, 0.32, 0.3, 0.42, 0, 0, 0, torso);
    M(GEO.sphere, P.c3, 0.25, 0.22, 0.3, 0, -0.06, 0.13, torso);
    const hr = 0.25;
    const hg = G(0, 0.27, 0.3, torso); rig.head = hg;
    M(GEO.sphere, P.c1, hr, hr, hr, 0, 0, 0, hg);
    const beak = M(GEO.cone, P.c2, 0.07, 0.2, 0.07, 0, -0.03, hr + 0.07, hg); beak.rotation.x = Math.PI / 2;
    addEyes(hg, hr, 1.1);
    addEars(hg, m.e, hr, P);
    addHorns(hg, m.h, hr, P);
    for (const s of [-1, 1]) {
      const wg = G(s * 0.27, 0.08, 0, torso);
      M(GEO.sphere, P.c1, 0.5, 0.05, 0.25, s * 0.45, 0, 0, wg);
      M(GEO.sphere, P.c2, 0.22, 0.055, 0.17, s * 0.82, 0, -0.06, wg);
      rig.wings.push({ g: wg, side: s, kind: 'bird' });
    }
    const tg = G(0, 0.03, -0.38, torso); rig.tails.push(tg);
    for (const a of [-0.4, 0, 0.4]) {
      const f = M(GEO.sphere, P.c2, 0.08, 0.03, 0.26, Math.sin(a) * 0.12, 0, -0.18, tg); f.rotation.y = a;
    }
    for (const s of [-1, 1]) M(GEO.cyl, P.c2, 0.025, 0.28, 0.025, s * 0.1, -0.36, 0, torso);
    height = rig.hover + 0.27 + hr + 0.1;
  } else if (m.b === 'serpent') {
    const N = 7;
    for (let i = 0; i < N; i++) {
      const r = 0.27 - i * 0.026;
      const bx = Math.sin(i * 0.95) * 0.22;
      const seg = G(bx, r, -i * 0.28, torso);
      M(GEO.sphere, i % 2 ? P.c1 : P.c1, r, r, r * 1.15, 0, 0, 0, seg);
      M(GEO.sphere, P.c3, r * 0.8, r * 0.5, r * 0.9, 0, -r * 0.45, 0.02, seg);
      if (m.sp && i % 2 === 0) addSpikes(seg, P, [[0, r * 0.95, 0, 0.8 + (N - i) * 0.05, -0.3]]);
      rig.segs.push({ g: seg, i, bx });
    }
    const tip = M(GEO.cone, P.c2, 0.08, 0.3, 0.08, Math.sin(N * 0.95) * 0.22, 0.1, -N * 0.28 - 0.05, torso); tip.rotation.x = -Math.PI / 2;
    rig.segs.push({ g: tip, i: N, bx: tip.position.x });
    // collo che si alza a S (stile cobra)
    for (let k = 0; k < 3; k++) {
      const t = (k + 1) / 4;
      M(GEO.sphere, P.c1, 0.25 - k * 0.015, 0.25 - k * 0.015, 0.25 - k * 0.015, 0, 0.3 + t * 0.62, 0.12 + Math.sin(t * Math.PI) * 0.12, torso);
      M(GEO.sphere, P.c3, 0.18, 0.16, 0.12, 0, 0.3 + t * 0.62, 0.3 + Math.sin(t * Math.PI) * 0.1, torso);
    }
    const hr = 0.32;
    const hg = G(0, 1.12, 0.3, torso); rig.head = hg;
    M(GEO.sphere, P.c1, hr, hr * 0.9, hr * 1.05, 0, 0, 0, hg);
    M(GEO.sphere, P.c1, 0.2, 0.14, 0.2, 0, -0.08, hr * 0.8, hg);
    M(GEO.sphere, P.c3, 0.18, 0.08, 0.18, 0, -0.16, hr * 0.75, hg);
    M(GEO.sphere, SHARED.dark, 0.03, 0.025, 0.02, 0.06, -0.02, hr + 0.17, hg);
    M(GEO.sphere, SHARED.dark, 0.03, 0.025, 0.02, -0.06, -0.02, hr + 0.17, hg);
    addEyes(hg, hr);
    addEars(hg, m.e, hr, P);
    addHorns(hg, m.h, hr, P);
    if (m.g) {
      for (const s of [-1, 1]) M(GEO.sphere, P.c2, 0.03, 0.12, 0.2, s * 0.28, 0.05, -0.08, hg).rotation.y = s * 0.4;
    }
    height = 1.12 + hr + 0.12;
  } else if (m.b === 'blob') {
    const fl = !!m.fl;
    rig.hover = fl ? 0.35 : 0; torso.position.y = rig.hover;
    const body = M(GEO.sphere, P.c1, 0.5, 0.44, 0.48, 0, 0.44, 0, torso);
    rig.body = body; rig.bodyBase = body.scale.clone();
    M(GEO.sphere, P.c3, 0.34, 0.27, 0.2, 0, 0.36, 0.32, torso);
    const hg = G(0, 0.48, 0, torso); rig.head = hg;
    addEyes(hg, 0.47, 0.9);
    addEars(hg, m.e, 0.42, P);
    addHorns(hg, m.h, 0.42, P);
    if (m.sp) addSpikes(torso, P, [[0, 0.88, 0, 1.1, 0], [0.22, 0.82, 0, 0.9, 0], [-0.22, 0.82, 0, 0.9, 0], [0, 0.82, -0.2, 0.9, -0.3]]);
    for (const s of [-1, 1]) {
      const ag = G(s * 0.46, 0.4, 0.05, torso);
      M(GEO.sphere, P.c1, 0.14, 0.1, 0.1, s * 0.05, 0, 0, ag);
      rig.arms.push({ g: ag, ph: 0, side: s, blob: true });
    }
    if (fl) {
      const w = M(GEO.cone, P.c1, 0.32, 0.45, 0.32, 0, 0.05, -0.08, torso); w.rotation.x = Math.PI + 0.5;
    } else {
      for (const s of [-1, 1]) M(GEO.sphere, P.c2, 0.14, 0.07, 0.18, s * 0.22, 0.04, 0.12, root);
    }
    height = rig.hover + 0.95;
  } else if (m.b === 'fish') {
    rig.hover = 0.55; torso.position.y = rig.hover;
    M(GEO.sphere, P.c1, 0.3, 0.33, 0.55, 0, 0, 0, torso);
    M(GEO.sphere, P.c3, 0.24, 0.2, 0.44, 0, -0.13, 0.04, torso);
    const hg = G(0, 0.04, 0.24, torso); rig.head = hg;
    addEyes(hg, 0.3, 0.9);
    addHorns(hg, m.h, 0.3, P);
    const tg = G(0, 0, -0.48, torso); rig.tails.push(tg);
    const tf = M(GEO.cone, P.c2, 0.05, 0.38, 0.32, 0, 0, -0.18, tg); tf.rotation.x = Math.PI / 2;
    const df = M(GEO.cone, P.c2, 0.04, 0.32, 0.22, 0, 0.32, -0.08, torso); df.rotation.x = -0.4;
    if (m.sp) { const d2 = M(GEO.cone, P.c2, 0.04, 0.22, 0.14, 0, 0.28, -0.32, torso); d2.rotation.x = -0.6; }
    for (const s of [-1, 1]) {
      const wg = G(s * 0.26, -0.1, 0.1, torso);
      M(GEO.sphere, P.c2, 0.16, 0.03, 0.1, s * 0.12, 0, 0, wg);
      rig.wings.push({ g: wg, side: s, kind: 'fin' });
    }
    height = rig.hover + 0.4;
  } else if (m.b === 'insect') {
    const fly = !!m.w;
    rig.hover = fly ? 0.7 : 0; torso.position.y = rig.hover;
    M(GEO.sphere, P.c1, 0.2, 0.18, 0.2, 0, 0.32, 0.05, torso);
    M(GEO.sphere, P.c1, 0.26, 0.22, 0.38, 0, 0.34, -0.38, torso);
    M(GEO.sphere, P.c2, 0.265, 0.12, 0.16, 0, 0.36, -0.36, torso);
    M(GEO.sphere, P.c2, 0.2, 0.09, 0.1, 0, 0.36, -0.6, torso);
    const hr = 0.21;
    const hg = G(0, 0.4, 0.32, torso); rig.head = hg;
    M(GEO.sphere, P.c1, hr, hr, hr, 0, 0, 0, hg);
    addEyes(hg, hr, 1.35);
    for (const s of [-1, 1]) {
      const a = M(GEO.cyl, P.c1, 0.015, 0.32, 0.015, s * 0.1, hr + 0.12, 0.05, hg); a.rotation.z = -s * 0.4; a.rotation.x = 0.3;
      M(GEO.sphere, P.c2, 0.04, 0.04, 0.04, s * 0.17, hr + 0.26, 0.1, hg);
    }
    [0.15, 0.03, -0.1].forEach((z, i) => {
      for (const s of [-1, 1]) {
        const lg = G(s * 0.14, 0.3, z, torso);
        lg.rotation.z = s * 0.9;
        M(GEO.cyl, P.c3, 0.022, 0.34, 0.022, 0, -0.17, 0, lg);
        rig.legs.push({ g: lg, ph: (i + (s > 0 ? 1 : 0)) * Math.PI, insect: true, side: s });
      }
    });
    if (fly) {
      const wmat = new THREE.MeshToonMaterial({ color: m.c[2], gradientMap: getGradient(), transparent: true, opacity: 0.6, emissive: glow, emissiveIntensity: glow ? 0.5 : 0, side: THREE.DoubleSide });
      P.wing = wmat;
      for (const s of [-1, 1]) {
        for (const [z, sz] of [[0.08, 1], [-0.12, 0.8]]) {
          const wg = G(s * 0.08, 0.46, z, torso);
          M(GEO.sphere, wmat, 0.42 * sz, 0.015, 0.18 * sz, s * 0.4 * sz, 0, 0, wg);
          rig.wings.push({ g: wg, side: s, kind: 'insect' });
        }
      }
    }
    if (m.t === 'spiky') {
      const tg = G(0, 0.4, -0.7, torso); rig.tails.push(tg);
      for (let i = 0; i < 3; i++) M(GEO.sphere, P.c1, 0.1, 0.1, 0.1, 0, 0.12 + i * 0.16, -0.08 + i * 0.06, tg);
      const st = M(GEO.cone, P.c2, 0.06, 0.2, 0.06, 0, 0.58, 0.14, tg); st.rotation.x = 2.2;
    }
    height = rig.hover + 0.75;
  }

  const S = m.s * CREATURE_SCALE;
  root.scale.setScalar(S);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData.rig = rig;
  root.userData.mats = [P.c1, P.c2, P.c3];
  root.userData.height = height * S;
  root.userData.phase = Math.random() * 10;
  root.userData.sid = species.id;
  return root;
}

// -------------------------------------------------------------- UMANO
export function buildHuman(look = {}) {
  const skin = toon(look.skin || 0xffd2a8);
  const shirt = toon(look.shirt || 0xd03a3a);
  const pants = toon(look.pants || 0x2a3a6a);
  const hair = toon(look.hair || 0x3a2210);
  const root = new THREE.Group();
  const rig = { arch: 'human', legs: [], arms: [], wings: [], tails: [], flames: [], segs: [], hover: 0, mv: 0 };
  const torso = G(0, 0, 0, root); rig.torso = torso;
  for (const [i, s] of [-1, 1].entries()) {
    const lg = G(s * 0.14, 0.78, 0, root);
    M(GEO.cyl, pants, 0.11, 0.74, 0.11, 0, -0.37, 0, lg);
    M(GEO.box, SHARED.dark, 0.16, 0.1, 0.28, 0, -0.74, 0.05, lg);
    rig.legs.push({ g: lg, ph: i * Math.PI });
  }
  M(GEO.cyl, shirt, 0.27, 0.62, 0.2, 0, 1.08, 0, torso);
  M(GEO.sphere, shirt, 0.27, 0.12, 0.2, 0, 1.38, 0, torso);
  M(GEO.cyl, pants, 0.28, 0.1, 0.21, 0, 0.8, 0, torso);
  const hg = G(0, 1.66, 0, torso); rig.head = hg;
  M(GEO.sphere, skin, 0.22, 0.24, 0.22, 0, 0, 0, hg);
  const hairM = M(GEO.sphere, hair, 0.235, 0.18, 0.235, 0, 0.07, -0.02, hg);
  hairM.scale.y = 0.2;
  M(GEO.sphere, hair, 0.235, 0.2, 0.2, 0, 0.06, -0.04, hg);
  for (const s of [-1, 1]) {
    M(GEO.sphere, SHARED.pupil, 0.03, 0.04, 0.02, s * 0.08, 0.02, 0.2, hg);
  }
  if (look.hat) {
    const hat = toon(look.hat);
    M(GEO.cyl, hat, 0.25, 0.14, 0.25, 0, 0.17, 0, hg);
    M(GEO.cyl, hat, 0.2, 0.03, 0.2, 0, 0.1, 0.16, hg).scale.set(0.2, 0.03, 0.18);
  }
  for (const [i, s] of [-1, 1].entries()) {
    const ag = G(s * 0.34, 1.34, 0, torso);
    M(GEO.cyl, shirt, 0.07, 0.6, 0.07, 0, -0.3, 0, ag);
    M(GEO.sphere, skin, 0.075, 0.075, 0.075, 0, -0.63, 0, ag);
    rig.arms.push({ g: ag, ph: i * Math.PI, side: s });
  }
  if (look.bag) {
    M(GEO.box, toon(look.bag), 0.34, 0.4, 0.16, 0, 1.12, -0.22, torso);
  }
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  root.userData.rig = rig;
  root.userData.mats = [shirt];
  root.userData.height = 1.9;
  root.userData.phase = Math.random() * 10;
  return root;
}

// ---------------------------------------------------------- ANIMAZIONE
export function animateModel(model, t, dt, moving, speedMul = 1) {
  const r = model.userData.rig;
  if (!r) return;
  const T = t + model.userData.phase;
  r.mv += ((moving ? 1 : 0) - r.mv) * Math.min(1, dt * 8);
  const mv = r.mv;
  const walkF = 9 * speedMul;
  if (r.torso) {
    let y = r.hover + Math.abs(Math.sin(T * walkF)) * 0.05 * mv + Math.sin(T * 2.2) * 0.02;
    if (r.hover) y += Math.sin(T * 2.4) * 0.07;
    r.torso.position.y = y;
  }
  for (const L of r.legs) {
    if (L.insect) L.g.rotation.x = Math.sin(T * walkF * 1.6 + L.ph) * 0.5 * mv;
    else L.g.rotation.x = Math.sin(T * walkF + L.ph) * 0.75 * mv;
  }
  for (const A of r.arms) {
    if (A.blob) { A.g.rotation.z = A.side * (0.2 + Math.sin(T * 5) * 0.25); continue; }
    A.g.rotation.x = Math.sin(T * walkF + A.ph) * 0.7 * mv;
    A.g.rotation.z = A.side * (0.05 + Math.sin(T * 1.7) * 0.03);
  }
  for (const W of r.wings) {
    if (W.kind === 'bird') W.g.rotation.z = W.side * (Math.sin(T * (9 + mv * 5)) * 0.65 + 0.05);
    else if (W.kind === 'insect') W.g.rotation.z = W.side * (Math.sin(T * 38) * 0.5 + 0.2);
    else if (W.kind === 'fin') W.g.rotation.z = W.side * Math.sin(T * 6) * 0.4;
    else W.g.rotation.z = W.side * (Math.sin(T * 3) * 0.18 + 0.1);
  }
  for (const tl of r.tails) {
    tl.rotation.y = Math.sin(T * (r.arch === 'fish' ? 7 : 3)) * (r.arch === 'fish' ? 0.45 : 0.32);
  }
  for (const f of r.flames) {
    const k = 1 + Math.sin(T * 21) * 0.12 + Math.sin(T * 13.7) * 0.08;
    f.scale.set(1 / k, k, 1 / k);
  }
  for (const S of r.segs) {
    S.g.position.x = (S.bx || 0) + Math.sin(T * (2.5 + mv * 5) - S.i * 0.8) * (0.06 + mv * 0.08) * Math.min(1, S.i * 0.5 + 0.2);
  }
  if (r.body) {
    const k = 1 + Math.sin(T * (4 + mv * 6)) * (0.05 + mv * 0.05);
    r.body.scale.set(r.bodyBase.x / Math.sqrt(k), r.bodyBase.y * k, r.bodyBase.z / Math.sqrt(k));
  }
  if (r.head) r.head.rotation.z = Math.sin(T * 1.3) * 0.05;
}

export function setFlash(model, amount, color = 0xffffff) {
  for (const m of model.userData.mats || []) {
    if (m.userData.baseE === undefined) { m.userData.baseE = m.emissive.getHex(); m.userData.baseI = m.emissiveIntensity; }
    if (amount > 0) { m.emissive.setHex(color); m.emissiveIntensity = amount; }
    else { m.emissive.setHex(m.userData.baseE); m.emissiveIntensity = m.userData.baseI; }
  }
}

export function disposeModel(model) {
  model.traverse((o) => {
    if (o.isMesh && o.material && !Object.values(SHARED).includes(o.material)) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}

// ------------------------------------------------------------- SFERA
export function buildOrb(color = 0xe83a3a) {
  const g = new THREE.Group();
  const r = 0.22;
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(color));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xf4f4f4));
  const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 20), toon(0x1a1a1a));
  band.rotation.x = Math.PI / 2;
  const btn = M(GEO.sphere, toon(0xffffff, 0xffffff, 0.3), 0.06, 0.06, 0.04, 0, 0, r);
  g.add(top, bot, band, btn);
  g.userData.btn = btn;
  return g;
}

// ------------------------------------------------------------ ETICHETTE
export function makeLabel(text, opts = {}) {
  const fs = opts.size || 40;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 28;
  const h = fs + 20;
  c.width = w; c.height = h;
  ctx.font = `bold ${fs}px "Trebuchet MS", sans-serif`;
  ctx.fillStyle = opts.bg || 'rgba(10,12,24,0.62)';
  const rr = 14;
  ctx.beginPath();
  ctx.moveTo(rr, 0); ctx.arcTo(w, 0, w, h, rr); ctx.arcTo(w, h, 0, h, rr); ctx.arcTo(0, h, 0, 0, rr); ctx.arcTo(0, 0, w, 0, rr);
  ctx.fill();
  ctx.fillStyle = opts.color || '#ffffff';
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
  const s = new THREE.Sprite(mat);
  const k = (opts.scale || 0.011);
  s.scale.set(w * k, h * k, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------------------------------------------------- RITRATTI
export class Portraits {
  constructor() {
    this.cache = new Map();
    this.size = 160;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(this.size, this.size);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a9a, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(2, 4, 5); this.scene.add(d);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  }
  get(species) {
    if (this.cache.has(species.id)) return this.cache.get(species.id);
    const model = buildCreature(species);
    model.rotation.y = -0.55;
    this.scene.add(model);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const dist = Math.max(sz.x, sz.y, sz.z) * 2.1 + 0.4;
    this.camera.position.set(c.x + dist * 0.15, c.y + dist * 0.18, c.z + dist);
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(model);
    disposeModel(model);
    this.cache.set(species.id, url);
    return url;
  }
}
