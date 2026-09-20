/** מחזור · עברית טבעית · מבנה AIC · מניפה · בלי ₪ מומצא */
window.MENIFA_AIC = {
  product: "mihzur",
  lockProduct: true,
  portraitSrc: "../assets/img/tamir.jpg",
  introHtml:
    "<p>אהלן, כאן <strong>תמיר גרמה</strong> ממניפה.</p>" +
    "<p>כמה שאלות קצרות על מחזור משכנתא — לראות אם שווה לכם לבדוק הצעה מחדש.</p>",
  questions: [
    { id: "found", title: "כבר מצאתם נכס, או שעדיין בדרך?", chips: [{ label: "כן, מצאנו" }, { label: "עדיין לא" }] },
    { id: "value", title: "אחלה — בערך מה השווי של הנכס?", sub: "סכום מלא, בלי פסיקים, ואז שליחה", input: "number", placeholder: "למשל 1500000" },
    { id: "deal", title: "איזה סוג עסקה זה אצלכם?", chips: [
      { label: "מוכרים דירה וקונים אחרת" },
      { label: "דירה ראשונה" },
      { label: "דירה להשקעה" }
    ]},
    { id: "mehir", title: "זה מחיר למשתכן?", chips: [{ label: "כן" }, { label: "לא" }] },
    { id: "when", title: "מתי אתם צריכים את הכסף / המשכנתא?", chips: [
      { label: "כמה שיותר מהר" },
      { label: "בקרוב" },
      { label: "עוד בודקים" }
    ]},
    { id: "equity", title: "וכמה הון עצמי יש לכם בערך?", sub: "סכום מלא, בלי פסיקים, ואז שליחה", input: "number", placeholder: "למשל 400000" },
    { id: "status", title: "סטטוס משפחתי?", chips: [
      { label: "רווק/ה" }, { label: "נשוי/ה" }, { label: "גרוש/ה" }
    ]},
    { id: "income", title: "שאלה חשובה — כמה נטו נכנס בחודש (ביחד אם יש בני זוג)?", sub: "סכום מלא, בלי פסיקים, ואז שליחה", input: "number", placeholder: "למשל 20000" },
    { id: "loans", title: "יש עוד הלוואות חוץ מהמשכנתא?", chips: [{ label: "כן" }, { label: "אין" }] },
    { id: "bank", title: "היו בעיות בבנק בשנים האחרונות — צ׳קים, BDI, הו״ק?", chips: [{ label: "כן" }, { label: "לא" }] },
    { id: "name", title: "רגע — איך קוראים לך?", input: "text", placeholder: "השם שלך" }
  ],
  softResult: function (a) {
    var name = a.name || "";
    var hi = name ? ("אוקיי " + name + ",") : "אוקיי,";
    return (
      "<p>" + hi + "</p>" +
      "<p>לפי מה שסיפרתם — שווה לשבת רגע על המספרים ולראות אם מחזור באמת משתלם לכם, מול מה שיש היום.</p>" +
      "<!--card-->" +
      "<p>" + (name ? name + ", " : "") + "בשיחה קצרה, בלי עלות ובלי התחייבות, נעבור על זה ביחד.</p>" +
      "<!--card-->" +
      "<p>סבבה" + (name ? " " + name : "") + " —</p>" +
      "<p><strong>לאיזה מספר לחזור אליך?</strong></p>"
    );
  }
};
