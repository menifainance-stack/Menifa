#!/usr/bin/env python3
# Rebuilds internal/shilat-life-data.js from internal/data CSVs.
import csv, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "internal" / "data"

tariff = []
with open(DATA / "official-risk1-tariff-annual-per-1000-by-age-sex-smoker.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        tariff.append({
            "age": int(row["age"]),
            "male_nonsmoker": float(row["male_nonsmoker"]),
            "male_smoker": float(row["male_smoker"]),
            "female_nonsmoker": float(row["female_nonsmoker"]),
            "female_smoker": float(row["female_smoker"]),
        })

agreements = []
with open(DATA / "special-discounts-agreement-codes-until-67.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        agreements.append({
            "agreement_code": int(row["agreement_code"]),
            "min_cover_ils": int(row["min_cover_ils"]),
            "age_min": int(row["age_min"]),
            "age_max": int(row["age_max"]),
            "discounts_pct": {
                "א": int(row["discount_pct_aleph"]),
                "ב": int(row["discount_pct_bet"]),
                "ג": int(row["discount_pct_gimel"]),
                "ד": int(row["discount_pct_dalet"]),
                "ה": int(row["discount_pct_he"]),
                "ו": int(row["discount_pct_vav"]),
            },
            "is_special_until_67": row["is_special_until_67"].lower() == "true",
            "table_title": row["table_title"],
            "notes": row["notes"],
        })

rules = json.loads((DATA / "special-discounts-rules.json").read_text(encoding="utf-8"))
payload = {
    "tariff_as_of": "05.2026",
    "product_label": "תעריף ריסק 1",
    "unit": "annual_ILS_per_1000_cover",
    "company_on_tariff": None,
    "company_note": "UNKNOWN on tariff/discounts PDFs",
    "source_files": [
        "shilat-source/תעריפי-ביטוח-חיים-ריסק-1_260910_205355.pdf",
        "shilat-source/extracted/official-risk1-tariff-annual-per-1000-by-age-sex-smoker.csv",
        "shilat-source/הנחות מיוחדות ריסקים עד גיל 67!.pdf",
        "shilat-source/extracted/special-discounts-agreement-codes-until-67.csv",
    ],
    "unknown_fields_always": [
        "discount_year_letter_meaning",
        "tariff_company_name",
        "discount_table_company_name",
    ],
    "official_risk1": tariff,
    "agreements": agreements,
    "discount_rules": {
        "table_title_ocr": rules["table_title_ocr"],
        "company_on_page": rules["company_on_page"],
        "year_column_meaning": rules["columns"]["aleph_to_vav"],
        "stacking_with_other_codes": rules["application"]["stacking_with_other_codes"],
        "selection_rule": rules["application"]["selection_rule"],
    },
    "empirical": {
        "migdal": [],
        "unified": [],
        "bundled": False,
        "note": "טבלאות אמפיריות (מגדל / דוח מאוחד) לא צורפו לחבילת הפיילוט v2. אין שיעורים מומצאים.",
    },
}
js = "/* generated from internal/data CSVs — do not edit by hand */\n"
js += "var SHILAT_LIFE_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
js += 'if (typeof module !== "undefined" && module.exports) module.exports = SHILAT_LIFE_DATA;\n'
(ROOT / "internal" / "shilat-life-data.js").write_text(js, encoding="utf-8")
print(f"wrote {len(tariff)} tariff rows, {len(agreements)} agreements")
