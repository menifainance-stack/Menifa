#!/usr/bin/env node
'use strict';

var assert = require('assert');
var path = require('path');
var data = require(path.join(__dirname, '..', 'internal', 'shilat-life-data.js'));
var engine = require(path.join(__dirname, '..', 'internal', 'shilat-life-engine.js'));

function almost(actual, expected, digits, msg) {
  var factor = Math.pow(10, digits || 8);
  assert.strictEqual(Math.round(actual * factor) / factor, Math.round(expected * factor) / factor, msg);
}

var failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log('ok  ' + name);
  } catch (err) {
    failures += 1;
    console.error('FAIL ' + name);
    console.error('    ' + err.message);
  }
}

test('age 40 from demo DOB as of 2026-09-16', function () {
  var birth = engine.parseIsoDate('1985-11-27');
  var asOf = engine.parseIsoDate('2026-09-16');
  assert.strictEqual(engine.floorAgeFromDates(birth, asOf), 40);
});

test('official CSV age 40 female nonsmoker is 0.80', function () {
  var row = data.official_risk1.find(function (r) { return r.age === 40; });
  assert.strictEqual(row.female_nonsmoker, 0.8);
});

test('example 1 — female 40 nonsmoker 1M code 3705 letter א', function () {
  var out = engine.compute({
    birth_date: '1985-11-27',
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    agreement_code: 3705,
    discount_year_letter: 'א',
    as_of_date: '2026-09-16',
    rate_source: 'official_risk1',
  }, data);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.method, 'official_risk1_with_agreement_discount');
  assert.strictEqual(out.age_used, 40);
  almost(out.base_rate_annual_per_1000, 0.8, 8);
  assert.strictEqual(out.discount_pct, 70);
  almost(out.net_rate_annual_per_1000, 0.24, 8);
  almost(out.annual_premium_before_discount, 800, 8);
  almost(out.annual_premium_est, 240, 8);
  almost(out.monthly_premium_est, 20, 8);
  assert.deepStrictEqual(out.eligibility_warnings, []);
  assert.strictEqual(out.company, null);
});

test('example 3 — same demo without discount', function () {
  var out = engine.compute({
    birth_date: '1985-11-27',
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    as_of_date: '2026-09-16',
    rate_source: 'official_risk1',
  }, data);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.method, 'official_risk1');
  almost(out.annual_premium_est, 800, 8);
  almost(out.monthly_premium_est, 800 / 12, 8);
  assert.strictEqual(out.discount_pct, null);
});

test('example 2 — male 45 smoker 2M code 3703 letter א', function () {
  var out = engine.compute({
    age: 45,
    sex: 'male',
    smoker: true,
    cover_amount: 2000000,
    agreement_code: 3703,
    discount_year_letter: 'א',
    rate_source: 'official_risk1',
  }, data);
  assert.strictEqual(out.ok, true);
  almost(out.base_rate_annual_per_1000, 2.76, 8);
  assert.strictEqual(out.discount_pct, 72);
  almost(out.annual_premium_before_discount, 5520, 8);
  almost(out.net_rate_annual_per_1000, 0.7728, 8);
  almost(out.annual_premium_est, 1545.6, 8);
  almost(out.monthly_premium_est, 128.8, 8);
});

test('example 4 — male 55 nonsmoker 750k code 3706 letter ב', function () {
  var out = engine.compute({
    age: 55,
    sex: 'male',
    smoker: false,
    cover_amount: 750000,
    agreement_code: 3706,
    discount_year_letter: 'ב',
    rate_source: 'official_risk1',
  }, data);
  almost(out.base_rate_annual_per_1000, 3.9, 8);
  assert.strictEqual(out.discount_pct, 60);
  almost(out.annual_premium_before_discount, 2925, 8);
  almost(out.net_rate_annual_per_1000, 1.56, 8);
  almost(out.annual_premium_est, 1170, 8);
  almost(out.monthly_premium_est, 97.5, 8);
});

test('example 5 — male 35 nonsmoker 500k code 3707 letter א', function () {
  var out = engine.compute({
    age: 35,
    sex: 'male',
    smoker: false,
    cover_amount: 500000,
    agreement_code: 3707,
    discount_year_letter: 'א',
    rate_source: 'official_risk1',
  }, data);
  almost(out.base_rate_annual_per_1000, 0.84, 8);
  assert.strictEqual(out.discount_pct, 65);
  almost(out.annual_premium_before_discount, 420, 8);
  almost(out.net_rate_annual_per_1000, 0.294, 8);
  almost(out.annual_premium_est, 147, 8);
  almost(out.monthly_premium_est, 12.25, 8);
});

test('smoker is required', function () {
  var out = engine.compute({
    age: 40,
    sex: 'female',
    cover_amount: 1000000,
  }, data);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.error, 'SMOKER_REQUIRED');
});

test('age 17 has no official cell — do not invent rate', function () {
  var out = engine.compute({
    age: 17,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    rate_source: 'official_risk1',
  }, data);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.error, 'NO_RATE_CELL');
  assert.strictEqual(out.official_cell_missing, true);
});

test('empirical source without bundled table fails clearly', function () {
  var out = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    rate_source: 'migdal_empirical',
  }, data);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.error, 'EMPIRICAL_NOT_BUNDLED');
  almost(out.official_rate_if_available, 0.8, 8);
});

test('eligibility warning for cover below min — still uses table discount', function () {
  var out = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 500000,
    agreement_code: 3705,
    discount_year_letter: 'א',
  }, data);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.discount_pct, 70);
  assert.ok(out.eligibility_warnings.length >= 1);
  almost(out.annual_premium_est, 120, 8);
});

test('eligibility warning for age below agreement range', function () {
  var out = engine.compute({
    age: 25,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    agreement_code: 3705,
    discount_year_letter: 'א',
  }, data);
  assert.strictEqual(out.ok, true);
  assert.ok(out.eligibility_warnings.some(function (w) { return w.indexOf('מחוץ לטווח') !== -1; }));
});

test('manual medical loading is labeled and applied after discount', function () {
  var out = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    agreement_code: 3705,
    discount_year_letter: 'א',
    medical_loading_pct: 50,
  }, data);
  almost(out.annual_premium_est, 360, 8);
  assert.strictEqual(out.method_flags.manual_loading, true);
});

test('company stays null unless provided — no invented insurer name', function () {
  var out = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
  }, data);
  assert.strictEqual(out.company, null);
  assert.ok(out.unknown_fields.indexOf('tariff_company_name') !== -1);
  assert.ok(out.unknown_fields.indexOf('discount_year_letter_meaning') !== -1);
  assert.ok(out.unknown_fields.indexOf('policy_fees_settlement_card_fees') !== -1);
});

test('underwriting flags do not change premium', function () {
  var a = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
    diabetes: true,
    height_cm: 165,
    weight_kg: 110,
    cover_type: 'mortgage',
  }, data);
  var b = engine.compute({
    age: 40,
    sex: 'female',
    smoker: false,
    cover_amount: 1000000,
  }, data);
  almost(a.annual_premium_est, b.annual_premium_est, 8);
  assert.ok(a.underwriting_flags.length > 0);
});

test('tariff row count 18–79', function () {
  assert.strictEqual(data.official_risk1.length, 62);
  assert.strictEqual(data.official_risk1[0].age, 18);
  assert.strictEqual(data.official_risk1[61].age, 79);
  assert.strictEqual(data.agreements.length, 11);
});

if (failures) {
  console.error('\n' + failures + ' failed');
  process.exit(1);
}
console.log('\nall tests passed');
