import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const firstTouchPath = path.join(repoRoot, 'assets/js/menifa-first-touch.js');
const leadPath = path.join(repoRoot, 'assets/lead-capture.js');
const calcPath = path.join(repoRoot, 'calculators.html');
const cssPath = path.join(repoRoot, 'assets/lead-capture.css');

const firstTouchSrc = fs.readFileSync(firstTouchPath, 'utf8');
const leadSrc = fs.readFileSync(leadPath, 'utf8');
const calc = fs.readFileSync(calcPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

assert.equal(firstTouchSrc.includes('document.referrer'), false);
assert.equal(firstTouchSrc.includes('.referrer'), false);
assert.equal(leadSrc.includes('document.referrer'), false);
assert.equal(leadSrc.includes('.referrer'), false);
assert.equal(leadSrc.includes('soft_preview'), false);
assert.equal(leadSrc.includes('soft_slug'), false);
assert.equal(leadSrc.includes('מקור הפניה (Soft)'), false);
assert.equal(leadSrc.includes('MenifaSoftLeadCapture'), false);
assert.equal(leadSrc.includes('lead-form__soft-makor'), false);
assert.match(leadSrc, /מקור_הפניה/);
assert.match(leadSrc, /makor_hafnia/);
assert.match(leadSrc, /https:\/\/hook\.us2\.make\.com\/u3ru1sllh8ansej9ievnjyr2kici7942/);
assert.equal(css.includes('lead-form__soft-makor'), false);
assert.equal(css.includes('soft-a24'), false);

assert.match(calc, /content="index, follow, max-image-preview:large"/);
assert.equal(calc.includes('noindex'), false);
assert.equal(calc.includes('Soft Preview'), false);
assert.equal(calc.includes('soft-a24-banner'), false);
assert.equal(calc.includes('id="calc-mortgage"'), true);
assert.equal(calc.includes('id="calc-refinance"'), true);
assert.equal(calc.includes('id="calc-dti"'), true);

const firstTouchTag = calc.indexOf('/assets/js/menifa-first-touch.js?v=2026-10-01-a24');
const leadTag = calc.indexOf('/assets/lead-capture.js?v=2026-10-01-a24');
const cssTag = calc.indexOf('/assets/lead-capture.css?v=2026-10-01-a24');
assert.ok(firstTouchTag > 0);
assert.ok(cssTag > 0);
assert.ok(leadTag > firstTouchTag);

const submitSrc = leadSrc.slice(leadSrc.indexOf("form.addEventListener('submit'"));
const guardAt = submitSrc.indexOf('hpInput.value');
const sendAt = submitSrc.indexOf('buildSubmitBody(');
assert.ok(guardAt > 0);
assert.ok(sendAt > guardAt);

assert.equal(firstTouchSrc.includes('<<'), false);
assert.equal(firstTouchSrc.includes('>>'), false);
assert.equal(leadSrc.includes('<<'), false);
assert.equal(leadSrc.includes('>>'), false);

function boot(href, storageSeed) {
  const url = new URL(href, 'http://live.local');
  const bag = Object.assign({}, storageSeed || {});
  const sessionStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null;
    },
    setItem(key, value) {
      bag[key] = String(value);
    }
  };
  const location = {
    href: url.href,
    pathname: url.pathname,
    search: url.search
  };
  const context = {
    URLSearchParams,
    sessionStorage,
    location,
    document: { referrer: 'https://www.google.com/', readyState: 'loading', addEventListener() {} }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(firstTouchSrc, context, { filename: firstTouchPath });
  const start = leadSrc.indexOf("var UNATTRIBUTED = 'לא מיוחס';");
  const end = leadSrc.indexOf('function buildForm(cfg)');
  assert.ok(start > 0 && end > start);
  vm.runInContext(
    leadSrc.slice(start, end) + '\nthis.__attr = { attributionFields: attributionFields, buildSubmitBody: buildSubmitBody };',
    context
  );
  return { context, bag, location };
}

function makor(href) {
  const { context } = boot(href);
  return {
    channel: context.MenifaFirstTouch.getMakorHafnia(),
    touch: context.MenifaFirstTouch.getFirstTouch()
  };
}

const cases = [
  ['http://live.local/calculators.html?utm_source=google&utm_medium=organic', 'seo'],
  ['http://live.local/c?utm_source=Google&utm_medium=Organic', 'seo'],
  ['http://live.local/c?utm_source=google&utm_medium=cpc', 'google'],
  ['http://live.local/c?utm_source=google&utm_medium=paid', 'google'],
  ['http://live.local/c?utm_source=google&utm_medium=ppc', 'google'],
  ['http://live.local/c?utm_source=facebook&utm_medium=paid_social', 'meta'],
  ['http://live.local/c?utm_source=fb&utm_medium=paid', 'meta'],
  ['http://live.local/c?utm_source=ig&utm_medium=cpc', 'meta'],
  ['http://live.local/c?utm_source=instagram&utm_medium=social', 'meta'],
  ['http://live.local/c?utm_source=meta&utm_medium=paid', 'meta'],
  ['http://live.local/c?utm_medium=referral', 'referral'],
  ['http://live.local/c?utm_source=referral&utm_medium=email', 'referral'],
  ['http://live.local/c?utm_source=partner', 'b2b'],
  ['http://live.local/c?utm_source=b2b&utm_medium=email', 'b2b'],
  ['http://live.local/c?utm_source=affiliate&utm_medium=cpc', 'b2b'],
  ['http://live.local/calculators.html', 'לא מיוחס'],
  ['http://live.local/c?utm_source=google', 'לא מיוחס'],
  ['http://live.local/c?utm_medium=organic', 'לא מיוחס'],
  ['http://live.local/c?gclid=Cj0test', 'לא מיוחס'],
  ['http://live.local/c?fbclid=IwARtest', 'לא מיוחס'],
  ['http://live.local/c?utm_source=facebook&utm_medium=organic', 'לא מיוחס'],
  ['http://live.local/c?utm_source=newsletter&utm_medium=email', 'לא מיוחס'],
  ['http://live.local/c?utm_source=fb&utm_medium=ppc', 'לא מיוחס']
];

for (const [href, expected] of cases) {
  const got = makor(href);
  assert.equal(got.channel, expected, href);
}

const organic = makor('http://live.local/calculators.html?utm_source=google&utm_medium=organic&utm_campaign=brand&utm_content=ad1&utm_term=mashkanta&gclid=G1&fbclid=F1');
assert.deepEqual(JSON.parse(JSON.stringify(organic.touch)), {
  utm_source: 'google',
  utm_medium: 'organic',
  utm_campaign: 'brand',
  utm_content: 'ad1',
  utm_term: 'mashkanta',
  gclid: 'G1',
  fbclid: 'F1',
  landing_page_path: '/calculators.html'
});
assert.equal(organic.channel, 'seo');

const bare = makor('http://live.local/calculators.html');
assert.equal(bare.touch.utm_source, '');
assert.equal(bare.touch.gclid, '');
assert.equal(bare.touch.fbclid, '');
assert.equal(bare.touch.landing_page_path, '/calculators.html');
assert.equal(bare.channel, 'לא מיוחס');

const locked = boot('http://live.local/calculators.html?utm_source=google&utm_medium=organic');
locked.location.search = '?utm_source=facebook&utm_medium=paid_social';
locked.location.pathname = '/later.html';
assert.equal(locked.context.MenifaFirstTouch.getMakorHafnia(), 'seo');
assert.equal(locked.context.MenifaFirstTouch.getFirstTouch().landing_page_path, '/calculators.html');
vm.runInContext(firstTouchSrc, locked.context, { filename: firstTouchPath });
assert.equal(locked.context.MenifaFirstTouch.getMakorHafnia(), 'seo');
assert.equal(JSON.parse(locked.bag.menifa_ft_v1).utm_source, 'google');

const meta = boot('http://live.local/calculators.html?utm_source=facebook&utm_medium=paid_social&utm_campaign=leads');
const payload = meta.context.__attr.buildSubmitBody({
  page: 'מחשבון משכנתא',
  name: 'בדיקה',
  phone: '0524502821',
  amount: 1200000,
  note: 'הלוואה',
  ts: '2026-10-01T00:00:00.000Z'
});
assert.equal(payload.page, 'מחשבון משכנתא');
assert.equal(payload.name, 'בדיקה');
assert.equal(payload.phone, '0524502821');
assert.equal(payload.amount, 1200000);
assert.equal(payload.note, 'הלוואה');
assert.equal(payload.ts, '2026-10-01T00:00:00.000Z');
assert.equal(payload.utm_source, 'facebook');
assert.equal(payload.utm_medium, 'paid_social');
assert.equal(payload.utm_campaign, 'leads');
assert.equal(payload.utm_content, '');
assert.equal(payload.utm_term, '');
assert.equal(payload.landing_page_path, '/calculators.html');
assert.equal(payload.page_path, '/calculators.html');
assert.equal(payload.gclid, '');
assert.equal(payload.fbclid, '');
assert.equal(payload['מקור_הפניה'], 'meta');
assert.equal(payload.makor_hafnia, 'meta');
assert.equal(Object.prototype.hasOwnProperty.call(payload, 'soft_preview'), false);
assert.equal(Object.prototype.hasOwnProperty.call(payload, 'soft_slug'), false);

const none = boot('http://live.local/calculators.html');
const emptyPayload = none.context.__attr.buildSubmitBody({
  page: 'מחשבון',
  name: 'א',
  phone: '0524502821',
  amount: '',
  note: '',
  ts: '2026-10-01T00:00:00.000Z'
});
assert.equal(emptyPayload['מקור_הפניה'], 'לא מיוחס');
assert.equal(emptyPayload.makor_hafnia, 'לא מיוחס');
assert.equal(emptyPayload.utm_source, '');

const seo = boot('http://live.local/calculators.html?utm_source=google&utm_medium=organic');
const seoPayload = seo.context.__attr.buildSubmitBody({
  page: 'מחשבון משכנתא',
  name: 'בדיקה',
  phone: '0524502821',
  amount: 1,
  note: '',
  ts: '2026-10-01T00:00:00.000Z'
});
assert.equal(seoPayload['מקור_הפניה'], 'seo');
assert.equal(seoPayload.makor_hafnia, 'seo');

delete none.context.MenifaFirstTouch;
const guessed = none.context.__attr.attributionFields();
assert.equal(guessed['מקור_הפניה'], 'לא מיוחס');
assert.equal(guessed.makor_hafnia, 'לא מיוחס');
assert.equal(guessed.utm_source, '');

console.log('a24 attribution tests passed', cases.length);
