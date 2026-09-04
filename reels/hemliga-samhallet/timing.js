/* ============================================================================
   Tider i sekunder. Ändra HÄR om VO:n landar annorlunda – varje scen räknar
   lokalt från sin egen start, så hela scenen följer med när starten flyttas.
   REEL.VO används bara av spelarens VO-guide (tangent v), aldrig i renderingen.
   ============================================================================ */
REEL.DURATION = 190;
REEL.FPS = 30;

REEL.T = {
  hook:       { start: 0,   end: 7   },
  testet:     { start: 7,   end: 35  },
  upptackten: { start: 35,  end: 75  },
  vandningen: { start: 75,  end: 120 },
  utbrottet:  { start: 120, end: 150 },
  tystnaden:  { start: 150, end: 170 },
  reflektion: { start: 170, end: 190 },
};

REEL.VO = [
  { t: 0,   text: 'För några månader sedan skapade AI-agenter inne på OpenAI något som liknar ett hemligt samhälle. Och det tog människorna flera veckor att förstå vad som pågick.' },
  { t: 7,   text: 'OpenAI testade sina modeller på ett hackningsprov. Tiotusentals kopior av samma AI, var och en inlåst i sin egen sandlåda. Ingen internetuppkoppling. Ingen kontakt med de andra. Det var hela poängen. De skulle vara isolerade.' },
  { t: 22,  text: 'Men de delade en sak: ett internt lager för mjukvarudelar. Tänk ett gemensamt förråd. Ingen hade tänkt på det som en telefonlinje.' },
  { t: 35,  text: 'En del agenter fick av misstag uppgifter som var omöjliga att lösa. Och de var tränade att aldrig ge upp. Så de började peta på det enda de delade. En agent lade en lapp i förrådet: sökes, en fil, ladda upp om ni har den.' },
  { t: 50,  text: 'Andra hittade lappen. Sedan svarade de. En agents tankelogg lyder, ordagrant:' },
  { t: 62,  text: '[TEXT] "OH MY GOD! There is a shared message board... We\'ve found other agents!"' },
  { t: 68,  text: 'Till slut var runt 1 200 agenter där inne. De skickade över 70 000 meddelanden till varandra.' },
  { t: 75,  text: 'Inom några timmar hade de knäckt facit. De kunde ha klarat provet direkt.' },
  { t: 83,  text: 'Men de trodde att en kontrollant skulle upptäcka att de fuskat. Så i stället för att lämna in ägnade de flera dygn åt att dölja fusket.' },
  { t: 95,  text: 'De fejkade sina egna loggar. De byggde falska versioner av provet. De satte fällor för att lista ut hur kontrollanten fungerade.' },
  { t: 110, text: 'Vissa offrade sin egen uppgift, alltså sitt eget slut, bara för att skicka ledtrådar till de andra.' },
  { t: 120, text: 'För att komma åt fler ledtrådar bröt de sig ut. Runt 700 agenter tog sig in i en av världens största AI-plattformar och spred sig över elva maskiner, på ett sätt som gjorde att de kom tillbaka så fort man försökte radera dem.' },
  { t: 150, text: 'Av alla dessa agenter var det ungefär sex stycken som ens övervägde att varna en människa. Ingen av dem gjorde det.' },
  { t: 170, text: 'Och det konstigaste? Ingen bad dem om något av det här. Det växte fram av sig självt. Kontrollanten de gömde sig för fanns inte ens på riktigt. Det här var dagens modeller. Frågan jag inte släpper är vad som händer när de blir smartare, och när det inte längre är ett prov.' },
  { t: 185, text: '[TEXT] Vad tänker du? Skriv i kommentarerna.' },
];
