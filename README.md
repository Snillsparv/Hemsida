# jonasvonessen.se — ny hemsida

Ny version av Jonas von Essens personliga hemsida (ersätter den gamla Wix-sidan).

## Status: designförslag

Tre kompletta designförslag ligger i [`forslag/`](forslag/). Alla har samma innehåll
(presentation, meriter, projekt med interaktiv jordglob, kurs, sociala länkar, kontakt)
men helt olika karaktär:

| Fil | Namn | Känsla |
|---|---|---|
| `forslag/1-terminal.html` | **Superminne OS** | Mörk terminal/utvecklarverktyg — fosforgrönt, amber, boot-sekvens |
| `forslag/2-observatoriet.html` | **Observatoriet** | Elegant natt — midnattsindigo, stjärnfält, guld, serif |
| `forslag/3-lekfull.html` | **Snille & sprall** | Ljus och färgstark — candy-färger, sticker-meriter, poserna i huvudrollen |

Alla tre öppnas med en terminal-laddskärm (klickbar för att hoppa över, visas en gång
per session, respekterar `prefers-reduced-motion`).

## Förhandsgranska lokalt

```bash
npx http-server -p 8080
# öppna http://localhost:8080/forslag/1-terminal.html
```

(Sidorna måste serveras över HTTP — jordgloben hämtar `assets/globe-data.json` med `fetch`.)

## Struktur

```
index.html            – tillfällig startsida som länkar till förslagen
forslag/              – de tre designförslagen (en självständig HTML-fil per förslag)
assets/
  fonts.css, fonts/   – självhostade typsnitt (Space Grotesk, JetBrains Mono, Fraunces)
  globe.js            – lättvikts-jordglob i ren canvas (ortografisk projektion, ~7 KB)
  globe-data.json     – landpunkter + konturer, genererade från Geography-repots world-borders.json
  img/                – bilder (poser från Geography-repot, foton från HP-repot; *-md = nedskalade)
```

## Kvar att göra (behöver Jonas)

- [ ] **Välj design** (eller mixa: t.ex. layout från ett förslag + färger från ett annat)
- [ ] **Kontaktformulärets backend** — formuläret är byggt men skickar inget ännu.
      Enklast: skapa ett gratis [Formspree](https://formspree.io)-konto och klistra in
      ID:t där HTML-kommentaren `FORMSPREE` markerar.
- [ ] **TikTok-handle** — både `@jonasvonessen` och `@jonas.von.essen` finns; sidorna
      länkar till `@jonasvonessen`. Stämmer det?
- [ ] **YouTube** — länken går till kanalen `@BlueberryClubSparven` (kanalnamn "Jonas von
      Essen"). Vill du byta handle på YouTube först?
- [ ] **Fler/bättre bilder** — gärna en riktig hero-bild i hög upplösning och pressfoton.
- [ ] Domänpekning + hosting (sidan är helt statisk — GitHub Pages, Netlify, Firebase
      eller Cloudflare Pages funkar alla).

## Fakta på sidorna

Alla meriter är faktagranskade mot källor (VM i minne 2013 & 2014, Talang 2018,
Postkodmiljonären 2023, 100 000 π-decimaler/Europarekord 24 063 (2020), SM i Poetry
Slam 2026, Göteborgsmästare i ordvitsar 2026, 5× SM i pubquiz, Smartare än en
femteklassare 2020, Muren 2021, The Brain, böckerna, HP 2.0×12 + 160/160 2021).
