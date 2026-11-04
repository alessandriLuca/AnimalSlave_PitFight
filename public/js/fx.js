// Effetti: tween, particelle, proiettili, testi fluttuanti
import * as THREE from './vendor/three.module.min.js';

export const ease = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
  back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

const PGEO = new THREE.SphereGeometry(1, 6, 5);
const matCache = new Map();
function pmat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshBasicMaterial({ color }));
  return matCache.get(color);
}

export class FX {
  constructor(scene, camera, layer) {
    this.scene = scene; this.camera = camera; this.layer = layer;
    this.parts = []; this.tweens = []; this.texts = []; this.rings = [];
    this.v = new THREE.Vector3();
  }
  tween(dur, fn, e = ease.inOut) {
    return new Promise((res) => {
      this.tweens.push({ t: 0, dur: Math.max(0.0001, dur), fn, e, res });
      fn(0);
    });
  }
  wait(sec) { return this.tween(sec, () => {}, ease.linear); }

  burst(pos, color, count = 16, speed = 4, size = 0.12, life = 0.8, gravity = -5) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(PGEO, pmat(color));
      m.position.copy(pos);
      const s = size * (0.6 + Math.random() * 0.8);
      m.scale.setScalar(s);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.scene.add(m);
      this.parts.push({ m, v, life, max: life, s, g: gravity });
    }
  }
  sparkle(pos, color, count = 10, radius = 1) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(PGEO, pmat(color));
      m.position.set(pos.x + (Math.random() - 0.5) * radius * 2, pos.y + Math.random() * radius * 1.5, pos.z + (Math.random() - 0.5) * radius * 2);
      const s = 0.06 + Math.random() * 0.08;
      m.scale.setScalar(s);
      this.scene.add(m);
      this.parts.push({ m, v: new THREE.Vector3(0, 1 + Math.random(), 0), life: 1, max: 1, s, g: 0 });
    }
  }
  ring(pos, color, maxR = 3, dur = 0.6) {
    const geo = new THREE.TorusGeometry(1, 0.06, 6, 40);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI / 2; m.position.copy(pos);
    this.scene.add(m);
    this.tween(dur, (t) => { m.scale.setScalar(0.2 + t * maxR); mat.opacity = 0.9 * (1 - t); }, ease.out).then(() => {
      this.scene.remove(m); geo.dispose(); mat.dispose();
    });
  }
  async projectile(from, to, color, dur = 0.38, size = 0.26, arc = 0.8) {
    const m = new THREE.Mesh(PGEO, new THREE.MeshBasicMaterial({ color }));
    const core = new THREE.Mesh(PGEO, pmat(0xffffff));
    core.scale.setScalar(0.5);
    m.add(core);
    m.scale.setScalar(size);
    this.scene.add(m);
    let last = 0;
    await this.tween(dur, (t) => {
      m.position.lerpVectors(from, to, t);
      m.position.y += Math.sin(t * Math.PI) * arc;
      if (t - last > 0.08) { last = t; this.burst(m.position, color, 2, 0.6, size * 0.4, 0.35, 0); }
    }, ease.linear);
    this.scene.remove(m); m.material.dispose();
  }
  floatText(pos, text, color = '#fff', size = 26, life = 1.1) {
    const el = document.createElement('div');
    el.className = 'floatText';
    el.textContent = text;
    el.style.color = color; el.style.fontSize = size + 'px';
    this.layer.appendChild(el);
    this.texts.push({ el, pos: pos.clone(), life, max: life });
  }
  update(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.e(k));
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.v.y += p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      p.m.scale.setScalar(p.s * Math.max(0, p.life / p.max));
      if (p.life <= 0) { this.scene.remove(p.m); this.parts.splice(i, 1); }
    }
    const w = innerWidth, h = innerHeight;
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.pos.y += dt * 1.2;
      this.v.copy(t.pos).project(this.camera);
      t.el.style.transform = `translate(-50%,-50%) translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) scale(${1 + Math.max(0, t.life - t.max + 0.2) * 2})`;
      t.el.style.opacity = Math.min(1, t.life * 2.5);
      if (t.life <= 0) { t.el.remove(); this.texts.splice(i, 1); }
    }
  }
}
