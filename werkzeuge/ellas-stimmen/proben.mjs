// Hörproben deutscher Azure-Frauenstimmen für "Ellas Babykatzen" -> anhoeren.html
import { readFileSync, writeFileSync } from 'node:fs';
const [k, reg] = readFileSync('../../../azure-speech.key', 'utf8').split(/\r?\n/).map(s => s.trim());
const TEXT = 'Die kleinen Vampire wollen nachts Unfug machen. Nur die mutigen Babykatzen können sie nach Hause zu Mama schicken! Welche Babykatze bist du?';
const INFO = {
  SeraphinaMultilingual: 'warm, sehr natürlich, Erzählerin', Katja: 'klar und freundlich, Klassiker',
  Amala: 'weich, ruhig', Elke: 'reifer, gemütlich', Gisela: 'Kinderstimme (Mädchen)', Klarissa: 'hell, lebhaft',
  Louisa: 'jung, fröhlich', Maja: 'sanft, jung', Tanja: 'sachlich, deutlich',
};
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = [];
for (const name of Object.keys(INFO)) {
  const voice = `de-DE-${name}Neural`;
  const ssml = `<speak version="1.0" xml:lang="de-DE"><voice name="${voice}"><prosody rate="-8%" pitch="+3%">${esc(TEXT)}</prosody></voice></speak>`;
  const r = await fetch(`https://${reg}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', body: ssml,
    headers: { 'Ocp-Apim-Subscription-Key': k, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'spielekiste' },
  });
  if (!r.ok) { console.warn('Fehler', voice, r.status, (await r.text()).slice(0, 200)); break; }
  writeFileSync(`${name}.mp3`, Buffer.from(await r.arrayBuffer()));
  rows.push(`<div class="v"><b>${name.replace('Multilingual', '')}</b><small>${INFO[name]}</small><audio controls preload="none" src="${name}.mp3"></audio></div>`);
  console.log('ok', voice);
  await new Promise(res => setTimeout(res, 3500));
}
writeFileSync('anhoeren.html', `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stimme für Ellas Babykatzen</title>
<style>body{margin:0;font:17px/1.5 system-ui,sans-serif;background:#2a2152;color:#fff6e6;padding:24px 16px}main{max-width:540px;margin:0 auto;display:grid;gap:12px}h1{margin:0;font-size:1.5rem}p{margin:0;color:#d9cdf2}.v{background:#3b2f6e;border-radius:14px;padding:10px 14px;display:grid;gap:4px}small{color:#d9cdf2}audio{width:100%}</style></head>
<body><main><h1>Welche Stimme liest Ellas Babykatzen vor?</h1><p>„${TEXT}“</p>${rows.join('')}</main></body></html>`);
console.log(rows.length, 'Proben fertig');
