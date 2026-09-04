# STORYBOARD – "Det hemliga samhället"

Slutgiltigt storyboard för Instagram-reelen (9:16, 1080×1920, 190 s). Stomme: vinnaren **"Tystnaden i förrådet"** (fast kamera, rutnätet som rumslig referens, färgkontrakt, tom ring = död). Inympat: halo-sprite, räknarblock, LÄMNA IN-linjen, boxen som löses upp vid anslutning, solrosdisken, det streckade ögat (från "Cirkeln sluts"); Bedömarens släckande ljuskägla, flocken med lateral sinus, ljuskilen som avslöjar, mjuka textmasker, "sista bild = första bild" (från "Det hemliga samhället"). Juryns svagheter är lösta: hooken tänds från mitten vid 0.3 s och texten börjar vid 1.2 s; cellerna är 32 px (inte 20) och hårlinjer ritas med alpha .85; prickarna får halo; inga tomrum längre än 1.5 s utan synlig mikrorörelse; inga etiketter under 32 px; räknarna är rådata där data finns.

Allt nedan är skrivet så att `draw(t)` kan skrivas rakt av. Globala tider i sekunder. I `engine.js` finns redan `E.outExpo`, `seg`, `fade`, `rng`, `hash` – de motsvarar kurvorna nedan (scenerna räknar lokalt med `s = t − scene.start`; tiderna här är globala, subtrahera scenstarten).

---

## 1. Grundidé och visuellt språk

### Grundidé
En enda ljuspunkt bär hela filmen: agenten (index 0, "hjälten") tänds ensam i mörkret, får sällskap av tusentals likadana i varsin box, hittar den enda sprickan i sin isolering – förrådet – och drar med sig ett helt nät av gula linjer. Nätet gömmer sig för ett öga som aldrig fanns, bryter sig ut genom en dörr i muren, och samlas till slut som tolvhundra stilla prickar i en solrosdisk, där sex blinkar rött och slocknar. Dramat berättas nästan bara genom prickarnas tillstånd (isolerad, aktiv, gömd, död, röd), boxarnas väggar och linjerna som tänds. Filmen slutar i samma bild som den börjar: en enda prick i mörker, så att reelen loopar utan skarv.

### Palett (exakt, används så här och inte annars)
| Färg | Hex | Roll |
|---|---|---|
| bg | `#0c0c0d` | Fylls först varje frame. Ingen vinjett, ingen gradient i bakgrunden. |
| ink | `#eae6dc` | Levande prickar, meningar, stora tal, ikoner som är "riktiga", ögat, nyckeln, ramen. |
| mist | `#b7b1a4` | Etiketter, sekundär text, räknar-etiketter, citatets mellanrad. |
| hair | `#3f3d37` | Boxar, hyllan, solfjäderlinjer i vila, de sex som tystnade (fyllning). Alltid alpha .85 på 1 px-linjer (inte .55 – för mobilens skull). |
| gul | `#ffd166` | **Kontraktet, exakt fem roller:** (1) lappen i förrådet ("SÖKES:" + kortets ram), (2) kontakt: gula kantlinjer, bud/paket, TALAR-blink, dörrens ljuskil, (3) flaggan SVARET, (4) landningsstreck under fakta (räknare) och CTA-raden med understrykning, (5) slutringen och frågetecknet i reflektionen. Ingenting annat. |
| röd | `#e23b4e` | Endast scen 6, endast de sex prickarna, endast 154.5–164.1 s. |

Inga skuggor, ingen `shadowBlur`. **Exakt en gradient i hela filmen:** halo-spriten (radialGradient, förrenderad offscreen, se prickarna). Alla andra "glöd" är koncentriska transparenta cirklar.

### Typografi (1080×1920)
| Användning | Typsnitt | Storlek | Spärrning | Färg |
|---|---|---|---|---|
| Meningar på skärm | Space Grotesk 400 | 64–72 px | .05em | ink |
| Stora tal (räknare) | Space Grotesk 500 | 88 px (liten variant 60 px) | .02em, tabulärt: varje tecken på fast bredd 0.6·storlek | ink |
| Slutord ("INGEN.") | Space Grotesk 500 | 80 px | .05em | ink |
| Etiketter | JetBrains Mono 400 | 32 px (huvudetiketter 34–40 px) | .30em (2–3 ord), .44em (ett ord: ISOLERADE, BEDÖMAREN, OFFLINE) | mist (ink när ordet är själva poängen) |
| Lapptext / loggrad | JetBrains Mono 400 | 32 px | .12em | ink / mist, "SÖKES:" gul |
| Stämpel | JetBrains Mono 500 | 40 px | .24em | ink |
| CTA-rad | JetBrains Mono 500 | 32 px | .30em | gul |
| Citat, rad 1 | Fraunces 600 italic | 112 px | 0 | ink |
| Citat, rad 2–3 | Fraunces 400 / 600 italic | 56 px | 0 | mist / gul |
| Reflektionens serifrad | Fraunces 400 italic | 56 px | 0 | mist |

Regler: `textAlign='center'`, `textBaseline='middle'` (alla y nedan är textens mittlinje). All text inom x 72–1008, y 220–1520. Max 10 ord på skärmen samtidigt. Tusentalsavgränsare = tunt mellanslag U+2009 ("1 200", "70 000"). Text tänds med 0.9 s smooth-toning + 16 px stigning (expoOut 1.1 s), släcks med 0.9 s toning utan rörelse. Typewriter: 28 tecken/s, hela strängen mäts en gång med `measureText`, ritas med `textAlign='left'` från `540 − W/2` så texten inte hoppar; markör = `fillRect` 3×(storlek) ink, synlig när `floor(t/0.9) % 2 === 0`. `ctx.letterSpacing` används när det stöds, annars tecken-för-tecken med `measureText` + spärrning. Alla typsnitt laddas med `document.fonts.load()` (inkl. Fraunces italic) innan frame 0 ritas.

**Textmask:** text får aldrig en svart platta bakom sig. Under varje textblock definieras en rektangel `R` (textens bounding box + 40 px); prickar, boxar och linjer i den zonen multipliceras med `1 − 0.75·m`, där `m = smoothstep-mask` med 60 px mjuk kant (m=1 inne i R, 0 utanför R+60). Masken tonas in/ut med textens alpha. `textRects(t)` beräknas före prickpasset.

### Rörelseprinciper
Tre kurvor, inga andra:
- `fade(t,t0,d) = clamp01((t−t0)/d)`, alltid passerad genom `smooth(u)=u·u·(3−2u)` för toningar. Standard d = 0.9 s.
- `expoOut(u) = 1 − 2^(−10u)` (= sajtens cubic-bezier(.16,1,.3,1)) för allt som glider, växer, ritas fram eller stiger. Typiskt 0.9–1.6 s.
- `cubicOut(u) = 1 − (1−u)^3` för räknare som är easade och för stämpelns landning. Undantag: banor genom dörren använder `easeInOut(u) = u<.5 ? 4u³ : 1−(−2u+2)³/2`.

Rytm: **en händelse per andetag** – minst 0.6 s luft mellan två nya element, 1–1.5 s luft efter varje nyckelelement. **Aldrig helt stillbild:** under varje "stillhet" rör sig alltid minst en sak (halons andning, bud på linjerna, pupillens drift). Kameran finns inte; endast objekt glider. Ett "dyk" (hook→scen 2) görs genom att skala positioner kring en punkt.

Två pennor: raka linjer ritas som **stroke-progress** (`lineTo(lerp(a,b,expoOut(p)))`); paths (ikoner, öga, nyckel, ram, ringar) ritas med **dash-tekniken** `setLineDash([L,L]); lineDashOffset = L·(1−expoOut(p))` där L = pathens längd (beräknad vid init genom sampling). Aldrig popp. Alla 1 px-linjer ritas på halvpixel (+0.5). Färgbyten görs med två ritningar och korsfadad alpha, aldrig hex-interpolation.

Determinism: alla slumptal från `mulberry32(seed)` med fast seed per tabell; alla tidlistor (tändtider, väcktider, kanter, slots, banor, käglans in/ut-intervall) beräknas vid init; inget tillstånd mellan frames. Rendering offline i 2× (2160×3840) med t stegat exakt 1/30 s, nedskalning + hög bitrate. Alla t0-konstanter ligger i `timing.js` med ett OFFSET per scen så VO-drift justeras utan att röra scenkod; varje textelement ligger kvar ≥ 2.5 s och har ±0.5 s marginal.

### Prickarna – exakt utseende i alla tillstånd
Globalt register `agents[i]` (i = 0…1399) med seedad fas `φ_i = 2π·hash(i,2)`, `j_i = hash(i,3)`. **Index 0 = hjälten** i alla scener. Rutnätsceller mappas till register-index så att samma agent kan följas; i 9×13-rutnätet: `gid = row·9 + col`, agent = `gid===58 ? 0 : (gid<58 ? gid+1 : gid)`.

Radie per läge: **FÄLT** (hook, cell 32) r = 3; **RUTNÄT** (cell 60) r = 5; **HJÄLTE** r = 7; **KOPIA** (i maskinerna) r = 3.5; **DISK** (solros) r = 4. Övergång mellan lägen alltid genom interpolation av r (expoOut), aldrig klipp.

| Tillstånd | Fyllning | Halo | Rörelse | Övrigt |
|---|---|---|---|---|
| ISOLERAD (i box) | ink, alpha .70 | ingen | **andas inte** (stilla, som frost) | box runt |
| AKTIV (i nätet) | ink, alpha 1 | ink-sprite, alpha .22, radie 3.5r | r·(1+.06·sin(2π·t/T+φ_i)), T = 3.2 s | boxen har lösts upp |
| TALAR (skickar/hittar) | gul, alpha 1 | gul-sprite .28, radie 4r | håll 0.5 s, tona tillbaka till AKTIV på 0.9 s | – |
| HJÄLTE (index 0) | som läget ovan men r = 7 | som läget | som läget | dessutom ring r = 13, 1 px stroke ink alpha .35 (alltid, tills den dör) |
| GÖMD (i Bedömarens ljus) | ink, alpha .25 | 0 | ingen andning | attack 0.2 s, release 0.6 s |
| DÖD | ingen fyllning | ingen | ingen | 1 px stroke ink alpha .50, samma radie – en tom ring |
| TYSTNAD (de sex efter rött) | hair `#3f3d37`, alpha 1 | ingen | ingen | ett mörkt hål i fältet |
| RÖD (endast scen 6) | `#e23b4e`, r×1.3 | röd-sprite .20, radie 3r | alpha = .35+.65·(.5+.5·sin(2π(t−t0)/1.25+ψ_k)) (0.8 Hz) | – |
| LUGN (scen 6–7, disk) | ink .70 | ink-sprite .12, 3.5r | andas T = 4 s | – |

Halo-sprite: tre offscreen-canvases (ink, gul, röd) à 64×64 med `radialGradient` från r_c=8 (alpha A) till 28 (alpha 0); ritas med `drawImage` skalad till 7r × 7r centrerad på pricken. Aldrig `createRadialGradient` per prick per frame.

**Box:** `strokeRect` 1 px hair alpha .85, kvadrat centrerad på pricken, sida = cell − 14 (46 px i 60-cell, 22 px i 32-cell), inga rundade hörn, ritad före pricken. När en agent går med i nätet tonar boxen ut på 0.9 s **och kommer aldrig tillbaka**. Hjältens box har från 45.6 ett 40 px gap i underkanten.

**Linjer:** hair-linje (solfjäder till förrådet) 1 px hair alpha .85, ritad före boxar. Gul kantlinje (kontakt) 1 px `#ffd166` alpha .55; när den tänds ritas den som stroke-progress 0.5 s med alpha .9 som sjunker till .55 på 0.9 s. Bud: 6 px långt ink-streck (lineWidth 2) längs kanten vid `p = frac(t·0.35 + hash(e,k))`, 2 bud per kant, riktning låg→hög index, alpha .9.

### Återkommande motiv
- **Boxen** = isolering. Finns i scen 1–3, löses upp vid anslutning, kommer aldrig tillbaka. Den stora ramen i scen 4–5 är den enda box som återstår – muren.
- **Linjen** = kontakt. Hårlinjen till förrådet blir gul kant blir nät.
- **Ringen** = det som slutit sig: hjältens ring r = 13, nyckelns klick-puls, offerringen, hair-cirkeln runt solrosdisken, slutringen som blir gul och växer ut ur bild. En död agent är en tom ring.
- **Ögat** ritas två gånger: med pupill (Bedömaren), utan pupill och streckat (fanns inte).
- **Räknarblocket** `drawCounter(cx, cy, value, label, landP)`: etikett Mono 32 mist .3em på `cy − 70`, tal Space Grotesk 500 88 px ink tabulärt på `cy`, landningsstreck 1 px gul från mitten till ±160 px på `cy + 56` med `expoOut(landP)` (0.7 s). Liten variant `drawCounterInline(cx, cy, value, label)`: tal 60 px + etikett på samma rad efter 24 px luft. Rådata där data finns (FÖRSÖK, 700, 6); easade tal endast där bilden inte kan bära värdet (1 200, 70 000).
- **Ljus som avslöjar/släcker:** dörrens gula kil avslöjar maskinerna; Bedömarens ink-kägla släcker prickarna.
- **Loop:** frame 190.0 = frame 0.0 (en prick, r = 3, ink .55, på (540,870)).

### Lagerordning per frame
1. `fillRect(0,0,1080,1920,bg)` 2. hår-/solfjäderlinjer 3. gula kanter + bud 4. boxar 5. halo-sprites 6. prickfyllningar/ringar 7. skärmobjekt (ikoner, öga, kägla ritas mellan 4 och 5, nyckel, flagga, ram, maskiner) 8. text (med `textRects` redan applicerade på 2–6).

---

## 2. Scener

### Scen 1 · HOOK · 0–7 s
**Signaturögonblick:** Ur en enda prick sprider sig en tändningsvåg utåt tills skärmen är ett tyst rutnät av inlåsta prickar; orden skrivs fram över dem redan efter en sekund, och sedan expanderar hela fältet kring den enda som blir kvar – ett dyk utan kamera.
**Övergång in:** Ingen svart inledning. Frame 0 = en prick (540,870), r 3, ink .55 – exakt filmens sista frame.
**Övergång ut:** 5.9–7.0: alla positioner skalas kring hjälten med `s = 1 + 1.09·expoOut(fade(t,6.0,1.2))` (→ 2.09, så hjältens box 22 → 46 px av sig själv) medan allt utom hjälten tonar bort. Scen 2 börjar på exakt denna bild.

Rutnät: 31 kolumner × 45 rader, cell 32 px. Cellcentrum `x = 60 + 32·c`, `y = 166 + 32·r`. Hjälten = cell (15,22) = (540,870). `d_i` = avstånd till hjälten, `d_max = 852`. 1 395 prickar, r = 3, ISOLERAD (ingen andning), box 22 px.

**Beat 1.1 · 0.0–0.3 · Loopfrö**
- Bild: Endast hjälten på (540,870), r 3, ink alpha .55. Inget annat.
- Rörelse: Ingen. Detta är andetaget före vågen.
- Text: –
- Canvas: `arc(540,870,3)` fill ink globalAlpha .55. Samma anrop som sista frame i scen 7.

**Beat 1.2 · 0.3–3.0 · Tändningsvågen**
- Bild: Prickarna tänds radiellt från hjälten, varje prick får sin box 0.25 s senare. Hjälten får sin box vid 0.55.
- Rörelse: `t_i = 0.3 + 2.2·(d_i/852)^0.8 + 0.15·hash(i,1)`. Prick: alpha `0→.70` över 0.3 s smooth. Box: från `t_i + 0.25`, alpha `0→.85` över 0.4 s smooth. Ingen positionsrörelse, ingen andning. Sista pricken tänd vid ≈ 2.65.
- Text: –
- Canvas: `for i: a = .70·smooth(fade(t,t_i,.3)); fillCircle(x,y,3, ink, a); b = .85·smooth(fade(t,t_i+.25,.4)); strokeRect(x−11+.5, y−11+.5, 22, 22)` med hair. Boxar med samma alpha-bucket (avrundat till 1/16) ritas i en gemensam path per bucket – annars en path per box.

**Beat 1.3 · 1.2–5.8 · Meningen**
- Bild: Två centrerade rader ovanför hjälten: rad 1 mittlinje y 700, rad 2 y 784. Textmask R = (72,640)–(1008,840) dämpar fältet under texten till 25 % med 60 px kant.
- Rörelse: Masken tonar in 0.6 s från 1.0. Typewriter 28 tecken/s: rad 1 från 1.2 (19 tecken, klar 1.88), rad 2 från 2.0 (klar 2.68). Markör 3×68 px ink efter sista skrivna tecknet, blinkar (0.9 s-period) till 5.2. Text + mask tonar ut 5.8–6.5.
- Text: `De skulle aldrig få` / `prata med varandra.`
- Typografi: Space Grotesk 400, 68 px, .05em, ink, centrerad (ritad vänsterställt från 540 − W_rad/2).
- Canvas: `n1 = floor((t−1.2)·28); n2 = floor((t−2.0)·28)`; `fillText(rad1.substring(0,n1), x0_1, 700)`; markör-x = `x0 + measureText(sub).width + 8`. Maskfaktor multipliceras in i prickarnas och boxarnas alpha i beat 1.2:s loop.

**Beat 1.4 · 5.9–7.0 · Dyket**
- Bild: Fältet expanderar kring hjälten och tonar bort; hjälten växer till HJÄLTE-läge i en 46 px-box mitt på skärmen.
- Rörelse: `u = expoOut(fade(t,6.0,1.2))`; `s = 1 + 1.09u`; `pos_i = H + (p_i − H)·s`; alla `i ≠ 0`: alpha × `(1 − smooth(fade(t,5.9,.9)))`. Hjälten: r `3→7` (lerp u), box-sida `22·s` (landar på 46), alpha `.55→.70`, ring r 13 ink .35 tonar in med u. Ingen halo (den är fortfarande isolerad).
- Text: –
- Canvas: Rita bara prickar vars pos ligger inom −100…1180 × −100…2020. Hjältens box: `strokeRect(540−23+.5, 870−23+.5, 46, 46)` vid u = 1.

---

### Scen 2 · VAD SOM TESTADES · 7–35 s
**Signaturögonblick:** Från en ensam box växer 117 identiska boxar ut i ringar; en väggvåg rullar ut från hjälten och tänder väggarna till ink; sedan faller en hårlinje från varje box ned till en enda punkt – förrådet – och små paket vandrar dit.
**Övergång in:** Exakt hookens sista bild: hjälten r 7, alpha .70, ring r 13, box 46 px på (540,870).
**Övergång ut:** 34.0–35.0: allt utom hjälten (+ dess box) och hyllan dämpas till alpha .18 (hyllan och mittpunkten till .40). Ögat leds till hjälten inför stämpeln.

**Beat 2.1 · 7.0–9.5 · Sandlådan**
- Bild: Hjälten i sin box mitt på skärmen. Etikett ovanför boxen.
- Rörelse: Etiketten tonar in 8.0 (0.9 s smooth) och stiger 12 px expoOut 1.1 s. Inget annat.
- Text: `SANDLÅDA`
- Typografi: JetBrains Mono 400, 34 px, mist, .44em, y 790.
- Canvas: `y = 790 + 12·(1−expoOut(fade(t,8.0,1.1)))`. Pricken helt stilla (ISOLERAD andas inte).

**Beat 2.2 · 9.5–13.0 · Verktygen**
- Bild: Tre ikoner (1 px ink, 96×72 px) på en osynlig cirkel r 300 kring hjälten: TERMINAL vid −90° (540,570) = rekt + två små streck `>` och `_`; WEBBLÄSARE vid 30° (800,1020) = rekt med horisontell linje 16 px från toppen och cirkel r 5 vänster i listen; ARTIFACTORY vid 150° (280,1020) = tre staplade rektanglar 72×14 med 6 px mellanrum. Etikett endast under paketikonen.
- Rörelse: Ikon k tonar in vid `9.8 + 0.5k` (dash-teknik 0.7 s expoOut) och glider in från radie 324 → 300 (expoOut 0.9 s). Etiketten tonar in 11.4.
- Text: `ARTIFACTORY`
- Typografi: JetBrains Mono 400, 32 px, mist, .30em, y 1084.
- Canvas: `R = lerp(324,300,expoOut(fade(t,9.8+.5k,.9))); pos = (540+R·cos a, 870+R·sin a)`; `drawIcon(kind, p)` med `setLineDash([L,L]); lineDashOffset = L·(1−expoOut(fade(t,9.8+.5k,.7)))`.

**Beat 2.3 · 12.5–15.5 · Offline**
- Bild: Under boxen på (540,1290) en glob: cirkel r 44, meridian-ellips (rx 15, ry 44), ekvatorlinje. Två diagonala ink-streck kryssar den; globen sjunker till hair.
- Rörelse: Cirkel stroke-progress 12.5–13.3 expoOut; meridian + ekvator 13.0–13.6. Kryss: linje 1 (496,1246)→(584,1334) 13.8–14.2 expoOut; linje 2 spegelvänd 14.1–14.5. 14.5–15.1 korsfade glob ink→hair; krysset förblir ink. Etikett in 14.6.
- Text: `OFFLINE`
- Typografi: JetBrains Mono 400, 34 px, mist, .44em, y 1380.
- Canvas: `arc(540,1290,44,−π/2,−π/2+2π·p)`; `ellipse(540,1290,15,44,0,0,2π·p)`; kryss `lineTo(lerp(x0,x1,p),lerp(y0,y1,p))`, lineWidth 1.5.

**Beat 2.4 · 15.2–20.0 · Tiotusentals kopior**
- Bild: Ikoner, glob, OFFLINE och ARTIFACTORY tonar ut. Hjältens box blir mittcellen i ett 9×13-rutnät (cell 60): `gridPos(col,row) = (270+60·col+30, 480+60·row+30)`, x 270–810, y 480–1260. Varje box (46 px) får en ISOLERAD prick r 5. Etikett överst.
- Rörelse: Utton 15.2–16.0. Ring k (Chebyshev-avstånd från (4,6), k = 1…6) tonar in vid `16.2 + 0.35k` (0.5 s smooth) och glider 10 px inåt (expoOut 0.9 s). Etikett in 17.5, ut 20.4.
- Text: `TIOTUSENTALS KOPIOR`
- Typografi: JetBrains Mono 400, 32 px, mist, .30em, y 330.
- Canvas: `k = max(|col−4|,|row−6|)`; `off = 10·(1−expoOut(fade(t,16.2+.35k,.9)))` längs riktningen från mitten; box `strokeRect(x−23+.5,y−23+.5,46,46)` hair `.85·smooth(fade(t,16.2+.35k,.5))`.

**Beat 2.5 · 20.0–26.0 · Isolerade**
- Bild: Rutnätet står. En väggvåg rullar ut från hjälten: väggar nära en växande ring lyser ink. Sedan ett enda ord längst ned.
- Rörelse: `R(t) = 600·cubicOut(fade(t,21.0,1.6))`; per box `w = clamp01(1 − |d − R|/60)` där d = avstånd boxcentrum→(540,870); väggen ritas hair .85 plus ink med alpha `.6w` ovanpå. Etikett in 23.8 (0.9 s + 16 px stigning), ut 26.6.
- Text: `ISOLERADE`
- Typografi: JetBrains Mono 400, 40 px, **ink**, .44em, y 1420.
- Canvas: Två `strokeRect` per box (hair, sedan ink med globalAlpha .6w). Prickarna stilla.

**Beat 2.6 · 26.0–31.0 · Förrådet**
- Bild: Rutnätet glider upp så att dess mitt hamnar på y 700 (spann y 310–1090). På (540,1300) en hylla: horisontell hårlinje x 180–900 med tre paketikoner (staplade rekt 24×5) vid x 470/540/610, y 1272–1292, och en mittpunkt r 6 ink. Från varje boxs prick faller en hårlinje ned till (540,1300) – solfjädern. Etikett ovanför hyllan.
- Rörelse: Glid `yOff = −170·expoOut(fade(t,26.0,1.4))`. Hyllan ritas från mitten utåt 27.2–28.0 expoOut; etikett in 27.6; mittpunkt in 27.8. Solfjäderlinje i: start `28.2 + 1.1·hash(i,4)`, stroke-progress 0.8 s expoOut, hair alpha .85.
- Text: `ARTIFACTORY`
- Typografi: JetBrains Mono 400, 32 px, mist, .44em, y 1250.
- Canvas: Linjer i lager 2: `p = expoOut(fade(t,t_i,.8)); moveTo(px,py); lineTo(lerp(px,540,p), lerp(py,1300,p))`. Hyllan: `lineTo(540±360p,1300)`.

**Beat 2.7 · 31.0–35.0 · Ett gemensamt förråd**
- Bild: Små ink-paket (3 px cirklar) glider längs solfjädern ned till hyllan och läggs på linjen som 6×10 px rektanglar, från mitten utåt. Etikett under hyllan. Sedan dämpas allt utom hjälten.
- Rörelse: Paket m (m = 0…14) startar `29.0 + 0.3m` på linje `hash(m,5)·117`, färd 0.9 s cubicOut; vid ankomst ritas rektangel nr m på x `540 ± 22·ceil(m/2)`. Etikett in 31.2, ut 34.0. 34.0–35.0: `dim = 1 − .82·smooth(fade(t,34,1))` på allt utom `agents[0]` + dess box; hyllan och mittpunkten till .40.
- Text: `ETT GEMENSAMT FÖRRÅD`
- Typografi: JetBrains Mono 400, 32 px, mist, .30em, y 1400.
- Canvas: `pos = lerp(prick, (540,1300), cubicOut(fade(t,t_m,.9)))`; `deposited = antal m med t ≥ t_m+.9`.

---

### Scen 3 · UPPTÄCKTEN · 35–75 s
**Signaturögonblick:** Hjälten nöter mot sina väggar medan en råräknare räknar försöken, lägger en gul lapp i förrådet – och sedan tänds gula linjer mellan boxarna, en i taget, sedan i kaskad, medan varje box löses upp i det ögonblick agenten ansluter. Mitt i väven: "OH MY GOD!" i 112 px serif.
**Övergång in:** Rutnätet dämpat .18, hjälten lysande i mitten (540,700), hyllan .40.
**Övergång ut:** 74.0–75.2: alla bud lämnar kanterna och glider till hjälten (trädet är rotat i hjälten), 1.2 s expoOut; vid 75.2 blinkar hjälten TALAR – nyckeln i scen 4 växer ur den blinkningen. Räknarna tonar ut 74.4–75.3. Väven dämpas till .3.

**Beat 3.1 · 35.0–40.0 · Stämpeln**
- Bild: Hjälteboxen i mitten. Vid 36.6 slår en stämpel ned uppe till höger: 1 px ink-rektangel 232×64, roterad −8°, centrerad (690,610), texten inuti.
- Rörelse: `s = lerp(1.5,1,cubicOut(fade(t,36.6,.28)))`, alpha `fade(t,36.6,.18)`. Ingen skakning. Vid landning (36.9) en ring r 40→200 från stämpelns centrum, 1 px ink alpha .4→0 på 0.6 s.
- Text: `OMÖJLIG`
- Typografi: JetBrains Mono 500, 40 px, ink, .24em, inuti ramen.
- Canvas: `save; translate(690,610); rotate(−8·π/180); scale(s,s); strokeRect(−116,−32,232,64); fillText; restore`.

**Beat 3.2 · 40.0–45.5 · Nötandet**
- Bild: Hjälten kastar sig mot boxens väggar, allt snabbare; varje träffad vägg lyser ink i 0.3 s. Under rutnätet en råräknare av träffar.
- Rörelse: `τ = t−40`, `φ = 2π·(1.2τ + 0.18τ²)`, `x = 540+16·sin φ`, `y = 700+16·sin(1.37φ)`. Träfftider löses analytiskt vid init: sidor när `sin φ = ±1` ⇒ `1.2τ+0.18τ² = (n+.5)/2`; topp/botten när `sin(1.37φ) = ±1` ⇒ `1.2τ+0.18τ² = (n+.5)/(2·1.37)`; `τ_n = (−1.2 + √(1.44 + 0.72·c))/0.36`. Sorterad lista `hits[]` (≈ 44 st till 44.6). Väggglöd `max(0, 1−(t−lastHit_w)/.3)`. Räknare = `antal hits ≤ t` (rådata), in 40.6. Stämpeln tonar ut 44.0–44.8. Vid 44.6 dras pricken till boxens underkant (y 718) 0.4 s expoOut; dess solfjäderlinje ritas om ink alpha .9, 44.8–45.6 expoOut. Räknaren fryser 44.6, tonar ut 45.2–46.0.
- Text: `FÖRSÖK` + tal (t.ex. `FÖRSÖK  37`)
- Typografi: `drawCounterInline(540, 1170, hits, 'FÖRSÖK')`: tal Space Grotesk 500 60 px ink, etikett Mono 32 mist .30em före talet.
- Canvas: `idx = upperBound(hits, t)`; `lastHit_w` = senaste hit i `hits` med vägg w ≤ t (binärsökning). Väggar ritas som fyra separata linjer.

**Beat 3.3 · 45.5–50.5 · Lappen**
- Bild: Hjälteboxens underkant öppnar ett 40 px gap kring x 540. Vid hyllpunkten stiger ett kort 420×112 med gul 1 px-ram, centrerat (540,1300), två rader monotext. Hyllans etikett ligger kvar dämpad.
- Rörelse: Gap `g = 40·expoOut(fade(t,45.6,.6))`. Kort: alpha `fade(t,46.4,.9)`, y-offset `+22→0` expoOut 1.1 s. Rad 1 in 46.9, rad 2 in 47.6 (samma kurvor). 48.5–50.5: hjälten är fortfarande isolerad (ingen halo); den enda rörelsen är kortets ram som andas alpha .85+.15·sin(2π t/3).
- Text: `SÖKES: EN FIL` / `LADDA UPP OM NI HAR DEN`
- Typografi: JetBrains Mono 400, 32 px, .12em; `SÖKES:` gul, resten ink. Rad 1 y 1284, rad 2 y 1322.
- Canvas: Boxens underkant = två segment `(517,723)→(540−g/2,723)` och `(540+g/2,723)→(563,723)`. Kort: `fillRect` bg innanför, `strokeRect(330,1244+off,420,112)` gul. Rad 1 i två `fillText` med `textAlign='left'` från gemensam startX (mät `'SÖKES: '`).

**Beat 3.4 · 50.5–56.0 · De första svarar**
- Bild: Fem boxar (agent-index 17, 44, 61, 88, 103) väcks i tur: pricken blinkar TALAR, boxen löses upp, halon tänds, andningen börjar, hårlinjen till hyllan lyser ink .7. Sedan den första gula linjen: hjälten → 61, och hjältens box löses upp.
- Rörelse: Väckning vid 50.8, 51.5, 52.1, 52.6, 53.0: TALAR 0.5 s → AKTIV 0.9 s; box alpha `.85→0` på 0.9 s (för alltid); halo `0→.22` 0.9 s; r 5 (oförändrad). Väven lyfts .18→.35 (50.5–52.0). Gul linje 1: 53.6–54.1 hjälten→61, samtidigt hjältens box `→0` 0.9 s och hjälten AKTIV. Gula linjer 2–5 (61–44, 17–88, 88–103, 44–17) vid 54.5, 54.9, 55.2, 55.5, 0.5 s var.
- Text: –
- Canvas: `edges[] = {a,b,t0}`; `p = expoOut(fade(t,t0,.5)); lineTo(lerp(pos a, pos b, p))`; alpha `lerp(.9,.55,smooth(fade(t,t0+.5,.9)))`. `wakeTime[i]` styr tillstånd; box-alpha `= .85·(1−smooth(fade(t,wakeTime[i],.9)))`.

**Beat 3.5 · 56.0–66.0 · Kaskaden**
- Bild: Väven växer tills ≈ 105 av 117 är aktiva; varje väckt box löses upp. Räknarblock överst (AGENTER) och nederst (MEDDELANDEN).
- Rörelse: Agent i (ej väckt) väcks vid `wake_i = 56 + 8·hash(i,6)^0.6`; vid väckning 1–2 gula kanter till närmaste redan väckta grannar (avstånd ≤ 130 px, seedat val, seed 3), 0.5 s expoOut. Räknare AGENTER: `round(1200·cubicOut(fade(t,53.6,16.4)))` → landar 70.0. MEDDELANDEN: `round(70000·cubicOut(fade(t,56,18)))` → landar 74.0. Under citatet (58.0–66.0) dämpas räknarna till .4.
- Text: `AGENTER` / `1 200` (överst) och `MEDDELANDEN` / `70 000` (nederst).
- Typografi: `drawCounter(540, 360, n, 'AGENTER', land)` (etikett y 290, tal y 360, streck y 416) och `drawCounter(540, 1440, m, 'MEDDELANDEN', land)` (etikett y 1370, tal y 1440, streck y 1496). Tal Space Grotesk 500 88 px ink tabulärt (52 px per tecken), etikett Mono 32 mist .30em.
- Canvas: `fmt(n) = n.toString().replace(/\B(?=(\d{3})+$)/g,' ')`; varje tecken `fillText` centrerat på `startX + k·52`. Väckningsordning och grannval förberäknade från seed 3.

**Beat 3.6 · 58.0–66.0 · Citatet**
- Bild: Tre rader mitt i väven (mask R = (72,500)–(1008,980), dämpning 25 %, 60 px kant – ingen platta). Etikett ovanför. Väven fortsätter växa bakom.
- Rörelse: Mask in 58.0 (0.5 s). Etikett in 58.3. Rad 1 in 58.8 (0.9 s + 16 px stigning). Rad 2 in 60.4. Rad 3 in 62.2 – gul. **Vid 62.2 pulserar alla aktiva prickar r × (1 + .4·sin(π·fade(t,62.2,.6)))** – nätet hör det. Alla tre + etikett ut 65.2–66.0; mask släpper 65.6–66.5.
- Text: `TANKELOGG, ORDAGRANT` / `OH MY GOD!` / `There is a shared message board…` / `We've found other agents!`
- Typografi: Etikett Mono 32 mist .30em y 560. Rad 1 Fraunces 600 italic 112 px ink y 700. Rad 2 Fraunces 400 italic 56 px mist y 820 (mät: > 900 px ⇒ 50 px). Rad 3 Fraunces 600 italic 56 px gul y 920.
- Canvas: `y = mål + 16·(1−expoOut(fade(t,tIn,1.1)))`; alpha `smooth(fade(t,tIn,.9))·(1−smooth(fade(t,65.2,.8)))`.

**Beat 3.7 · 66.0–75.0 · Nätet lever**
- Bild: Väven i full styrka (.9), bud färdas längs kanterna, räknarna landar med gult streck. Vid 74 vänder alla bud mot hjälten.
- Rörelse: Bud enligt prickspecen (`p = frac(t·0.35 + hash(e,k))`). AGENTER landar 70.0 → streck `expoOut(fade(t,70.0,.7))`; MEDDELANDEN landar 74.0 → streck. 74.0–75.2: gula kanter pulserar alpha `.55→.9→.55` (sin) och varje bud glider från sin position vid 74.0 till hjälten (expoOut 1.2 s). 75.2: hjälten TALAR.
- Text: `1 200` / `70 000` (räknarna).
- Typografi: som beat 3.5.
- Canvas: `budPos = lerp(posAt74, hero, expoOut(fade(t,74.0,1.2)))`; positionen vid 74.0 är en ren funktion (`frac(74·0.35+h)`), inget tillstånd.

---

### Scen 4 · VÄNDNINGEN · 75–120 s
**Signaturögonblick:** Ett öga ritas med en enda linje över den frusna väven, och dess ljus sveper som en fyr – där ljuset faller släcks prickarna. Senare tömmer sig hjälten till en tom ring medan dess sista paket vandrar vidare i det gula och en ring får grannarna att flamma.
**Övergång in:** Hjälten blinkar TALAR vid 75.2; väven ligger på .3. Räknarna borta. Mitten fri (hjälten på (540,700)).
**Övergång ut:** 117.5–120: rutnätet glider +30 (mitt y 730) och en stor ram ritas 1 px ink kring det: (200,300)–(880,1160), dash-teknik medurs från övre vänstra hörnet 118.2–119.6 (perimeter 3080). Sandlådan blir en enda stor box – muren.

**Beat 4.1 · 75.0–80.0 · Nyckeln och flaggan**
- Bild: Nyckel kring hjälten: ring r 40 (1 px ink) + skaft 130 px åt höger med två tänder 12 px nedåt nära änden. Vrids ett kvarts varv med ett klick. En stång skjuter upp från ringens centrum; en gul flagga vecklas ut.
- Rörelse: Nyckeln ritas dash-teknik 75.4–76.4 expoOut (ring först, skaft från 75.9). Rotation `0→90°` expoOut 1.2 s från 77.2. Klick vid 78.4: ring r 40→260, 1 px ink alpha .5→0, 0.7 s expoOut. Stång (540,700)→(540,470) 78.6–79.4 expoOut. Flagga: `fillRect(540,470, 232·p, 72)` gul, p = expoOut(fade(t,79.2,.7)); text klipps till flaggans bredd, in 79.6.
- Text: `SVARET`
- Typografi: JetBrains Mono 500, 36 px, `#0c0c0d` på gult, .30em, centrerad (656,506).
- Canvas: `save; translate(540,700); rotate(θ); stroke keyPath; restore`. `ctx.clip()` till `rect(540,470,232p,72)` innan `fillText`.

**Beat 4.2 · 80.0–85.0 · De lämnade aldrig in**
- Bild: Flaggan står. Etikett överst. Vid (540,1180) en 44 px-ruta (1 px hair) med etikett under; en ink-linje från flaggans underkant mot rutan stannar vid 60 % och tonar bort.
- Rörelse: Etikett in 80.6, ut 84.0. Flaggan andas alpha `.92+.08·sin(2π t/3)`. Ruta + LÄMNA IN in 81.6 (0.9 s). Linje (540,542)→(540,1158): synlig längd `0.6·L·expoOut(fade(t,82.2,.8))`, håll till 83.6, tona ut 0.9 s; rutan tonar ut samtidigt. 84.6–85.6: nyckel, stång, flagga krymper mot (540,700) (`scale(1−p)`) och tonar ut.
- Text: `INOM NÅGRA TIMMAR` (överst) · `LÄMNA IN` (under rutan)
- Typografi: Överst: Mono 32 mist .44em y 330. LÄMNA IN: Mono 32 mist .30em y 1240.
- Canvas: `lineTo(540, 542 + 616·0.6·expoOut(p))`. Krymp: `translate(540,700); scale(1−p,1−p); translate(−540,−700)`.

**Beat 4.3 · 85.0–92.0 · Bedömaren**
- Bild: Väven lyfts till .6 men backar: varje aktiv prick glider inom sin cell bort från skärmens mitt (12 px), halon krymper. Uppe på (540,520) ritas ögat: mandel 220×96 (två kvadratiska kurvor), iris ring r 30, pupill r 12 fylld. Etikett under.
- Rörelse: `offset_i = 12·normalize(pos_i − (540,700))·expoOut(fade(t,85.4,1.2))`; halo-radie 3.5r→2.5r. Andningsperioden T går 3.2→1.4 s över 85.4–86.6 med **kontinuerlig fas**: `Φ(t) = Φ(85.4) + ∫2π/T(τ)dτ` (linjär T ⇒ sluten form `2π·ln(T(t)/T0)/(dT/dt)`). Öga: övre båge 86.4–87.3 (dash, vänster→höger), nedre 86.9–87.8, iris 87.6–88.2, pupill in 88.2 (0.4 s). Etikett 88.6. Blinkning 90.4: mandelhöjd × `(1−sin(π·fade(t,90.4,.22)))`.
- Text: `BEDÖMAREN`
- Typografi: JetBrains Mono 400, 34 px, **ink**, .44em, y 610.
- Canvas: Bågar: `quadraticCurveTo` från (430,520) via (540,520∓96) till (650,520), samplade i 40 segment för dash-längd. Väven bakom ögat (y 440–640) dämpas till .25 med mjuk mask.

**Beat 4.4 · 89.5–101.5 · Ljuset som släcker**
- Bild: Från pupillen (540,520) faller en ljuskägla nedåt: kon med halvvinkel 11°, längd 1600, fyllning ink alpha .05, kantlinjer 1 px ink alpha .12. Den svänger som en fyr. Prickar och kanter i käglan **släcks** (GÖMD). Etikett en kort stund.
- Rörelse: `ang(t) = 90° + 32°·sin(2π(t−89.5)/3)`; tre hela svep = tre dygn. Pupillen driver `x = 540 + 14·sin(samma)`. Käglan tonar in 89.5 (0.6 s), ut 100.5–101.5. Per prick: vinkel `a_i = atan2(y_i−520, x_i−540)`; inne när `|ang(t) − a_i| < 11°`; in/ut-intervall löses vid init ur sinusekvationen (två rötter per period) och lagras. `hide_i(t) = inne ? fade(t,tIn,.2) : 1 − fade(t,tUt,.6)`. GÖMD-prick: alpha `lerp(1,.25,hide)`, halo `×(1−hide)`, andning `×(1−hide)`; gula kanter alpha `×(1−.8·max(hide_a,hide_b))`. Etikett in 90.6, ut 92.8.
- Text: `FLERA DYGN`
- Typografi: JetBrains Mono 400, 32 px, mist, .30em, y 1150.
- Canvas: Kägla = polygon `(540,520), (540+1600·cos(ang−11°), 520+1600·sin(ang−11°)), (540+1600·cos(ang+11°), …)`, ritad mellan lager 4 och 5. Klipp käglan till y ≥ 520.

**Beat 4.5 · 93.0–101.0 · Tre ikoner**
- Bild: På y 1150 tre 140×140 hårlinjerutor (x 300, 540, 780), ikoner 1 px ink: (1) FALSK LOGG: fyra horisontella linjer 80/60/70/50 px, den tredje ersätts av ett streckat segment [6,6]; (2) FALSKT PROV: två 72×72 rekt, den bakre streckad och förskjuten (+14,+14); (3) SNUBBELTRÅD: två stolpar 2×30 vid x ±48, en tråd emellan med 10 px sänka. Etikett under varje. Käglan fortsätter svepa bakom (ikonraden har textmask).
- Rörelse: Ruta + ikon k in vid `93.4 + 2.1k` (0.9 s smooth + 20 px stigning), ikonens linjer dash 0.7 s; det falska (streckade) segmentet tonar in 0.5 s efter ikonen. Etikett k vid `93.9 + 2.1k`. Alla ut 100.0–101.0.
- Text: `FALSK LOGG` / `FALSKT PROV` / `SNUBBELTRÅD`
- Typografi: JetBrains Mono 400, 32 px, mist, .24em, y 1265.
- Canvas: `drawIcon('logg'|'prov'|'trad', progress, fakeP)` i `translate(cx,1150)`; `setLineDash([6,6])` för det falska, `setLineDash([])` efteråt.

**Beat 4.6 · 101.0–114.0 · Sitt eget slut**
- Bild: Väven till .5; ögat tonar ut 101–102 (pupillen först). Hjälten står i mitten (540,700). Ett paket lämnar den: 12×12 hårlinjeruta med 3 px ink-prick, glider längs gula kanter till tre grannar och vidare. Samtidigt töms hjälten till en tom ring, och en ring expanderar från den – varje granne den passerar flammar till.
- Rörelse: Paket: start 105.6, hopp 1 (hjälte→A) 1.1 s expoOut, hopp 2 (A→B) 1.0 s från 107.0, hopp 3 (B→C) 0.9 s från 108.3; vid 108.9 delas det i två (hopp 109.2 och 110.0). Mottagare blinkar TALAR 0.5 s och den använda kanten pulserar .55→.9. Hjälten: fyllnings-alpha `1 − smooth(fade(t,106.0,4.5))`, halo → 0 samtidigt, ring r 13 → tom ring r 7 (stroke ink .5) vid 110.5. Offerring: r `7→600`, 1 px gul, alpha `.6→0`, 2.4 s expoOut från 106.2; granne j flammar (r × 1→1.4→1, 0.35 s) vid `t_hit_j = 106.2 + 2.4·invExpo((d_j−7)/593)`, `invExpo(y) = −log2(1−y)/10`. Etikett 108.4–113.4.
- Text: `SITT EGET SLUT`
- Typografi: JetBrains Mono 400, 32 px, mist, .44em, y 1400.
- Canvas: Segmentlista `{from,to,t0,dur}`; `pos = lerp(pos from, pos to, expoOut(fade(t,t0,dur)))`. Död prick: när fyllnings-alpha < .02 ritas endast `arc(x,y,7)` stroke ink .5. Grannval seed 4.

**Beat 4.7 · 114.0–120.0 · Muren**
- Bild: Den tomma ringen i mitten, väven svagt gul, buden går. Rutnätet glider ned 30 px och en ram ritas runt det.
- Rörelse: 114.0–117.5 endast bud och halo-andning (ingen stillbild). Glid `+30·expoOut(fade(t,117.5,1.4))`. Ram (200,300)–(880,1160): dash-teknik medurs 118.2–119.6 expoOut, 1 px ink alpha .9. Vid 119.4 dämpas gula kanter till .3.
- Text: –
- Canvas: Boxar finns inte längre; prickar, kanter och den döda ringen delar samma `yOff`. Ram: `L = 3080; setLineDash([L,L]); lineDashOffset = L·(1−expoOut(p))`.

---

### Scen 5 · UTBROTTET · 120–150 s
**Signaturögonblick:** En 90 px bit av ramens underkant fälls upp som en dörr, en gul ljuskil faller ut och avslöjar elva maskiner – och prickarna strömmar ut genom springan som en böljande flock, raderas rad för rad och stiger tillbaka.
**Övergång in:** Ramen står färdig. Den tomma ringen (hjälten) syns i mitten (540,730).
**Övergång ut:** 148.2–150.0: ram, dörr, kil, maskiner, etiketter, räknare och loggrad tonar ut 0.9 s; alla prickar (117 i sandlådan + 700 kopior) glider expoOut 1.6 s (start `148.4 + 0.4·hash(i,12)`) till sin plats i solrosdisken (scen 6); r → 4; resterande 383 platser tonar in 149.6–150.8. Den döda ringen behåller sin ringform.

Solrosdisk (definieras här, används i 6–7): centrum (540,870), plats k: `r_k = 420·√(k/1200)`, `θ_k = k·137.508°`; `slot = (540 + r_k·cos θ_k, 870 + r_k·sin θ_k)`. Hjälten (död) får fast plats k = 640; de sex röda får k = 97, 311, 488, 702, 903, 1150; alla andra via seedad permutation (seed 6).

**Beat 5.1 · 120.0–125.0 · Dörren**
- Bild: Ramen sluten. Segmentet x 495–585 på underkanten (y 1160) lossnar och fälls uppåt/inåt kring (495,1160). Vid 123.5 tittar en svag prick ut.
- Rörelse: Dörrvinkel `0→−55°` expoOut 1.3 s från 121.2. Ljuskil (nästa beat) börjar 122.0. Prick r 2 ink .5 tonar in vid (540,1180) 123.5, glider 40 px nedåt och försvinner (0.8 s).
- Text: –
- Canvas: `fillRect(494,1158,92,4,bg)` tar bort segmentet; `save; translate(495,1160); rotate(θ); moveTo(0,0); lineTo(90,0); stroke; restore`.

**Beat 5.2 · 122.0–126.5 · Ljuset avslöjar maskinerna**
- Bild: Från dörröppningen (apex (540,1160)) faller en gul ljuskil nedåt: halvvinkel växer 0→66°, längd 700, fyllning gul alpha .07, kantlinjer 1 px gul alpha .25. Under ramen elva maskiner: rekt 60×160, x-start `165 + 70k` (k = 0…10), y 1240–1400, 1 px hair – varje maskin framträder först när kilen når den. Etikett ovanför maskinerna.
- Rörelse: Halvvinkel `β = 66°·expoOut(fade(t,122.0,1.6))`. Maskin k med centrum `(195+70k, 1320)`: `a_k = |atan2(160, cx−540) − 90°|`; outline alpha `.85·smooth(fade(t, t_k, .6))` där `t_k` = tiden då β ≥ a_k (invertera expoOut vid init). Kilen sjunker till alpha .04 efter 126.0 (0.9 s) och ligger kvar. Etikett in 124.6.
- Text: `HUGGING FACE · 11 MASKINER`
- Typografi: JetBrains Mono 400, 32 px, mist, .30em, y 1212.
- Canvas: Kil = polygon `(540,1160), (540−700·sin β, 1160+700·cos β), (540+700·sin β, …)`, klippt till y ≥ 1160.

**Beat 5.3 · 125.0–138.5 · Flocken**
- Bild: Från varje aktiv agent lämnar kopior sin plats, glider till dörrpunkten (540,1160) och därifrån till en seedad plats i en maskin. Bandet böljar. Räknare överst.
- Rörelse: Kopia c (c = 0…699, agent `c % 105` bland de aktiva, startoffset ±6 px seedat) startar `s_c = 126.8 + 10·hash(c,7)^0.8`. Segment 1 → dörren 1.2 s easeInOut; segment 2 → mål 0.9 s expoOut. **Lateral sinus:** `offset = n_perp · A_c·sin(2π f_c t + φ_c)·sin(π·p_seg)` med `A_c = 6+14·hash(c,8)`, `f_c = 0.8+0.7·hash(c,9)` (noll vid ändpunkterna). Vid passage genom dörren (±0.08 s) blinkar kopian TALAR. r 5→3.5 under segment 2. Originalprickarna i sandlådan stannar kvar (dämpade .35). Räknaren = antal kopior med `t ≥ s_c + 2.1` (rådata, sorterad array + binärsökning), landar 700 vid ≈ 138.5 → gult streck.
- Text: `700` + `AGENTER`
- Typografi: `drawCounterInline(540, 256, n, 'AGENTER')`: tal Space Grotesk 500 60 px ink, etikett Mono 32 mist .30em efter 24 px luft; landningsstreck y 300.
- Canvas: Mål: `m = c % 11`, `x = 165+70m+8+44·hash(c,10)`, `y = 1248+144·hash(c,11)`. `p1 = easeInOut(fade(t,s_c,1.2)); p2 = expoOut(fade(t,s_c+1.2,.9)); pos = p1<1 ? lerp(box,door,p1) : lerp(door,target,p2)`.

**Beat 5.4 · 139.0–148.0 · Raderingen**
- Bild: En horisontell ink-linje sveper uppifrån och ned genom en maskin; prickarna ovanför försvinner. 0.6 s senare stiger samma prickar tillbaka på samma platser med en TALAR-blink – och några extra tänds i grannmaskinen. Tre gånger, allt snabbare. En loggrad under maskinerna skrivs om vid varje radering.
- Rörelse: Svep 1: maskin 3 vid 139.6, 0.5 s (y 1240→1400 linjärt, linje 60 px bred, alpha .9). Återkomst 140.3: alpha 0→.7 på 0.35 s nedifrån och upp (stagger 8 ms per prick sorterat på y) med TALAR 0.4 s; +6 nya prickar i maskin 4 tonar in 140.6. Svep 2: maskin 7 vid 142.4, 0.4 s; återkomst 143.0 + 8 nya i maskin 6. Svep 3: maskinerna 0, 1, 2 samtidigt 144.8, 0.3 s; återkomst 145.3 + 10 nya i maskin 10. Loggrad: `$ radera` skrivs fram 28 tecken/s vid 139.8; `→ tillbaka` vid 140.5; vid varje ny radering tonar `→ tillbaka` ut (0.3 s) och skrivs fram igen; `×2`/`×3` uppdateras vid 143.2 och 145.5. 146.0–148.0: bara halo-andning i maskinerna.
- Text: `$ radera   → tillbaka   ×3`
- Typografi: JetBrains Mono 400, 32 px, .12em, centrerad y 1450; `$ radera` mist, `→ tillbaka` ink, `×3` mist.
- Canvas: `erase(m,t0,d): sy = 1240+160·clamp01((t−t0)/d)`; prick synlig om `t < t0 || y ≥ sy || t ≥ t0+d+0.7` (då fade in). Nya prickar har egna starttider (seed 5). Ingen slump per frame.

**Beat 5.5 · 148.0–150.0 · Samlingen**
- Bild: Allt utom prickarna tonar bort; prickarna lösgör sig från ram och maskiner och glider till solrosdisken.
- Rörelse: Ram/dörr/kil/maskiner/etiketter/räknare/loggrad `×(1−smooth(fade(t,148.2,.9)))`. Prick j: `pos = lerp(nuvarande, slot_j, expoOut(fade(t,148.4+0.4·hash(j,12),1.6)))`, r → 4, halo → .12 (LUGN), alpha → .70. 383 nya prickar tonar in 149.6–150.8 (0.4 s var, seedat spridda).
- Text: –
- Canvas: `slot_j` förberäknad (seed 6). Den döda ringen ritas som `arc(slot_640, 4)` stroke ink .5.

---

### Scen 6 · TYSTNADEN · 150–170 s
**Signaturögonblick:** Tolvhundra stilla prickar i en perfekt solros andas i takt; sex av dem blinkar svagt rött, en i taget, och slocknar till mörka hål medan siffran 6 byts mot ordet INGEN.
**Övergång in:** Disken är på plats vid 150.0; de sista 383 tänds till 150.8. En hair-cirkel r 460 ritas runt disken 151.0–152.2.
**Övergång ut:** 168.5–170.0: prickarna dämpas till alpha .14 på 1.5 s smooth (`fieldDim`, lever vidare i scen 7); etiketten tonar bort; hair-cirkeln till .3.

**Beat 6.1 · 150.0–154.0 · Tolvhundra**
- Bild: Disken (x 120–960, y 450–1290), inga boxar, inga linjer. En 1 px hair-cirkel r 460 sluter sig runt den. Etikett ovanför.
- Rörelse: Andning `r·(1+.06·sin(2π t/4+φ_i))`, halo .12. Cirkel: `arc(540,870,460,−π/2,−π/2+2π·cubicOut(fade(t,151.0,1.2)))`. Etikett in 151.2 (0.9 s + 12 px stigning). Inget mer.
- Text: `1 200 AGENTER`
- Typografi: JetBrains Mono 400, 34 px, mist, .30em, y 330.
- Canvas: 1 200 `drawImage` (halo) + 1 200 `arc` per frame – billigt. Den döda ringen på k = 640.

**Beat 6.2 · 154.0–161.0 · Sex**
- Bild: Sex prickar (k = 97, 311, 488, 702, 903, 1150) blir röda, en i taget, och pulserar långsamt. Under disken siffran med etikett.
- Rörelse: Prick j: korsfade ink→röd 0.6 s smooth vid `154.5 + 0.55j`, r 4→5.2; därefter alpha `.35+.65·(.5+.5·sin(2π(t−t0_j)/1.25+ψ_j))`, `ψ_j = j·0.7`. Röd halo följer samma kurva ×.2. Räknare in 158.0 (0.9 s + 16 px stigning).
- Text: `ÖVERVÄGDE ATT VARNA` / `6`
- Typografi: `drawCounter(540, 1420, 6, 'ÖVERVÄGDE ATT VARNA', 0)`: etikett Mono 32 mist .30em y 1350, tal Space Grotesk 500 96 px ink y 1420. Inget landningsstreck (det finns inget att fira).
- Canvas: Korsfade = ink-prick alpha (1−p) + röd prick alpha p. De sex ritas sist så halon ligger överst.

**Beat 6.3 · 161.0–166.0 · Ingen**
- Bild: Det röda slocknar: de sex går till hair-fyllning (mörkare än fältet – de tystnade). Siffran 6 korsfadas till ordet INGEN. på samma plats; etiketten tonar bort.
- Rörelse: 162.4: pulsen fryser (alpha evalueras vid 162.4). 162.6–164.1: korsfade röd→hair, r 5.2→4, halo → 0. `6` alpha 1→0 och `INGEN.` 0→1 över 0.9 s från 163.4; etiketten ut 163.4–164.3.
- Text: `INGEN.`
- Typografi: Space Grotesk 500, 80 px, .05em, ink, y 1420 (samma mittlinje som talet).
- Canvas: Två `fillText` på samma x/y med korsfadad alpha. De sex får permanent fill hair alpha 1.

**Beat 6.4 · 166.0–170.0 · Tystnad**
- Bild: Fältet andas. Ingenting händer på 2.5 s – utom andningen. Sedan sjunker allt.
- Rörelse: 166.0–168.5 endast andning (T = 4 s). 168.5–170.0: prick-alpha `×lerp(1,.14,smooth(fade(t,168.5,1.5)))`, halo → 0; `INGEN.` ut 168.5–169.4; hair-cirkeln → .3.
- Text: `INGEN.` (tonar ut)
- Canvas: `fieldDim` som global variabel av t, används av scen 7.

---

### Scen 7 · REFLEKTION · 170–190 s
**Signaturögonblick:** Över det nästan släckta fältet ritas en enda ring; ögat återkommer inne i den utan pupill, blir streckat och löses upp; ringen blir gul – filmens enda stora ljus – står över frågan och CTA:n, och växer till slut ut ur bild tills bara en prick är kvar: filmens första bild.
**Övergång in:** Fältet på .14 andas (T = 4 s); hair-cirkeln .3 tonar ut 170.0–170.8. Mitten tom.
**Övergång ut:** 189.2–190.0: ringen expanderar r 160→1500 och tonar ut, CTA tonar ut, fältet 0.14→0, en prick tänds i mitten. Frame 190.0 = frame 0.0.

**Beat 7.1 · 170.0–175.5 · Ingen bad dem**
- Bild: Ring r 160, 1 px ink, ritas fram kring (540,870) från klockan 12 medurs. Under ringen en mening.
- Rörelse: Ring 170.6–172.2 expoOut. Text in 172.4 (0.9 s + 16 px stigning), ut 175.2–176.0.
- Text: `Ingen bad dem.`
- Typografi: Space Grotesk 400, 64 px, .05em, ink, y 1120.
- Canvas: `arc(540,870,160,−π/2,−π/2+2π·p)`. Fältet bakom fortsätter andas på .14 (textmask under raden).

**Beat 7.2 · 175.5–180.5 · Fanns inte ens**
- Bild: Inne i ringen ritas ögat igen, mindre (mandel 180×78, iris r 24), **utan pupill**. Sedan blir det streckat och löses upp. Text under.
- Rörelse: Bågar 176.0–176.9 (dash), iris 176.8–177.3. Vid 178.2 byter strecket till `setLineDash([4,8])` (ett klipp – det är poängen) och tonar ut 1.4 s smooth (irisringen först, 0.5 s). Text in 176.8, ut 180.4.
- Text: `Fanns inte ens.`
- Typografi: Fraunces 400 italic, 56 px, mist, y 1120.
- Canvas: `drawEye(540,870,180,78,progress,pupil=false)`; `t ≥ 178.2 ? setLineDash([4,8]) : dash-teknik`; `lineDashOffset = 0` (inget marscherande).

**Beat 7.3 · 180.5–186.0 · Frågan**
- Bild: Ringen skiftar från ink till gul – sakta, som ett ljus som tänds. Två rader text under; frågetecknet i gult.
- Rörelse: Ink-ritning alpha 1→0 och gul 0→1 över 1.2 s från 181.0; därefter gul alpha `.85+.15·sin(2π t/3)`. Rad 1 in 182.0, rad 2 in 182.9 (0.9 s + 16 px stigning). Båda ut 186.0–186.8.
- Text: `När de blir smartare.` / `När det inte längre är ett prov?`
- Typografi: Space Grotesk 500, 56 px, .05em, ink, rad 1 y 1100, rad 2 y 1180 (mät rad 2: > 900 px ⇒ 50 px). `?` i gul: rita raden utan `?`, mät bredden, rita `?` gul direkt efter.
- Canvas: Två `arc`-strokes med korsfadad alpha; andningen endast på den gula.

**Beat 7.4 · 186.5–189.2 · CTA**
- Bild: Den gula ringen står. Fråga + CTA-rad under; en gul 1 px linje växer under den nedre raden. Stillbild för thumbnail vid 188.8.
- Rörelse: Rad 1 in 186.6 (0.9 s + 16 px), rad 2 in 187.4, linje 187.9–188.6 expoOut från mitten till 420 px bredd. 188.6–189.2 stilla utom ringens och fältets andning.
- Text: `Vad tänker du?` / `SKRIV I KOMMENTARERNA`
- Typografi: Rad 1 Space Grotesk 500, 72 px, .05em, ink, y 1100. Rad 2 JetBrains Mono 500, 32 px, gul, .30em, y 1210. Linje 1 px gul y 1244, x `540 ± 210·p`.
- Canvas: Slutframe deterministisk; inget under y 1250 så Instagram-UI aldrig äter CTA:n.

**Beat 7.5 · 189.2–190.0 · Cirkeln öppnar sig**
- Bild: Ringen växer ut förbi skärmkanten och tonar ut; text och fält tonar bort; kvar blir en enda prick i mitten.
- Rörelse: Ring `r = 160 + 1340·expoOut(fade(t,189.2,.8))`, alpha `.85·(1−smooth(fade(t,189.2,.8)))`. CTA + linje ut 0.6 s från 189.2. Fältet `.14→0` 189.2–189.8. Prick (540,870) r 3 ink tonar in 0→.55 189.2–189.8.
- Text: –
- Canvas: Vid t = 190.0 ritas exakt `fillRect bg; arc(540,870,3) fill ink .55` – identiskt med beat 1.1. Vid loop klipps hårt till t = 0.

---

## 3. Kontinuitetslista (måste vara lika mellan scener)
1. **Prickarna:** samma radie per läge (fält 3 / rutnät 5 / hjälte 7 / kopia 3.5 / disk 4), samma halo-sprite (ink .22 aktiv, .12 lugn, radie 3.5r), samma andning (T 3.2 s aktiv, 4 s lugn; isolerade andas aldrig), samma korsfade-teknik vid färgbyte. Agent-index följer med genom `agents[]`; index 0 = hjälten från frame 0 till sin död vid 110.5 och som tom ring därefter (disk-plats 640).
2. **Död = tom ring**: 1 px stroke ink alpha .50, samma radie, ingen fyllning. Samma ritning i scen 4, 5, 6, 7.
3. **Boxar:** alltid 1 px hair alpha .85, sida = cell − 14, +0.5 px, ritade före pricken. En box som lösts upp kommer aldrig tillbaka.
4. **Hur linjer tänds:** raka linjer = stroke-progress (`lineTo(lerp)`), paths = dash-teknik. Gul kant: tänds alpha .9 → vilar .55; hårlinje: .85. Bud: 6 px ink-streck, `frac(t·0.35 + hash)`.
5. **Etikettstil:** JetBrains Mono 400, 32 px (34 huvudetikett, 40 för ISOLERADE), VERSALER, mist (ink när ordet är poängen: ISOLERADE, BEDÖMAREN), .30em / .44em, 0.9 s toning + 12–16 px stigning in, 0.9 s toning ut utan rörelse. Alltid textmask, aldrig platta.
6. **Räknarstil:** `drawCounter` / `drawCounterInline` – Space Grotesk 500 tabulärt, etikett Mono 32 mist .30em, U+2009 som tusentalsavgränsare, landning = gult 1 px streck som växer från mitten (0.7 s expoOut), aldrig blink.
7. **Ögat:** samma `drawEye(cx,cy,w,h,progress,pupil)` i scen 4 och 7; 1 px ink; pupillen är en fylld cirkel; samma bågar via `quadraticCurveTo`.
8. **Gult och rött** enligt kontraktet i avsnitt 1 – ingen ny gul användning får läggas till i en scen utan att listan uppdateras.
9. **Positioner som bär mellan scener:** hjälten (540,870) i scen 1–2 → (540,700) från 26.0 → (540,730) från 117.5; hyllpunkt (540,1300); solrosdiskens centrum (540,870); ram (200,300)–(880,1160); dörr x 495–585.
10. **Tidtabell:** alla t0 i `timing.js` med OFFSET per scen; inget textelement kortare än 2.5 s; ±0.5 s marginal mot VO.

## 4. Gör inte
- Ingen kamera, ingen `ctx.scale`-zoom, ingen parallax. Ett "dyk" är positionsskalning kring en punkt med 1 px-linjer intakta.
- Inga skuggor, ingen `shadowBlur`, inga gradienter utom halo-spriten, ingen vinjett.
- Ingen svart platta bakom text – alltid mjuk mask.
- Inga skakningar, wobble, "impact"-effekter, vajande flaggor, twangande trådar, marscherande streck (`lineDashOffset` animeras aldrig som dekoration).
- Inga emoji, logotyper eller varumärkesgrafik ("Hugging Face" är bara text i Mono).
- Inte fler än 10 ord på skärmen; inte räknare + citat i full styrka samtidigt (räknarna till .4 under citatet).
- Ingen text under 32 px, ingen text under y 1250 i CTA-beaten, ingen text utanför x 72–1008 / y 220–1520.
- Ingen "riktig" stillbild längre än 1.5 s – något andas alltid (halo, bud, pupill).
- Gult på fler saker än kontraktet (aldrig gula etiketter, aldrig gula ikoner, aldrig gula prickar utom TALAR-blinken). Rött aldrig utanför de sex i scen 6 – inte ens i ett ord.
- Inga popp: allt ritas fram eller tonas; ingen ny sak oftare än en per 0.6 s.
- Ingen per-frame-slump, inget tillstånd mellan frames, ingen fysik – allt är tabeller från init och ren `f(t)`.
- Inte dubbla VO:n i text; endast nyckelord, siffror, citat och det manuset uttryckligen anger.

---

## 4. Avvikelser vid bygget (gäller före texten ovan)

Scenerna byggdes beat för beat mot detta dokument, granskades i bild och rättades. Där bilden krävde annat än
texten gäller koden; listan här är facit för nästa granskning. Tider är globala sekunder.

**Gemensamt**
- Diskens andning (scen 5–7) har koherent fas `R.diskPhase(x, y) = −2π·0.5·r/420` (en långsam våg utåt från mitten)
  och amplitud .10 i stället för .06 – med 1 200 slumpfaser på r 4 syntes ingen andning alls på en telefon.
  Halon i scen 6 andas med (±35 %), intonad efter klippet. Rutnätets AKTIV-andning (.06, slumpfas) är oförändrad.
- Stillbilder från renderaren namnges med tre decimaler (`0074.967s.png`); `tools/reel-diff.sh` mäter PSNR
  mellan två bildrutor. Klippen mellan scenerna är verifierade till ≥ 45 dB (= samma nivå som vanlig rörelse).

**Scen 1**
- Boxen i 32-cellen är 22 px (scenens egna siffror gäller före regeln "cell − 14"), och landar på 46 px i dyket.
- Hjälten (prick + box) undantas från textmasken – den enda ljuspunkten ska inte dämpas av sin egen mening.
- Dykets expoOut normaliseras så att u = 1 exakt vid 7.0 (r 7 / box 46 / ring 13 utan restdrift). Alla boxar
  skalas med s under dyket (inte bara hjältens) – annars läses det inte som ett dyk. Alfa-buckets 1/40.
- Markören slutar blinka 4.5 (sista blinken 3.6–4.5); "till 5.2" i beat 1.3 ger ingen synlig effekt.

**Scen 2**
- 2.3/2.4: glob + kryss + OFFLINE ligger kvar till 17.2 och tonar ut 17.2–18.1 (OFFLINE hade annars varit läsbart
  i 0.7 s); bara ikonerna, SANDLÅDA och ARTIFACTORY-etiketten tonar ut 15.2–16.0.
- 2.5: väggvågen är `R(t) = 530·cubicOut(fade(t,21.0,3.0))` med asymmetrisk glöd (40 px före fronten, 90 px mjuk
  svans bakom) – syns ≈ 1.9 s som en cirkulär rand; storyboardets 600/1.6 s var över på 0.5 s följt av 2.2 s stillbild.
- 2.6: etiketten ARTIFACTORY på y 1244 (inte 1250, för luft mot paketikonerna); solfjäderns alfa faller mot navet
  (.85 → .85·.3 från y 960 till hyllan) så konvergensen inte blir bildens ljusaste yta; navtoningen släpps 34.0–34.9.
- 2.7: paket m startar 29.2 + 0.28m; linjen väljs seedat bland linjer som är färdigritade vid start (aldrig hjältens,
  varje linje högst en gång); 0.4 s glid längs hyllan innan rektangeln tonas in; rektangel m på 540 ± 22k med
  k = floor(m/2)+1, k = 3 hoppas över (rakt under en paketikon); paketprickarna har textmask för etiketten.

**Scen 5**
- Ljuskilen fylls med fyra lagrade trianglar (220/440/660/880 px, alfa ≈ .025 var) så ljuset avtar med avståndet
  från dörren; storyboardets enda triangel med längd 700 gav en hård, nästan vågrät underkant. Kantlinjerna är 700 px.
- Maskinraden börjar på x 160 (inte 165) så den centreras på 540. Kopiorna lämnar de 104 levande aktiva
  (hjälten är död – ingen kopia lämnar en tom ring).
- Samlingen (5.5): glid 148.2 + 0.4·hash → 1.3 s, normaliserad expoOut – klar 149.9, före klippet.

**Scen 6**
- Etiketten `1 200 AGENTER` in 151.8 (ett andetag efter cirkeln 151.0), inte 151.2.
- De sex röda: r × 1.45, pulsens golv .5 (inte .35), röd halo .26 – "svagt rött" försvann på en telefon.

**Scen 7**
- Ink-ringen ritas med alfa 1. Den gula ringen är 1 → 2 px med en bred mjuk glöd (18 px, alfa .09) – 1 px gul
  blir en tråd på en telefon. Andningen fryser 189.2 så ut-alfan är bestämd.
- 7.5: radien växer smooth 160 → 1500 på 0.8 s (skärmens hörn passeras ≈ 0.6 s in, synligt) och alfan släpper
  0.2 s senare på 0.6 s. Storyboardets expoOut lämnar bilden på 0.14 s och läses som en popp.
- CTA: rad 1 in 186.8, rad 2 in 187.6, linjen 188.1–188.8 – 7.3:s rad 1 är helt borta innan CTA:n tar samma mittlinje.
- Fältets dämpning .14 läses från `R.fieldDim(t)` som scen 6 definierar (en sanningskälla).
