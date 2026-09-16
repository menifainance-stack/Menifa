/**
 * Shilat life-risk premium engine — spec v2 (2026-09-16).
 * Official Risk1 tariff + agreement discounts. Underwriting flags are UX only.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ShilatLifeCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
  var DISCLAIMER =
    'כלי פנימי להערכה בלבד. אינו הצעת מחיר מחייבת ואינו ייעוץ ביטוחי מורשה.';
  var DISCLAIMER_FULL =
    'כלי פנימי להערכה בלבד. אינו הצעת מחיר מחייבת מחברת ביטוח ואינו ייעוץ ביטוחי מורשה. גם כשמחושב מתעריפון/הנחות רשמיים — התוצאה היא אומדן פנימי בלבד; התעריפים הקובעים הם אלו שבמחשבי החברה במועד הפקת הפוליסה (כפי שמצוין בתעריפון).';

  function isFiniteNumber(n) {
    return typeof n === 'number' && isFinite(n);
  }

  function parseOptionalPct(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = Number(value);
    if (!isFinite(n) || n < 0) return null;
    return n;
  }

  function parseIsoDate(value) {
    if (!value || typeof value !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]);
    var d = Number(m[3]);
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      return null;
    }
    return { y: y, mo: mo, d: d };
  }

  function floorAgeFromDates(birth, asOf) {
    var age = asOf.y - birth.y;
    if (asOf.mo < birth.mo || (asOf.mo === birth.mo && asOf.d < birth.d)) age -= 1;
    return age;
  }

  function tariffIndex(rows) {
    var map = Object.create(null);
    (rows || []).forEach(function (row) {
      map[row.age] = row;
    });
    return map;
  }

  function agreementIndex(rows) {
    var map = Object.create(null);
    (rows || []).forEach(function (row) {
      map[String(row.agreement_code)] = row;
    });
    return map;
  }

  function lookupOfficialRate(row, sex, smoker) {
    if (!row) return null;
    if (sex === 'male') return smoker ? row.male_smoker : row.male_nonsmoker;
    if (sex === 'female') return smoker ? row.female_smoker : row.female_nonsmoker;
    return null;
  }

  function lookupEmpiricalRate(table, age, sex) {
    if (!table || !table.length) return null;
    var hits = table.filter(function (row) {
      return Number(row.age) === age && row.sex === sex;
    });
    if (!hits.length) return null;
    var values = hits
      .map(function (row) {
        return Number(row.rate_annual_per_1000);
      })
      .filter(isFiniteNumber)
      .sort(function (a, b) {
        return a - b;
      });
    if (!values.length) return null;
    var mid = Math.floor(values.length / 2);
    if (values.length % 2 === 0) return (values[mid - 1] + values[mid]) / 2;
    return values[mid];
  }

  function phoenixExamBand(age) {
    if (age <= 50) return { regular: 3500000, extended: 6000000, label: '0–50' };
    if (age <= 55) return { regular: 2500000, extended: 5000000, label: '51–55' };
    if (age <= 60) return { regular: 1500000, extended: 3000000, label: '56–60' };
    if (age <= 64) return { regular: 1250000, extended: 2500000, label: '61–64' };
    return { regular: 800000, extended: 1000000, label: '65 ומעלה' };
  }

  function underwritingFlags(input, age, cover) {
    var flags = [];
    var coverType = input.cover_type === 'mortgage' ? 'mortgage' : 'regular';

    if (age < 18 || age > 70) {
      flags.push({
        source: 'clal_uw_2026',
        kind: 'entry_age',
        text:
          'עלון חיתום 2026 (כלל): גילאי כניסה למוות 18–70. הדגל אינו משנה את הפרמיה ואינו מחליף החלטת חיתום.',
      });
    }
    if (cover > 4000000) {
      flags.push({
        source: 'clal_uw_2026',
        kind: 'financial',
        text:
          'עלון חיתום 2026 (כלל): מעל 4,000,000 ₪ מצוינים מסמכים לחיתום פיננסי. אין אחוז תוספת במסמך.',
      });
    }
    if (cover > 5000000) {
      flags.push({
        source: 'clal_uw_2026',
        kind: 'financial',
        text:
          'עלון חיתום 2026 (כלל): מעל 5,000,000 ₪ החיתום הפיננסי מחמיר. אין אחוז תוספת במסמך.',
      });
    }

    var band = phoenixExamBand(age);
    if (cover >= band.regular) {
      flags.push({
        source: 'phoenix_dgeshim_2024_11',
        kind: 'medical_exam',
        text:
          'דגשי הפניקס (סכומי ביטוח לחיתום, 11.2024), גיל ' +
          band.label +
          ': סכום עליון לבדיקה רגילה ' +
          band.regular.toLocaleString('he-IL') +
          ' ₪. ייתכן שיידרש מסמך/בדיקה — לא אישור ולא דחייה.',
      });
    }
    if (cover >= band.extended) {
      flags.push({
        source: 'phoenix_dgeshim_2024_11',
        kind: 'medical_exam_extended',
        text:
          'דגשי הפניקס, גיל ' +
          band.label +
          ': סכום תחתון לבדיקה מורחבת ' +
          band.extended.toLocaleString('he-IL') +
          ' ₪. ייתכן שיידרש מסמך/בדיקה — לא אישור ולא דחייה.',
      });
    }
    if (age >= 65) {
      flags.push({
        source: 'phoenix_dgeshim_2024_11',
        kind: 'age_65',
        text:
          'דגשי הפניקס: כל מועמד בגיל 65 ומעלה חייב להמציא תמצית מידע מקופת חולים. לא חלק מנוסחת הפרמיה.',
      });
    }
    if (age >= 50) {
      flags.push({
        source: 'phoenix_dgeshim_2024_11',
        kind: 'age_50_screening',
        text:
          'דגשי הפניקס: המסמך מזכיר קולונוסקופיה או ממוגרפיה בגיל 50 ומעלה במסגרת גילוי מוקדם.',
      });
    }

    if (coverType === 'regular') {
      if (cover > 4000000) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'financial_regular',
          text:
            'דגשי הפניקס — ריסק רגיל: מעל 4,000,000 ₪ נדרשת הצהרת הכנסה והצהרה על סכומים בחברות נוספות. עד 5,000,000 ₪ כולל חברות נוספות — אין נתונים נוספים לפי המסמך; מעל 5,000,000 ₪ מסמכי שכר/שאלון פיננסי.',
        });
      }
    } else if (cover > 4000000) {
      flags.push({
        source: 'phoenix_dgeshim_2024_11',
        kind: 'financial_mortgage',
        text:
          'דגשי הפניקס — משכנתא/ריסק משועבד: מעל 4,000,000 ₪ נדרש הסכם הלוואה מהבנק והצהרה על סכומים בחברות נוספות. עד 7,000,000 ₪ כולל חברות נוספות — אין נתונים נוספים לפי המסמך; מעל 7,000,000 ₪ מסמכי שכר/שאלון פיננסי.',
      });
    }

    if (input.diabetes === true) {
      if (cover > 750000) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'diabetes',
          text:
            'דגשי הפניקס — סוכרת, ריסק מעל 750,000 ₪: תיעוד מרופא מטפל (סוג, מועד אבחנה, אברי מטרה, חלבון בשתן, HbA1C). דגל מסמכים בלבד.',
        });
      } else {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'diabetes',
          text: 'דגשי הפניקס — סוכרת, ריסק עד 750,000 ₪: שאלון סוכרת מלא. דגל מסמכים בלבד.',
        });
      }
    }

    var heightCm = Number(input.height_cm);
    var weightKg = Number(input.weight_kg);
    if (isFiniteNumber(heightCm) && heightCm > 0 && isFiniteNumber(weightKg) && weightKg > 0) {
      var heightM = heightCm / 100;
      var bmi = weightKg / (heightM * heightM);
      var bmiRounded = Math.round(bmi * 10) / 10;
      if (bmi >= 41) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'bmi',
          text:
            'BMI משוער ' +
            bmiRounded +
            '. דגשי הפניקס: BMI 41 ומעלה — סף נפרד לכיסוי ריסק בטבלת עודף משקל. דגל מסמכים בלבד.',
        });
      } else if (bmi >= 38) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'bmi',
          text:
            'BMI משוער ' +
            bmiRounded +
            '. דגשי הפניקס: BMI 38 ומעלה — סף לאכ״ע/מרפא; מ־36 תמצית קופ״ח. דגל מסמכים בלבד.',
        });
      } else if (bmi >= 36) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'bmi',
          text:
            'BMI משוער ' +
            bmiRounded +
            '. דגשי הפניקס: BMI 36 ומעלה מחייב תמצית מידע מקופ״ח (סוכר, שומנים, תפקודי כבד). דגל מסמכים בלבד.',
        });
      } else if (bmi <= 15) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'bmi',
          text: 'BMI משוער ' + bmiRounded + '. דגשי הפניקס: BMI 15 ומטה — נדרש תיעוד רפואי. דגל מסמכים בלבד.',
        });
      } else if (bmi < 17) {
        flags.push({
          source: 'phoenix_dgeshim_2024_11',
          kind: 'bmi',
          text:
            'BMI משוער ' +
            bmiRounded +
            '. דגשי הפניקס: BMI 16–17 — הצהרה אם המצב ידוע ויציב 3 שנים. דגל מסמכים בלבד.',
        });
      }
    }

    flags.push({
      source: 'phoenix_dgeshim_2024_11',
      kind: 'validity',
      text:
        'תוקף מסמכים לפי דגשי הפניקס: הצהרת בריאות 60 יום; השלמת מידע רפואי 45 יום; אישור תנאים 30 יום; בדיקה רפואית שנה אחת.',
    });

    return flags;
  }

  function fail(code, message, extra) {
    var out = {
      ok: false,
      error: code,
      message: message,
      disclaimer: DISCLAIMER,
      disclaimer_full: DISCLAIMER_FULL,
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        out[k] = extra[k];
      });
    }
    return out;
  }

  function compute(input, data) {
    input = input || {};
    data = data || (typeof SHILAT_LIFE_DATA !== 'undefined' ? SHILAT_LIFE_DATA : null);
    if (!data) return fail('NO_DATA', 'חסרים נתוני תעריף משובצים.');

    var rateSource = input.rate_source || 'official_risk1';
    var sex = input.sex;
    if (sex !== 'male' && sex !== 'female') {
      return fail('SEX_REQUIRED', 'יש לבחור מין (גבר/אישה).');
    }

    if (input.smoker !== true && input.smoker !== false) {
      return fail('SMOKER_REQUIRED', 'יש לבחור מעשן / לא מעשן. השדה חובה במצב תעריף רשמי.');
    }
    var smoker = input.smoker === true;

    var cover = Number(input.cover_amount);
    if (!isFiniteNumber(cover) || cover <= 0) {
      return fail('COVER_REQUIRED', 'יש להזין סכום כיסוי חיובי.');
    }

    var asOf = parseIsoDate(input.as_of_date) || parseIsoDate('2026-09-16');
    var birth = parseIsoDate(input.birth_date);
    var age;
    var ageSource;
    if (birth) {
      age = floorAgeFromDates(birth, asOf);
      ageSource = 'birth_date';
    } else if (input.age !== null && input.age !== undefined && input.age !== '') {
      age = Number(input.age);
      ageSource = 'age_input';
    } else {
      return fail('AGE_REQUIRED', 'יש להזין תאריך לידה או גיל.');
    }
    if (!isFiniteNumber(age) || age !== Math.floor(age)) {
      return fail('AGE_INVALID', 'גיל לא תקין.');
    }

    var officialMap = tariffIndex(data.official_risk1);
    var officialRow = officialMap[age];
    var officialRate = lookupOfficialRate(officialRow, sex, smoker);
    var officialCellMissing = !isFiniteNumber(officialRate);

    var method = 'official_risk1';
    var baseRate = officialRate;
    var usedEmpirical = false;

    if (rateSource === 'official_risk1') {
      if (officialCellMissing) {
        return fail('NO_RATE_CELL', 'אין תא רשמי בתעריף ריסק 1 לגיל זה (18–79). לא הומצא שיעור חלופי.', {
          age_used: age,
          official_cell_missing: true,
          empirical_available: !!(data.empirical && data.empirical.bundled),
          unknown_fields: data.unknown_fields_always || [],
        });
      }
    } else if (rateSource === 'migdal_empirical' || rateSource === 'unified_empirical') {
      var tableKey = rateSource === 'migdal_empirical' ? 'migdal' : 'unified';
      var table = data.empirical && data.empirical[tableKey];
      var empRate = lookupEmpiricalRate(table, age, sex);
      if (!isFiniteNumber(empRate)) {
        return fail(
          'EMPIRICAL_NOT_BUNDLED',
          (data.empirical && data.empirical.note) ||
            'טבלה אמפירית לא צורפה לפיילוט זה. אין שיעורים מומצאים.',
          {
            age_used: age,
            official_cell_missing: officialCellMissing,
            official_rate_if_available: officialCellMissing ? null : officialRate,
            unknown_fields: data.unknown_fields_always || [],
          }
        );
      }
      baseRate = empRate;
      usedEmpirical = true;
      method = 'empirical_median_fallback';
    } else {
      return fail('RATE_SOURCE_UNKNOWN', 'מקור שיעור לא מוכר.');
    }

    var annualBefore = (cover / 1000) * baseRate;
    var discountPct = null;
    var netRate = baseRate;
    var agreementCode = input.agreement_code === '' || input.agreement_code === undefined ? null : input.agreement_code;
    if (agreementCode !== null && agreementCode !== undefined) {
      agreementCode = Number(agreementCode);
      if (!isFiniteNumber(agreementCode)) agreementCode = null;
    }

    var letter = input.discount_year_letter || null;
    if (letter === '') letter = null;
    var eligibilityWarnings = [];
    var agreementRow = null;

    if (agreementCode !== null) {
      if (!letter) {
        return fail('DISCOUNT_LETTER_REQUIRED', 'כשיש קוד הסכם יש לבחור אות הנחה א–ו. משמעות האות אינה ידועה מהמקור.');
      }
      if (LETTERS.indexOf(letter) === -1) {
        return fail('DISCOUNT_LETTER_INVALID', 'אות הנחה חייבת להיות אחת מ־א–ו.');
      }
      agreementRow = agreementIndex(data.agreements)[String(agreementCode)];
      if (!agreementRow) {
        return fail('AGREEMENT_CODE_UNKNOWN', 'קוד הסכם לא נמצא בטבלת מכונות מעודכן.');
      }
      if (age < agreementRow.age_min || age > agreementRow.age_max) {
        eligibilityWarnings.push(
          'גיל ' +
            age +
            ' מחוץ לטווח הקוד ' +
            agreementCode +
            ' (' +
            agreementRow.age_min +
            '–' +
            agreementRow.age_max +
            '). ההנחה מהטבלה מוצגת כאומדן — לא הומצא שיעור חלופי.'
        );
      }
      if (cover < agreementRow.min_cover_ils) {
        eligibilityWarnings.push(
          'סכום הכיסוי נמוך מהמינימום של קוד ' +
            agreementCode +
            ' (' +
            agreementRow.min_cover_ils.toLocaleString('he-IL') +
            ' ₪). ההנחה מהטבלה מוצגת כאומדן — לא הומצא שיעור חלופי.'
        );
      }
      discountPct = agreementRow.discounts_pct[letter];
      netRate = baseRate * (1 - discountPct / 100);
      if (!usedEmpirical) method = 'official_risk1_with_agreement_discount';
    }

    var annualAfter = (cover / 1000) * netRate;
    var medical = parseOptionalPct(input.medical_loading_pct);
    var occupational = parseOptionalPct(input.occupational_loading_pct);
    var manualLoading = false;
    var methodFlags = { manual_loading: false };
    if (medical && medical > 0) {
      annualAfter *= 1 + medical / 100;
      manualLoading = true;
    }
    if (occupational && occupational > 0) {
      annualAfter *= 1 + occupational / 100;
      manualLoading = true;
    }
    if (manualLoading) {
      methodFlags.manual_loading = true;
      netRate = annualAfter / (cover / 1000);
    }

    var monthly = annualAfter / 12;
    var company = input.company === '' || input.company === undefined ? null : input.company;

    return {
      ok: true,
      method: method,
      method_flags: methodFlags,
      age_used: age,
      age_source: ageSource,
      sex_used: sex,
      smoker_used: smoker,
      cover_amount: cover,
      product: input.product || 'risk1',
      company: company,
      company_note: data.company_note,
      base_rate_annual_per_1000: baseRate,
      agreement_code: agreementCode,
      discount_year_letter: letter,
      discount_pct: discountPct,
      net_rate_annual_per_1000: netRate,
      annual_premium_before_discount: annualBefore,
      annual_premium_est: annualAfter,
      monthly_premium_est: monthly,
      monthly_premium_before_discount: annualBefore / 12,
      eligibility_warnings: eligibilityWarnings,
      official_cell_missing: officialCellMissing,
      tariff_as_of: data.tariff_as_of,
      payment_frequency: input.payment_frequency || 'monthly',
      as_of_date: input.as_of_date || '2026-09-16',
      rate_source: rateSource,
      source_files: data.source_files,
      unknown_fields: data.unknown_fields_always || [],
      underwriting_flags: underwritingFlags(input, age, cover),
      agreement_meta: agreementRow
        ? {
            min_cover_ils: agreementRow.min_cover_ils,
            age_min: agreementRow.age_min,
            age_max: agreementRow.age_max,
            is_special_until_67: agreementRow.is_special_until_67,
            table_title: agreementRow.table_title,
          }
        : null,
      disclaimer: DISCLAIMER,
      disclaimer_full: DISCLAIMER_FULL,
    };
  }

  return {
    LETTERS: LETTERS,
    DISCLAIMER: DISCLAIMER,
    DISCLAIMER_FULL: DISCLAIMER_FULL,
    compute: compute,
    floorAgeFromDates: floorAgeFromDates,
    parseIsoDate: parseIsoDate,
    underwritingFlags: underwritingFlags,
  };
});
