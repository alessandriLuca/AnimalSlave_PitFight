# AnimalSlave: Pit Fight

Gioco 3D in terza persona che gira nel browser: catturi, alleni e fai combattere creature,
un po' come i giochi di mostriciattoli e come le battaglie tra mascotte. È un sito
**statico al 100%**, senza build e senza server: lo carichi su Cloudflare Pages e funziona.

## Cosa c'è dentro

- **60 creature** originali, tutte fatte in 3D procedurale con 7 tipi di corpo (quadrupedi, bipedi, uccelli, serpenti, blob, pesci, insetti), con animazioni
- **10 tipi** (Bestia, Fuoco, Acqua, Erba, Elettro, Terra, Aria, Ghiaccio, Ombra, Luce) con tabella delle efficacie
- **56 mosse**: attacchi, cure, potenziamenti, malus e stati alterati (scottatura, veleno, paralisi, sonno, congelamento)
- **Mondo aperto** con 7 zone: Prati, Bosco, Palude, Deserto, Steppa Gelata, Vulcano, Rovine
- **Creature selvatiche visibili** che girano per il mondo: ti avvicini e le sfidi (nome verde = non ancora catturata)
- **La tua creatura in testa alla squadra ti segue** come una mascotte
- **Battaglie a turni nel mondo**: arena che compare sul posto, camera cinematografica, proiettili, particelle e numeri dei danni
- **Cattura** con 3 tipi di sfere; la probabilità dipende da PS, stato, rarità e livello
- Livelli, esperienza, **mosse nuove** (scegli quale dimenticare) ed **evoluzioni**
- **8 allenatori**, **6 Capi Zona** (ognuno dà un Sigillo) e il **Gran Maestro della Fossa** come boss finale, con rivincite sempre più difficili
- **5 leggendari** nascosti ai bordi del mondo
- Centro Cura, Bottega, Santuari di cura con viaggio rapido, Box per le creature in più
- Bestiario completo, minimappa, mappa del mondo, salvataggio automatico (localStorage)
- Musica ed effetti sonori sintetizzati (WebAudio), comandi touch per il telefono

## Comandi

| Tasto | Azione |
|---|---|
| WASD / frecce | Muoviti |
| Shift | Corri |
| Trascina il mouse / Q, R | Ruota la camera |
| Rotella | Zoom |
| E | Interagisci / sfida una creatura |
| Tab / I | Menu (squadra, box, bestiario, zaino, mappa, sistema) |
| M | Mappa |
| 1-4, Esc, Spazio | Scelte in battaglia, indietro, salta il testo |

Su telefono: joystick a sinistra, trascina a destra per la camera, pulsanti a schermo.

## Provarlo in locale

Serve solo un server statico, perché i moduli ES non si caricano da `file://`:

```bash
cd public && python3 -m http.server 8080
```

Poi apri http://localhost:8080

## Pubblicarlo su Cloudflare Pages

### Opzione A: dalla dashboard (consigliata)

1. Vai su Cloudflare, poi **Workers & Pages**, poi **Create**, poi **Pages**, poi **Connect to Git**
2. Scegli il repository `AnimalSlave_PitFight`
3. Impostazioni di build:
   - **Framework preset**: None
   - **Build command**: *(vuoto)*
   - **Build output directory**: `public`
4. Clicca **Save and Deploy**. Ogni push sul branch di produzione ripubblica il sito da solo.

### Opzione B: da terminale con Wrangler

```bash
npx wrangler pages deploy public --project-name animalslave-pitfight
```

(Il file `wrangler.toml` ha già `pages_build_output_dir = "public"`.)

## Struttura

```
public/
  index.html          pagina
  css/style.css       interfaccia
  js/main.js          ciclo di gioco, NPC, salvataggi, eventi
  js/data.js          tipi, mosse, 60 specie, zone, oggetti, allenatori
  js/creature.js      statistiche, esperienza, evoluzioni
  js/models.js        modelli 3D procedurali (creature, umani, sfere, ritratti)
  js/world.js         terreno a zone, vegetazione, villaggio, Fossa, santuari
  js/player.js        input, giocatore, camera in terza persona, compagno
  js/wild.js          creature selvatiche e leggendari
  js/battle.js        sistema di combattimento e cattura
  js/ui.js            HUD, dialoghi, menu, negozio, bestiario
  js/fx.js            tween, particelle, proiettili, testi fluttuanti
  js/audio.js         effetti sonori e musica sintetizzati
  js/vendor/          three.js r170 (MIT)
```
