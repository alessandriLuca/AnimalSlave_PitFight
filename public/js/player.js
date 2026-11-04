// Input, giocatore, telecamera in terza persona, compagno che segue
import * as THREE from './vendor/three.module.min.js';
import { buildHuman, buildCreature, animateModel, disposeModel } from './models.js';
import { SPECIES } from './data.js';
import { WORLD_RADIUS } from './world.js';

export class Input {
  constructor(dom) {
    this.keys = new Set(); this.pressed = new Set();
    this.drag = null; this.dx = 0; this.dy = 0; this.wheel = 0;
    this.joy = { x: 0, y: 0, id: null, cx: 0, cy: 0 };
    addEventListener('keydown', (e) => {
      if (e.repeat) { if (!['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) return; }
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('mousedown', (e) => { this.drag = { x: e.clientX, y: e.clientY }; });
    addEventListener('mouseup', () => { this.drag = null; });
    addEventListener('mousemove', (e) => {
      if (!this.drag) return;
      this.dx += e.clientX - this.drag.x; this.dy += e.clientY - this.drag.y;
      this.drag = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    // touch: metà sinistra joystick, metà destra camera
    const joyEl = document.getElementById('joystick');
    const knob = joyEl ? joyEl.querySelector('.knob') : null;
    dom.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && this.joy.id === null) {
          this.joy.id = t.identifier; this.joy.cx = t.clientX; this.joy.cy = t.clientY;
          if (joyEl) { joyEl.style.left = t.clientX - 60 + 'px'; joyEl.style.top = t.clientY - 60 + 'px'; joyEl.classList.add('on'); }
        } else if (!this.tdrag) {
          this.tdrag = { id: t.identifier, x: t.clientX, y: t.clientY };
        }
      }
      e.preventDefault();
    }, { passive: false });
    dom.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          let x = (t.clientX - this.joy.cx) / 50, y = (t.clientY - this.joy.cy) / 50;
          const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
          this.joy.x = x; this.joy.y = y;
          if (knob) knob.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
        } else if (this.tdrag && t.identifier === this.tdrag.id) {
          this.dx += (t.clientX - this.tdrag.x) * 1.4; this.dy += (t.clientY - this.tdrag.y) * 1.4;
          this.tdrag.x = t.clientX; this.tdrag.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          this.joy.id = null; this.joy.x = this.joy.y = 0;
          if (knob) knob.style.transform = ''; if (joyEl) joyEl.classList.remove('on');
        }
        if (this.tdrag && t.identifier === this.tdrag.id) this.tdrag = null;
      }
    };
    dom.addEventListener('touchend', end); dom.addEventListener('touchcancel', end);
  }
  press(code) { this.pressed.add(code); }
  was(code) { return this.pressed.has(code); }
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    x += this.joy.x; y -= this.joy.y;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  endFrame() { this.pressed.clear(); this.dx = 0; this.dy = 0; this.wheel = 0; }
}

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.model = buildHuman({ shirt: 0xd8402a, pants: 0x2a3a6a, hair: 0x4a2a12, hat: 0xd8402a, bag: 0xe0a040 });
    scene.add(this.model);
    this.pos = new THREE.Vector3(0, 0, 24);
    this.facing = Math.PI;
    this.moving = false; this.stepT = 0;
  }
  teleport(x, z) { this.pos.set(x, this.world.groundY(x, z), z); this.model.position.copy(this.pos); }
  update(dt, t, input, camYaw, enabled, audio) {
    let mv = false;
    if (enabled) {
      const a = input.axis();
      if (Math.abs(a.x) + Math.abs(a.y) > 0.05) {
        const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || Math.hypot(input.joy.x, input.joy.y) > 0.95;
        const sp = (sprint ? 15 : 8.5) * Math.min(1, Math.hypot(a.x, a.y) * 1.2);
        const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
        const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
        let dx = fx * a.y + rx * a.x, dz = fz * a.y + rz * a.x;
        const l = Math.hypot(dx, dz); dx /= l; dz /= l;
        const nx = this.pos.x + dx * sp * dt, nz = this.pos.z + dz * sp * dt;
        if (this.world.height(nx, nz) > -0.75) { this.pos.x = nx; this.pos.z = nz; }
        else if (this.world.height(nx, this.pos.z) > -0.75) this.pos.x = nx;
        else if (this.world.height(this.pos.x, nz) > -0.75) this.pos.z = nz;
        this.world.collide(this.pos, 0.45);
        const r = Math.hypot(this.pos.x, this.pos.z);
        if (r > WORLD_RADIUS) { this.pos.x *= WORLD_RADIUS / r; this.pos.z *= WORLD_RADIUS / r; }
        const target = Math.atan2(dx, dz);
        let d = target - this.facing;
        while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        this.facing += d * Math.min(1, dt * 12);
        mv = true;
        this.speedMul = sp / 8.5;
        this.stepT += dt * sp;
        if (this.stepT > 2.6) { this.stepT = 0; audio && audio.sfx('step'); }
      }
    }
    this.moving = mv;
    const gy = this.world.groundY(this.pos.x, this.pos.z);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 18);
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.facing;
    animateModel(this.model, t, dt, mv, mv ? Math.min(1.5, this.speedMul || 1) : 1);
  }
}

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera; this.world = world;
    this.yaw = 0; this.pitch = 0.42; this.dist = 10;
    this.override = null; this.blend = 0;
    this.cur = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
  }
  setBattle(pos, look) { this.override = { pos: pos.clone(), look: look.clone() }; }
  clearBattle() { this.override = null; }
  update(dt, target, input, allowOrbit) {
    if (allowOrbit) {
      this.yaw -= input.dx * 0.006;
      this.pitch = Math.max(0.08, Math.min(1.25, this.pitch + input.dy * 0.004));
      this.dist = Math.max(4.5, Math.min(22, this.dist + input.wheel * 1.2));
      if (input.keys.has('KeyQ')) this.yaw += dt * 2.2;
      if (input.keys.has('KeyR')) this.yaw -= dt * 2.2;
    }
    const want = this.tmp;
    let lookAt;
    if (this.override) {
      want.copy(this.override.pos); lookAt = this.override.look;
      this.blend = Math.min(1, this.blend + dt * 2.5);
    } else {
      const cp = Math.cos(this.pitch);
      want.set(target.x + Math.sin(this.yaw) * cp * this.dist, target.y + 1.6 + Math.sin(this.pitch) * this.dist, target.z + Math.cos(this.yaw) * cp * this.dist);
      const gh = this.world.height(want.x, want.z) + 0.8;
      if (want.y < gh) want.y = gh;
      lookAt = new THREE.Vector3(target.x, target.y + 1.5, target.z);
      this.blend = Math.max(0, this.blend - dt * 2.5);
    }
    const k = this.override ? Math.min(1, dt * 3.5) : Math.min(1, dt * 10);
    if (!this.inited) { this.cur.copy(want); this.look.copy(lookAt); this.inited = true; }
    this.cur.lerp(want, k);
    this.look.lerp(lookAt, k);
    this.camera.position.copy(this.cur);
    this.camera.lookAt(this.look);
  }
}

// La creatura in testa alla squadra ti segue (stile mascotte)
export class Companion {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.model = null; this.sid = null;
    this.pos = new THREE.Vector3(); this.facing = 0; this.visible = true;
  }
  setSpecies(sid, near) {
    if (this.sid === sid && this.model) return;
    if (this.model) { this.scene.remove(this.model); disposeModel(this.model); this.model = null; }
    this.sid = sid;
    if (!sid) return;
    this.model = buildCreature(SPECIES[sid]);
    const s = this.model.scale.x;
    if (s > 1.7) this.model.scale.setScalar(1.7 + (s - 1.7) * 0.4);
    this.scene.add(this.model);
    if (near) this.pos.set(near.x + 1.5, near.y, near.z + 1.5);
  }
  setVisible(v) { this.visible = v; if (this.model) this.model.visible = v; }
  update(dt, t, player) {
    if (!this.model) return;
    const behind = new THREE.Vector3(player.pos.x - Math.sin(player.facing) * 2.2 + Math.cos(player.facing) * 1.3, 0, player.pos.z - Math.cos(player.facing) * 2.2 - Math.sin(player.facing) * 1.3);
    const dx = behind.x - this.pos.x, dz = behind.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 30) { this.pos.x = behind.x; this.pos.z = behind.z; }
    else if (d > 0.4) {
      const sp = Math.min(d * 3.2, 20);
      this.pos.x += (dx / d) * sp * dt; this.pos.z += (dz / d) * sp * dt;
      const target = Math.atan2(dx, dz);
      let a = target - this.facing; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
      this.facing += a * Math.min(1, dt * 8);
      moving = d > 0.8;
    }
    this.world.collide(this.pos, 0.35);
    const gy = this.world.groundY(this.pos.x, this.pos.z);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 15);
    this.model.position.copy(this.pos);
    this.model.rotation.y = this.facing;
    animateModel(this.model, t, dt, moving, 1.2);
  }
}
