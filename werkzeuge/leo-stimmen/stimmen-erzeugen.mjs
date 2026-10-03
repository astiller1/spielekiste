// Erzeugt die Sprachaufnahmen für "Kapitän Leo" mit ElevenLabs oder Microsoft Azure.
//   node stimmen-erzeugen.mjs                 -> fehlende Aufnahmen mit ElevenLabs (Will)
//   node stimmen-erzeugen.mjs --azure         -> fehlende Aufnahmen mit Azure (Stimme siehe AZURE_VOICE)
//   node stimmen-erzeugen.mjs --azure --stimme=de-DE-FlorianMultilingualNeural --neu
//                                             -> alle Aufnahmen neu, mit dieser Azure-Stimme
//   node stimmen-erzeugen.mjs --azure --proben -> Hörproben deutscher Azure-Stimmen in ./azure-proben
//   node stimmen-erzeugen.mjs --liste         -> nur die Sätze zählen und anzeigen
// ElevenLabs-Schlüssel: $ELEVENLABS_API_KEY oder ../../../wort-insel/elevenlabs.key
// Azure: $AZURE_SPEECH_KEY + $AZURE_SPEECH_REGION oder ../../../azure-speech.key (Zeile 1 Schlüssel, Zeile 2 Region, z. B. westeurope)
// Ausgabe: ../../docs/spiele/leo-audio/<schlüssel>.mp3 und manifest.json
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const GAME = join(here, '../../docs/spiele/kapitaen-leo.html');
const OUT = join(here, '../../docs/spiele/leo-audio');
const VOICE = 'bIHbv24MWmeRgasZH58o'; // Will
const MODEL = 'eleven_multilingual_v2';
const SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.3 };
const AZURE = process.argv.includes('--azure');
const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const AZURE_VOICE = arg('stimme') || 'de-DE-ConradNeural';
const FORCE = process.argv.includes('--neu');
const MAX_EARN = 30, MAX_MISS = 20; // darüber sagt das Spiel einen allgemeinen Satz

// muss genau so im Spiel stehen
export function vkey(t) { let h = 0x811c9dc5; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return 'v' + h.toString(16).padStart(8, '0'); }

const src = readFileSync(GAME, 'utf8');
const grab = name => (0, eval)('(' + src.match(new RegExp(`const ${name} = (\\{[\\s\\S]*?\\n\\});`))[1] + ')');
const UP = grab('UP'), FT = grab('FT');
const ORDER = (0, eval)(src.match(/const ORDER = (\[[^\]]*\]);/)[1]);

const texts = [];
const add = t => { if (!texts.includes(t)) texts.push(t); };

// 1. feste Sätze aus say(...) und showHint(...)
for (const m of src.matchAll(/(?:say|showHint)\(([^;]*)/g)) {
  for (const s of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    const t = s[1].replace(/\\'/g, "'");
    if (t.includes(' ') && !t.endsWith(' ')) add(t);
  }
}
// 2. Werft
for (const k in UP) add('Super! ' + UP[k].said);
// 3. Fänge
const BIG = new Set(['tuna', 'octo', 'angler']);
for (const k of ORDER) {
  const ft = FT[k], fem = ft.ein.startsWith('Eine'), ph = [ft.ein];
  if (k !== 'gold' && k !== 'chest') ph.push((fem ? 'Eine glitzernde ' : 'Ein glitzernder ') + ft.name, (fem ? 'Eine riesige ' : 'Ein riesiger ') + ft.name);
  for (const p of ph) { add(p + '!'); add(`Neu! ${p}!`); }
}
// 4. Oma Grete
for (const k of ORDER) {
  const ft = FT[k];
  if (k === 'chest' || k === 'gold' || ft.night) continue;
  const need = ft.zone === 0 ? 3 : 2;
  add(`Oma Grete wünscht sich ${need} ${ft.pl}!`);
  for (let left = 1; left < need; left++) add(`Oma Grete braucht noch ${left === 1 ? ft.ein.replace(/^Ein /, 'einen ').replace(/^Eine /, 'eine ') : left + ' ' + ft.pl}.`);
  add(`Danke! Oma Grete schenkt dir ${need * ft.value + 5} Bonus-Münzen!`);
}
// 5. Zahlen (zuletzt, damit das Wichtige zuerst fertig ist)
add('Du hast ganz viele Münzen verdient!'); add('Dafür brauchst du noch mehr Münzen.');
for (let e = 2; e <= MAX_EARN; e++) add(`Du hast ${e} Münzen verdient!`);
for (let m = 2; m <= MAX_MISS; m++) add(`Dafür brauchst du noch ${m} Münzen.`);

const chars = texts.reduce((a, t) => a + t.length, 0);
console.log(`${texts.length} Sätze, ${chars} Zeichen`);
if (process.argv.includes('--liste')) { texts.forEach(t => console.log(vkey(t), t)); process.exit(0); }

function azureCreds() {
  let k = process.env.AZURE_SPEECH_KEY, reg = process.env.AZURE_SPEECH_REGION;
  const f = join(here, '../../../azure-speech.key');
  if ((!k || !reg) && existsSync(f)) [k, reg] = readFileSync(f, 'utf8').split(/\r?\n/).map(x => x.trim());
  if (!k || !reg) { console.error('Azure-Schlüssel fehlt: ../../../azure-speech.key anlegen (Zeile 1 Schlüssel, Zeile 2 Region).'); process.exit(1); }
  return { k, reg };
}
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
// kindgerecht: etwas langsamer, etwas höher
const ssml = (t, voice) => `<speak version="1.0" xml:lang="de-DE"><voice name="${voice}"><prosody rate="-6%" pitch="+4%">${esc(t)}</prosody></voice></speak>`;
const az = AZURE ? azureCreds() : null;
const elKey = AZURE ? null : (process.env.ELEVENLABS_API_KEY || readFileSync(join(here, '../../../wort-insel/elevenlabs.key'), 'utf8')).trim();
function tts(t, voice = AZURE_VOICE) {
  if (AZURE) return fetch(`https://${az.reg}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': az.k, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'spielekiste' },
    body: ssml(t, voice),
  });
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST', headers: { 'xi-api-key': elKey, 'content-type': 'application/json' },
    body: JSON.stringify({ text: t, model_id: MODEL, language_code: 'de', voice_settings: SETTINGS }),
  });
}

if (AZURE && process.argv.includes('--proben')) {
  const dir = join(here, 'azure-proben'); mkdirSync(dir, { recursive: true });
  const probe = 'Ahoi Kapitän Leo! Tippe auf einen Fisch. Oh, ein riesiger Thunfisch! Tippe ganz schnell!';
  const list = await (await fetch(`https://${az.reg}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': az.k } })).json();
  const de = list.filter(v => v.Locale === 'de-DE' && /Neural$/.test(v.ShortName) && !/Multilingual/.test(v.ShortName) || /^(de-DE-(Florian|Seraphina)MultilingualNeural)$/.test(v.ShortName));
  const rows = [];
  for (const v of de) {
    const r = await tts(probe, v.ShortName);
    if (!r.ok) { console.warn('Fehler', v.ShortName, r.status, (await r.text()).slice(0, 160)); break; }
    writeFileSync(join(dir, v.ShortName + '.mp3'), Buffer.from(await r.arrayBuffer()));
    rows.push(`<div class="v"><b>${v.DisplayName}</b> <small>${v.Gender === 'Male' ? 'männlich' : 'weiblich'} · ${v.ShortName}</small><audio controls preload="none" src="${v.ShortName}.mp3"></audio></div>`);
    console.log('Probe', v.ShortName);
    await new Promise(r => setTimeout(r, 3500));
  }
  writeFileSync(join(dir, 'anhoeren.html'), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Azure-Stimmen</title><style>body{margin:0;font:17px/1.5 system-ui,sans-serif;background:#0a2c4e;color:#fff7e3;padding:24px 16px}main{max-width:560px;margin:0 auto;display:grid;gap:12px}.v{background:#123d66;border-radius:14px;padding:10px 14px;display:grid;gap:6px}small{color:#bfe3f7}audio{width:100%}</style></head><body><main><h1>Deutsche Azure-Stimmen</h1><p>Zum Vergleich: ../will.mp3 ist die jetzige ElevenLabs-Stimme.</p>${rows.join('')}</main></body></html>`);
  console.log(`${rows.length} Proben in azure-proben/anhoeren.html`);
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
let made = 0, failed = 0, stop = false;
async function one(t) {
  const file = join(OUT, vkey(t) + '.mp3');
  if ((existsSync(file) && !FORCE) || stop) return;
  const r = await tts(t);
  if (!r.ok) {
    failed++; const msg = await r.text();
    console.warn('Fehler', r.status, t, msg.slice(0, 160));
    stop = true; // beim ersten Fehler aufhören, nichts erzwingen
    return;
  }
  writeFileSync(file, Buffer.from(await r.arrayBuffer())); made++;
  if (made % 25 === 0) console.log(`${made} erzeugt …`);
}
const queue = [...texts];
// einzeln und mit Pause: der Gratis-Tarif erlaubt keine parallelen Anfragen
// einzeln und mit Pause: Gratis-Tarife erlauben keine parallelen Anfragen (Azure F0: ca. 20 pro Minute)
while (queue.length && !stop) { await one(queue.shift()); await new Promise(r => setTimeout(r, AZURE ? 3200 : 1200)); }
const have = readdirSync(OUT).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(have));
console.log(`Fertig: ${made} neu, ${failed} Fehler, ${have.length} im Manifest.`);
