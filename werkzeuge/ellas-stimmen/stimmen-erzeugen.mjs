// Erzeugt die Sprachaufnahmen für "Ellas Babykatzen" mit Microsoft Azure.
//   node stimmen-erzeugen.mjs          -> fehlende Aufnahmen erzeugen
//   node stimmen-erzeugen.mjs --liste  -> nur Bausteine zählen und anzeigen
//   node stimmen-erzeugen.mjs --neu    -> alles neu aufnehmen
// Schlüssel: ../../../azure-speech.key (Zeile 1 Schlüssel, Zeile 2 Region)
// Ausgabe: ../../docs/spiele/ellas-audio/<schlüssel>.mp3 und manifest.json
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GAME = join(here, '../../docs/spiele/ellas-babykatzen.html');
const OUT = join(here, '../../docs/spiele/ellas-audio');
// n = Erzählerin, k = Katzen, v = Babyvampire
const VOICES = {
  n: { name: 'de-DE-SeraphinaMultilingualNeural', rate: '-8%', pitch: '+0%' },
  k: { name: 'de-DE-GiselaNeural', rate: '-4%', pitch: '+6%' },
  v: { name: 'de-DE-GiselaNeural', rate: '-12%', pitch: '-10%' },
};
const FORCE = process.argv.includes('--neu');

// muss genau so im Spiel stehen
const vkey = t => { let h = 0x811c9dc5; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return 'v' + h.toString(16).padStart(8, '0'); };

const src = readFileSync(GAME, 'utf8');
const grab = name => (0, eval)('(' + src.match(new RegExp(`const ${name} = ([\\[{][\\s\\S]*?[\\]}]);[ \\t]*$`, 'm'))[1] + ')');
const SKILLS = grab('SKILLS'), CATS = grab('CATS'), VAMPS = grab('VAMPS'), CRY = grab('CRY');
const CAT_SAYS = grab('CAT_SAYS'), CAT_LINES = grab('CAT_LINES');

const parts = [];
const seen = new Set();
const add = (v, t) => { const k = vkey(v + '|' + t); if (!seen.has(k)) { seen.add(k); parts.push({ v, t, k }); } };
const N = t => add('n', t), K = t => add('k', t), V = t => add('v', t);

N('Welche Babykatze bist du? Tippe auf eine Katze.');
Object.values(CAT_SAYS).forEach(K); Object.values(CAT_LINES).forEach(K);
CRY.forEach(V);
const moves = ['Zwicki-Biss', 'Fledermaus-Flattern', 'Umhang-Wirbel'];
for (const c of CATS) {
  const cn = c.name;
  for (const s of Object.values(SKILLS)) N(`${cn} macht ${s.name}!`);
  N(`${cn} fühlt sich viel besser.`);
  N(`Ein weiches Kuschelschild schützt ${cn}.`);
  N(`Was macht ${cn} jetzt?`);
  N(`${cn} ist ganz müde und geht nach Hause zum Kuscheln.`);
  for (let st = 0; st < VAMPS.length; st++)
    N(`${cn} hat ${st === 0 ? 'noch keinen Babyvampir' : st === 1 ? 'einen Babyvampir' : st + ' Babyvampire'} nach Hause geschickt. Jetzt macht ${cn} ein Schläfchen. Willst du nochmal von vorn anfangen?`);
  N(`${cn} hat sogar die Königin Mitternacht nach Hause geschickt. Jetzt ist die Nacht ruhig und alle schlafen. Die Vampire kommen aber bestimmt wieder, ein bisschen stärker!`);
  for (const v of VAMPS) N(`${v.name} kommt angeflattert! Was macht ${cn}?`);
}
N('Zweimal getroffen!');
for (const v of VAMPS) {
  const e = v.name;
  N(`${e} erschrickt und wird schwächer.`); N(`Aber ${e} ist noch hellwach.`); N(`${e} gähnt und schläft ein.`);
  N(`${e} schläft und schnarcht. Chrrr. Du bist dran!`); N(`${e} macht eine Grimasse. Bäääh! Das tut gar nicht weh.`);
  N(`${e} weint:`);
  for (const mv of moves) { N(`${e} versucht ${mv}. Aber das Kuschelschild hält! Nichts passiert.`); N(`${e} macht ${mv}! Autsch!`); }
}
N('Super gemacht! Such dir ein Geschenk aus.');
const opts = ['Mehr Leben', 'Picknick', ...Object.values(SKILLS).flatMap(s => [s.name + ' stärker machen', s.name + ' neu lernen'])];
for (const o of opts) { N(o); N('oder ' + o); }
N('Hurra! Alle Babyvampire sind bei Mama!');

const chars = parts.reduce((a, p) => a + p.t.length, 0);
console.log(`${parts.length} Bausteine, ${chars} Zeichen`);
if (process.argv.includes('--liste')) { parts.forEach(p => console.log(p.k, p.v, p.t)); process.exit(0); }

const [key, reg] = readFileSync(join(here, '../../../azure-speech.key'), 'utf8').split(/\r?\n/).map(s => s.trim());
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
mkdirSync(OUT, { recursive: true });
let made = 0, failed = 0;
for (const p of parts) {
  const file = join(OUT, p.k + '.mp3');
  if (existsSync(file) && !FORCE) continue;
  const vo = VOICES[p.v];
  const ssml = `<speak version="1.0" xml:lang="de-DE"><voice name="${vo.name}"><prosody rate="${vo.rate}" pitch="${vo.pitch}">${esc(p.t)}</prosody></voice></speak>`;
  const r = await fetch(`https://${reg}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', body: ssml,
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'spielekiste' },
  });
  if (!r.ok) { failed++; console.warn('Fehler', r.status, p.t, (await r.text()).slice(0, 200)); break; } // beim ersten Fehler aufhören
  writeFileSync(file, Buffer.from(await r.arrayBuffer())); made++;
  if (made % 25 === 0) console.log(`${made} erzeugt …`);
  await new Promise(res => setTimeout(res, 3200)); // Gratis-Tarif F0: ca. 20 Anfragen pro Minute
}
const have = readdirSync(OUT).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(have));
console.log(`Fertig: ${made} neu, ${failed} Fehler, ${have.length} im Manifest.`);
