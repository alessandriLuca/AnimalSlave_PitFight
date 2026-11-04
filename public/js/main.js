// ANIMALSLAVE: PIT FIGHT — gioco principale
import * as THREE from './vendor/three.module.min.js';
import { SPECIES, DEX, TAMERS, ZONES, MOVES, pol } from './data.js';
import { createCreature, healFull, canEvolve, evolve, nameOf, maxHp } from './creature.js';
import { World, renderMapCanvas, VILLAGE_R, ARENA } from './world.js';
import { buildHuman, animateModel, makeLabel, Portraits } from './models.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { Input, Player, CameraRig, Companion } from './player.js';
import { WildManager } from './wild.js';
import { Battle } from './battle.js';
import { UI } from './ui.js';

const SAVE_KEY = 'animalslave_pitfight_v1';
const SPAWN = { x: 0, z: 24 };

class Game {
  constructor() {
    const app = document.getElementById('app');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    app.prepend(this.renderer.domElement);
    this.renderer.domElement.id = 'gl';

    this.scene = new THREE.Scene();
    this.fogColor = new THREE.Color(ZONES.meadow.fog);
    this.scene.fog = new THREE.Fog(this.fogColor, 90, 340);
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1200);
    this.camera.fov = this.camera.aspect < 0.8 ? 72 : 58;
    this.camera.updateProjectionMatrix();
    this.setupLights();
    this.setupSky();

    this.world = new World(this.scene);
    this.mapCanvas = renderMapCanvas(320);
    this.fx = new FX(this.scene, this.camera, document.getElementById('floatLayer'));
    this.audio = new Audio();
    this.input = new Input(this.renderer.domElement);
    this.portraits = new Portraits();
    this.data = this.newData();
    this.ui = new UI(this);
    this.player = new Player(this.scene, this.world);
    this.player.teleport(SPAWN.x, SPAWN.z);
    this.camRig = new CameraRig(this.camera, this.world);
    this.companion = new Companion(this.scene, this.world);
    this.wild = new WildManager(this);
    this.npcs = [];
    this.state = 'title';
    this.blockInput = 0;
    this.shakeT = 0;
    this.t = 0;
    this.hudT = 0; this.saveT = 0;
    this.clock = new THREE.Clock();
    addEventListener('resize', () => this.resize());
    addEventListener('beforeunload', () => { if (this.data.started) this.save(); });
    const unlock = () => this.audio.init();
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock); addEventListener('touchstart', unlock);
    this.loop();
    this.boot();
  }

  newData() {
    return {
      v: 1, gold: 500, items: { orb: 5, potion: 3 }, party: [], box: [], seen: {}, caught: {}, defeated: {},
      seals: [], shrines: {}, legendCaught: {}, pos: { ...SPAWN }, started: false, pitWins: 0, playTime: 0,
      muted: false, musicOff: false,
    };
  }
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return Object.assign(this.newData(), d);
    } catch (e) { return null; }
  }
  save() {
    if (!this.data.started) return;
    this.data.pos = { x: this.player.pos.x, z: this.player.pos.z };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage pieno o bloccato */ }
  }
  resetSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } this.data.started = false; }

  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xd8ecff, 0x6a5a40, 1.25);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 220;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    this.scene.add(sun); this.scene.add(sun.target);
    this.sun = sun;
  }
  setupSky() {
    const geo = new THREE.SphereGeometry(900, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x3a7ad8) }, bottom: { value: new THREE.Color(0xcfe8ff) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.1,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.7)),1.0); }',
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    this.clouds = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.5, fog: false });
    const cg = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(cg, cm);
        m.scale.set(10 + Math.random() * 10, 4 + Math.random() * 3, 8 + Math.random() * 6);
        m.position.set(k * 9 - 13, Math.random() * 3, Math.random() * 6);
        c.add(m);
      }
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 320;
      c.position.set(Math.sin(a) * r, 110 + Math.random() * 40, Math.cos(a) * r);
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = this.camera.aspect < 0.8 ? 72 : 58;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  shake(t) { this.shakeT = Math.max(this.shakeT, t); }

  // ------------------------------------------------------------ AVVIO
  async boot() {
    this.buildNpcs();
    const saved = this.load();
    document.getElementById('loading').classList.add('hidden');
    this.ui.showHud(false);
    const choice = await this.ui.title(!!(saved && saved.started));
    this.audio.init();
    if (choice === 'continue') {
      this.data = saved;
      this.audio.setMuted(!!this.data.muted);
      this.audio.musicOn = !this.data.musicOff;
      this.player.teleport(this.data.pos.x, this.data.pos.z);
      this.refreshNpcMarkers();
    } else {
      this.resetSave();
      this.data = this.newData();
      this.player.teleport(SPAWN.x, SPAWN.z);
      this.refreshNpcMarkers();
    }
    this.camRig.inited = false;
    this.camRig.yaw = 0;
    this.state = 'event';
    this.ui.showHud(true);
    this.audio.music('world');
    if (!this.data.started) await this.intro();
    this.onPartyChanged(true);
    this.wild.spawnLegendaries();
    this.state = 'world';
  }

  async intro() {
    const elder = 'Nonna Ortensia';
    await this.ui.dialog(elder, [
      'Oh! Finalmente sei arrivato, tesoro.',
      'Benvenuto a <b>Borgo Fossa</b>, il villaggio dove crescono i domatori più forti del mondo.',
      'Al centro del villaggio c\'è <b>la Fossa</b>: l\'arena del <b>Gran Maestro Krator</b>. Nessuno l\'ha mai battuto...',
      'Per sfidarlo servono i <b>6 Sigilli</b> dei Capi Zona, sparsi nelle terre selvagge intorno al villaggio.',
      'Ma non puoi andare da solo! Scegli un compagno tra questi tre cuccioli.',
    ]);
    const sid = await this.ui.pickStarter();
    const c = createCreature(sid, 6);
    this.data.party.push(c);
    this.markCaught(sid);
    this.data.started = true;
    this.onPartyChanged(true);
    await this.ui.dialog(elder, [
      `<b>${SPECIES[sid].name}</b>! Ottima scelta. Guarda come ti segue già!`,
      'Tieni anche questi: <b>5 Cristalli</b> e <b>3 Tonici</b>. Indebolisci le creature selvatiche e lancia un Cristallo dallo <b>Zaino</b> per imprigionarle.',
      'Le creature col <b style="color:#9fffa0">nome verde</b> non le hai ancora catturate. Avvicinati e premi <b>E</b> per sfidarle.',
      'Il <b>Centro Cura</b> (tetto rosa) cura gratis la squadra, la <b>Bottega</b> (tetto blu) vende Cristalli e Tonici.',
      'Inizia dai <b>Prati</b> qui intorno, poi il <b>Bosco Sussurrante</b> a nord-ovest. Premi <b>Tab</b> per il menu e <b>M</b> per la mappa. Buona fortuna!',
    ]);
    this.save();
  }

  // ------------------------------------------------------------- NPC
  addNpc(kind, data, x, z, look, name) {
    const model = buildHuman(look);
    const y = this.world.groundY(x, z);
    model.position.set(x, y, z);
    model.rotation.y = Math.atan2(-x, -z);
    this.scene.add(model);
    const label = makeLabel(name, { color: data && (data.leader || data.pit) ? '#ffd040' : '#ffffff', size: 30, scale: 0.012 });
    label.position.y = 2.35;
    model.add(label);
    const n = { kind, data, x, z, model, label, name, home: { x, y, z, rot: model.rotation.y } };
    this.npcs.push(n);
    return n;
  }
  buildNpcs() {
    this.addNpc('elder', null, 5, 19, { shirt: 0x9a5ab0, pants: 0x5a3a6a, hair: 0xe8e8e8 }, 'Nonna Ortensia');
    this.addNpc('healer', null, -17.5, 18.5, { shirt: 0xff8ab8, pants: 0xffffff, hair: 0xd04a6a, hat: 0xffffff }, 'Infermiera Gioia');
    this.addNpc('shop', null, 17.5, 18.5, { shirt: 0x3a7ad8, pants: 0x3a3a3a, hair: 0x2a1a0a, hat: 0x3a7ad8 }, 'Bruno il Bottegaio');
    for (const t of TAMERS) {
      const p = t.pos || pol(t.at[0], t.at[1]);
      const n = this.addNpc('tamer', t, p.x, p.z, t.look, (t.leader ? '★ ' : '') + t.name);
      if (t.pit) n.model.rotation.y = 0;
    }
  }
  refreshNpcMarkers() {
    for (const n of this.npcs) {
      if (n.kind !== 'tamer') continue;
      const done = this.data.defeated[n.data.id];
      if (!done && !n.marker) {
        n.marker = makeLabel(n.data.leader || n.data.pit ? '!!' : '!', { color: '#fff', bg: n.data.leader || n.data.pit ? 'rgba(220,150,20,0.95)' : 'rgba(210,40,40,0.95)', size: 44, scale: 0.014 });
        n.marker.position.y = 2.95;
        n.model.add(n.marker);
      } else if (done && n.marker) { n.model.remove(n.marker); n.marker = null; }
    }
  }

  // --------------------------------------------------------- SQUADRA
  markSeen(sid) { this.data.seen[sid] = true; }
  markCaught(sid) {
    const first = !this.data.caught[sid];
    this.data.seen[sid] = true; this.data.caught[sid] = true;
    if (first && this.data.started) this.ui.toast(`📖 Nuova voce nel Bestiario: ${SPECIES[sid].name}!`, '#9fffa0');
    for (const w of this.wild.list) if (w.sid === sid) this.wild.refreshLabel(w);
  }
  addCreature(c) {
    this.markCaught(c.sid);
    if (this.data.party.length < 6) { this.data.party.push(c); return 'party'; }
    this.data.box.push(c); return 'box';
  }
  onPartyChanged(snap = false) {
    const lead = this.data.party[0];
    this.companion.setSpecies(lead ? lead.sid : null, this.player.pos);
    if (snap && lead) this.companion.pos.set(this.player.pos.x + 1.5, this.player.pos.y, this.player.pos.z + 1.5);
    this.ui._party = null;
    this.save();
  }
  healAll() { for (const c of [...this.data.party]) healFull(c); this.ui._party = null; }

  async learnMove(c, moveId, say) {
    const mv = MOVES[moveId];
    if (c.moves.includes(moveId)) return;
    if (c.moves.length < 4) { c.moves.push(moveId); this.audio.sfx('buff'); await say(`${nameOf(c)} ha imparato ${mv.name}!`); return; }
    await say(`${nameOf(c)} vuole imparare ${mv.name}, ma conosce già 4 mosse.`);
    const idx = await this.ui.chooseForget(c, moveId);
    if (idx >= 0) {
      const old = MOVES[c.moves[idx]].name;
      c.moves[idx] = moveId;
      this.audio.sfx('buff');
      await say(`${nameOf(c)} ha dimenticato ${old} e al suo posto ha imparato ${mv.name}!`);
    } else await say(`${nameOf(c)} non ha imparato ${mv.name}.`);
  }

  // ---------------------------------------------------------- INTERAZIONI
  findInteract() {
    const p = this.player.pos;
    let best = null, bd = Infinity;
    const consider = (o, d) => { if (d < bd) { bd = d; best = o; } };
    for (const n of this.npcs) {
      const d = Math.hypot(n.model.position.x - p.x, n.model.position.z - p.z);
      if (d < (n.data && n.data.pit ? 4.5 : 3.4)) consider({ kind: 'npc', n }, d);
    }
    for (const s of this.world.shrines) {
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < 10 && !this.data.shrines[s.id]) {
        this.data.shrines[s.id] = true;
        this.ui.toast(`✨ Santuario scoperto: ${ZONES[s.zone].name}`, '#3affd0');
        this.audio.sfx('heal');
      }
      if (d < 4.5) consider({ kind: 'shrine', s }, d);
    }
    const w = this.wild.nearest(p, 3);
    if (w) consider({ kind: 'wild', w }, Math.hypot(w.pos.x - p.x, w.pos.z - p.z) - 1);
    return best;
  }
  promptFor(it) {
    if (!it) return null;
    if (it.kind === 'wild') {
      const s = SPECIES[it.w.sid];
      return `<b>E</b> Combatti: ${it.w.legendary ? '★ ' : ''}${s.name} Lv.${it.w.level}${this.data.caught[s.id] ? '' : ' <span class="newMark">✦ nuovo</span>'}`;
    }
    if (it.kind === 'shrine') return '<b>E</b> Santuario di cura';
    const n = it.n;
    if (n.kind === 'tamer' && !this.data.defeated[n.data.id]) return `<b>E</b> Sfida ${n.data.name}`;
    return `<b>E</b> Parla con ${n.name}`;
  }
  async interact(it) {
    this.state = 'event';
    try {
      if (it.kind === 'wild') await this.startWild(it.w);
      else if (it.kind === 'shrine') await this.useShrine(it.s);
      else await this.talk(it.n);
    } catch (e) { console.error(e); }
    if (this.state === 'event') this.state = 'world';
  }
  hasAlive() { return this.data.party.some((c) => c.hp > 0); }

  async talk(n) {
    const d = this.data;
    if (n.kind === 'healer') {
      const k = await this.ui.dialog(n.name, 'Benvenuto al Centro Cura! Vuoi che rimetta in sesto le tue creature?', ['Sì, grazie!', 'No']);
      if (k === 0) {
        this.healAll(); this.audio.sfx('heal');
        this.fx.sparkle(this.player.pos, 0xff9ad0, 24, 1.5);
        await this.ui.dialog(n.name, 'Ecco fatto! Le tue creature sono in piena forma. Torna quando vuoi!');
        this.save();
      }
    } else if (n.kind === 'shop') {
      await this.ui.dialog(n.name, 'Benvenuto! Cristalli, tonici... ho tutto quello che serve a un domatore!');
      await this.ui.openShop();
    } else if (n.kind === 'elder') {
      const caught = Object.keys(d.caught).length;
      const next = TAMERS.filter((t) => t.leader && !d.defeated[t.id]).sort((a, b) => a.team[0][1] - b.team[0][1])[0];
      const lines = [`Hai <b>${d.seals.length}/6</b> Sigilli e hai catturato <b>${caught}/${DEX.length}</b> creature.`];
      if (next) lines.push(`Ti consiglio di sfidare <b>${next.name}</b> nella zona <b>${ZONES[next.zone].name}</b>. Le sue creature sono intorno al livello ${next.team[next.team.length - 1][1]}.`);
      else if (!d.defeated.pitmaster) lines.push('Hai tutti i Sigilli! Entra nella <b>Fossa</b> e sfida il Gran Maestro Krator!');
      else lines.push('Sei il nuovo Campione della Fossa! Ora completa il Bestiario: si dice che 5 creature <b>leggendarie</b> si nascondano agli estremi del mondo...');
      lines.push('Ricorda: i tipi contano! Il Fuoco brucia l\'Erba, l\'Acqua spegne il Fuoco, l\'Erba assorbe l\'Acqua... prova e scopri le altre combinazioni.');
      await this.ui.dialog(n.name, lines);
    } else if (n.kind === 'tamer') {
      const t = n.data;
      if (d.defeated[t.id] && !t.pit) {
        await this.ui.dialog(t.name, t.leader ? `Il ${t.seal} è tuo. Continua così, e un giorno batterai anche Krator!` : 'Mi hai battuto in modo netto. Devo allenarmi di più!');
        return;
      }
      if (!this.hasAlive()) { await this.ui.dialog(t.name, 'Le tue creature sono tutte KO! Vai a curarle prima di sfidarmi.'); return; }
      if (t.pit && d.seals.length < 6) {
        await this.ui.dialog(t.name, [`Hah! Un novellino. Torna quando avrai tutti e <b>6 i Sigilli</b> dei Capi Zona. Ne hai solo ${d.seals.length}.`]);
        return;
      }
      if (t.pit && d.defeated.pitmaster) {
        const k = await this.ui.dialog(t.name, `Campione... vuoi la rivincita? Questa volta le mie creature saranno più forti (rivincita n.${d.pitWins}).`, ['Combattiamo!', 'Non ora']);
        if (k !== 0) return;
      } else {
        const k = await this.ui.dialog(t.name, [t.line], ['Accetto la sfida!', 'Non ora']);
        if (k !== 0) return;
      }
      await this.startTrainer(n);
    }
  }

  async useShrine(s) {
    this.healAll(); this.audio.sfx('heal');
    this.fx.sparkle(this.player.pos, 0x3affd0, 24, 1.5);
    const list = this.world.shrines.filter((x) => this.data.shrines[x.id] && x.id !== s.id);
    const choices = ['Villaggio', ...list.map((x) => ZONES[x.zone].name), 'Resta qui'];
    const k = await this.ui.dialog('Santuario', ['Un\'energia antica avvolge la tua squadra. <b>Le tue creature sono state curate!</b>', 'Il cristallo può portarti in un altro santuario che hai scoperto.'], choices);
    if (k === choices.length - 1) { this.save(); return; }
    const dest = k === 0 ? { x: SPAWN.x, z: SPAWN.z } : { x: list[k - 1].x + 4, z: list[k - 1].z + 4 };
    this.audio.sfx('evolve');
    document.getElementById('fade').classList.add('on');
    await this.fx.wait(0.5);
    this.player.teleport(dest.x, dest.z);
    this.companion.pos.set(dest.x + 1.5, this.player.pos.y, dest.z + 1.5);
    this.wild.clearAll(); this.wild.spawnLegendaries();
    this.camRig.inited = false;
    await this.fx.wait(0.3);
    document.getElementById('fade').classList.remove('on');
    this.save();
  }

  async startWild(w) {
    if (!this.hasAlive()) { this.ui.toast('Le tue creature sono KO! Curale al Centro Cura o a un Santuario.', '#ff6060'); return; }
    this.state = 'battle';
    w.frozen = true; w.model.visible = false;
    const enemy = createCreature(w.sid, w.level);
    const p = this.player.pos;
    const dir = new THREE.Vector3(w.pos.x - p.x, 0, w.pos.z - p.z);
    if (dir.length() < 0.5) dir.set(Math.sin(this.player.facing), 0, Math.cos(this.player.facing));
    dir.normalize();
    const center = this.safeCenter(p.clone().addScaledVector(dir, 3.5), dir);
    this.ui.setPrompt(null);
    this.battle = new Battle(this, { wild: true, enemies: [enemy], center, dir, wildRef: w });
    const out = await this.battle.run();
    this.battle = null;
    if (out === 'win' || out === 'caught') this.wild.remove(w);
    else { w.frozen = false; w.model.visible = true; w.cooldown = 5; }
    await this.afterBattle(out, null);
  }
  safeCenter(c, dir) {
    // evita di centrare la lotta in acqua profonda
    for (let i = 0; i < 6; i++) {
      if (this.world.height(c.x, c.z) > -0.5) return c;
      c.addScaledVector(dir, -1.5);
    }
    return c;
  }

  async startTrainer(n) {
    const t = n.data, d = this.data;
    this.state = 'battle';
    const bonus = t.pit ? (d.pitWins || 0) * 4 : 0;
    const enemies = t.team.map(([sid, lv]) => createCreature(sid, Math.min(60, lv + bonus)));
    const p = this.player.pos;
    const np = n.model.position;
    const dir = new THREE.Vector3(np.x - p.x, 0, np.z - p.z);
    if (dir.length() < 0.1) dir.set(0, 0, -1);
    dir.normalize();
    let center = p.clone().lerp(np, 0.5);
    if (t.pit) { center = new THREE.Vector3(ARENA.x, 0, ARENA.z); dir.set(0, 0, -1); }
    this.ui.setPrompt(null);
    this.battle = new Battle(this, { wild: false, trainer: t, trainerModel: n.model, enemies, center, dir });
    const out = await this.battle.run();
    this.battle = null;
    n.model.position.set(n.home.x, n.home.y, n.home.z); n.model.rotation.y = n.home.rot;
    if (out === 'win') {
      const first = !d.defeated[t.id];
      d.defeated[t.id] = true;
      this.refreshNpcMarkers();
      if (t.leader && first) {
        d.seals.push(t.seal);
        this.audio.sfx('caught');
        await this.ui.dialog(t.name, [`Incredibile... mi hai battuto!`, `Ti sei guadagnato il <b>${t.seal}</b>! 🏅 (${d.seals.length}/6)`, d.seals.length === 6 ? 'Hai tutti i Sigilli! Il Gran Maestro ti aspetta nella <b>Fossa</b>.' : 'Prendi anche questa: <b>3 Cristalli Rari</b>.']);
        d.items.superorb = (d.items.superorb || 0) + 3;
      } else if (t.pit) {
        d.pitWins = (d.pitWins || 0) + 1;
        d.items.iperorb = (d.items.iperorb || 0) + 3;
        await this.ui.dialog(t.name, ['Impossibile... nessuno mi aveva mai battuto!', '<b>Sei il nuovo Campione della Fossa!</b> 👑', 'Prendi questi <b>3 Cristalli Antichi</b>. Ti serviranno per le creature leggendarie che si nascondono ai confini del mondo.']);
        if (d.pitWins === 1) await this.ending();
      } else {
        await this.ui.dialog(t.name, 'Accidenti, sei forte! Ti meriti la vittoria.');
      }
    }
    await this.afterBattle(out, t);
  }

  async ending() {
    const caught = Object.keys(this.data.caught).length;
    await this.ui.dialog('★ CONGRATULAZIONI ★', [
      'Hai conquistato la <b>Fossa</b> e il titolo di Campione!',
      `Creature catturate: <b>${caught}/${DEX.length}</b>. Tempo di gioco: <b>${Math.floor(this.data.playTime / 60)} minuti</b>.`,
      'Ma l\'avventura non è finita: completa il Bestiario, trova i <b>5 Leggendari</b> e sfida di nuovo Krator per rivincite sempre più dure!',
      'Grazie per aver giocato ad <b>AnimalSlave: Pit Fight</b>!',
    ]);
  }

  async afterBattle(out) {
    const d = this.data;
    if (out === 'lose') {
      d.gold = Math.floor(d.gold * 0.85);
      this.healAll();
      document.getElementById('fade').classList.add('on');
      await this.fx.wait(0.6);
      this.player.teleport(SPAWN.x, SPAWN.z);
      this.wild.clearAll(); this.wild.spawnLegendaries();
      this.camRig.inited = false;
      await this.fx.wait(0.3);
      document.getElementById('fade').classList.remove('on');
      await this.ui.dialog('Infermiera Gioia', 'Ti abbiamo trovato svenuto e ti abbiamo riportato al villaggio. Le tue creature sono state curate. Hai perso un po\' di monete per strada...');
    }
    // evoluzioni
    for (const c of d.party) {
      while (canEvolve(c)) {
        const old = c.sid;
        await this.ui.evolution(old, SPECIES[old].evo.to);
        evolve(c);
        this.markCaught(c.sid);
      }
    }
    this.onPartyChanged();
    this.audio.music('world');
    this.state = 'world';
    this.save();
  }

  // ------------------------------------------------------------- LOOP
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.t += dt;
    const t = this.t;
    const inWorld = this.state === 'world';
    const free = inWorld && !this.ui.busy;
    if (this.data.started && this.state !== 'title') this.data.playTime += dt;

    if (this.state === 'title') {
      const a = t * 0.08;
      this.camera.position.set(Math.sin(a) * 60, 32, Math.cos(a) * 60);
      this.camera.lookAt(0, 4, 0);
    } else {
      this.player.update(dt, t, this.input, this.camRig.yaw, free, this.audio);
      if (this.state !== 'battle') this.companion.update(dt, t, this.player);
      this.camRig.update(dt, this.player.pos, this.input, this.state !== 'battle' && !this.ui.busy);
    }
    this.wild.update(dt, t, inWorld);
    const pp = this.player.pos;
    for (const n of this.npcs) {
      const dd = Math.hypot(n.model.position.x - pp.x, n.model.position.z - pp.z);
      if (dd < 80) animateModel(n.model, t, dt, false);
      if (n.marker) n.marker.position.y = 2.95 + Math.sin(t * 4) * 0.08;
      if (inWorld && dd < 7 && dd > 1.5 && n.kind !== 'tamer') n.model.rotation.y = Math.atan2(pp.x - n.model.position.x, pp.z - n.model.position.z);
    }
    if (this.battle) this.battle.update(dt, t);

    if (free) {
      const it = this.findInteract();
      this.ui.setPrompt(this.promptFor(it));
      if (performance.now() > this.blockInput) {
        if (this.input.was('KeyE') && it) this.interact(it);
        else if (this.input.was('Tab') || this.input.was('KeyI')) this.ui.openMenu();
        else if (this.input.was('KeyM')) this.ui.openMenu('map');
      }
      this.saveT += dt;
      if (this.saveT > 30) { this.saveT = 0; this.save(); }
    } else if (this.state !== 'battle') this.ui.setPrompt(null);

    // nebbia per zona
    const zone = this.world.zoneAt(pp.x, pp.z);
    this.fogColor.lerp(new THREE.Color(ZONES[zone].fog), Math.min(1, dt * 1.5));
    this.scene.fog.color.copy(this.fogColor);
    this.sky.material.uniforms.bottom.value.copy(this.fogColor);
    this.sky.position.copy(this.camera.position);
    this.clouds.position.x = Math.sin(t * 0.01) * 40;

    // sole che segue il giocatore
    const focus = this.state === 'title' ? new THREE.Vector3(0, 0, 0) : pp;
    this.sun.position.set(focus.x + 45, focus.y + 80, focus.z + 30);
    this.sun.target.position.copy(focus);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = this.shakeT * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * k; this.camera.position.y += (Math.random() - 0.5) * k;
    }
    this.world.update(t);
    this.fx.update(dt);

    if (this.state !== 'title') {
      this.hudT -= dt;
      if (this.hudT <= 0) { this.hudT = 0.2; this.ui.updateHud(); }
      if (this.state !== 'battle') this.ui.drawMinimap();
    }
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }
}

window.game = new Game();
