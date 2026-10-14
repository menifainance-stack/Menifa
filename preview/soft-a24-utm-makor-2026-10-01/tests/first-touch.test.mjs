import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const softRoot = path.resolve(here, '..');
const repoRoot = path.resolve(softRoot, '../..');
const firstTouchPath = path.join(softRoot, 'assets/js/menifa-first-touch.js');
const softLeadPath = path.join(softRoot, 'assets/lead-capture.js');
const liveLeadPath = path.join(repoRoot, 'assets/lead-capture.js');
const liveCalcPath = path.join(repoRoot, 'calculators.html');
const softCalcPath = path.join(softRoot, 'calculators.html');

const firstTouchSrc = fs.readFileSync(firstTouchPath, 'utf8');
const softLeadSrc = fs.readFileSync(softLeadPath, 'utf8');
const liveLeadSrc = fs.readFileSync(liveLeadPath, 'utf8');
const liveCalc = fs.readFileSync(liveCalcPath, 'utf8');
const softCalc = fs.readFileSync(softCalcPath, 'utf8');

assert.equal(firstTouchSrc.includes('document.referrer'), false);
assert.equal(softLeadSrc.includes('document.referrer'), false);
assert.equal(firstTouchSrc.includes('.referrer'), false);
assert.equal(softLeadSrc.includes('.referrer'), false);
assert.equal(liveLeadSrc.includes('soft_preview'), false);
assert.equal(liveLeadSrc.includes('מקור_הפניה'), false);
assert.equal(liveLeadSrc.includes('menifa_ft_v1'), false);
assert.equal(liveCalc.includes('noindex, nofollow'), false);
assert.match(liveCalc, /content="index, follow, max-image-preview:large"/);
assert.match(softCalc, /content="noindex, nofollow"/);
assert.match(softCalc, /Soft Preview · A24 ייחוס UTM · לא לייב/);
assert.match(softCalc, /\/preview\/soft-a24-utm-makor-2026-10-01\/assets\/js\/menifa-first-touch\.js/);
assert.match(softCalc, /\/preview\/soft-a24-utm-makor-2026-10-01\/assets\/lead-capture\.js/);
assert.equal(softCalc.includes('id="calc-mortgage"'), true);
assert.equal(softCalc.includes('id="calc-refinance"'), true);
assert.equal(softCalc.includes('id="calc-dti"'), true);
assert.equal(softCalc.includes('src="/assets/lead-capture.js'), false);
assert.equal(softCalc.includes('href="/assets/lead-capture.css'), false);

function boot(href, storageSeed) {
  const url = new URL(href, 'http://soft.local');
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
  ['http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html?utm_source=google&utm_medium=organic', 'seo'],
  ['http://soft.local/c?utm_source=Google&utm_medium=Organic', 'seo'],
  ['http://soft.local/c?utm_source=google&utm_medium=cpc', 'google'],
  ['http://soft.local/c?utm_source=google&utm_medium=paid', 'google'],
  ['http://soft.local/c?utm_source=google&utm_medium=ppc', 'google'],
  ['http://soft.local/c?utm_source=facebook&utm_medium=paid_social', 'meta'],
  ['http://soft.local/c?utm_source=fb&utm_medium=paid', 'meta'],
  ['http://soft.local/c?utm_source=ig&utm_medium=cpc', 'meta'],
  ['http://soft.local/c?utm_source=instagram&utm_medium=social', 'meta'],
  ['http://soft.local/c?utm_source=meta&utm_medium=paid', 'meta'],
  ['http://soft.local/c?utm_medium=referral', 'referral'],
  ['http://soft.local/c?utm_source=referral&utm_medium=email', 'referral'],
  ['http://soft.local/c?utm_source=partner', 'b2b'],
  ['http://soft.local/c?utm_source=b2b&utm_medium=email', 'b2b'],
  ['http://soft.local/c?utm_source=affiliate&utm_medium=cpc', 'b2b'],
  ['http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html', 'לא מיוחס'],
  ['http://soft.local/c?utm_source=google', 'לא מיוחס'],
  ['http://soft.local/c?utm_medium=organic', 'לא מיוחס'],
  ['http://soft.local/c?gclid=Cj0test', 'לא מיוחס'],
  ['http://soft.local/c?fbclid=IwARtest', 'לא מיוחס'],
  ['http://soft.local/c?utm_source=facebook&utm_medium=organic', 'לא מיוחס'],
  ['http://soft.local/c?utm_source=newsletter&utm_medium=email', 'לא מיוחס'],
  ['http://soft.local/c?utm_source=fb&utm_medium=ppc', 'לא מיוחס']
];

for (const [href, expected] of cases) {
  const got = makor(href);
  assert.equal(got.channel, expected, href);
}

const organic = makor('http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html?utm_source=google&utm_medium=organic&utm_campaign=brand&utm_content=ad1&utm_term=mashkanta&gclid=G1&fbclid=F1');
assert.deepEqual(JSON.parse(JSON.stringify(organic.touch)), {
  utm_source: 'google',
  utm_medium: 'organic',
  utm_campaign: 'brand',
  utm_content: 'ad1',
  utm_term: 'mashkanta',
  gclid: 'G1',
  fbclid: 'F1',
  landing_page_path: '/preview/soft-a24-utm-makor-2026-10-01/calculators.html'
});

const bare = makor('http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html');
assert.equal(bare.touch.utm_source, '');
assert.equal(bare.touch.gclid, '');
assert.equal(bare.touch.fbclid, '');
assert.equal(bare.touch.landing_page_path, '/preview/soft-a24-utm-makor-2026-10-01/calculators.html');

const locked = boot('http://soft.local/calculators.html?utm_source=google&utm_medium=organic');
locked.location.search = '?utm_source=facebook&utm_medium=paid_social';
locked.location.pathname = '/later.html';
assert.equal(locked.context.MenifaFirstTouch.getMakorHafnia(), 'seo');
assert.equal(locked.context.MenifaFirstTouch.getFirstTouch().landing_page_path, '/calculators.html');
vm.runInContext(firstTouchSrc, locked.context, { filename: firstTouchPath });
assert.equal(locked.context.MenifaFirstTouch.getMakorHafnia(), 'seo');
assert.equal(JSON.parse(locked.bag.menifa_ft_v1).utm_source, 'google');

const leadContext = boot('http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html?utm_source=facebook&utm_medium=paid_social&utm_campaign=leads');
vm.runInContext(softLeadSrc, leadContext.context, { filename: softLeadPath });
const payload = leadContext.context.MenifaSoftLeadCapture.buildSubmitBody({
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
assert.equal(payload.landing_page_path, '/preview/soft-a24-utm-makor-2026-10-01/calculators.html');
assert.equal(payload.page_path, '/preview/soft-a24-utm-makor-2026-10-01/calculators.html');
assert.equal(payload.gclid, '');
assert.equal(payload.fbclid, '');
assert.equal(payload['מקור_הפניה'], 'meta');
assert.equal(payload.makor_hafnia, 'meta');
assert.equal(payload.soft_preview, true);
assert.equal(payload.soft_slug, 'a24-utm-makor-2026-10-01');

const none = boot('http://soft.local/preview/soft-a24-utm-makor-2026-10-01/calculators.html');
vm.runInContext(softLeadSrc, none.context, { filename: softLeadPath });
const emptyPayload = none.context.MenifaSoftLeadCapture.buildSubmitBody({
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

delete none.context.MenifaFirstTouch;
const guessed = none.context.MenifaSoftLeadCapture.attributionFields();
assert.equal(guessed['מקור_הפניה'], 'לא מיוחס');
assert.equal(guessed.makor_hafnia, 'לא מיוחס');

const submitSrc = softLeadSrc.slice(softLeadSrc.indexOf("form.addEventListener('submit'"));
const guardAt = submitSrc.indexOf('hpInput.value');
const sendAt = submitSrc.indexOf('buildSubmitBody(');
assert.ok(guardAt > 0);
assert.ok(sendAt > guardAt);

console.log('first-touch tests passed', cases.length);
