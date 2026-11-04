// Interfaccia DOM: HUD, dialoghi, menu, negozio, bestiario, UI battaglia
import { SPECIES, DEX, TYPES, MOVES, ITEMS, STATUS, ZONES, RARITY_NAME, TAMERS, effectiveness, learnset } from './data.js';
import { calcStats, maxHp, xpProgress, nameOf } from './creature.js';
import { levelRange } from './wild.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const typeBadge = (t) => `<span class="type" style="background:${TYPES[t].color}">${TYPES[t].name}</span>`;
const hpColor = (p) => (p > 0.5 ? '#4ade6a' : p > 0.2 ? '#f5c81e' : '#ef4444');
const statusBadge = (s) => (s ? `<span class="status" style="background:${STATUS[s].color}">${STATUS[s].name}</span>` : '');

export class UI {
  constructor(game) {
    this.g = game;
    this.modal = $('#modal');
    this.dialogEl = $('#dialog');
    this.battleEl = $('#battleUI');
    this.logEl = $('#battleLog');
    this.menuEl = $('#battleMenu');
    this.promptEl = $('#prompt');
    this.keyHandlers = [];
    this.sayResolve = null;
    this.menuTab = 'team';
    addEventListener('keydown', (e) => {
      const h = this.keyHandlers[this.keyHandlers.length - 1];
      if (h) { if (h(e) !== false) e.preventDefault(); }
    });
    this.logEl.addEventListener('click', () => this.skipSay());
    this.mini = $('#minimap');
    this.miniCtx = this.mini.getContext('2d');
    $('#btnMenu').addEventListener('click', () => this.g.input.press('Tab'));
    $('#btnAct').addEventListener('click', () => this.g.input.press('KeyE'));
    $('#btnMap').addEventListener('click', () => this.g.input.press('KeyM'));
  }
  pushKeys(fn) {
    this.keyHandlers.push(fn);
    return () => { const i = this.keyHandlers.indexOf(fn); if (i >= 0) this.keyHandlers.splice(i, 1); this.g.blockInput = performance.now() + 250; };
  }
  get busy() { return !this.modal.classList.contains('hidden') || !this.dialogEl.classList.contains('hidden'); }
  portrait(sid) { return this.g.portraits.get(SPECIES[sid]); }

  // ------------------------------------------------------------ HUD
  toast(text, color = '#fff') {
    const t = el('div', 'toast', esc(text)); t.style.borderColor = color;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }
  setPrompt(text) {
    if (text) { this.promptEl.innerHTML = text; this.promptEl.classList.remove('hidden'); }
    else this.promptEl.classList.add('hidden');
  }
  showHud(v) { $('#hud').classList.toggle('hidden', !v); }
  updateHud() {
    const g = this.g, d = g.data;
    const zone = g.world.zoneAt(g.player.pos.x, g.player.pos.z);
    const Z = ZONES[zone];
    const lr = levelRange(zone, g.player.pos.x, g.player.pos.z);
    const zt = `${Z.name} <small>Lv ${lr[0]}-${lr[1]}</small>`;
    if (this._zone !== zt) { $('#zoneName').innerHTML = zt; this._zone = zt; }
    const caught = Object.keys(d.caught).length;
    const info = `<span title="Monete">🪙 ${d.gold}</span><span title="Sigilli">🏅 ${d.seals.length}/6</span><span title="Bestiario">📖 ${caught}/${DEX.length}</span><span title="Sfere">🔴 ${(d.items.orb || 0) + (d.items.superorb || 0) + (d.items.iperorb || 0)}</span>`;
    if (this._info !== info) { $('#topInfo').innerHTML = info; this._info = info; }
    const key = d.party.map((c) => `${c.sid}${c.level}${c.hp}${c.status}`).join('|');
    if (this._party !== key) {
      this._party = key;
      const bar = $('#partyBar'); bar.innerHTML = '';
      d.party.forEach((c, i) => {
        const p = c.hp / maxHp(c);
        const b = el('div', 'pslot' + (i === 0 ? ' lead' : '') + (c.hp <= 0 ? ' ko' : ''));
        b.innerHTML = `<img src="${this.portrait(c.sid)}"><div class="plv">${c.level}</div><div class="php"><i style="width:${p * 100}%;background:${hpColor(p)}"></i></div>`;
        b.title = `${nameOf(c)} Lv.${c.level}`;
        b.onclick = () => this.openMenu('team', i);
        bar.appendChild(b);
      });
    }
  }
  drawMinimap() {
    const g = this.g, ctx = this.miniCtx, S = this.mini.width;
    const map = g.mapCanvas, R = 90;
    const px = g.player.pos.x, pz = g.player.pos.z;
    const k = map.width / 560;
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(map, (px - R + 280) * k, (pz - R + 280) * k, 2 * R * k, 2 * R * k, 0, 0, S, S);
    const toS = (x, z) => [((x - px) / (2 * R)) * S + S / 2, ((z - pz) / (2 * R)) * S + S / 2];
    for (const n of g.npcs) {
      const [x, y] = toS(n.x, n.z);
      if (x < -5 || y < -5 || x > S + 5 || y > S + 5) continue;
      ctx.fillStyle = n.kind === 'tamer' ? (g.data.defeated[n.data.id] ? '#888' : n.data.leader || n.data.pit ? '#ffd040' : '#ff5050') : n.kind === 'healer' ? '#ff7ab0' : n.kind === 'shop' ? '#3a8cff' : '#fff';
      ctx.beginPath(); ctx.arc(x, y, n.data && (n.data.leader || n.data.pit) ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (const s of g.world.shrines) {
      const [x, y] = toS(s.x, s.z);
      ctx.fillStyle = g.data.shrines[s.id] ? '#3affd0' : '#2a6a5a';
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    for (const w of g.wild.list) {
      const [x, y] = toS(w.pos.x, w.pos.z);
      ctx.fillStyle = w.legendary ? '#ffe070' : 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(x, y, w.legendary ? 3.5 : 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // giocatore
    ctx.save();
    ctx.translate(S / 2, S / 2); ctx.rotate(-g.player.facing + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', S / 2, 14);
  }

  // --------------------------------------------------------- DIALOGO
  dialog(name, lines, choices = null) {
    if (!Array.isArray(lines)) lines = [lines];
    const D = this.dialogEl;
    D.classList.remove('hidden');
    return new Promise((res) => {
      let i = 0;
      const show = () => {
        D.innerHTML = `${name ? `<div class="dname">${esc(name)}</div>` : ''}<div class="dtext">${lines[i]}</div>`;
        const last = i === lines.length - 1;
        if (last && choices) {
          const box = el('div', 'dchoices');
          choices.forEach((c, k) => {
            const b = el('button', 'btn', `<b>${k + 1}</b> ${c}`);
            b.onclick = (e) => { e.stopPropagation(); done(k); };
            box.appendChild(b);
          });
          D.appendChild(box);
        } else D.appendChild(el('div', 'dnext', '▼'));
      };
      const next = () => {
        this.g.audio.sfx('ui');
        if (i < lines.length - 1) { i++; show(); }
        else if (!choices) done(0);
      };
      const done = (k) => { pop(); D.onclick = null; D.classList.add('hidden'); this.g.audio.sfx('select'); res(k); };
      D.onclick = () => { if (!(i === lines.length - 1 && choices)) next(); };
      const pop = this.pushKeys((e) => {
        if (['Space', 'Enter', 'KeyE'].includes(e.code)) { if (!(i === lines.length - 1 && choices)) next(); }
        else if (choices && i === lines.length - 1 && /^Digit[1-9]$/.test(e.code)) { const k = +e.code.slice(5) - 1; if (k < choices.length) done(k); }
        else if (e.code === 'Escape' && choices && i === lines.length - 1) done(choices.length - 1);
        else return false;
      });
      show();
    });
  }

  // ---------------------------------------------------------- MODALE
  openModal(html, cls = '') {
    this.modal.className = 'modal ' + cls;
    this.modal.innerHTML = html;
    return this.modal;
  }
  closeModal() { this.modal.className = 'modal hidden'; this.modal.innerHTML = ''; }

  // ----------------------------------------------------- MENU PRINCIPALE
  openMenu(tab = this.menuTab, sel = 0) {
    if (this.g.state !== 'world') return;
    this.menuTab = tab;
    this.menuSel = sel;
    this.g.audio.sfx('ui');
    if (!this.menuPop) this.menuPop = this.pushKeys((e) => {
      if (['Escape', 'Tab', 'KeyI'].includes(e.code)) this.closeMenu();
      else if (e.code === 'KeyM') { this.menuTab = 'map'; this.renderMenu(); }
      else return false;
    });
    this.renderMenu();
  }
  closeMenu() { if (this.menuPop) { this.menuPop(); this.menuPop = null; } this.closeModal(); this.g.audio.sfx('ui'); }
  renderMenu() {
    const tabs = [['team', 'Squadra'], ['box', 'Box'], ['dex', 'Bestiario'], ['bag', 'Zaino'], ['map', 'Mappa'], ['sys', 'Sistema']];
    const m = this.openModal(`<div class="menu">
      <div class="tabs">${tabs.map(([k, n]) => `<button class="tab ${k === this.menuTab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}<button class="tab close">✕</button></div>
      <div class="menuBody"></div></div>`);
    m.querySelectorAll('.tab[data-t]').forEach((b) => (b.onclick = () => { this.menuTab = b.dataset.t; this.menuSel = 0; this.g.audio.sfx('ui'); this.renderMenu(); }));
    m.querySelector('.tab.close').onclick = () => this.closeMenu();
    const body = m.querySelector('.menuBody');
    ({ team: () => this.renderTeam(body), box: () => this.renderBox(body), dex: () => this.renderDex(body), bag: () => this.renderBag(body), map: () => this.renderMap(body), sys: () => this.renderSys(body) })[this.menuTab]();
  }

  monDetail(c, actions = []) {
    const sp = SPECIES[c.sid], st = calcStats(c), p = c.hp / st.hp;
    const moves = c.moves.map((id) => {
      const mv = MOVES[id];
      return `<div class="mv" style="border-color:${TYPES[mv.type].color}"><b>${mv.name}</b>${typeBadge(mv.type)}<small>${mv.power ? 'Pot ' + mv.power : mvDesc(mv)} · Prec ${mv.acc}</small></div>`;
    }).join('');
    const nextMoves = learnset(sp.types).filter(([l, m]) => l > c.level && !c.moves.includes(m)).slice(0, 2).map(([l, m]) => `Lv.${l} ${MOVES[m].name}`).join(', ');
    return `<div class="detail">
      <div class="dhead"><img class="bigp" src="${this.portrait(c.sid)}">
        <div><h2>${sp.name} <small>Lv.${c.level}</small></h2>
        <div>#${String(sp.num).padStart(3, '0')} ${sp.types.map(typeBadge).join(' ')} ${statusBadge(c.status)}</div>
        <div class="bar hp"><i style="width:${p * 100}%;background:${hpColor(p)}"></i><span>PS ${c.hp}/${st.hp}</span></div>
        <div class="bar xp"><i style="width:${xpProgress(c) * 100}%"></i><span>ESP</span></div></div></div>
      <div class="stats"><div>ATT <b>${st.atk}</b></div><div>DIF <b>${st.def}</b></div><div>VEL <b>${st.spd}</b></div></div>
      <div class="moves">${moves}</div>
      ${sp.evo ? `<div class="hint">Si evolve in <b>${SPECIES[sp.evo.to].name}</b> al Lv.${sp.evo.level}</div>` : ''}
      ${nextMoves ? `<div class="hint">Prossime mosse: ${nextMoves}</div>` : ''}
      <div class="actions">${actions.map((a, i) => `<button class="btn" data-a="${i}">${a[0]}</button>`).join('')}</div>
    </div>`;
  }
  bindActions(root, actions) {
    root.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => { this.g.audio.sfx('select'); actions[+b.dataset.a][1](); }));
  }

  renderTeam(body) {
    const d = this.g.data;
    const sel = Math.min(this.menuSel, d.party.length - 1);
    body.innerHTML = `<div class="split"><div class="list"></div><div class="right"></div></div>`;
    const list = body.querySelector('.list');
    d.party.forEach((c, i) => {
      const p = c.hp / maxHp(c);
      const r = el('div', 'row' + (i === sel ? ' on' : '') + (c.hp <= 0 ? ' ko' : ''), `<img src="${this.portrait(c.sid)}"><div class="rinfo"><b>${nameOf(c)}</b> <small>Lv.${c.level}</small> ${i === 0 ? '<span class="tag">TESTA</span>' : ''}${statusBadge(c.status)}<div class="bar hp sm"><i style="width:${p * 100}%;background:${hpColor(p)}"></i></div></div>`);
      r.onclick = () => { this.menuSel = i; this.g.audio.sfx('ui'); this.renderMenu(); };
      list.appendChild(r);
    });
    const c = d.party[sel];
    if (!c) return;
    const acts = [];
    if (sel > 0) acts.push(['⭐ Metti in testa', () => { d.party.splice(sel, 1); d.party.unshift(c); this.menuSel = 0; this.g.onPartyChanged(); this.renderMenu(); }]);
    if (sel > 0) acts.push(['▲ Su', () => { [d.party[sel - 1], d.party[sel]] = [d.party[sel], d.party[sel - 1]]; this.menuSel = sel - 1; this.g.onPartyChanged(); this.renderMenu(); }]);
    if (sel < d.party.length - 1) acts.push(['▼ Giù', () => { [d.party[sel + 1], d.party[sel]] = [d.party[sel], d.party[sel + 1]]; this.menuSel = sel + 1; this.g.onPartyChanged(); this.renderMenu(); }]);
    if (d.party.length > 1) acts.push(['📦 Al Box', () => { d.party.splice(sel, 1); d.box.push(c); this.menuSel = 0; this.g.onPartyChanged(); this.renderMenu(); }]);
    const right = body.querySelector('.right');
    right.innerHTML = this.monDetail(c, acts);
    this.bindActions(right, acts);
  }

  renderBox(body) {
    const d = this.g.data;
    body.innerHTML = `<div class="split"><div class="grid boxgrid"></div><div class="right"></div></div>`;
    const grid = body.querySelector('.grid'), right = body.querySelector('.right');
    if (!d.box.length) { right.innerHTML = '<div class="empty">Il Box è vuoto. Le creature catturate quando la squadra è piena (6) finiscono qui.</div>'; }
    const sel = Math.min(this.menuSel, d.box.length - 1);
    d.box.forEach((c, i) => {
      const cell = el('div', 'cell' + (i === sel ? ' on' : ''), `<img src="${this.portrait(c.sid)}"><small>${nameOf(c)} ${c.level}</small>`);
      cell.onclick = () => { this.menuSel = i; this.g.audio.sfx('ui'); this.renderMenu(); };
      grid.appendChild(cell);
    });
    const c = d.box[sel];
    if (!c) return;
    const acts = [];
    if (d.party.length < 6) acts.push(['➕ Porta in squadra', () => { d.box.splice(sel, 1); d.party.push(c); this.menuSel = 0; this.g.onPartyChanged(); this.renderMenu(); }]);
    else acts.push(['🔄 Scambia con l\'ultimo della squadra', () => { const out = d.party.pop(); d.box.splice(sel, 1, out); d.party.push(c); this.g.onPartyChanged(); this.renderMenu(); }]);
    acts.push(['🌿 Libera', async () => {
      const k = await this.dialog(null, `Vuoi davvero liberare ${nameOf(c)}? Non tornerà più.`, ['Sì, liberalo', 'No']);
      if (k === 0) { d.box.splice(sel, 1); this.menuSel = 0; this.g.save(); this.toast(`${nameOf(c)} è tornato in natura.`); }
      this.renderMenu();
    }]);
    right.innerHTML = this.monDetail(c, acts);
    this.bindActions(right, acts);
  }

  renderDex(body) {
    const d = this.g.data;
    const seen = Object.keys(d.seen).length, caught = Object.keys(d.caught).length;
    body.innerHTML = `<div class="dexhead">Avvistati <b>${seen}</b> · Catturati <b>${caught}</b> / ${DEX.length}</div><div class="split"><div class="grid dexgrid"></div><div class="right"></div></div>`;
    const grid = body.querySelector('.grid'), right = body.querySelector('.right');
    const sel = this.menuSel || 0;
    DEX.forEach((id, i) => {
      const sp = SPECIES[id];
      const st = d.caught[id] ? 'caught' : d.seen[id] ? 'seen' : 'unk';
      const cell = el('div', `cell ${st}` + (i === sel ? ' on' : ''), `<img data-sid="${id}"><small>#${String(sp.num).padStart(3, '0')} ${st === 'unk' ? '???' : sp.name}</small>${st === 'caught' ? '<em>●</em>' : ''}`);
      cell.onclick = () => { this.menuSel = i; this.g.audio.sfx('ui'); this.renderMenu(); };
      grid.appendChild(cell);
    });
    // ritratti generati a lotti per non bloccare
    const imgs = [...grid.querySelectorAll('img[data-sid]')];
    let k = 0;
    const step = () => {
      if (!grid.isConnected) return;
      for (let n = 0; n < 6 && k < imgs.length; n++, k++) imgs[k].src = this.portrait(imgs[k].dataset.sid);
      if (k < imgs.length) requestAnimationFrame(step);
    };
    step();
    grid.children[sel]?.scrollIntoView({ block: 'nearest' });
    const sp = SPECIES[DEX[sel]];
    const st = d.caught[sp.id] ? 'caught' : d.seen[sp.id] ? 'seen' : 'unk';
    const where = sp.zones.length ? sp.zones.map((z) => ZONES[z].name).join(', ') : sp.rarity === 'legendary' ? 'Luogo leggendario: ???' : sp.rarity === 'starter' ? 'Ricevuto dalla Nonna Ortensia' : 'Solo tramite evoluzione';
    const base = sp.base;
    right.innerHTML = `<div class="detail"><div class="dhead"><img class="bigp ${st === 'unk' ? 'sil' : ''}" src="${this.portrait(sp.id)}">
      <div><h2>#${String(sp.num).padStart(3, '0')} ${st === 'unk' ? '???' : sp.name}</h2>
      ${st !== 'unk' ? `<div>${sp.types.map(typeBadge).join(' ')} <span class="tag">${RARITY_NAME[sp.rarity]}</span></div>` : ''}
      <div class="hint">${st === 'caught' ? '● Catturato' : st === 'seen' ? '○ Avvistato' : 'Non ancora avvistato'}</div></div></div>
      ${st !== 'unk' ? `<p class="desc">${sp.desc}</p><div class="hint">📍 ${where}</div>
      <div class="statbars">${['hp', 'atk', 'def', 'spd'].map((k2) => `<div><span>${{ hp: 'PS', atk: 'ATT', def: 'DIF', spd: 'VEL' }[k2]}</span><i style="width:${(base[k2] / 135) * 100}%"></i><b>${base[k2]}</b></div>`).join('')}</div>
      ${sp.evo ? `<div class="hint">Evolve in ${d.seen[sp.evo.to] ? SPECIES[sp.evo.to].name : '???'} al Lv.${sp.evo.level}</div>` : ''}` : '<p class="desc">Esplora il mondo per incontrare questa creatura.</p>'}
    </div>`;
  }

  renderBag(body) {
    const d = this.g.data;
    const keys = Object.keys(ITEMS);
    body.innerHTML = `<div class="baglist"></div><div class="seals"><h3>Sigilli</h3>${TAMERS.filter((t) => t.leader).map((t) => `<div class="seal ${d.seals.includes(t.seal) ? 'on' : ''}">🏅 ${t.seal}<small>${t.name}</small></div>`).join('')}</div>`;
    const list = body.querySelector('.baglist');
    for (const k of keys) {
      const it = ITEMS[k], n = d.items[k] || 0;
      const r = el('div', 'item' + (n ? '' : ' none'), `<b>${it.name}</b> <span class="cnt">x${n}</span><small>${it.desc}</small>`);
      if (n && (it.heal || it.cure || it.revive)) {
        const b = el('button', 'btn sm', 'Usa');
        b.onclick = async () => {
          const filter = it.revive ? (c) => c.hp <= 0 : it.cure ? (c) => c.hp > 0 && c.status : (c) => c.hp > 0 && c.hp < maxHp(c);
          const idx = await this.chooseMember(d.party, filter, `Usa ${it.name} su...`, true);
          if (idx >= 0) {
            const c = d.party[idx];
            d.items[k]--;
            if (it.heal) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * it.heal));
            if (it.cure) { c.status = null; }
            if (it.revive) { c.hp = Math.round(maxHp(c) * it.revive); c.status = null; }
            this.g.audio.sfx('heal');
            this.toast(`${it.name} usata su ${nameOf(c)}`, '#7aff8a');
            this.g.save();
          }
          this.renderMenu();
        };
        r.appendChild(b);
      }
      list.appendChild(r);
    }
  }

  renderMap(body) {
    const g = this.g;
    body.innerHTML = `<div class="bigmap"><canvas width="520" height="520"></canvas><div class="legend">
      <span><i style="background:#fff"></i>Tu</span><span><i style="background:#ff5050"></i>Allenatore</span><span><i style="background:#ffd040"></i>Capo / Fossa</span>
      <span><i style="background:#3affd0"></i>Santuario</span><span><i style="background:#ff7ab0"></i>Centro Cura</span><span><i style="background:#888"></i>Già battuto</span></div></div>`;
    const cv = body.querySelector('canvas'), ctx = cv.getContext('2d');
    const S = cv.width;
    ctx.drawImage(g.mapCanvas, 0, 0, S, S);
    const toS = (x, z) => [((x + 280) / 560) * S, ((z + 280) / 560) * S];
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    for (const [id, Z] of Object.entries(ZONES)) {
      if (Z.angle === undefined) continue;
      const a = (Z.angle * Math.PI) / 180;
      const [x, y] = toS(Math.sin(a) * 200, -Math.cos(a) * 200);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(Z.name, x + 1, y + 1);
      ctx.fillStyle = '#fff'; ctx.fillText(Z.name, x, y);
      ctx.font = '11px sans-serif'; ctx.fillText(`Lv ${Z.lv[0]}-${Z.lv[1]}`, x, y + 14); ctx.font = 'bold 13px sans-serif';
    }
    for (const n of g.npcs) {
      const [x, y] = toS(n.x, n.z);
      ctx.fillStyle = n.kind === 'tamer' ? (g.data.defeated[n.data.id] ? '#888' : n.data.leader || n.data.pit ? '#ffd040' : '#ff5050') : n.kind === 'healer' ? '#ff7ab0' : n.kind === 'shop' ? '#3a8cff' : '#fff';
      ctx.beginPath(); ctx.arc(x, y, n.data && (n.data.leader || n.data.pit) ? 6 : 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.stroke();
    }
    for (const s of g.world.shrines) { const [x, y] = toS(s.x, s.z); ctx.fillStyle = g.data.shrines[s.id] ? '#3affd0' : '#2a6a5a'; ctx.fillRect(x - 4, y - 4, 8, 8); }
    const [px, py] = toS(g.player.pos.x, g.player.pos.z);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  renderSys(body) {
    const g = this.g;
    body.innerHTML = `<div class="sys">
      <button class="btn" id="sSave">💾 Salva partita</button>
      <button class="btn" id="sAudio">${g.audio.muted ? '🔇 Audio: OFF' : '🔊 Audio: ON'}</button>
      <button class="btn" id="sMusic">${g.audio.musicOn ? '🎵 Musica: ON' : '🎵 Musica: OFF'}</button>
      <button class="btn danger" id="sReset">🗑️ Cancella salvataggio</button>
      <div class="help"><h3>Comandi</h3>
      <p><b>WASD / Frecce</b> muoviti · <b>Shift</b> corri · <b>Trascina mouse</b> ruota camera · <b>Rotella</b> zoom · <b>Q / R</b> ruota camera</p>
      <p><b>E</b> interagisci / sfida creature · <b>Tab / I</b> menu · <b>M</b> mappa · <b>Esc</b> chiudi</p>
      <p>In battaglia: <b>1-4</b> scegli, <b>Esc</b> indietro, <b>Spazio</b> salta testo.</p>
      <h3>Come si gioca</h3>
      <p>Avvicinati alle creature selvatiche (nome verde = non ancora catturata) e premi <b>E</b> per sfidarle. Indeboliscile e lancia una Sfera dallo Zaino per catturarle.
      Sconfiggi i 6 Capi Zona per ottenere i Sigilli e sfida il Gran Maestro nella <b>Fossa</b> al centro del villaggio. Completa il Bestiario di ${DEX.length} creature!</p>
      <p>Tempo di gioco: ${Math.floor(g.data.playTime / 3600)}h ${Math.floor((g.data.playTime % 3600) / 60)}m</p></div></div>`;
    $('#sSave', body).onclick = () => { g.save(); this.toast('Partita salvata!', '#7aff8a'); };
    $('#sAudio', body).onclick = () => { g.audio.setMuted(!g.audio.muted); g.data.muted = g.audio.muted; this.renderMenu(); };
    $('#sMusic', body).onclick = () => { g.audio.musicOn = !g.audio.musicOn; g.data.musicOff = !g.audio.musicOn; this.renderMenu(); };
    $('#sReset', body).onclick = async () => {
      const k = await this.dialog(null, 'Vuoi davvero cancellare il salvataggio e ricominciare da zero?', ['Sì, cancella tutto', 'No']);
      if (k === 0) { g.resetSave(); location.reload(); } else this.renderMenu();
    };
  }

  // ----------------------------------------------------- SCELTA MEMBRO
  chooseMember(party, filter, title, cancellable = true) {
    return new Promise((res) => {
      const ov = el('div', 'chooser');
      ov.innerHTML = `<div class="ctitle">${title}</div><div class="clist"></div>${cancellable ? '<button class="btn back">↩ Annulla</button>' : ''}`;
      const list = ov.querySelector('.clist');
      const valid = [];
      party.forEach((c, i) => {
        const ok = filter(c, i);
        const p = c.hp / maxHp(c);
        const r = el('div', 'row' + (ok ? '' : ' dis') + (c.hp <= 0 ? ' ko' : ''), `<b class="num">${i + 1}</b><img src="${this.portrait(c.sid)}"><div class="rinfo"><b>${nameOf(c)}</b> <small>Lv.${c.level}</small> ${statusBadge(c.status)}<div class="bar hp sm"><i style="width:${p * 100}%;background:${hpColor(p)}"></i><span>${c.hp}/${maxHp(c)}</span></div></div>`);
        if (ok) { r.onclick = () => done(i); valid.push(i); }
        list.appendChild(r);
      });
      const done = (i) => { pop(); ov.remove(); this.g.audio.sfx('select'); res(i); };
      if (cancellable) ov.querySelector('.back').onclick = () => done(-1);
      const pop = this.pushKeys((e) => {
        if (/^Digit[1-6]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (valid.includes(i)) done(i); }
        else if (e.code === 'Escape' && cancellable) done(-1);
        else return false;
      });
      document.getElementById('app').appendChild(ov);
    });
  }

  chooseForget(c, moveId) {
    const nm = MOVES[moveId];
    return new Promise((res) => {
      const ov = el('div', 'chooser');
      ov.innerHTML = `<div class="ctitle">${nameOf(c)} vuole imparare <b>${nm.name}</b> ${typeBadge(nm.type)} ${nm.power ? 'Pot ' + nm.power : mvDesc(nm)}.<br>Quale mossa vuoi dimenticare?</div><div class="clist"></div><button class="btn back">✋ Non imparare ${nm.name}</button>`;
      const list = ov.querySelector('.clist');
      c.moves.forEach((id, i) => {
        const mv = MOVES[id];
        const r = el('div', 'row', `<b class="num">${i + 1}</b><div class="rinfo"><b>${mv.name}</b> ${typeBadge(mv.type)} <small>${mv.power ? 'Pot ' + mv.power : mvDesc(mv)} · Prec ${mv.acc}</small></div>`);
        r.onclick = () => done(i);
        list.appendChild(r);
      });
      const done = (i) => { pop(); ov.remove(); this.g.audio.sfx('select'); res(i); };
      ov.querySelector('.back').onclick = () => done(-1);
      const pop = this.pushKeys((e) => {
        if (/^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < c.moves.length) done(i); }
        else if (e.code === 'Escape') done(-1);
        else return false;
      });
      document.getElementById('app').appendChild(ov);
    });
  }

  // ------------------------------------------------------------ BATTAGLIA
  battleShow(v) {
    this.battleEl.classList.toggle('hidden', !v);
    this.showHud(!v);
    this.menuEl.innerHTML = ''; this.logEl.textContent = '';
    if (!v) this._bh = null;
  }
  battleHud(b) {
    const panel = (S, mine) => {
      if (!S.mon) return '';
      const c = S.mon, sp = SPECIES[c.sid], mx = maxHp(c), p = c.hp / mx;
      const caught = this.g.data.caught[c.sid];
      return `<div class="pname">${!mine && b.wild ? (caught ? '<span class="caughtMark" title="Già catturato">●</span> ' : '<span class="newMark" title="Non catturato">✦</span> ') : ''}${sp.name} <small>Lv.${c.level}</small> ${statusBadge(c.status)}</div>
        <div class="ptypes">${sp.types.map(typeBadge).join(' ')}</div>
        <div class="bar hp"><i style="width:${p * 100}%;background:${hpColor(p)}"></i>${mine ? `<span>${c.hp}/${mx}</span>` : ''}</div>
        ${mine ? `<div class="bar xp"><i style="width:${xpProgress(c) * 100}%"></i></div>` : ''}
        ${!mine && !b.wild ? `<div class="balls">${b.enemyTeam.map((m) => `<i class="${m.hp > 0 ? '' : 'out'}"></i>`).join('')}</div>` : ''}
        ${mine ? `<div class="balls">${this.g.data.party.map((m) => `<i class="${m.hp > 0 ? '' : 'out'}"></i>`).join('')}</div>` : ''}`;
    };
    $('#enemyPanel').innerHTML = panel(b.E, false);
    $('#playerPanel').innerHTML = panel(b.P, true);
  }
  battleSay(text, dur = 1.0) {
    this.logEl.innerHTML = text;
    this.logEl.classList.add('talk');
    return new Promise((res) => {
      const fin = () => { if (this.sayResolve === fin) this.sayResolve = null; clearTimeout(this.sayTimer); pop(); res(); };
      this.sayResolve = fin;
      const pop = this.pushKeys((e) => { if (['Space', 'Enter'].includes(e.code)) this.skipSay(); else return false; });
      this.sayTimer = setTimeout(fin, dur * 1000 * (this.g.fastText ? 0.6 : 1));
    });
  }
  skipSay() { if (this.sayResolve) this.sayResolve(); }

  battleMenu(b) {
    return new Promise((res) => {
      const mon = b.P.mon;
      let pop = null;
      const finish = (a) => { if (pop) pop(); this.menuEl.innerHTML = ''; this.g.audio.sfx('select'); res(a); };
      const main = () => {
        this.logEl.innerHTML = `Cosa deve fare <b>${nameOf(mon)}</b>?`;
        this.logEl.classList.remove('talk');
        this.menuEl.className = 'bmenu main';
        this.menuEl.innerHTML = `<button class="bbtn fight"><b>1</b> LOTTA</button><button class="bbtn team"><b>2</b> SQUADRA</button><button class="bbtn bag"><b>3</b> ZAINO</button><button class="bbtn run ${b.wild ? '' : 'dis'}"><b>4</b> FUGA</button>`;
        const [f, t, bg, r] = this.menuEl.children;
        f.onclick = fight; t.onclick = team; bg.onclick = bag; r.onclick = () => b.wild && finish({ type: 'run' });
        setKeys((e) => {
          if (e.code === 'Digit1') fight(); else if (e.code === 'Digit2') team(); else if (e.code === 'Digit3') bag();
          else if (e.code === 'Digit4' && b.wild) finish({ type: 'run' }); else return false;
        });
      };
      const setKeys = (fn) => { if (pop) pop(); pop = this.pushKeys(fn); };
      const fight = () => {
        this.g.audio.sfx('ui');
        this.menuEl.className = 'bmenu moves';
        this.menuEl.innerHTML = '';
        const etypes = SPECIES[b.E.mon.sid].types;
        mon.moves.forEach((id, i) => {
          const mv = MOVES[id];
          const eff = mv.kind === 'dmg' ? effectiveness(mv.type, etypes) : 1;
          const tag = mv.kind !== 'dmg' ? `<em>${mvDesc(mv)}</em>` : eff > 1 ? '<em class="sup">Superefficace!</em>' : eff < 1 ? '<em class="weak">Poco efficace</em>' : '';
          const btn = el('button', 'mbtn', `<b>${i + 1}</b> <span class="mname">${mv.name}</span>${tag}<small>${TYPES[mv.type].name} · ${mv.power ? 'Pot ' + mv.power : '—'} · Prec ${mv.acc}</small>`);
          btn.style.setProperty('--tc', TYPES[mv.type].color);
          btn.onclick = () => finish({ type: 'move', move: id });
          this.menuEl.appendChild(btn);
        });
        const back = el('button', 'mbtn back', '↩ Indietro'); back.onclick = main; this.menuEl.appendChild(back);
        setKeys((e) => {
          if (/^Digit[1-4]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < mon.moves.length) finish({ type: 'move', move: mon.moves[i] }); }
          else if (e.code === 'Escape') main(); else return false;
        });
      };
      const team = async () => {
        this.g.audio.sfx('ui');
        if (pop) { pop(); pop = null; }
        const idx = await this.chooseMember(this.g.data.party, (c) => c.hp > 0 && c !== mon, 'Chi mandi in campo?', true);
        if (idx >= 0) finish({ type: 'switch', idx }); else main();
      };
      const bag = () => {
        this.g.audio.sfx('ui');
        const d = this.g.data;
        this.menuEl.className = 'bmenu items';
        this.menuEl.innerHTML = '';
        const usable = Object.keys(ITEMS).filter((k) => (d.items[k] || 0) > 0 && (!ITEMS[k].orb || b.wild));
        if (!usable.length) this.menuEl.appendChild(el('div', 'empty', 'Nessun oggetto utilizzabile.'));
        usable.forEach((k, i) => {
          const it = ITEMS[k];
          const btn = el('button', 'mbtn item', `<b>${i + 1}</b> <span class="mname">${it.name}</span> <em>x${d.items[k]}</em><small>${it.desc}</small>`);
          btn.onclick = () => pick(k);
          this.menuEl.appendChild(btn);
        });
        const back = el('button', 'mbtn back', '↩ Indietro'); back.onclick = main; this.menuEl.appendChild(back);
        const pick = async (k) => {
          const it = ITEMS[k];
          if (it.orb) return finish({ type: 'item', item: k });
          if (pop) { pop(); pop = null; }
          const filter = it.revive ? (c) => c.hp <= 0 : it.cure ? (c) => c.hp > 0 && c.status : (c) => c.hp > 0 && c.hp < maxHp(c);
          const idx = await this.chooseMember(d.party, filter, `Usa ${it.name} su...`, true);
          if (idx >= 0) finish({ type: 'item', item: k, target: idx }); else bag();
        };
        setKeys((e) => {
          if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < usable.length) pick(usable[i]); }
          else if (e.code === 'Escape') main(); else return false;
        });
      };
      main();
    });
  }
  battleChooseMember(b, forced) {
    return this.chooseMember(this.g.data.party, (c) => c.hp > 0, forced ? 'Scegli la prossima creatura!' : 'Chi mandi in campo?', !forced);
  }

  // ------------------------------------------------------------ NEGOZIO
  openShop() {
    return new Promise((res) => {
      const d = this.g.data;
      const render = () => {
        const m = this.openModal(`<div class="shop"><h2>🛒 Bottega di Bruno</h2><div class="gold">🪙 ${d.gold} monete</div><div class="slist"></div><button class="btn close">Esci</button></div>`);
        const list = m.querySelector('.slist');
        for (const [k, it] of Object.entries(ITEMS)) {
          const r = el('div', 'item', `<b>${it.name}</b> <span class="price">🪙 ${it.price}</span> <span class="cnt">(hai ${d.items[k] || 0})</span><small>${it.desc}</small>`);
          for (const q of [1, 5]) {
            const b = el('button', 'btn sm' + (d.gold < it.price * q ? ' dis' : ''), `Compra x${q}`);
            b.onclick = () => {
              if (d.gold < it.price * q) { this.g.audio.sfx('miss'); return; }
              d.gold -= it.price * q; d.items[k] = (d.items[k] || 0) + q;
              this.g.audio.sfx('coin'); render();
            };
            r.appendChild(b);
          }
          list.appendChild(r);
        }
        m.querySelector('.close').onclick = close;
      };
      const close = () => { pop(); this.closeModal(); this.g.save(); res(); };
      const pop = this.pushKeys((e) => { if (e.code === 'Escape') close(); else return false; });
      render();
    });
  }

  // ---------------------------------------------------------- STARTER
  pickStarter() {
    return new Promise((res) => {
      const ids = ['fiammolo', 'gocciolo', 'germoglio'];
      const m = this.openModal(`<div class="starter"><h2>Scegli il tuo compagno!</h2><div class="cards">${ids.map((id, i) => {
        const sp = SPECIES[id];
        return `<div class="card" data-i="${i}"><img src="${this.portrait(id)}"><h3>${sp.name}</h3><div>${sp.types.map(typeBadge).join('')}</div><p>${sp.desc}</p><button class="btn">Scelgo ${sp.name}! <b>${i + 1}</b></button></div>`;
      }).join('')}</div></div>`, 'wide');
      const done = (i) => { pop(); this.closeModal(); this.g.audio.sfx('select'); res(ids[i]); };
      m.querySelectorAll('.card').forEach((c) => (c.onclick = () => done(+c.dataset.i)));
      const pop = this.pushKeys((e) => { if (/^Digit[1-3]$/.test(e.code)) done(+e.code.slice(5) - 1); else return false; });
    });
  }

  // ---------------------------------------------------------- EVOLUZIONE
  evolution(oldSid, newSid) {
    return new Promise((res) => {
      const a = this.portrait(oldSid), b = this.portrait(newSid);
      const m = this.openModal(`<div class="evo"><div class="evotext">Cosa? <b>${SPECIES[oldSid].name}</b> si sta evolvendo!</div><div class="evoimg"><img class="ea" src="${a}"><img class="eb" src="${b}"></div><button class="btn hidden">Fantastico!</button></div>`, 'evoModal');
      this.g.audio.sfx('evolve');
      const ea = m.querySelector('.ea'), eb = m.querySelector('.eb');
      let t = 0;
      const iv = setInterval(() => {
        t++;
        const show = t > 26 || (t > 6 && Math.floor(t / Math.max(1, 6 - t / 6)) % 2 === 1);
        ea.style.opacity = show ? 0 : 1; eb.style.opacity = show ? 1 : 0;
        if (t > 26) {
          clearInterval(iv);
          this.g.audio.sfx('caught');
          m.querySelector('.evotext').innerHTML = `Congratulazioni! <b>${SPECIES[oldSid].name}</b> si è evoluto in <b>${SPECIES[newSid].name}</b>!`;
          const btn = m.querySelector('.btn'); btn.classList.remove('hidden');
          const done = () => { pop(); this.closeModal(); res(); };
          btn.onclick = done;
          const pop = this.pushKeys((e) => { if (['Space', 'Enter', 'KeyE', 'Escape'].includes(e.code)) done(); else return false; });
        }
      }, 120);
    });
  }

  // ---------------------------------------------------------- TITOLO
  title(hasSave) {
    return new Promise((res) => {
      const t = $('#title');
      t.classList.remove('hidden');
      t.innerHTML = `<div class="logo"><div class="l1">ANIMALSLAVE</div><div class="l2">PIT FIGHT</div><div class="l3">Cattura · Allena · Combatti nella Fossa</div></div>
        <div class="tbtns">${hasSave ? '<button class="btn big" id="tCont">▶ Continua</button>' : ''}<button class="btn big ${hasSave ? 'alt' : ''}" id="tNew">✦ Nuova partita</button></div>
        <div class="tinfo">${DEX.length} creature · 10 tipi · 7 zone · 6 Capi Zona · 1 Fossa<br><small>WASD per muoverti · trascina per la camera · E per interagire</small></div>`;
      const go = (v) => { t.classList.add('out'); setTimeout(() => t.classList.add('hidden'), 600); res(v); };
      if (hasSave) $('#tCont').onclick = () => go('continue');
      $('#tNew').onclick = async () => {
        if (hasSave && !confirm('Iniziare una nuova partita? Il salvataggio attuale verrà sovrascritto.')) return;
        go('new');
      };
    });
  }
}

function mvDesc(mv) {
  if (mv.kind === 'heal') return `Cura ${Math.round(mv.pct * 100)}%`;
  if (mv.kind === 'buff') return `+${mv.stages} ${mv.stat.toUpperCase()}`;
  if (mv.kind === 'debuff') return `${mv.stages} ${mv.stat.toUpperCase()} nemico`;
  if (mv.kind === 'status') return STATUS[mv.status].full.charAt(0).toUpperCase() + STATUS[mv.status].full.slice(1);
  return '';
}
