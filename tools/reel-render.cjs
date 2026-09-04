#!/usr/bin/env node
/* ============================================================================
   Renderar reelen i reels/hemliga-samhallet/ till MP4, stillbilder eller en
   kontaktkarta – bildruta för bildruta, deterministiskt, via headless Chromium.

   Kräver:  playwright   (globalt installerat: NODE_PATH=/opt/node22/lib/node_modules)
            ffmpeg       (FFMPEG=/sökväg, paketet ffmpeg-static, eller ffmpeg på PATH)

   Exempel:
     node tools/reel-render.cjs --list
     node tools/reel-render.cjs --stills 3,20.5,60 --out out/stills --scale 0.5
     node tools/reel-render.cjs --sheet out/karta.png --every 2 --from 35 --to 75 --cols 6 --scale 0.25
     node tools/reel-render.cjs --mp4 out/reel.mp4                      (hela filmen, 30 fps, H.264)
     node tools/reel-render.cjs --mp4 out/scen3.mp4 --from 35 --to 75 --crf 18

   Flaggor: --from/--to sekunder · --fps (30) · --scale (1 = 1080×1920) · --stamp true/false
   (tidsstämpel i hörnet; standard på för stillbilder/karta, av för mp4) · --guides (rita säker yta)
   ============================================================================ */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PAGE = '/reels/hemliga-samhallet/index.html';

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); o[k] = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true; }
    else o._.push(a);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
if (args.help || !(args.mp4 || args.stills || args.sheet || args.list)) {
  console.log(fs.readFileSync(__filename, 'utf8').split('====')[1].trim());
  process.exit(args.help ? 0 : 1);
}
const bool = (v, d) => (v == null ? d : !(v === 'false' || v === '0' || v === 'off'));

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return require('ffmpeg-static'); } catch (e) { /* inte installerat */ }
  return 'ffmpeg';
}
function findPlaywright() {
  try { return require('playwright'); } catch (e) { /* prova nästa */ }
  try { return require('playwright-core'); } catch (e) { /* saknas */ }
  console.error('Hittar inte playwright. Kör t.ex.:\n  NODE_PATH=/opt/node22/lib/node_modules node tools/reel-render.cjs …\neller npm i -g playwright');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.normalize(path.join(ROOT, p));
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404 ' + p); }
        res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ port: srv.address().port, close: () => srv.close() }));
  });
}

const fmtT = t => { const s = Math.floor(t); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${Math.floor((t - s) * 10)}`; };
const mkdirp = d => fs.mkdirSync(d, { recursive: true });

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(cmd + ' avslutades med kod ' + code))));
  });
}

async function main() {
  const { chromium } = findPlaywright();
  const scale = +args.scale || 1, fps = +args.fps || 30;
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale });
  const pageErrors = [];
  page.on('pageerror', e => { pageErrors.push(e.message); console.error('[sida] fel:', e.message); });
  page.on('console', m => { if (m.type() === 'error') { pageErrors.push(m.text()); console.error('[sida]', m.text()); } });
  const extra = (bool(args.guides, false) ? '&guides' : '');
  await page.goto(`http://127.0.0.1:${srv.port}${args.page || DEFAULT_PAGE}?render=1${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__reel && window.__reel.fontsReady === true, null, { timeout: 30000 });
  const info = await page.evaluate(() => ({ duration: __reel.duration, scenes: __reel.scenes }));
  const from = args.from != null ? +args.from : 0, to = args.to != null ? +args.to : info.duration;

  if (args.list) {
    console.log(`Längd ${fmtT(info.duration)} (${info.duration} s) · ${fps} fps`);
    info.scenes.forEach((s, i) => console.log(`  ${i + 1}. ${s.id.padEnd(12)} ${fmtT(s.start)} – ${fmtT(s.end)}   ${s.name}`));
  }

  const clip = { x: 0, y: 0, width: 1080, height: 1920 };
  const stampDefault = !args.mp4;
  const stamp = bool(args.stamp, stampDefault);
  const guides = bool(args.guides, false);
  async function snap(t) {
    await page.evaluate(([t, stamp, guides]) => window.__reel.seek(t, { stamp, guides }), [t, stamp, guides]);
    return page.screenshot({ type: 'png', clip, scale: 'device' });
  }

  if (args.stills) {
    const out = args.out || path.join(ROOT, 'reels/hemliga-samhallet/out/stills'); mkdirp(out);
    const times = String(args.stills).split(',').map(Number).filter(n => !isNaN(n));
    for (const t of times) {
      const f = path.join(out, `${t.toFixed(1).padStart(6, '0')}s.png`);
      fs.writeFileSync(f, await snap(t));
      console.log('still', fmtT(t), '→', f);
    }
  }

  if (args.sheet) {
    const every = +args.every || 2, cols = +args.cols || 6;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-sheet-'));
    const times = []; for (let t = from; t < to; t += every) times.push(+t.toFixed(3));
    for (let i = 0; i < times.length; i++) fs.writeFileSync(path.join(tmp, `f${String(i + 1).padStart(4, '0')}.png`), await snap(times[i]));
    const rows = Math.ceil(times.length / cols);
    const out = path.resolve(args.sheet === true ? path.join(ROOT, 'reels/hemliga-samhallet/out/karta.png') : args.sheet); mkdirp(path.dirname(out));
    await run(findFfmpeg(), ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '1', '-i', path.join(tmp, 'f%04d.png'),
      '-filter_complex', `tile=${cols}x${rows}:padding=6:margin=6:color=0x1b1b1e`, '-frames:v', '1', '-update', '1', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`kontaktkarta ${times.length} rutor (${cols}×${rows}), var ${every}:e sekund från ${fmtT(from)} till ${fmtT(to)} → ${out}`);
    console.log('  läsordning: vänster→höger, rad för rad; ruta n visar t = ' + from + ' + (n−1)·' + every + ' s');
  }

  if (args.mp4) {
    const out = path.resolve(args.mp4 === true ? path.join(ROOT, 'reels/hemliga-samhallet/out/reel.mp4') : args.mp4); mkdirp(path.dirname(out));
    const n = Math.round((to - from) * fps), crf = String(args.crf || 18);
    const ff = spawn(findFfmpeg(), ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', crf, '-preset', args.preset || 'medium', '-profile:v', 'high', '-movflags', '+faststart', out],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg kod ' + code)))); });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = await snap(from + i / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % Math.max(1, Math.floor(n / 20)) === 0 || i === n - 1) {
        const el = (Date.now() - t0) / 1000;
        process.stdout.write(`\r  ${String(Math.round(100 * (i + 1) / n)).padStart(3)} %  ${i + 1}/${n} rutor  ${el.toFixed(0)} s` + (i ? `  (~${(el / (i + 1) * (n - i - 1)).toFixed(0)} s kvar)` : '') + '   ');
      }
    }
    ff.stdin.end(); await done;
    const mb = (fs.statSync(out).size / 1048576).toFixed(1);
    console.log(`\nmp4 ${fmtT(from)}–${fmtT(to)} · ${n} rutor @ ${fps} fps · ${mb} MB → ${out}`);
  }

  const errs = await page.evaluate(() => window.__reel.errors);
  await browser.close(); srv.close();
  if (errs.length || pageErrors.length) {
    console.error('\nFEL under renderingen:'); [...new Set([...errs, ...pageErrors])].forEach(e => console.error('  ·', e));
    process.exit(2);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
