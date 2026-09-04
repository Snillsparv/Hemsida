# Det hemliga samhället – animation till Instagram-reelen

Animerat bildlager (9:16, 1080×1920, ~3:10) till manuset om AI-agenterna som
byggde ett hemligt samhälle inne på OpenAI. VO:n spelas in separat; det här är
det som syns. Allt är ritat i kod (canvas), så varje detalj går att ändra.

Designen följer sajtens "Tystnaden": svart, en tanke i taget, gult ljus.
Hela storyboardet med beat-lista scen för scen finns i [`STORYBOARD.md`](STORYBOARD.md).

## Förhandsgranska

Sidan måste serveras över HTTP (typsnitten laddas via `fetch`-liknande regler):

```bash
npx http-server -p 8080
# öppna http://localhost:8080/reels/hemliga-samhallet/
```

Tangenter i spelaren: **mellanslag** spela/paus · **←/→** ±1 s (skift ±5 s) ·
**, .** en bildruta · **1–7** hoppa till scen · **v** VO-guide (visar vilken
replik som ska ligga var) · **g** Instagram-säker yta · **l** loopa aktuell scen.
`?t=62` startar vid 62 s, `?autoplay` spelar direkt.

## Exportera till video

Renderingen sker bildruta för bildruta i headless Chromium, så resultatet är
exakt och stabilt (inga tappade rutor). Kräver [Playwright](https://playwright.dev)
och ffmpeg:

```bash
npm i -g playwright && npx playwright install chromium   # en gång
brew install ffmpeg                                      # eller: npm i -g ffmpeg-static

node tools/reel-render.cjs --mp4 reels/hemliga-samhallet/out/reel.mp4      # hela filmen
node tools/reel-render.cjs --mp4 out/scen3.mp4 --from 35 --to 75           # en bit
node tools/reel-render.cjs --stills 3,20.5,60 --out out/stills --scale 0.5 # stillbilder
node tools/reel-render.cjs --sheet out/karta.png --every 2                 # kontaktkarta
node tools/reel-render.cjs --list                                          # scenlista
```

MP4:n är H.264 (yuv420p, 30 fps) och laddas upp direkt i Instagram. Ljudet
(VO + ev. musik) läggs på i klippprogrammet. Mappen `out/` är git-ignorerad.

## Ändra tider

Alla scentider ligger i [`timing.js`](timing.js). Scenerna räknar lokalt från sin
egen start, så flyttar du en scens `start`/`end` följer hela scenen med. Hamnar
VO:n annorlunda i inspelningen: justera där, rendera om.

## Struktur

```
index.html      – spelaren (scrubber, VO-guide, säkra ytor)
engine.js       – tidslinjen + rithjälpare (text, prickar, linjer, agentfältet …)
icons.js        – delade streckikoner (terminal, nyckel, öga, dörr …)
style.js        – storyboardets konventioner: prickarnas tillstånd, halo, boxar, räknare, ögat, textmask
world.js        – delad data: 9×13-rutnätet, väven (vem vaknar när), solrosdisken
timing.js       – scentider + VO-repliker (bara för guiden)
scenes/NN-*.js  – en fil per scen; draw(ctx, s, t) ritar bildrutan vid lokal tid s
STORYBOARD.md   – designdokumentet
```

Grundregel för scenerna: allt är en ren funktion av tiden. Inget tillstånd
sparas mellan bildrutor, all slump är seedad (`REEL.rng`, `REEL.hash`). Då går
det att scrubba, loopa och rendera identiskt varje gång.
