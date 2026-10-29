#!/usr/bin/env node
/**
 * consent-a11y-360 overlap scan.
 *
 * For each lead-form page, at 360x800 and 390x844, scroll in 40px steps
 * (under the 50px cap) across every offset where the form intersects the
 * viewport. Record the max intersection area of .fab-a11y with the mailing
 * consent label and with the submit control. Both must be 0 after the fix.
 *
 * No form is submitted. Any non-GET request, and any request to the Make
 * webhook, is aborted.
 *
 *   PLAYWRIGHT_PATH=/tmp/pw-consent/node_modules/playwright/index.js \
 *     node evidence/consent-a11y-360/overlap-check.mjs --phase before|after --base http://127.0.0.1:8765
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const playwrightEntry = process.env.PLAYWRIGHT_PATH || 'playwright';
const playwrightMod = await import(
  playwrightEntry.startsWith('/') ? pathToFileURL(playwrightEntry).href : playwrightEntry
);
const chromium = (playwrightMod.chromium || (playwrightMod.default && playwrightMod.default.chromium));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STEP = 40;
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 }
];
const DESKTOP = { width: 1280, height: 800 };
const SHOT_PAGES = [
  'lp/mihzur/index.html',
  'lp/ihud/index.html',
  'blog/ריבית-משכנתא-היום.html',
  'index.html',
  'contact.html'
];
const DESKTOP_PAGES = [
  'index.html',
  'lp/mihzur/index.html',
  'blog/ריבית-משכנתא-היום.html'
];

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  return process.argv[i + 1];
}
function has(name) {
  return process.argv.includes('--' + name);
}

const phase = arg('phase', 'after');
const base = arg('base', 'http://127.0.0.1:8765').replace(/\/$/, '');
const only = arg('only', '');
const outDir = path.resolve(arg('out', path.join(ROOT, 'evidence/consent-a11y-360', phase)));
const beforePath = arg('before', path.join(ROOT, 'evidence/consent-a11y-360/before/overlap.json'));

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'evidence' || ent.name === 'tests' || ent.name === 'mockups' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function toUrl(relPath) {
  return base + '/' + relPath.split('/').map(encodeURIComponent).join('/');
}

function discover() {
  const files = walk(ROOT, []);
  const lead = [];
  const lpNoForm = [];
  for (const file of files) {
    const r = rel(file);
    const html = fs.readFileSync(file, 'utf8');
    const isLead = html.includes('class="lead-form"') || html.includes('data-lead=');
    if (r.startsWith('lp/') && !isLead) lpNoForm.push(r);
    if (!isLead) continue;
    if (!html.includes('fab-a11y')) continue;
    lead.push(r);
  }
  lead.sort();
  lpNoForm.sort();
  return { lead, lpNoForm };
}

async function settle(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function readPage(page) {
  return page.evaluate(async (step) => {
    function area(a, b) {
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (!(w > 0) || !(h > 0)) return 0;
      return w * h;
    }
    function round1(n) {
      return Math.round(n * 10) / 10;
    }
    function lineCount(el) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      let lh = parseFloat(cs.lineHeight);
      const h = el.getBoundingClientRect().height;
      if (!lh || Number.isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
      if (!h || !lh) return null;
      return Math.max(1, Math.round(h / lh));
    }
    const forms = Array.from(document.querySelectorAll('form.lead-form, form[data-lead]'));
    const fab = document.querySelector('.fab-a11y');
    const btn = fab ? fab.querySelector('.fab-btn') : null;
    if (!fab || !btn || !forms.length) {
      return { error: 'missing fab or lead form', forms: forms.length, fab: !!fab };
    }

    document.documentElement.style.scrollBehavior = 'auto';
    const go = (y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    const frames = (n) => new Promise((resolve) => {
      let left = n;
      const tick = () => { left -= 1; if (left > 0) requestAnimationFrame(tick); else resolve(); };
      requestAnimationFrame(tick);
    });
    const settled = async () => {
      let prev = '';
      let stable = 0;
      for (let i = 0; i < 8 && stable < 2; i++) {
        await frames(1);
        const form = document.querySelector('form.lead-form, form[data-lead]');
        const marketing = form && form.querySelector('input[name="marketing"]');
        const block = marketing && (marketing.closest('label') || marketing);
        const fab = document.querySelector('.fab-a11y');
        const br = block ? block.getBoundingClientRect() : { top: 0, bottom: 0 };
        const fr = fab ? fab.getBoundingClientRect() : { top: 0, bottom: 0 };
        const sig = [Math.round(br.top), Math.round(br.bottom), Math.round(fr.top), Math.round(fr.bottom)].join(',');
        stable = sig === prev ? stable + 1 : 0;
        prev = sig;
      }
    };
    go(0);
    await settled();

    const form = forms[0];
    const box = form.closest('#form') || form.parentElement;
    const heading = box ? box.querySelector('h1, h2, h3') : null;
    const rows = Array.from(form.querySelectorAll(':scope > .row')).map((el) => round1(el.getBoundingClientRect().height));
    const submit0 = form.querySelector('button[type="submit"], input[type="submit"]');
    const band = document.querySelector('.bg-cta');
    const bandHeading = band ? band.querySelector('h1, h2, h3') : null;
    const bandWidthPct = band ? round1((band.getBoundingClientRect().width / window.innerWidth) * 100) : null;
    const metrics = {
      headingText: heading ? heading.textContent.replace(/\s+/g, ' ').trim() : '',
      headingLines: lineCount(heading),
      headingHeight: heading ? round1(heading.getBoundingClientRect().height) : null,
      rowHeights: rows,
      submitHeight: submit0 ? round1(submit0.getBoundingClientRect().height) : null,
      submitText: submit0 ? submit0.textContent.replace(/\s+/g, ' ').trim() : '',
      bandHeadingLines: lineCount(bandHeading),
      bandWidthPct
    };

    const vh = window.innerHeight;
    const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
    let start = Infinity;
    let end = -Infinity;
    for (const f of forms) {
      const r = f.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = r.bottom + window.scrollY;
      start = Math.min(start, Math.max(0, top - vh));
      end = Math.max(end, Math.min(maxY, bottom));
    }
    if (!Number.isFinite(start)) start = 0;
    if (!Number.isFinite(end)) end = 0;
    const points = [];
    const push = (y) => {
      const yy = Math.max(0, Math.min(maxY, Math.round(y)));
      if (!points.includes(yy)) points.push(yy);
    };
    for (let y = start; y < end; y += step) push(y);
    push(end);

    let maxConsent = 0;
    let maxSubmit = 0;
    let minFabW = Infinity;
    let minFabH = Infinity;
    let hiddenFrames = 0;
    let worst = null;
    const fabBox = () => fab.getBoundingClientRect();

    for (const y of points) {
      go(y);
      await settled();
      const fr = fabBox();
      const br = btn.getBoundingClientRect();
      const cs = getComputedStyle(fab);
      const bcs = getComputedStyle(btn);
      if (cs.display === 'none' || cs.visibility === 'hidden' || bcs.display === 'none' || bcs.visibility === 'hidden' || fr.width < 1 || fr.height < 1) hiddenFrames++;
      minFabW = Math.min(minFabW, br.width);
      minFabH = Math.min(minFabH, br.height);
      for (const f of forms) {
        const marketing = f.querySelector('input[name="marketing"]');
        const block = marketing ? (marketing.closest('label') || marketing) : null;
        const submit = f.querySelector('button[type="submit"], input[type="submit"]');
        if (block) {
          const a = area(fr, block.getBoundingClientRect());
          if (a > maxConsent) {
            maxConsent = a;
            worst = { kind: 'consent', area: a, y, fabTop: fr.top };
          }
        }
        if (submit) {
          const a = area(fr, submit.getBoundingClientRect());
          if (a > maxSubmit) {
            maxSubmit = a;
            if (!worst || a > worst.area) worst = { kind: 'submit', area: a, y, fabTop: fr.top };
          }
        }
      }
    }

    go(0);
    await settled();
    const rest = fab.getBoundingClientRect();
    btn.focus({ preventScroll: true });
    const reachable = document.activeElement === btn
      && !btn.disabled
      && !btn.hidden
      && !fab.hidden
      && btn.getAttribute('aria-hidden') !== 'true'
      && fab.getAttribute('aria-hidden') !== 'true'
      && !btn.inert
      && !fab.inert
      && btn.tabIndex >= 0
      && (btn.getAttribute('aria-label') || '').length > 0;

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      steps: points.length,
      stepPx: step,
      range: [Math.round(start), Math.round(end)],
      maxConsentPx2: maxConsent,
      maxSubmitPx2: maxSubmit,
      maxPx2: Math.max(maxConsent, maxSubmit),
      fabMinW: minFabW,
      fabMinH: minFabH,
      hiddenFrames,
      worst,
      reachable,
      ariaLabel: btn.getAttribute('aria-label'),
      liftAtRest: getComputedStyle(document.documentElement).getPropertyValue('--a11y-fab-lift').trim(),
      fabBottomGapAtRest: round1(window.innerHeight - rest.bottom),
      metrics
    };
  }, STEP);
}

async function shoot(page, file) {
  await page.evaluate(async () => {
    const form = document.querySelector('form.lead-form, form[data-lead]');
    const submit = form && form.querySelector('button[type="submit"], input[type="submit"]');
    const marketing = form && form.querySelector('input[name="marketing"]');
    const block = marketing && (marketing.closest('label') || marketing);
    const anchor = submit || block || form;
    if (!anchor) return;
    const vh = window.innerHeight;
    document.documentElement.style.scrollBehavior = 'auto';
    const bottom = anchor.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: Math.max(0, Math.round(bottom - (vh - 28))), left: 0, behavior: 'instant' });
    let prev = '';
    let stable = 0;
    for (let i = 0; i < 8 && stable < 2; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const form = document.querySelector('form.lead-form, form[data-lead]');
      const marketing = form && form.querySelector('input[name="marketing"]');
      const block = marketing && (marketing.closest('label') || marketing);
      const fab = document.querySelector('.fab-a11y');
      const br = block ? block.getBoundingClientRect() : { top: 0, bottom: 0 };
      const fr = fab ? fab.getBoundingClientRect() : { top: 0, bottom: 0 };
      const sig = [Math.round(br.top), Math.round(br.bottom), Math.round(fr.top), Math.round(fr.bottom)].join(',');
      stable = sig === prev ? stable + 1 : 0;
      prev = sig;
    }
  });
  await page.screenshot({ path: file, fullPage: false });
}

function mdTable(rows) {
  const head = '| page | width | steps | max consent px² | max submit px² | max px² | fab min | reachable | heading lines | row heights |';
  const sep = '|---|---:|---:|---:|---:|---:|---|---|---:|---|';
  const body = rows.map((r) => {
    const fab = r.error ? '' : `${Math.round(r.fabMinW)}×${Math.round(r.fabMinH)}`;
    const rowsH = r.metrics ? r.metrics.rowHeights.join(', ') : '';
    const lines = r.metrics ? r.metrics.headingLines : '';
    return `| ${r.path} | ${r.width} | ${r.steps ?? ''} | ${r.maxConsentPx2 ?? ''} | ${r.maxSubmitPx2 ?? ''} | ${r.maxPx2 ?? ''} | ${fab} | ${r.reachable ?? ''} | ${lines ?? ''} | ${rowsH} |`;
  });
  return [head, sep, ...body].join('\n') + '\n';
}

async function main() {
  const found = discover();
  let pages = found.lead;
  if (only) pages = pages.filter((p) => p === only || p.endsWith(only));
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'shots'), { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const shardArg = arg('shard', '');
  let shardI = 1;
  let shardN = 1;
  if (shardArg) {
    const parts = shardArg.split('/');
    shardI = Number(parts[0]);
    shardN = Number(parts[1]);
    pages = pages.filter((_, idx) => idx % shardN === (shardI - 1));
  }

  const results = [];
  const desktopResults = [];
  let makeHits = 0;
  let nonGet = 0;

  async function arm(context) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('menifa-consent', JSON.stringify({
          v: 2, necessary: true, statistics: false, marketing: false, ts: '2026-10-29T00:00:00.000Z'
        }));
      } catch (e) {}
    });
    await context.route('**/*', (route) => {
      const req = route.request();
      const url = req.url();
      if (/make\.com|hook\.us2/i.test(url)) {
        makeHits++;
        return route.abort();
      }
      if (req.method() !== 'GET' && req.method() !== 'HEAD') {
        nonGet++;
        return route.abort();
      }
      return route.continue();
    });
  }

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: 'he-IL',
      deviceScaleFactor: 1
    });
    await arm(context);
    const page = await context.newPage();
    for (const relPath of pages) {
      const url = toUrl(relPath);
      process.stdout.write(`${phase} ${vp.width} ${relPath}\n`);
      try {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await settle(page);
        const data = await readPage(page);
        data.path = relPath;
        data.width = vp.width;
        data.height = vp.height;
        data.status = res ? res.status() : 0;
        results.push(data);
        if (SHOT_PAGES.includes(relPath)) {
          const slug = relPath
            .replace(/^blog\//, 'blog-')
            .replace(/\.html$/, '')
            .replace(/[\/]/g, '-');
          const file = path.join(outDir, 'shots', `${vp.width}-${slug}.png`);
          await shoot(page, file);
          data.shot = path.relative(ROOT, file);
        }
      } catch (err) {
        results.push({ path: relPath, width: vp.width, height: vp.height, error: String(err && err.message || err) });
        process.stdout.write(`  ERR ${err && err.message}\n`);
      }
    }
    await context.close();
  }

  if (!only && shardI === 1) {
    const context = await browser.newContext({
      viewport: { width: DESKTOP.width, height: DESKTOP.height },
      locale: 'he-IL',
      deviceScaleFactor: 1
    });
    await arm(context);
    const page = await context.newPage();
    for (const relPath of DESKTOP_PAGES) {
      if (!pages.includes(relPath) && !found.lead.includes(relPath)) continue;
      process.stdout.write(`${phase} desktop ${relPath}\n`);
      try {
        await page.goto(toUrl(relPath), { waitUntil: 'domcontentloaded', timeout: 20000 });
        await settle(page);
        const data = await readPage(page);
        data.path = relPath;
        data.width = DESKTOP.width;
        data.height = DESKTOP.height;
        desktopResults.push(data);
      } catch (err) {
        desktopResults.push({ path: relPath, width: DESKTOP.width, error: String(err && err.message || err) });
      }
    }
    await context.close();
  }

  await browser.close();

  const payload = {
    phase,
    base,
    stepPx: STEP,
    generatedAt: new Date().toISOString(),
    pageCount: pages.length,
    lpWithoutLeadForm: found.lpNoForm,
    makeWebhookRequestsAborted: makeHits,
    otherNonGetAborted: nonGet,
    pages: results,
    desktop: desktopResults
  };
  fs.writeFileSync(path.join(outDir, 'overlap.json'), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(outDir, 'overlap-table.md'), mdTable(results));
  fs.writeFileSync(path.join(outDir, 'pages.txt'), pages.join('\n') + '\n');

  let failed = 0;
  if (phase === 'after') {
    for (const row of results) {
      if (row.error || row.maxPx2 > 0 || row.hiddenFrames || row.reachable !== true || row.fabMinW < 44 || row.fabMinH < 44) failed++;
    }
    if (makeHits > 0) failed++;
    if (fs.existsSync(beforePath)) {
      const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
      const key = (r) => r.path + '@' + r.width;
      const bmap = new Map((before.pages || []).map((r) => [key(r), r]));
      const lines = ['| page | width | before consent | before submit | after consent | after submit | heading lines before/after | rows same |',
        '|---|---:|---:|---:|---:|---:|---|---|'];
      const reg = [];
      const near = (a, b) => (a == null && b == null) || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1);
      const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) <= 1);
      for (const row of results) {
        const b = bmap.get(key(row));
        const sameRows = !!(b && row.metrics && b.metrics && sameList(b.metrics.rowHeights, row.metrics.rowHeights));
        const sameHead = !!(b && row.metrics && b.metrics && b.metrics.headingLines === row.metrics.headingLines && near(b.metrics.headingHeight, row.metrics.headingHeight));
        const sameSubmit = !!(b && row.metrics && b.metrics && near(b.metrics.submitHeight, row.metrics.submitHeight) && b.metrics.submitText === row.metrics.submitText);
        const sameBand = !!(b && row.metrics && b.metrics && b.metrics.bandHeadingLines === row.metrics.bandHeadingLines && near(b.metrics.bandWidthPct, row.metrics.bandWidthPct));
        if (!sameRows || !sameHead || !sameSubmit || !sameBand) failed++;
        lines.push(`| ${row.path} | ${row.width} | ${b ? b.maxConsentPx2 : ''} | ${b ? b.maxSubmitPx2 : ''} | ${row.maxConsentPx2} | ${row.maxSubmitPx2} | ${b && b.metrics ? b.metrics.headingLines : ''}/${row.metrics ? row.metrics.headingLines : ''} | ${sameRows && sameHead ? 'yes' : 'NO'} |`);
        reg.push({ path: row.path, width: row.width, sameRows, sameHead, sameSubmit, sameBand, before: b && b.metrics, after: row.metrics });
      }
      const dlines = ['', '## Desktop sample (must match main)', '', '| page | before bottom gap | after bottom gap | before heading | after heading | lift |', '|---|---:|---:|---:|---:|---|'];
      const bdmap = new Map((before.desktop || []).map((r) => [r.path, r]));
      for (const row of desktopResults) {
        const b = bdmap.get(row.path);
        const gapOk = b && Math.abs((b.fabBottomGapAtRest || 0) - (row.fabBottomGapAtRest || 0)) <= 1;
        const headOk = b && row.metrics && b.metrics && b.metrics.headingLines === row.metrics.headingLines && sameList(b.metrics.rowHeights, row.metrics.rowHeights);
        if (!gapOk || !headOk || (row.liftAtRest && row.liftAtRest !== '0px' && row.liftAtRest !== '')) failed++;
        dlines.push(`| ${row.path} | ${b ? b.fabBottomGapAtRest : ''} | ${row.fabBottomGapAtRest} | ${b && b.metrics ? b.metrics.headingLines : ''} | ${row.metrics ? row.metrics.headingLines : ''} | ${row.liftAtRest || '(unset)'} |`);
      }
      const cmp = lines.join('\n') + '\n' + dlines.join('\n') + '\n';
      fs.writeFileSync(path.join(ROOT, 'evidence/consent-a11y-360/overlap-table.md'), cmp);
      fs.writeFileSync(path.join(ROOT, 'evidence/consent-a11y-360/regression.json'), JSON.stringify({ failed, reg, desktop: desktopResults }, null, 2));
    }
  }

  const summary = {
    phase,
    pages: results.length,
    failed,
    makeHits,
    nonGet,
    maxAfter: phase === 'after' ? Math.max(0, ...results.map((r) => r.maxPx2 || 0)) : null
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  process.stdout.write(JSON.stringify(summary) + '\n');
  if (phase === 'after' && failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
