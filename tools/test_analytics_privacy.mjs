/**
 * Privacy proof for generate_lead / Pixel / GA4.
 *
 * Loads contact.html + assets/site.js in jsdom, submits a fake lead with
 * need = מסורבי בנקים, and prints the analytics payloads next to the CRM body.
 * fetch is stubbed. Nothing is sent to Make.com or SmartNPV.
 *
 *   npm install --prefix /tmp/privacy-harness jsdom
 *   node tools/test_analytics_privacy.mjs
 * jsdom is loaded from JSDOM_PACKAGE or /tmp/privacy-harness (not a site dependency).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const jsdomPkg = process.env.JSDOM_PACKAGE || '/tmp/privacy-harness/node_modules/jsdom/package.json';
const { JSDOM } = createRequire(jsdomPkg)('jsdom');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'contact.html'), 'utf8');
const siteJs = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');
const NEED = 'מסורבי בנקים';
const SENSITIVE = /מסורב|סירוב|050-1234567|חוב 500000|123456782|test@example\.com/;

function boot(consent) {
  const dom = new JSDOM(html, {
    url: 'https://menifa.org/contact.html?utm_source=preview&utm_medium=qa&utm_campaign=privacy-test&utm_content=need-gate',
    pretendToBeVisual: true,
    runScripts: 'outside-only'
  });
  const { window } = dom;
  window.scrollTo = function () {};
  window.MENIFA_TRACK = { ga4: '', meta_pixel: '', clarity: '' };
  if (consent) {
    window.localStorage.setItem('menifa-consent', JSON.stringify({
      v: 2, necessary: true, statistics: true, marketing: true, ts: '2026-10-06T00:00:00.000Z'
    }));
  }
  window.document.cookie = '_fbp=fb.1.privacytest';
  window.document.cookie = '_fbc=fb.1.privacyclick';
  const crm = [];
  window.fetch = function (url, opts) {
    crm.push({
      url: String(url),
      mode: opts && opts.mode,
      body: opts && opts.body ? String(opts.body) : ''
    });
    return Promise.resolve({ ok: true, status: 0, type: 'opaque' });
  };
  window.eval(siteJs);
  window.document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) e.preventDefault();
  }, true);
  const gtagCalls = [];
  const fbqCalls = [];
  window.__ga = true;
  window.gtag = function () { gtagCalls.push(Array.prototype.slice.call(arguments)); };
  window.fbq = function () { fbqCalls.push(Array.prototype.slice.call(arguments)); };
  return { window, crm, gtagCalls, fbqCalls };
}

function leadEvents(window) {
  return (window.dataLayer || []).filter(function (e) { return e && e.event === 'generate_lead'; });
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

function noSensitive(payload, label) {
  const blob = JSON.stringify(payload);
  assert(!SENSITIVE.test(blob), label + ' still contains sensitive text: ' + blob);
  assert(!Object.prototype.hasOwnProperty.call(payload, 'need'), label + ' has need');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'name'), label + ' has name');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'phone'), label + ' has phone');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'email'), label + ' has email');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'note'), label + ' has note');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'answers'), label + ' has answers');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'link_text'), label + ' has link_text');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'income'), label + ' has income');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'amount'), label + ' has amount');
  assert(!Object.prototype.hasOwnProperty.call(payload, 'id_number'), label + ' has id_number');
}

const { window, crm, gtagCalls, fbqCalls } = boot(true);
const { document } = window;
const form = document.querySelector('form[data-lead]');
form.querySelector('[name=name]').value = 'בדיקת פרטיות';
form.querySelector('[name=phone]').value = '050-1234567';
form.querySelector('[name=need]').value = NEED;
form.querySelector('[name=when]').value = 'השבוע';
form.querySelector('[name=consent]').checked = true;

const note = document.createElement('textarea');
note.name = 'note';
note.value = 'חוב 500000 והכנסה 20000';
form.appendChild(note);
const fsEl = document.createElement('fieldset');
fsEl.setAttribute('data-q', '');
const legend = document.createElement('legend');
legend.textContent = 'כמה הלוואות פעילות יש לכם?';
fsEl.appendChild(legend);
const radio = document.createElement('input');
radio.type = 'radio';
radio.name = 'q0';
radio.value = '4 ומעלה';
radio.checked = true;
fsEl.appendChild(radio);
form.appendChild(fsEl);

form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

const dl = leadEvents(window);
assert(dl.length === 1, 'expected one generate_lead on the dataLayer, got ' + dl.length);
const analyticsEvent = dl[0];
noSensitive(analyticsEvent, 'dataLayer generate_lead');
assert(analyticsEvent.value === 1, 'value must stay 1');
assert(analyticsEvent.currency === 'ILS', 'currency must stay ILS');
assert(analyticsEvent.form === 'contact', 'form id should remain the public form id');
assert(analyticsEvent.page === '/contact.html', 'page should remain the public path');
assert(typeof analyticsEvent.event_id === 'string' && analyticsEvent.event_id.indexOf('lead_') === 0, 'event_id kept for dedup');

const gtagLead = gtagCalls.filter(function (c) { return c[0] === 'event' && c[1] === 'generate_lead'; });
assert(gtagLead.length === 1, 'expected one gtag generate_lead');
noSensitive(gtagLead[0][2], 'gtag generate_lead');
assert(gtagLead[0][2].value === 1, 'gtag value must stay 1');

const fbqLead = fbqCalls.filter(function (c) { return c[0] === 'track' && c[1] === 'Lead'; });
assert(fbqLead.length === 1, 'expected one fbq Lead');
noSensitive(fbqLead[0][2], 'fbq Lead');
assert(fbqLead[0][2].value === 1, 'fbq value must stay 1');
assert(fbqLead[0][3] && fbqLead[0][3].eventID === analyticsEvent.event_id, 'fbq eventID should match event_id');

assert(crm.length === 1, 'expected exactly one stubbed CRM post, got ' + crm.length);
assert(crm[0].url === 'https://hook.us2.make.com/9pclkzy81xfnlh1nfyista793l9hbdig', 'CRM url changed');
assert(crm[0].mode === 'no-cors', 'CRM mode changed');
const crmFields = Object.fromEntries(new URLSearchParams(crm[0].body));
assert(crmFields.need === NEED, 'CRM lost need: ' + crmFields.need);
assert(crmFields.name === 'בדיקת פרטיות', 'CRM lost name');
assert(crmFields.phone === '050-1234567', 'CRM lost phone');
assert(crmFields.note === 'חוב 500000 והכנסה 20000', 'CRM lost note');
assert(crmFields.answers.indexOf('4 ומעלה') !== -1, 'CRM lost quiz answers');
assert(crmFields.utm_source === 'preview', 'CRM lost utm_source');
assert(crmFields.utm_medium === 'qa', 'CRM lost utm_medium');
assert(crmFields.utm_campaign === 'privacy-test', 'CRM lost utm_campaign');
assert(crmFields.utm_content === 'need-gate', 'CRM lost utm_content');
assert(crmFields.source === 'contact', 'CRM lost source');
assert(crmFields.when === 'השבוע', 'CRM lost when');
assert(crmFields.consent === 'כן', 'CRM lost consent');
assert(crmFields.fbp === 'fb.1.privacytest', 'CRM lost fbp');
assert(crmFields.fbc === 'fb.1.privacyclick', 'CRM lost fbc');

const wa = Array.prototype.find.call(document.querySelectorAll('.wa-topics a'), function (a) {
  return a.textContent.trim() === NEED;
});
assert(wa, 'WhatsApp topic link missing');
wa.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const waEvents = (window.dataLayer || []).filter(function (e) { return e && e.event === 'contact_whatsapp'; });
assert(waEvents.length === 1, 'expected one contact_whatsapp');
noSensitive(waEvents[0], 'contact_whatsapp');
assert(waEvents[0].page === '/contact.html', 'whatsapp page missing');
const fbqContact = fbqCalls.filter(function (c) { return c[0] === 'track' && c[1] === 'Contact'; });
assert(fbqContact.length === 1, 'expected fbq Contact');
noSensitive(fbqContact[0][2], 'fbq Contact');

window.menifaTrack('generate_lead', {
  form: 'contact',
  page: '/contact.html',
  need: NEED,
  link_text: NEED,
  name: 'בדיקת פרטיות',
  phone: '050-1234567',
  email: 'test@example.com',
  income: '20000',
  amount: '500000',
  note: 'חוב 500000',
  answers: ['כמה הלוואות 4 ומעלה'],
  id_number: '123456782',
  health: 'condition',
  loan_intent: 'איחוד הלוואות',
  has_property: 'כן',
  q0: '4 ומעלה',
  currency: 'ILS',
  value: 1,
  event_id: 'lead_gate_check'
});
const gated = leadEvents(window).filter(function (e) { return e.event_id === 'lead_gate_check'; });
assert(gated.length === 1, 'gate event missing');
noSensitive(gated[0], 'direct menifaTrack gate');
assert(gated[0].value === 1 && gated[0].currency === 'ILS', 'gate dropped value/currency');
assert(gated[0].form === 'contact' && gated[0].page === '/contact.html', 'gate dropped safe fields');
assert(!Object.prototype.hasOwnProperty.call(gated[0], 'q0'), 'gate kept quiz answer q0');

const queued = boot(false);
queued.window.menifaTrack('generate_lead', {
  form: 'contact', page: '/contact.html', need: NEED, name: 'בדיקת פרטיות',
  phone: '050-1234567', currency: 'ILS', value: 1, event_id: 'lead_queued'
});
assert(leadEvents(queued.window).length === 0, 'queued event must not hit dataLayer before consent');
queued.window.document.getElementById('ck-all').click();
const flushed = leadEvents(queued.window);
assert(flushed.length === 1, 'consent should flush the queued lead');
noSensitive(flushed[0], 'flushed generate_lead');
assert(flushed[0].value === 1, 'flushed value must stay 1');
assert(queued.crm.length === 0, 'queue scenario must not post a lead');

const proof = {
  note: 'fetch was stubbed. No request left the process.',
  analytics: {
    dataLayer: analyticsEvent,
    gtag: gtagLead[0],
    fbq: fbqLead[0]
  },
  contact_whatsapp: {
    dataLayer: waEvents[0],
    fbq: fbqContact[0]
  },
  gate_if_caller_still_passes_need: gated[0],
  flushed_after_consent: flushed[0],
  crm: {
    url: crm[0].url,
    mode: crm[0].mode,
    decoded: crmFields,
    body: crm[0].body
  }
};

console.log(JSON.stringify(proof, null, 2));
if (!process.exitCode) console.log('\nPASS');
