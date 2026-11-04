// Combattimento a turni in-world (stile pet battle / Pokémon)
import * as THREE from './vendor/three.module.min.js';
import { SPECIES, MOVES, TYPES, ITEMS, STATUS, effectiveness, RARITY_CATCH } from './data.js';
import { calcStats, gainXp, maxHp, nameOf } from './creature.js';
import { buildCreature, animateModel, disposeModel, setFlash, buildOrb } from './models.js';
import { ease } from './fx.js';

const STAT_NAME = { atk: "l'Attacco", def: 'la Difesa', spd: 'la Velocità' };
const MELEE = new Set(['beast', 'earth']);
const hex = (c) => parseInt(c.slice(1), 16);
const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export class Battle {
  constructor(game, opts) {
    this.g = game; this.ui = game.ui; this.fx = game.fx; this.audio = game.audio;
    this.wild = !!opts.wild;
    this.wildRef = opts.wildRef || null;
    this.trainer = opts.trainer || null;
    this.trainerModel = opts.trainerModel || null;
    this.enemyTeam = opts.enemies;
    this.center = opts.center.clone();
    this.dir = opts.dir.clone().setY(0).normalize();
    this.perp = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    this.over = false; this.outcome = null; this.runTries = 0;
    this.participants = new Set();
    this.P = { side: 'p', mon: null, model: null, stages: null, pos: null };
    this.E = { side: 'e', mon: null, model: null, stages: null, pos: null };
    this.objects = [];
    this.t = 0;
  }
  get party() { return this.g.data.party; }
  types(S) { return SPECIES[S.mon.sid].types; }
  stat(S, k) { return calcStats(S.mon)[k] * stageMul(S.stages[k]); }
  speed(S) { return this.stat(S, 'spd') * (S.mon.status === 'paralysis' ? 0.5 : 1); }
  label(S) {
    const n = nameOf(S.mon);
    if (S.side === 'p') return n;
    return this.wild ? `${n} selvatico` : `${n} nemico`;
  }
  say(text, dur) { return this.ui.battleSay(text, dur); }
  hud() { this.ui.battleHud(this); }

  // ------------------------------------------------------------ SETUP
  async setup() {
    const w = this.g.world;
    const c = this.center;
    c.y = w.groundY(c.x, c.z);
    this.P.pos = c.clone().addScaledVector(this.dir, -3.8);
    this.E.pos = c.clone().addScaledVector(this.dir, 3.8);
    for (const S of [this.P, this.E]) S.pos.y = w.groundY(S.pos.x, S.pos.z);
    // anello dell'arena
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.09, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85 }));
    ring.rotation.x = Math.PI / 2; ring.position.set(c.x, c.y + 0.25, c.z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6.2, 48), new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.18, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(c.x, c.y + 0.2, c.z);
    this.g.scene.add(ring, disc); this.objects.push(ring, disc);
    this.ring = ring;
    // giocatore dietro la sua creatura
    const pp = this.P.pos.clone().addScaledVector(this.dir, -2.6).addScaledVector(this.perp, -1.6);
    this.g.player.teleport(pp.x, pp.z);
    this.g.player.facing = Math.atan2(this.dir.x, this.dir.z);
    this.g.player.model.rotation.y = this.g.player.facing;
    this.g.companion.setVisible(false);
    if (this.trainerModel) {
      const tp = this.E.pos.clone().addScaledVector(this.dir, 2.8).addScaledVector(this.perp, 1.6);
      this.trainerModel.position.set(tp.x, w.groundY(tp.x, tp.z), tp.z);
      this.trainerModel.rotation.y = Math.atan2(-this.dir.x, -this.dir.z);
    }
    // camera cinematografica di lato
    const camPos = this.pickCamPos();
    this.g.camRig.setBattle(camPos, c.clone().add(new THREE.Vector3(0, 1.3, 0)));
    this.ui.battleShow(true);
  }
  pickCamPos() {
    // prova varie posizioni e sceglie quella meno coperta da alberi/rocce/colline
    const w = this.g.world, c = this.center;
    let best = null, bs = Infinity;
    for (const side of [1, -1]) {
      for (const back of [-4.4, -2, -6.5, 0]) {
        for (const dist of [9.6, 8]) {
          const p = c.clone().addScaledVector(this.perp, dist * side).addScaledVector(this.dir, back);
          p.y = Math.max(c.y, w.height(p.x, p.z)) + 3.9;
          let score = w.blockers(c.x, c.z, p.x, p.z) * 10 + Math.abs(back + 4.4) * 0.6 + (9.6 - dist) * 0.8;
          score += Math.max(0, w.height(p.x, p.z) - c.y - 2) * 3;
          if (score < bs) { bs = score; best = p; }
        }
      }
    }
    return best;
  }

  async sendOut(S, mon, wildIntro = false) {
    if (S.model) { this.g.scene.remove(S.model); disposeModel(S.model); }
    S.mon = mon; S.stages = { atk: 0, def: 0, spd: 0 }; S.fainted = false;
    const m = buildCreature(SPECIES[mon.sid]);
    m.position.copy(S.pos);
    const other = S === this.P ? this.E.pos : this.P.pos;
    m.rotation.y = Math.atan2(other.x - S.pos.x, other.z - S.pos.z);
    this.g.scene.add(m);
    S.model = m;
    const s0 = m.scale.x;
    S.baseScale = Math.min(3.2, Math.max(1.45, s0 * 1.2));
    S.hk = S.baseScale / s0;
    m.scale.setScalar(S.baseScale);
    if (S === this.P) { this.participants.add(mon.uid); this.g.markSeen(mon.sid); }
    else this.g.markSeen(mon.sid);
    this.hud();
    if (wildIntro) {
      m.scale.setScalar(S.baseScale);
      await this.fx.tween(0.35, (t) => { m.position.y = S.pos.y + Math.sin(t * Math.PI) * 0.8; });
    } else {
      this.fx.ring(S.pos.clone().setY(S.pos.y + 0.3), 0xffffff, 2.2, 0.5);
      this.fx.sparkle(S.pos, 0xffffff, 14, 0.9);
      await this.fx.tween(0.45, (t) => m.scale.setScalar(S.baseScale * t), ease.back);
    }
  }
  async recall(S) {
    const m = S.model; if (!m) return;
    await this.fx.tween(0.3, (t) => m.scale.setScalar(S.baseScale * (1 - t)));
    this.g.scene.remove(m); disposeModel(m); S.model = null;
  }

  // ------------------------------------------------------------- LOOP
  async run() {
    await this.setup();
    this.audio.sfx('encounter');
    this.audio.music(this.trainer && this.trainer.pit ? 'pit' : 'battle');
    const firstEnemy = this.enemyTeam.find((c) => c.hp > 0);
    if (this.wild) {
      this.E.model = this.wildRef ? null : null;
      await this.sendOut(this.E, firstEnemy, true);
      await this.say(this.wildRef && this.wildRef.legendary ? `Il leggendario ${nameOf(firstEnemy)} ti sbarra la strada!` : `Un ${nameOf(firstEnemy)} selvatico ti sfida!`);
    } else {
      await this.say(`${this.trainer.name} vuole combattere!`);
      await this.sendOut(this.E, firstEnemy);
      await this.say(`${this.trainer.name} manda in campo ${nameOf(firstEnemy)}!`);
    }
    const lead = this.party.find((c) => c.hp > 0);
    await this.sendOut(this.P, lead);
    await this.say(`Vai, ${nameOf(lead)}!`, 0.6);
    while (!this.over) {
      const act = await this.ui.battleMenu(this);
      await this.turn(act);
    }
    await this.cleanup();
    return this.outcome;
  }

  async turn(pAct) {
    const eAct = this.aiChoose();
    const queue = [];
    if (pAct.type !== 'move') queue.push([this.P, pAct], [this.E, eAct]);
    else {
      const ps = this.speed(this.P), es = this.speed(this.E);
      const pFirst = ps > es || (ps === es && Math.random() < 0.5);
      if (pFirst) queue.push([this.P, pAct], [this.E, eAct]); else queue.push([this.E, eAct], [this.P, pAct]);
    }
    for (const [S, act] of queue) {
      if (this.over) return;
      if (!S.mon || S.mon.hp <= 0 || S.fainted) continue;
      const O = S === this.P ? this.E : this.P;
      if (act.type === 'move') {
        if (O.mon.hp <= 0) continue;
        await this.doMove(S, O, MOVES[act.move]);
      } else if (act.type === 'switch') {
        await this.say(`Torna qui, ${nameOf(this.P.mon)}!`, 0.6);
        await this.recall(this.P);
        const mon = this.party[act.idx];
        await this.sendOut(this.P, mon);
        await this.say(`Vai, ${nameOf(mon)}!`, 0.6);
        // il nemico colpisce la nuova creatura: l'azione del nemico resta in coda
      } else if (act.type === 'item') {
        await this.useItem(act);
        if (this.over) return;
      } else if (act.type === 'run') {
        if (await this.tryRun()) return;
      }
      if (await this.checkFaints()) return;
    }
    // effetti di fine turno
    for (const S of [this.P, this.E]) {
      if (this.over || !S.mon || S.mon.hp <= 0) continue;
      const st = S.mon.status;
      if (st === 'burn' || st === 'poison') {
        const mx = maxHp(S.mon);
        const dmg = Math.max(1, Math.floor(mx / (st === 'burn' ? 12 : 9)));
        S.mon.hp = Math.max(0, S.mon.hp - dmg);
        this.fx.burst(this.mid(S), hex(STATUS[st].color), 10, 2, 0.1);
        this.fx.floatText(this.mid(S), `-${dmg}`, STATUS[st].color, 22);
        this.hud();
        await this.say(`${this.label(S)} soffre per ${st === 'burn' ? 'la scottatura' : 'il veleno'}!`, 0.8);
      }
    }
    await this.checkFaints();
  }

  mid(S) { return S.pos.clone().setY(S.pos.y + (S.model ? S.model.userData.height * (S.hk || 1) * 0.55 : 0.6)); }

  async checkFaints() {
    if (this.E.mon && this.E.mon.hp <= 0 && !this.E.fainted) {
      this.E.fainted = true;
      await this.faintAnim(this.E);
      await this.say(`${this.label(this.E)} va KO!`);
      await this.awardXp(this.E.mon);
      const next = this.enemyTeam.find((c) => c.hp > 0);
      if (next && !this.wild) {
        await this.say(`${this.trainer.name} manda in campo ${nameOf(next)}!`, 0.7);
        this.participants = new Set(this.P.mon && this.P.mon.hp > 0 ? [this.P.mon.uid] : []);
        await this.sendOut(this.E, next);
      } else {
        await this.finish('win');
        return true;
      }
    }
    if (this.P.mon && this.P.mon.hp <= 0 && !this.P.fainted) {
      this.P.fainted = true;
      await this.faintAnim(this.P);
      await this.say(`${nameOf(this.P.mon)} va KO!`);
      this.participants.delete(this.P.mon.uid);
      if (!this.party.some((c) => c.hp > 0)) { await this.finish('lose'); return true; }
      const idx = await this.ui.battleChooseMember(this, true);
      const mon = this.party[idx];
      await this.sendOut(this.P, mon);
      await this.say(`Vai, ${nameOf(mon)}!`, 0.6);
    }
    return false;
  }

  async awardXp(enemy) {
    const sp = SPECIES[enemy.sid];
    const xp = Math.max(1, Math.floor((sp.baseXp * enemy.level) / 4.5 * (this.trainer ? 1.5 : 1)));
    for (const uid of [...this.participants]) {
      const c = this.party.find((m) => m.uid === uid);
      if (!c || c.hp <= 0) continue;
      await this.say(`${nameOf(c)} guadagna ${xp} Punti Esperienza!`, 0.7);
      const evs = gainXp(c, xp);
      this.hud();
      for (const ev of evs) {
        if (ev.type === 'level') {
          this.audio.sfx('level');
          if (c === this.P.mon) { this.fx.sparkle(this.P.pos, 0xffe070, 16, 1); this.fx.ring(this.P.pos.clone().setY(this.P.pos.y + 0.2), 0xffe070, 2); }
          this.hud();
          await this.say(`${nameOf(c)} sale al livello ${ev.level}!`, 0.9);
        } else if (ev.type === 'learn') {
          await this.g.learnMove(c, ev.move, (t) => this.say(t));
        }
      }
    }
  }

  // ------------------------------------------------------------ MOSSE
  async doMove(S, O, move) {
    const name = this.label(S), mon = S.mon;
    if (mon.status === 'sleep') {
      mon.statusTurns--;
      if (mon.statusTurns <= 0) { mon.status = null; this.hud(); await this.say(`${name} si è svegliato!`, 0.7); }
      else { this.fx.floatText(this.mid(S), 'Zzz', '#d0d0ff', 26); await this.say(`${name} sta dormendo profondamente...`); return; }
    }
    if (mon.status === 'freeze') {
      if (Math.random() < 0.3) { mon.status = null; this.hud(); await this.say(`${name} si è scongelato!`, 0.7); }
      else { this.fx.sparkle(S.pos, 0xbff8ff, 10, 0.8); await this.say(`${name} è congelato e non può muoversi!`); return; }
    }
    if (mon.status === 'paralysis' && Math.random() < 0.25) {
      this.fx.burst(this.mid(S), 0xf5d01e, 10, 2, 0.08);
      await this.say(`${name} è paralizzato! Non riesce a muoversi!`); return;
    }
    await this.say(`${name} usa ${move.name}!`, 0.55);
    const color = hex(TYPES[move.type].color);
    const selfMove = move.kind === 'heal' || move.kind === 'buff';
    if (!selfMove && Math.random() * 100 > move.acc) {
      await this.hop(S);
      this.audio.sfx('miss');
      this.fx.floatText(this.mid(O), 'Mancato!', '#ffffff', 22);
      await this.say(`Ma ${this.label(O)} lo evita!`, 0.8);
      return;
    }
    if (move.kind === 'dmg') {
      await this.attackAnim(S, O, move, color);
      const { dmg, eff, crit } = this.calcDamage(S, O, move);
      O.mon.hp = Math.max(0, O.mon.hp - dmg);
      this.hitAnim(O, eff, color, dmg, crit);
      this.hud();
      await this.fx.wait(0.35);
      if (crit) await this.say('Colpo critico!', 0.6);
      if (eff > 1) await this.say('Ha colpito il punto debole!', 0.7);
      else if (eff < 1) await this.say('Il colpo viene in parte assorbito...', 0.7);
      if (move.drain && mon.hp > 0) {
        const h = Math.max(1, Math.floor(dmg * move.drain));
        mon.hp = Math.min(maxHp(mon), mon.hp + h);
        this.fx.floatText(this.mid(S), `+${h}`, '#7aff8a', 22); this.hud();
        await this.say(`${name} assorbe energia!`, 0.6);
      }
      if (O.mon.hp > 0 && move.status && Math.random() < move.chance) await this.applyStatus(O, move.status, true);
      if (O.mon.hp > 0 && move.foeStat && Math.random() < move.chance) await this.changeStage(O, move.foeStat, move.foeStages);
    } else if (move.kind === 'heal') {
      const mx = maxHp(mon);
      if (mon.hp >= mx) { await this.say('Ma i PS sono già al massimo!', 0.7); return; }
      const h = Math.max(1, Math.round(mx * move.pct));
      mon.hp = Math.min(mx, mon.hp + h);
      this.audio.sfx('heal');
      this.fx.sparkle(S.pos, 0x7aff8a, 18, 1);
      this.fx.floatText(this.mid(S), `+${h}`, '#7aff8a', 26);
      this.hud();
      await this.say(`${name} recupera salute!`, 0.7);
    } else if (move.kind === 'buff') {
      await this.glow(S, color);
      await this.changeStage(S, move.stat, move.stages);
    } else if (move.kind === 'debuff') {
      await this.fx.projectile(this.mid(S), this.mid(O), color, 0.35, 0.2);
      await this.changeStage(O, move.stat, move.stages);
    } else if (move.kind === 'status') {
      await this.fx.projectile(this.mid(S), this.mid(O), color, 0.4, 0.22);
      await this.applyStatus(O, move.status, false);
    }
  }

  calcDamage(S, O, move) {
    const A = this.stat(S, 'atk') * (S.mon.status === 'burn' ? 0.6 : 1);
    const D = this.stat(O, 'def');
    const L = S.mon.level;
    const base = (((2 * L) / 5 + 2) * move.power * A) / D / 50 + 2;
    const stab = this.types(S).includes(move.type) ? 1.5 : 1;
    const eff = effectiveness(move.type, this.types(O));
    const crit = Math.random() < 0.0625;
    const rnd = 0.85 + Math.random() * 0.15;
    return { dmg: Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * rnd)), eff, crit };
  }

  async changeStage(T, stat, n) {
    const before = T.stages[stat];
    T.stages[stat] = Math.max(-4, Math.min(4, before + n));
    const nm = this.label(T);
    if (T.stages[stat] === before) { await this.say(`${STAT_NAME[stat]} di ${nm} non può ${n > 0 ? 'salire' : 'scendere'} ancora!`, 0.8); return; }
    this.audio.sfx(n > 0 ? 'buff' : 'debuff');
    this.fx.floatText(this.mid(T), `${n > 0 ? '▲' : '▼'} ${stat.toUpperCase()}`, n > 0 ? '#ffe070' : '#8ab8ff', 22);
    const big = Math.abs(n) >= 2 ? ' molto' : '';
    const cap = STAT_NAME[stat].charAt(0).toUpperCase() + STAT_NAME[stat].slice(1);
    await this.say(`${cap} di ${nm} ${n > 0 ? 'aumenta' : 'diminuisce'}${big}!`, 0.8);
  }

  async applyStatus(T, st, secondary) {
    const types = this.types(T);
    const immune = (st === 'burn' && types.includes('fire')) || (st === 'freeze' && types.includes('ice')) || (st === 'paralysis' && types.includes('electric'));
    if (T.mon.status || immune) { if (!secondary) await this.say('Ma non ha effetto!', 0.7); return; }
    T.mon.status = st;
    T.mon.statusTurns = st === 'sleep' ? 2 + Math.floor(Math.random() * 3) : 0;
    this.fx.burst(this.mid(T), hex(STATUS[st].color), 14, 2.5, 0.1);
    this.hud();
    await this.say(`${this.label(T)} è ${STATUS[st].full}!`, 0.8);
  }

  // ------------------------------------------------------- ANIMAZIONI
  async hop(S) {
    const m = S.model, y0 = S.pos.y;
    await this.fx.tween(0.3, (t) => { m.position.y = y0 + Math.sin(t * Math.PI) * 0.5; });
  }
  async glow(S, color) {
    const m = S.model;
    this.fx.ring(S.pos.clone().setY(S.pos.y + 0.2), color, 2.2, 0.6);
    this.fx.sparkle(S.pos, color, 14, 0.9);
    await this.fx.tween(0.5, (t) => setFlash(m, Math.sin(t * Math.PI) * 0.7, color));
    setFlash(m, 0);
  }
  async attackAnim(S, O, move, color) {
    const m = S.model;
    const from = S.pos.clone(), to = O.pos.clone();
    const melee = MELEE.has(move.type) || /fang|bite|claw|wing|frenzy|slam/.test(move.id);
    if (melee) {
      const hitPoint = from.clone().lerp(to, 0.72);
      await this.fx.tween(0.22, (t) => { m.position.lerpVectors(from, hitPoint, t); m.position.y = from.y + Math.sin(t * Math.PI) * 0.6; }, ease.in);
      this.fx.burst(this.mid(O), color, 18, 5, 0.14);
      this.fx.tween(0.3, (t) => { m.position.lerpVectors(hitPoint, from, t); }, ease.out);
    } else {
      await this.fx.tween(0.15, (t) => { m.position.y = from.y + Math.sin(t * Math.PI) * 0.35; });
      const big = move.power >= 90;
      if (big) this.fx.ring(this.mid(S), color, 1.6, 0.4);
      await this.fx.projectile(this.mid(S), this.mid(O), color, big ? 0.45 : 0.32, big ? 0.42 : 0.24, move.type === 'electric' ? 0.2 : 0.8);
      this.fx.burst(this.mid(O), color, big ? 30 : 18, big ? 7 : 5, big ? 0.2 : 0.13);
      if (big) this.fx.ring(O.pos.clone().setY(O.pos.y + 0.3), color, 3.5, 0.5);
    }
  }
  hitAnim(O, eff, color, dmg, crit) {
    const m = O.model, base = O.pos.clone();
    this.audio.sfx(eff > 1 || crit ? 'superhit' : eff < 1 ? 'weakhit' : 'hit');
    this.fx.floatText(this.mid(O).add(new THREE.Vector3(0, 0.4, 0)), `-${dmg}`, eff > 1 ? '#ffd040' : eff < 1 ? '#c0c0c0' : '#ff5a5a', eff > 1 || crit ? 36 : 28);
    this.fx.tween(0.4, (t) => {
      setFlash(m, (1 - t) * 0.9, 0xffffff);
      m.position.x = base.x + Math.sin(t * 40) * 0.12 * (1 - t);
      m.position.z = base.z + Math.cos(t * 37) * 0.08 * (1 - t);
    }, ease.linear).then(() => { setFlash(m, 0); m.position.copy(base); });
    if (eff > 1 || crit) this.g.shake(0.25);
  }
  async faintAnim(S) {
    const m = S.model; if (!m) return;
    this.audio.sfx('faint');
    const y0 = m.position.y, s0 = S.baseScale;
    await this.fx.tween(0.7, (t) => {
      m.rotation.z = t * 1.4; m.position.y = y0 - t * 0.5; m.scale.setScalar(s0 * (1 - t * 0.9));
    }, ease.in);
    this.fx.burst(S.pos.clone().setY(S.pos.y + 0.3), 0xdddddd, 12, 2, 0.15);
    m.visible = false;
  }

  // ----------------------------------------------------------- OGGETTI
  async useItem(act) {
    const it = ITEMS[act.item];
    const data = this.g.data;
    if (!data.items[act.item]) return;
    data.items[act.item]--;
    if (it.orb) return this.throwOrb(act.item, it);
    const c = this.party[act.target];
    if (it.heal) {
      const mx = maxHp(c), h = Math.max(1, Math.round(mx * it.heal));
      c.hp = Math.min(mx, c.hp + h);
      this.audio.sfx('heal');
      if (c === this.P.mon) { this.fx.sparkle(this.P.pos, 0x7aff8a, 18, 1); this.fx.floatText(this.mid(this.P), `+${h}`, '#7aff8a', 26); }
      this.hud();
      await this.say(`Usi ${it.name} su ${nameOf(c)}. Recupera ${h} PS!`);
    } else if (it.cure) {
      c.status = null; c.statusTurns = 0;
      this.audio.sfx('heal'); this.hud();
      await this.say(`${nameOf(c)} è guarito da ogni problema di stato!`);
    } else if (it.revive) {
      c.hp = Math.max(1, Math.round(maxHp(c) * it.revive)); c.status = null;
      this.audio.sfx('heal'); this.hud();
      await this.say(`${nameOf(c)} è tornato in forze!`);
    }
  }

  async throwOrb(id, it) {
    const E = this.E, mon = E.mon;
    await this.say(`Lanci un ${it.name}!`, 0.5);
    const orb = buildOrb(id === 'orb' ? 0x5ae0ff : id === 'superorb' ? 0xb07aff : 0xffc640);
    this.g.scene.add(orb); this.objects.push(orb);
    const from = this.g.player.pos.clone().setY(this.g.player.pos.y + 1.6);
    const to = this.mid(E);
    this.audio.sfx('throw');
    await this.fx.tween(0.6, (t) => {
      orb.position.lerpVectors(from, to, t); orb.position.y += Math.sin(t * Math.PI) * 2.5;
      orb.rotation.x = t * 12;
    }, ease.linear);
    // assorbimento
    this.fx.sparkle(to, 0xffffff, 16, 0.8);
    const m = E.model;
    await this.fx.tween(0.35, (t) => { m.scale.setScalar(E.baseScale * (1 - t)); setFlash(m, t, 0xff6060); });
    m.visible = false; setFlash(m, 0);
    const ground = E.pos.y + 0.22;
    await this.fx.tween(0.35, (t) => { orb.position.y = to.y + (ground - to.y) * t; orb.rotation.x = 0; }, ease.in);
    // probabilità
    const sp = SPECIES[mon.sid];
    const hpF = 1 - (2 / 3) * (mon.hp / maxHp(mon));
    const stB = mon.status === 'sleep' || mon.status === 'freeze' ? 2 : mon.status ? 1.5 : 1;
    const lvF = Math.max(0.55, 1 - Math.max(0, mon.level - 15) * 0.012);
    const p = Math.min(1, RARITY_CATCH[sp.rarity] * hpF * it.orb * stB * lvF);
    const shakeP = Math.pow(p, 1 / 3);
    let shakes = 0;
    for (let i = 0; i < 3; i++) {
      await this.fx.wait(0.35);
      if (Math.random() > shakeP) break;
      shakes++;
      this.audio.sfx('shake');
      await this.fx.tween(0.4, (t) => { orb.rotation.z = Math.sin(t * Math.PI * 2) * 0.5; });
    }
    if (shakes === 3) {
      await this.fx.wait(0.3);
      this.audio.sfx('caught');
      this.fx.sparkle(orb.position, 0xffe070, 24, 0.8);
      this.fx.burst(orb.position, 0xffe070, 20, 4, 0.1);
      orb.userData.btn.material.emissive.setHex(0xffe070);
      await this.say(`${sp.name} è stato imprigionato nel cristallo! Catturato!`, 1.3);
      const where = this.g.addCreature(mon);
      if (where === 'box') await this.say(`La squadra è piena: ${sp.name} è stato mandato al Box.`, 1);
      this.outcome = 'caught';
      this.over = true;
      if (this.wildRef && this.wildRef.legendary) this.g.data.legendCaught[sp.id] = true;
      return;
    }
    this.audio.sfx('escape');
    this.fx.burst(orb.position, 0xffffff, 16, 4, 0.12);
    this.g.scene.remove(orb);
    m.visible = true;
    await this.fx.tween(0.3, (t) => m.scale.setScalar(E.baseScale * t), ease.back);
    const msgs = ['Oh no! Si è liberato!', 'Accidenti! Ci eri quasi!', 'Argh! Mancava poco!', 'Noooo! Era quasi preso!'];
    await this.say(msgs[shakes], 0.9);
  }

  async tryRun() {
    if (!this.wild) { await this.say('Non puoi fuggire da una lotta tra allenatori!'); return false; }
    this.runTries++;
    const ch = 0.45 + 0.35 * (this.speed(this.P) / Math.max(1, this.speed(this.E))) + this.runTries * 0.12;
    if (Math.random() < ch) {
      this.audio.sfx('escape');
      await this.say('Sei fuggito senza problemi!', 0.8);
      this.outcome = 'run'; this.over = true;
      return true;
    }
    await this.say('Non riesci a fuggire!', 0.8);
    return false;
  }

  // ------------------------------------------------------------ IA
  aiChoose() {
    const E = this.E, P = this.P;
    let best = null, bs = -1;
    const smart = !!this.trainer;
    for (const id of E.mon.moves) {
      const m = MOVES[id];
      let s = 0;
      if (m.kind === 'dmg') {
        const stab = this.types(E).includes(m.type) ? 1.5 : 1;
        s = m.power * effectiveness(m.type, this.types(P)) * stab * (m.acc / 100);
      } else if (m.kind === 'heal') s = E.mon.hp / maxHp(E.mon) < 0.4 ? 130 : 2;
      else if (m.kind === 'status') s = P.mon.status ? 0 : 50;
      else if (m.kind === 'buff') s = E.stages[m.stat] < 2 ? 42 : 0;
      else if (m.kind === 'debuff') s = P.stages[m.stat] > -2 ? 38 : 0;
      s *= smart ? 0.85 + Math.random() * 0.3 : 0.3 + Math.random() * 1.4;
      if (s > bs) { bs = s; best = m; }
    }
    return { type: 'move', move: best ? best.id : 'tackle' };
  }

  // ------------------------------------------------------------ FINE
  async finish(outcome) {
    this.outcome = outcome; this.over = true;
    const d = this.g.data;
    if (outcome === 'win') {
      this.audio.sfx('win');
      if (this.trainer) {
        const t = this.trainer;
        const mult = t.pit ? 1 + (d.pitWins || 0) * 0.5 : 1;
        const gold = Math.round(t.gold * mult);
        d.gold += gold;
        await this.say(`Hai sconfitto ${t.name}!`, 1);
        await this.say(`Ricevi ${gold} monete come premio!`, 1);
      } else {
        const gold = 8 + this.E.mon.level * 4;
        d.gold += gold;
        await this.say(`Hai vinto! Trovi ${gold} monete per terra.`, 0.9);
      }
    } else if (outcome === 'lose') {
      this.audio.sfx('lose');
      await this.say('Non hai più creature in grado di lottare...', 1.1);
      await this.say('Svieni e ti risvegli al villaggio...', 1.1);
    }
  }

  async cleanup() {
    this.ui.battleShow(false);
    for (const S of [this.P, this.E]) if (S.model) { this.g.scene.remove(S.model); disposeModel(S.model); S.model = null; }
    for (const o of this.objects) this.g.scene.remove(o);
    this.g.camRig.clearBattle();
    this.g.companion.setVisible(true);
  }

  update(dt, t) {
    this.t += dt;
    for (const S of [this.P, this.E]) if (S.model && S.model.visible) animateModel(S.model, t, dt, false);
    if (this.ring) this.ring.rotation.z = t * 0.3;
  }
}
