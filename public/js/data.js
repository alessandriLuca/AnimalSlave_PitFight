// =====================================================================
//  DATI DI GIOCO: tipi, mosse, specie (60), zone, oggetti, allenatori
// =====================================================================

export const TYPES = {
  beast:    { name: 'Bestia',   color: '#c2a47a' },
  fire:     { name: 'Fuoco',    color: '#ff6a2a' },
  water:    { name: 'Acqua',    color: '#3a8cff' },
  grass:    { name: 'Erba',     color: '#4cc34a' },
  electric: { name: 'Elettro',  color: '#f5c81e' },
  earth:    { name: 'Terra',    color: '#b07a3a' },
  air:      { name: 'Aria',     color: '#7fc4f0' },
  ice:      { name: 'Ghiaccio', color: '#7fe6f0' },
  shadow:   { name: 'Ombra',    color: '#8a5ad8' },
  light:    { name: 'Luce',     color: '#f2d75a' },
};

// attaccante -> difensori su cui è superefficace (x2) / poco efficace (x0.5)
const STRONG = {
  beast: ['electric'], fire: ['grass', 'ice'], water: ['fire', 'earth'], grass: ['water', 'earth', 'light'],
  electric: ['water', 'air'], earth: ['fire', 'electric', 'ice'], air: ['grass', 'beast'],
  ice: ['air', 'grass', 'earth'], shadow: ['light', 'beast'], light: ['shadow', 'ice'],
};
const WEAK = {
  beast: ['earth'], fire: ['water', 'earth', 'fire'], water: ['water', 'grass', 'ice'], grass: ['fire', 'air', 'grass'],
  electric: ['earth', 'grass', 'electric'], earth: ['grass', 'air'], air: ['electric', 'ice'],
  ice: ['fire', 'ice', 'water'], shadow: ['shadow'], light: ['light', 'fire'],
};
export function effectiveness(atkType, defTypes) {
  let m = 1;
  for (const d of defTypes) {
    if (STRONG[atkType].includes(d)) m *= 2;
    else if (WEAK[atkType].includes(d)) m *= 0.5;
  }
  return m;
}

// ---------------------------------------------------------------- MOSSE
// kind: dmg | heal | buff (su sé) | debuff (sul nemico) | status
export const MOVES = {};
function mv(id, name, type, power, acc, extra = {}) {
  MOVES[id] = { id, name, type, power, acc, kind: power > 0 ? 'dmg' : extra.kind, ...extra };
}
// Bestia
mv('tackle', 'Placcaggio', 'beast', 40, 100);
mv('bite', 'Morso', 'beast', 60, 100);
mv('slam', 'Schianto', 'beast', 85, 90);
mv('frenzy', 'Furia Selvaggia', 'beast', 110, 85);
mv('roar', 'Ruggito', 'beast', 0, 100, { kind: 'debuff', stat: 'atk', stages: -1 });
mv('harden', 'Corazza', 'beast', 0, 100, { kind: 'buff', stat: 'def', stages: 1 });
mv('focus', 'Concentrazione', 'beast', 0, 100, { kind: 'buff', stat: 'atk', stages: 2 });
mv('lick', 'Leccata Curativa', 'beast', 0, 100, { kind: 'heal', pct: 0.35 });
// Fuoco
mv('ember', 'Brace', 'fire', 40, 100, { status: 'burn', chance: 0.1 });
mv('flamefang', 'Zanna Ardente', 'fire', 65, 95, { status: 'burn', chance: 0.15 });
mv('fireblast', 'Vampata', 'fire', 90, 90, { status: 'burn', chance: 0.2 });
mv('inferno', 'Inferno', 'fire', 120, 80, { status: 'burn', chance: 0.3 });
mv('willo', 'Fuoco Fatuo', 'fire', 0, 85, { kind: 'status', status: 'burn' });
// Acqua
mv('splash', 'Spruzzo', 'water', 40, 100);
mv('jet', "Getto d'Acqua", 'water', 65, 100);
mv('hydro', 'Idrocannone', 'water', 90, 90);
mv('tsunami', 'Maremoto', 'water', 115, 85);
mv('rain', 'Pioggia Lenitiva', 'water', 0, 100, { kind: 'heal', pct: 0.4 });
// Erba
mv('leaf', 'Foglielama', 'grass', 40, 100);
mv('vine', 'Frusta Liana', 'grass', 65, 100);
mv('petal', 'Tempesta di Petali', 'grass', 90, 90);
mv('forestwrath', 'Ira della Foresta', 'grass', 115, 85);
mv('spore', 'Spora Sonnifera', 'grass', 0, 75, { kind: 'status', status: 'sleep' });
mv('drain', 'Assorbimento', 'grass', 55, 100, { drain: 0.5 });
// Elettro
mv('spark', 'Scintilla', 'electric', 40, 100, { status: 'paralysis', chance: 0.1 });
mv('bolt', 'Fulmine', 'electric', 65, 100, { status: 'paralysis', chance: 0.15 });
mv('thunder', 'Tuono', 'electric', 90, 85, { status: 'paralysis', chance: 0.2 });
mv('voltnova', 'Supernova Voltaica', 'electric', 120, 80, { status: 'paralysis', chance: 0.2 });
mv('stunwave', 'Onda Paralizzante', 'electric', 0, 85, { kind: 'status', status: 'paralysis' });
// Terra
mv('rock', 'Sassata', 'earth', 40, 100);
mv('mud', 'Fanghiglia', 'earth', 55, 100, { foeStat: 'spd', foeStages: -1, chance: 0.5 });
mv('quake', 'Terremoto', 'earth', 90, 95);
mv('landslide', 'Frana', 'earth', 115, 85);
mv('stoneskin', 'Pelle di Pietra', 'earth', 0, 100, { kind: 'buff', stat: 'def', stages: 2 });
// Aria
mv('gust', 'Raffica', 'air', 40, 100);
mv('wingsteel', "Ala d'Acciaio", 'air', 65, 95);
mv('tornado', 'Tornado', 'air', 90, 90);
mv('cyclone', 'Ciclone', 'air', 115, 85);
mv('tailwind', 'Vento in Coda', 'air', 0, 100, { kind: 'buff', stat: 'spd', stages: 2 });
// Ghiaccio
mv('frost', 'Brina', 'ice', 40, 100, { status: 'freeze', chance: 0.1 });
mv('icefang', 'Zanna Gelida', 'ice', 65, 95, { status: 'freeze', chance: 0.1 });
mv('blizzard', 'Bufera', 'ice', 90, 85, { status: 'freeze', chance: 0.15 });
mv('absolutezero', 'Zero Assoluto', 'ice', 120, 80, { status: 'freeze', chance: 0.2 });
mv('icemist', 'Nebbia Gelida', 'ice', 0, 95, { kind: 'debuff', stat: 'spd', stages: -2 });
// Ombra
mv('shadowclaw', 'Ombrartiglio', 'shadow', 45, 100);
mv('darkbite', 'Morso Oscuro', 'shadow', 70, 95);
mv('shadowball', 'Palla Ombra', 'shadow', 90, 90);
mv('eclipse', 'Eclisse', 'shadow', 115, 85);
mv('miasma', 'Miasma', 'shadow', 0, 90, { kind: 'status', status: 'poison' });
mv('nightmare', 'Incubo', 'shadow', 0, 70, { kind: 'status', status: 'sleep' });
// Luce
mv('flash', 'Lampo', 'light', 40, 100);
mv('sunbeam', 'Raggio Solare', 'light', 65, 100);
mv('judgment', 'Giudizio', 'light', 90, 90);
mv('supernova', 'Supernova', 'light', 115, 85);
mv('blessing', 'Benedizione', 'light', 0, 100, { kind: 'heal', pct: 0.5 });
mv('blind', 'Accecamento', 'light', 0, 95, { kind: 'debuff', stat: 'atk', stages: -2 });

const TIERS = {
  beast: ['tackle', 'bite', 'slam', 'frenzy'],
  fire: ['ember', 'flamefang', 'fireblast', 'inferno'],
  water: ['splash', 'jet', 'hydro', 'tsunami'],
  grass: ['leaf', 'vine', 'petal', 'forestwrath'],
  electric: ['spark', 'bolt', 'thunder', 'voltnova'],
  earth: ['rock', 'mud', 'quake', 'landslide'],
  air: ['gust', 'wingsteel', 'tornado', 'cyclone'],
  ice: ['frost', 'icefang', 'blizzard', 'absolutezero'],
  shadow: ['shadowclaw', 'darkbite', 'shadowball', 'eclipse'],
  light: ['flash', 'sunbeam', 'judgment', 'supernova'],
};
const SUPPORT = {
  beast: 'roar', fire: 'willo', water: 'rain', grass: 'spore', electric: 'stunwave',
  earth: 'stoneskin', air: 'tailwind', ice: 'icemist', shadow: 'miasma', light: 'blessing',
};
const BUFF = {
  beast: 'focus', fire: 'focus', water: 'harden', grass: 'drain', electric: 'tailwind',
  earth: 'harden', air: 'focus', ice: 'harden', shadow: 'nightmare', light: 'blind',
};

// Insieme di mosse apprese per livello, generato dai tipi
export function learnset(types) {
  const [a, b] = types;
  const T = TIERS[a], U = b ? TIERS[b] : TIERS.beast;
  const raw = [
    [1, 'tackle'], [1, T[0]], [5, SUPPORT[a]], [9, b ? U[0] : 'bite'], [13, T[1]],
    [17, BUFF[a]], [21, b ? U[1] : 'lick'], [26, T[2]], [31, b ? U[2] : 'slam'],
    [36, b ? SUPPORT[b] : 'harden'], [40, T[3]], [46, b ? U[3] : 'frenzy'],
  ];
  const seen = new Set(); const out = [];
  for (const [l, m] of raw) if (!seen.has(m)) { seen.add(m); out.push([l, m]); }
  return out;
}

// --------------------------------------------------------------- SPECIE
// m: modello procedurale -> b: corpo, c: [principale, accento, pancia], s: scala,
//    e: orecchie, t: coda, h: corna, w: ali, sp: aculei, g: bagliore, mn: criniera, fl: fluttua
export const SPECIES = {};
export const DEX = [];
function sp(id, name, types, base, zones, rarity, m, evo, desc) {
  const [hp, atk, def, spd] = base;
  SPECIES[id] = {
    id, num: DEX.length + 1, name, types, base: { hp, atk, def, spd }, zones, rarity, m,
    evo: evo ? { to: evo[0], level: evo[1] } : null, desc,
    baseXp: Math.round((hp + atk + def + spd) / 4.2),
  };
  DEX.push(id);
}

// --- Starter
sp('fiammolo', 'Fiammolo', ['fire'], [45, 55, 40, 60], [], 'starter',
  { b: 'quad', c: [0xff7a2a, 0xffd23f, 0xfff1c9], s: 0.8, e: 'pointy', t: 'flame' }, ['brazzardo', 16],
  'Una volpina con la coda che arde. Quando è felice la fiamma diventa blu.');
sp('brazzardo', 'Brazzardo', ['fire'], [62, 76, 56, 74], ['volcano'], 'rare',
  { b: 'quad', c: [0xe8551c, 0xffb52e, 0xfff0c0], s: 1.1, e: 'pointy', t: 'flame', mn: 1 }, ['infernoth', 32],
  'La sua criniera di braci scalda interi accampamenti durante l\'inverno.');
sp('infernoth', 'Infernoth', ['fire', 'earth'], [82, 102, 86, 80], [], 'rare',
  { b: 'quad', c: [0xb8321a, 0x3a2a2a, 0xffa040], s: 1.5, e: 'pointy', t: 'flame', h: 2, sp: 1, mn: 1, g: 0xff6a1a }, null,
  'Ogni suo passo lascia impronte di magma. Si dice sia nato dentro un vulcano.');
sp('gocciolo', 'Gocciolo', ['water'], [50, 45, 55, 50], [], 'starter',
  { b: 'biped', c: [0x4aa8ff, 0xbfe8ff, 0xe6f7ff], s: 0.8, e: 'none', t: 'fin' }, ['ondrago', 16],
  'Un ranocchio curioso che spruzza acqua da una pinna sulla testa.');
sp('ondrago', 'Ondrago', ['water'], [66, 66, 76, 64], ['swamp'], 'rare',
  { b: 'biped', c: [0x2d7fe0, 0x9ee0ff, 0xdff4ff], s: 1.1, e: 'none', t: 'fin', sp: 1 }, ['abissauro', 32],
  'Nuota controcorrente per allenarsi. Le sue pinne tagliano le onde.');
sp('abissauro', 'Abissauro', ['water', 'ice'], [92, 90, 96, 70], [], 'rare',
  { b: 'serpent', c: [0x1b4fa8, 0xbff4ff, 0xe8fbff], s: 1.6, h: 2, sp: 1, g: 0x8ff0ff }, null,
  'Un serpente marino delle profondità glaciali. Il suo ruggito congela la schiuma.');
sp('germoglio', 'Germoglio', ['grass'], [50, 50, 50, 50], [], 'starter',
  { b: 'quad', c: [0x6ccf4a, 0xffe066, 0xe9ffd1], s: 0.8, e: 'round', t: 'leaf' }, ['foglierto', 16],
  'Un cucciolo con un bocciolo sulla schiena che sboccia al sole.');
sp('foglierto', 'Foglierto', ['grass'], [66, 66, 66, 64], ['forest'], 'rare',
  { b: 'quad', c: [0x4fae36, 0xff9ad0, 0xdfffc6], s: 1.15, e: 'pointy', t: 'leaf', mn: 1 }, ['silvarca', 32],
  'La sua criniera fogliata cambia colore con le stagioni.');
sp('silvarca', 'Silvarca', ['grass', 'beast'], [92, 96, 90, 70], [], 'rare',
  { b: 'quad', c: [0x3e8a2e, 0x8b5a2b, 0xcff0a8], s: 1.6, e: 'pointy', t: 'leaf', h: 2, mn: 1 }, null,
  'Il re del bosco. Sulle sue corna crescono piccoli alberi.');

// --- Prati
sp('squittino', 'Squittino', ['beast'], [40, 45, 35, 60], ['meadow'], 'common',
  { b: 'quad', c: [0xc9a27a, 0xffb0c0, 0xf5e6d3], s: 0.55, e: 'round', t: 'thin' }, ['rattorso', 14],
  'Rosicchia tutto ciò che trova. Si nasconde nell\'erba alta.');
sp('rattorso', 'Rattorso', ['beast'], [70, 76, 60, 66], ['meadow', 'forest'], 'uncommon',
  { b: 'quad', c: [0x8a6a4a, 0xffb0c0, 0xd8c0a0], s: 1.0, e: 'round', t: 'thin', sp: 1 }, null,
  'Tozzo e testardo. I suoi denti rompono le pietre.');
sp('piumello', 'Piumello', ['air'], [40, 45, 40, 65], ['meadow'], 'common',
  { b: 'bird', c: [0xa7d8ff, 0xffd34d, 0xffffff], s: 0.6 }, ['falcoraggio', 18],
  'Cinguetta all\'alba. Vola in stormi rumorosissimi.');
sp('falcoraggio', 'Falcoraggio', ['air', 'beast'], [66, 82, 60, 96], ['forest', 'desert'], 'uncommon',
  { b: 'bird', c: [0x7a5230, 0xffe08a, 0xf0e0c0], s: 1.1, h: 0, e: 'pointy' }, null,
  'Scende in picchiata a velocità incredibili sulle sue prede.');
sp('bruchetto', 'Bruchetto', ['grass'], [45, 35, 50, 40], ['meadow'], 'common',
  { b: 'insect', c: [0x9fe06a, 0xffd23f, 0xe0ffb0], s: 0.55 }, ['farfallux', 12],
  'Mangia foglie tutto il giorno, poi dorme in un bozzolo.');
sp('farfallux', 'Farfallux', ['grass', 'light'], [60, 70, 55, 82], ['meadow', 'forest'], 'rare',
  { b: 'insect', c: [0xf6a5ff, 0xfff07a, 0xffe0ff], s: 0.8, w: 1, g: 0xffc0ff }, null,
  'Le polveri delle sue ali brillano come stelle cadenti.');
sp('coniglampo', 'Coniglampo', ['electric'], [45, 50, 40, 72], ['meadow'], 'uncommon',
  { b: 'quad', c: [0xffe14a, 0x3a3a3a, 0xfff6c0], s: 0.6, e: 'long', t: 'fluffy' }, ['voltaliepre', 20],
  'Le sue orecchie accumulano elettricità statica. Non accarezzarlo!');
sp('voltaliepre', 'Voltaliepre', ['electric'], [66, 82, 56, 106], ['swamp'], 'rare',
  { b: 'quad', c: [0xffd21a, 0x2a2a3a, 0xfff6c0], s: 0.95, e: 'long', t: 'fluffy', g: 0xfff27a }, null,
  'Corre così veloce da lasciare una scia di fulmini.');
sp('muschietto', 'Muschietto', ['grass'], [62, 40, 62, 30], ['meadow', 'swamp'], 'common',
  { b: 'blob', c: [0x5fae3e, 0xb6ff8a, 0xa0e070], s: 0.6 }, null,
  'Una pallina di muschio vivente. Ama l\'umidità del mattino.');

// --- Bosco
sp('ghiandotto', 'Ghiandotto', ['grass', 'earth'], [60, 62, 72, 40], ['forest'], 'common',
  { b: 'biped', c: [0xb07a44, 0x5c3a1e, 0xe8c99a], s: 0.7, e: 'none', h: 1, t: 'none' }, null,
  'Si traveste da ghianda per non farsi mangiare dagli scoiattoli.');
sp('volpombra', 'Volpombra', ['shadow'], [50, 62, 45, 72], ['forest'], 'common',
  { b: 'quad', c: [0x4a3b6b, 0xb48cff, 0x8070a8], s: 0.75, e: 'pointy', t: 'fluffy' }, ['kitsunox', 24],
  'Appare solo al crepuscolo. Ride come un bambino.');
sp('kitsunox', 'Kitsunox', ['shadow', 'fire'], [76, 96, 66, 100], ['ruins'], 'rare',
  { b: 'quad', c: [0x3a2b5b, 0xb48cff, 0x6a5a98], s: 1.1, e: 'pointy', t: 'fluffy', mn: 1, g: 0xb48cff }, null,
  'Le sue nove fiamme viola ingannano i viaggiatori.');
sp('gufonotte', 'Gufonotte', ['air', 'shadow'], [70, 62, 62, 70], ['forest'], 'uncommon',
  { b: 'bird', c: [0x5a4a7a, 0xffcc33, 0xa898c0], s: 0.85, e: 'pointy' }, null,
  'Vede nel buio più totale. Il suo verso porta sogni strani.');
sp('cervolume', 'Cervolume', ['light'], [76, 72, 70, 86], ['forest'], 'rare',
  { b: 'quad', c: [0xf3ecd8, 0xffe48a, 0xffffff], s: 1.2, e: 'pointy', t: 'fluffy', h: 2, g: 0xfff3b0 }, null,
  'Le sue corna illuminano i sentieri dei viandanti smarriti.');
sp('ragnetto', 'Ragnetto', ['shadow'], [45, 56, 45, 56], ['forest', 'ruins'], 'common',
  { b: 'insect', c: [0x3a2f4a, 0xff4a6a, 0x5a4a6a], s: 0.5 }, ['tessitrix', 20],
  'Tesse ragnatele a forma di stelle per catturare la rugiada.');
sp('tessitrix', 'Tessitrix', ['shadow', 'earth'], [72, 86, 76, 70], ['ruins'], 'uncommon',
  { b: 'insect', c: [0x2a2038, 0xff3a5a, 0x4a3a5a], s: 1.0, sp: 1 }, null,
  'Le sue tele sono più resistenti dell\'acciaio.');

// --- Palude
sp('pesciolux', 'Pesciolux', ['water'], [45, 45, 45, 62], ['swamp'], 'common',
  { b: 'fish', c: [0x5ecbff, 0xffa94d, 0xd8f4ff], s: 0.6 }, ['squalampo', 22],
  'Salta fuori dall\'acqua per acchiappare le libellule.');
sp('squalampo', 'Squalampo', ['water', 'electric'], [76, 96, 66, 90], ['swamp'], 'uncommon',
  { b: 'fish', c: [0x3a6ea8, 0xffe14a, 0xd0e4f8], s: 1.3, sp: 1, g: 0xffe14a }, null,
  'Uno squalo che genera scariche per stordire i nemici.');
sp('rospone', 'Rospone', ['water', 'grass'], [82, 66, 72, 45], ['swamp'], 'common',
  { b: 'biped', c: [0x6aa84a, 0x3a7a3a, 0xf0f0b0], s: 0.95, e: 'none', t: 'none' }, null,
  'Il suo gracidio si sente a chilometri. Ha sempre fame.');
sp('anguillo', 'Anguillo', ['electric'], [60, 76, 50, 86], ['swamp'], 'uncommon',
  { b: 'serpent', c: [0x2a3a5a, 0xfff04a, 0x5a6a8a], s: 0.9, g: 0xfff04a }, null,
  'Si nasconde nel fango e illumina la palude di notte.');
sp('melmoso', 'Melmoso', ['water', 'shadow'], [72, 55, 66, 40], ['swamp'], 'common',
  { b: 'blob', c: [0x5a4a6a, 0x8affd0, 0x6a5a7a], s: 0.8 }, ['fangolemme', 25],
  'Una melma viscida che borbotta parole incomprensibili.');
sp('fangolemme', 'Fangolemme', ['water', 'earth'], [102, 86, 96, 40], ['swamp'], 'rare',
  { b: 'biped', c: [0x6a5038, 0x3a8a6a, 0x8a7058], s: 1.4, e: 'none', sp: 1, t: 'none' }, null,
  'Un gigante di fango che protegge la palude dagli intrusi.');
sp('libellampo', 'Libellampo', ['air', 'water'], [55, 66, 50, 96], ['swamp', 'meadow'], 'uncommon',
  { b: 'insect', c: [0x48d1cc, 0x99eeff, 0xc0fff8], s: 0.7, w: 1 }, null,
  'Sfreccia sul pelo dell\'acqua senza mai bagnarsi.');

// --- Deserto
sp('sabbiotto', 'Sabbiotto', ['earth'], [56, 62, 62, 56], ['desert'], 'common',
  { b: 'quad', c: [0xd9b26a, 0xa0683a, 0xf0d8a0], s: 0.7, e: 'none', t: 'thin', sp: 1 }, ['dunaraptor', 26],
  'Una lucertola che nuota sotto la sabbia come fosse acqua.');
sp('dunaraptor', 'Dunaraptor', ['earth', 'beast'], [82, 102, 80, 86], ['desert'], 'rare',
  { b: 'biped', c: [0xc8923a, 0x6a3a1a, 0xf0d0a0], s: 1.3, e: 'none', t: 'spiky', sp: 1 }, null,
  'Caccia in branco tra le dune. Le sue zanne non perdonano.');
sp('scorpiaccio', 'Scorpiaccio', ['earth', 'shadow'], [62, 82, 82, 50], ['desert'], 'common',
  { b: 'insect', c: [0x8a3a2a, 0x2a1a1a, 0xb05a40], s: 0.8, t: 'spiky' }, null,
  'La sua coda velenosa brilla al chiaro di luna.');
sp('cactorso', 'Cactorso', ['grass', 'earth'], [86, 76, 86, 35], ['desert'], 'uncommon',
  { b: 'biped', c: [0x4a9a4a, 0xff7aa8, 0x8ad08a], s: 1.1, e: 'round', sp: 1, t: 'none' }, null,
  'Un orsetto-cactus. Abbracciarlo è una pessima idea.');
sp('solarpino', 'Solarpino', ['fire', 'air'], [60, 76, 56, 90], ['desert', 'volcano'], 'uncommon',
  { b: 'bird', c: [0xff9a2a, 0xfff07a, 0xffe0a0], s: 0.85, g: 0xffb030 }, null,
  'Assorbe il calore del sole e lo rilascia in volo.');
sp('vermosabbia', 'Vermosabbia', ['earth'], [72, 66, 72, 40], ['desert'], 'common',
  { b: 'serpent', c: [0xc49a5a, 0x7a5a3a, 0xe0c090], s: 0.9 }, ['colossoverme', 30],
  'Scava gallerie lunghe chilometri sotto le dune.');
sp('colossoverme', 'Colossoverme', ['earth', 'beast'], [116, 100, 96, 45], ['desert'], 'rare',
  { b: 'serpent', c: [0xa47a3a, 0x5a3a1a, 0xd0a870], s: 1.8, h: 2, sp: 1 }, null,
  'Quando emerge dalla sabbia, la terra trema per giorni.');

// --- Tundra
sp('pinguinetto', 'Pinguinetto', ['ice', 'water'], [55, 50, 56, 50], ['tundra'], 'common',
  { b: 'biped', c: [0x2a3a5a, 0xffc040, 0xffffff], s: 0.65, e: 'none', t: 'none' }, ['imperagelo', 28],
  'Scivola sul ghiaccio a pancia in giù per divertimento.');
sp('imperagelo', 'Imperagelo', ['ice', 'water'], [92, 86, 92, 66], ['tundra'], 'rare',
  { b: 'biped', c: [0x1a2a4a, 0xffd34d, 0xffffff], s: 1.3, e: 'none', h: 1, t: 'none', mn: 1 }, null,
  'Il sovrano dei ghiacci. La sua corona è fatta di brina eterna.');
sp('lupogelo', 'Lupogelo', ['ice', 'beast'], [60, 72, 56, 76], ['tundra'], 'common',
  { b: 'quad', c: [0xdfefff, 0x7ab8ff, 0xffffff], s: 0.9, e: 'pointy', t: 'fluffy' }, ['fenrigel', 30],
  'Ulula alla luna e il vento si fa più freddo.');
sp('fenrigel', 'Fenrigel', ['ice', 'shadow'], [86, 106, 76, 100], ['tundra'], 'rare',
  { b: 'quad', c: [0xbfd8f0, 0x4a3b8b, 0xe8f4ff], s: 1.4, e: 'pointy', t: 'fluffy', mn: 1, sp: 1, g: 0x99eeff }, null,
  'Leggenda narra che abbia ingoiato una stella d\'inverno.');
sp('fioccoblob', 'Fioccoblob', ['ice'], [66, 50, 66, 50], ['tundra'], 'common',
  { b: 'blob', c: [0xeaf6ff, 0x9fd8ff, 0xffffff], s: 0.7, sp: 1 }, null,
  'Un fiocco di neve vivente. Si scioglie se lo abbracci troppo.');
sp('orsobrina', 'Orsobrina', ['ice', 'earth'], [106, 96, 90, 40], ['tundra'], 'uncommon',
  { b: 'quad', c: [0xf4f4f4, 0x9aaabb, 0xffffff], s: 1.5, e: 'round', t: 'none' }, null,
  'Dorme tutto l\'anno tranne il giorno più freddo.');

// --- Vulcano
sp('lavalumaca', 'Lavalumaca', ['fire', 'earth'], [72, 60, 82, 30], ['volcano'], 'common',
  { b: 'blob', c: [0xff5a1a, 0x3a2a2a, 0xffa060], s: 0.8, g: 0xff7a2a }, null,
  'Lascia una scia di lava che si raffredda in pietra.');
sp('draghetto', 'Draghetto', ['fire', 'air'], [56, 66, 50, 66], ['volcano'], 'uncommon',
  { b: 'quad', c: [0xff6a3a, 0xffd34d, 0xffe0b0], s: 0.75, e: 'none', t: 'spiky', h: 2, w: 1 }, ['dragoinferno', 35],
  'Un cucciolo di drago. Starnutisce scintille quando è raffreddato.');
sp('dragoinferno', 'Dragoinferno', ['fire', 'air'], [96, 116, 86, 100], ['volcano'], 'rare',
  { b: 'quad', c: [0xd03a1a, 0xffc040, 0xffd090], s: 1.7, e: 'none', t: 'spiky', h: 2, w: 1, sp: 1, g: 0xff8a2a }, null,
  'Il suo battito d\'ali scatena tempeste di fuoco.');
sp('magmatoro', 'Magmatoro', ['fire', 'beast'], [92, 100, 76, 70], ['volcano'], 'common',
  { b: 'quad', c: [0x7a2a1a, 0xff7a2a, 0xb05a3a], s: 1.3, e: 'round', t: 'thin', h: 2, mn: 1 }, null,
  'Carica a testa bassa. Le sue corna sono incandescenti.');
sp('scintillone', 'Scintillone', ['electric', 'fire'], [60, 92, 56, 96], ['volcano', 'desert'], 'uncommon',
  { b: 'blob', c: [0xfff04a, 0xff5a1a, 0xfff8b0], s: 0.7, g: 0xffe040, sp: 1 }, null,
  'Una sfera di energia pura che crepita allegramente.');

// --- Rovine
sp('spettrino', 'Spettrino', ['shadow'], [50, 62, 45, 72], ['ruins'], 'common',
  { b: 'blob', c: [0xb8a8ff, 0x4a2a8a, 0xd8d0ff], s: 0.65, g: 0xb8a8ff, fl: 1 }, ['lamentro', 30],
  'Un fantasmino timido che ama fare scherzi ai visitatori.');
sp('lamentro', 'Lamentro', ['shadow', 'air'], [82, 102, 70, 96], ['ruins'], 'rare',
  { b: 'blob', c: [0x6a4ac8, 0x2a1a5a, 0xa090f0], s: 1.1, h: 2, g: 0x9a7aff, fl: 1 }, null,
  'Il suo lamento si sente tra le colonne delle antiche rovine.');
sp('lucciolux', 'Lucciolux', ['light'], [55, 62, 50, 82], ['ruins', 'forest'], 'common',
  { b: 'insect', c: [0xfff3a0, 0x5a5a2a, 0xfffad0], s: 0.55, w: 1, g: 0xfff3a0 }, null,
  'Danza nelle notti d\'estate formando costellazioni.');
sp('golemrunico', 'Golemrunico', ['light', 'earth'], [102, 92, 112, 30], ['ruins'], 'uncommon',
  { b: 'biped', c: [0x8a8aa0, 0x7af0ff, 0xa0a0b8], s: 1.6, e: 'none', sp: 1, t: 'none', g: 0x7af0ff }, null,
  'Costruito da una civiltà dimenticata. Le sue rune brillano ancora.');
sp('gattoastrale', 'Gattoastrale', ['light', 'shadow'], [72, 86, 66, 106], ['ruins'], 'uncommon',
  { b: 'quad', c: [0x2a2a5a, 0xfff07a, 0x4a4a7a], s: 0.85, e: 'pointy', t: 'thin', g: 0xfff07a }, null,
  'Sul suo pelo si vedono le costellazioni. Va e viene a piacimento.');

// --- Leggendari
sp('aurorix', 'Aurorix', ['light', 'ice'], [100, 110, 100, 112], [], 'legendary',
  { b: 'bird', c: [0xdff6ff, 0xff9af0, 0xffffff], s: 2.0, g: 0x9ffcff, e: 'pointy' }, null,
  'Leggendario. Le aurore del nord sono le scie delle sue ali.');
sp('nihilorc', 'Nihilorc', ['shadow', 'beast'], [112, 122, 96, 96], [], 'legendary',
  { b: 'biped', c: [0x1a1028, 0xff2a5a, 0x3a2048], s: 2.0, e: 'pointy', h: 2, sp: 1, g: 0xff2a5a, t: 'spiky' }, null,
  'Leggendario. Divora la luce. Le rovine furono costruite per imprigionarlo.');
sp('pyrothane', 'Pyrothane', ['fire', 'electric'], [102, 122, 90, 106], [], 'legendary',
  { b: 'serpent', c: [0xd92a1a, 0xffe04a, 0xffa060], s: 2.2, h: 2, sp: 1, g: 0xffd040 }, null,
  'Leggendario. Dorme nel cuore del vulcano; quando si sveglia, il cielo tuona.');
sp('gaiadon', 'Gaiadon', ['earth', 'grass'], [132, 110, 122, 55], [], 'legendary',
  { b: 'quad', c: [0x5a7a3a, 0x8a5a3a, 0xa0c070], s: 2.3, e: 'round', t: 'leaf', h: 2, sp: 1, mn: 1 }, null,
  'Leggendario. Sulla sua schiena cresce un\'intera foresta.');
sp('leviaqua', 'Leviaqua', ['water'], [116, 106, 106, 92], [], 'legendary',
  { b: 'serpent', c: [0x1a6ad0, 0xa0f0ff, 0xd0f8ff], s: 2.4, h: 2, sp: 1, g: 0x7af0ff }, null,
  'Leggendario. Il guardiano del lago. Le sue spire generano le maree.');

// ----------------------------------------------------------------- ZONE
// angoli: 0 = nord (-z), in senso orario
export const ZONES = {
  meadow:  { name: 'Prati del Villaggio', lv: [2, 5],   color: '#6fbf4a', fog: 0xcfe8ff },
  tundra:  { name: 'Steppa Gelata',       lv: [16, 22], color: '#eef4fa', fog: 0xe6f0ff, angle: 0 },
  volcano: { name: 'Monte Brace',         lv: [20, 27], color: '#4a3a36', fog: 0xd8b8a8, angle: 60 },
  desert:  { name: 'Dune Roventi',        lv: [12, 18], color: '#e0c27a', fog: 0xffe8c0, angle: 120 },
  ruins:   { name: 'Rovine Astrali',      lv: [24, 31], color: '#7a6f8a', fog: 0xd8d0f0, angle: 180 },
  swamp:   { name: 'Palude Nebbiosa',     lv: [8, 14],  color: '#56603a', fog: 0xc8d8c0, angle: 240 },
  forest:  { name: 'Bosco Sussurrante',   lv: [5, 11],  color: '#3d7a33', fog: 0xc8e8c8, angle: 300 },
};
export const SECTORS = ['tundra', 'volcano', 'desert', 'ruins', 'swamp', 'forest'];

export function pol(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(a) * r, z: -Math.cos(a) * r };
}

// --------------------------------------------------------------- OGGETTI
export const ITEMS = {
  orb:      { name: 'Sfera',        price: 100, desc: 'Cattura creature selvatiche.', orb: 1 },
  superorb: { name: 'Super Sfera',  price: 300, desc: 'Cattura migliore (x1.6).', orb: 1.6 },
  iperorb:  { name: 'Iper Sfera',   price: 800, desc: 'Cattura ottima (x2.6).', orb: 2.6 },
  potion:   { name: 'Pozione',      price: 80,  desc: 'Cura il 50% dei PS.', heal: 0.5 },
  superpot: { name: 'Super Pozione',price: 220, desc: 'Cura tutti i PS.', heal: 1 },
  antidote: { name: 'Cura Totale',  price: 120, desc: 'Cura ogni problema di stato.', cure: 1 },
  revive:   { name: 'Ravviva',      price: 450, desc: 'Rianima una creatura esausta (50% PS).', revive: 0.5 },
};

export const STATUS = {
  burn:      { name: 'BRU', full: 'scottato',     color: '#ff6a2a' },
  poison:    { name: 'VEL', full: 'avvelenato',   color: '#a050d0' },
  paralysis: { name: 'PAR', full: 'paralizzato',  color: '#f5c81e' },
  sleep:     { name: 'SON', full: 'addormentato', color: '#8a8aa0' },
  freeze:    { name: 'CON', full: 'congelato',    color: '#7fe6f0' },
};

// ----------------------------------------------------------- ALLENATORI
// leader: dà un Sigillo. look: colori del modello umano
export const TAMERS = [
  // minori
  { id: 't_meadow1', name: 'Bimbo Lino', zone: 'meadow', at: [200, 60], team: [['squittino', 4], ['piumello', 5]], gold: 120,
    look: { shirt: 0x3a8cff, pants: 0x2a2a3a, hair: 0x6a3a1a }, line: 'Ehi! Ho appena preso la mia prima creatura. Combattiamo!' },
  { id: 't_meadow2', name: 'Ragazza Pia', zone: 'meadow', at: [320, 62], team: [['bruchetto', 5], ['coniglampo', 6]], gold: 150,
    look: { shirt: 0xff7ab0, pants: 0x4a4a8a, hair: 0xffd060 }, line: 'I miei animaletti sono i più carini del villaggio!' },
  { id: 't_forest1', name: 'Esploratore Ugo', zone: 'forest', at: [285, 110], team: [['ghiandotto', 8], ['volpombra', 9], ['ragnetto', 9]], gold: 300,
    look: { shirt: 0x5a7a3a, pants: 0x6a5a3a, hair: 0x2a1a0a }, line: 'Il bosco è pieno di segreti. Vediamo se sei pronto!' },
  { id: 't_swamp1', name: 'Pescatore Tito', zone: 'swamp', at: [225, 115], team: [['pesciolux', 11], ['melmoso', 12], ['rospone', 12]], gold: 380,
    look: { shirt: 0x3a6a8a, pants: 0x3a3a2a, hair: 0x8a8a8a }, line: 'Oggi non abbocca niente... tanto vale combattere!' },
  { id: 't_desert1', name: 'Nomade Rasha', zone: 'desert', at: [140, 115], team: [['sabbiotto', 14], ['vermosabbia', 15], ['scorpiaccio', 16]], gold: 450,
    look: { shirt: 0xe0a040, pants: 0xf0e0c0, hair: 0x1a1a1a }, line: 'La sabbia mette alla prova i deboli.' },
  { id: 't_tundra1', name: 'Alpinista Greta', zone: 'tundra', at: [20, 115], team: [['pinguinetto', 17], ['lupogelo', 18], ['fioccoblob', 18]], gold: 520,
    look: { shirt: 0xd04040, pants: 0x3a3a5a, hair: 0xffe0a0 }, line: 'Fa freddo, eh? Ti riscaldo io con una lotta!' },
  { id: 't_volcano1', name: 'Fabbro Brando', zone: 'volcano', at: [40, 115], team: [['lavalumaca', 21], ['magmatoro', 22], ['solarpino', 22]], gold: 600,
    look: { shirt: 0x5a3a2a, pants: 0x2a2a2a, hair: 0x1a1a1a }, line: 'Forgio armi e creature. Le mie sono di ferro!' },
  { id: 't_ruins1', name: 'Medium Selene', zone: 'ruins', at: [200, 115], team: [['spettrino', 24], ['ragnetto', 25], ['lucciolux', 25], ['tessitrix', 26]], gold: 700,
    look: { shirt: 0x6a3a9a, pants: 0x2a1a3a, hair: 0xd0d0ff }, line: 'Gli spiriti mi hanno parlato di te...' },
  // capi zona
  { id: 'l_forest', leader: 1, seal: 'Sigillo Foglia', name: 'Silvia la Ranger', zone: 'forest', at: [300, 175],
    team: [['ghiandotto', 11], ['volpombra', 12], ['falcoraggio', 13], ['cervolume', 14]], gold: 900,
    look: { shirt: 0x2e6a2e, pants: 0x5a4a2a, hair: 0xb05a20, hat: 0x2e5a2e }, line: 'Sono la custode del Bosco. Dimostrami il tuo legame con le creature!' },
  { id: 'l_swamp', leader: 1, seal: 'Sigillo Onda', name: 'Gaspare il Barcaiolo', zone: 'swamp', at: [255, 125],
    team: [['rospone', 14], ['anguillo', 15], ['melmoso', 15], ['squalampo', 17]], gold: 1100,
    look: { shirt: 0x2a5a7a, pants: 0x3a3a2a, hair: 0xe0e0e0, hat: 0x6a5a3a }, line: 'La palude inghiotte chi è impreparato. Vediamo te.' },
  { id: 'l_desert', leader: 1, seal: 'Sigillo Duna', name: 'Zara delle Dune', zone: 'desert', at: [120, 175],
    team: [['sabbiotto', 17], ['cactorso', 18], ['scorpiaccio', 19], ['dunaraptor', 21]], gold: 1300,
    look: { shirt: 0xf0c060, pants: 0xa06030, hair: 0x2a1a0a, hat: 0xf0e0c0 }, line: 'Il sole del deserto forgia i veri campioni!' },
  { id: 'l_tundra', leader: 1, seal: 'Sigillo Gelo', name: 'Bjorn il Gelido', zone: 'tundra', at: [0, 175],
    team: [['pinguinetto', 20], ['fioccoblob', 21], ['orsobrina', 23], ['fenrigel', 24]], gold: 1500,
    look: { shirt: 0x8ab0d0, pants: 0x3a4a5a, hair: 0xf0f0f0, hat: 0xffffff }, line: 'Il gelo non perdona. Né io.' },
  { id: 'l_volcano', leader: 1, seal: 'Sigillo Brace', name: 'Vulcania', zone: 'volcano', at: [75, 150],
    team: [['lavalumaca', 24], ['magmatoro', 25], ['scintillone', 26], ['brazzardo', 26], ['dragoinferno', 28]], gold: 1800,
    look: { shirt: 0xc02a1a, pants: 0x2a1a1a, hair: 0xff6a1a }, line: 'Senti il calore? È solo l\'inizio!' },
  { id: 'l_ruins', leader: 1, seal: 'Sigillo Astro', name: 'Il Custode Muto', zone: 'ruins', at: [180, 175],
    team: [['spettrino', 27], ['gattoastrale', 28], ['golemrunico', 29], ['kitsunox', 29], ['lamentro', 31]], gold: 2100,
    look: { shirt: 0x3a2a5a, pants: 0x1a1a2a, hair: 0x8a8aa0, hat: 0x2a1a3a }, line: '. . . (ti fissa in silenzio e alza la mano)' },
  // Gran Maestro della Fossa
  { id: 'pitmaster', pit: 1, name: 'Gran Maestro Krator', zone: 'meadow', pos: { x: 0, z: -6 },
    team: [['kitsunox', 35], ['abissauro', 36], ['silvarca', 36], ['fenrigel', 36], ['infernoth', 37], ['dragoinferno', 38]], gold: 5000,
    look: { shirt: 0x1a1a1a, pants: 0x3a1a1a, hair: 0xffffff, hat: 0xc0a030 },
    line: 'Benvenuto nella FOSSA. Nessuno mi ha mai battuto. Fatti sotto!' },
];

export const LEGENDARY_SPOTS = [
  { sid: 'aurorix', level: 40, at: [345, 235] },
  { sid: 'pyrothane', level: 42, at: [60, 200] },
  { sid: 'nihilorc', level: 42, at: [195, 240] },
  { sid: 'leviaqua', level: 40, at: [240, 212] },
  { sid: 'gaiadon', level: 40, at: [315, 240] },
];

export const RARITY_WEIGHT = { common: 10, uncommon: 4, rare: 1.2, starter: 0, legendary: 0 };
export const RARITY_CATCH = { common: 0.9, uncommon: 0.6, rare: 0.4, starter: 0.45, legendary: 0.12 };
export const RARITY_NAME = { common: 'Comune', uncommon: 'Non comune', rare: 'Raro', starter: 'Iniziale', legendary: 'Leggendario' };
