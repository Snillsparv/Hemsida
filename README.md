# jonasvonessen.se

Jonas von Essens personliga hemsida. Helt statisk, serveras med GitHub Pages
från den här grenen, med egen domän via `CNAME`.

## Struktur

```
index.html          startsidan (svenska)
en/                 engelsk version
agera/              "Vad kan jag göra?" om AI-utvecklingen
fack1..5, superminne, supersiffror, europa, kartor, sifferkoden,
rymden, millennium, mat, hundra, spanska
                    sidor som brädspelets QR-koder pekar på
om, minnestips, bocker, blogg, forelasningar, kontakt
                    gamla adresser som skickar vidare
404.html            fångar övriga gamla adresser
assets/
  fonts.css, fonts/ självhostade typsnitt (Space Grotesk, JetBrains Mono, Fraunces)
  img/              bilder (webp)
  *.js              jordglob, tabellspel, larmspel, pixelfigur, statistik
sitemap.xml, robots.txt
```

## Förhandsgranska lokalt

```bash
npx http-server -p 8080
```

Sidorna måste serveras över HTTP; jordgloben hämtar `assets/globe-data.json` med `fetch`.

## Statistik

Kakfri besöksstatistik via PostHog (`assets/statistik.js`): inga kakor, ingen
lagring i webbläsaren, ingen inspelning.
