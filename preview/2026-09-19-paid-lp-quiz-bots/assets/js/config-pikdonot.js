/** AIC UI/tone · הפקדות 300K+ · Menifa · no yield promises */
window.MENIFA_AIC = {
  product: "pikdonot",
  lockProduct: true,
  portraitSrc: "../assets/img/tamir.jpg",
  introHtml:
    "<p>היי, כאן <strong>תמיר גרמה</strong>, מניפה פיננסית.</p>" +
    "<p>ענו על כמה שאלות קצרות על הפקדות / סכומים פנויים — בלי הבטחות תשואה.</p>",
  questions: [
    { id: "amount", title: "אחלה, בערך איזה סכום פנוי מדובר?", chips: [
      { label: "עד 300,000 ₪" }, { label: "300,000–500,000 ₪" }, { label: "500,000–1,000,000 ₪" }, { label: "מעל 1,000,000 ₪" }
    ]},
    { id: "where", title: "איפה הכסף היום?", chips: [
      { label: "פיקדון בבנק" }, { label: "עו\"ש / נזיל" }, { label: "מפוזר בכמה מקומות" }, { label: "אחר" }
    ]},
    { id: "goal", title: "מה המטרה העיקרית עם הסכום?", chips: [
      { label: "לשמור נזילות" }, { label: "לקנות דירה / הון עצמי" }, { label: "להוריד משכנתא" }, { label: "עדיין לא בטוחים" }
    ]},
    { id: "horizon", title: "אוקי, לאיזה אופק זמן אתם חושבים?", chips: [
      { label: "עד שנה" }, { label: "1–3 שנים" }, { label: "יותר מ-3 שנים" }, { label: "רק בודקים" }
    ]},
    { id: "mortgage", title: "יש משכנתא קיימת?", chips: [{ label: "כן" }, { label: "לא" }] },
    { id: "when", title: "למתי תרצו להתקדם?", chips: [
      { label: "עכשיו כמה שיותר מהר" }, { label: "בתקופה הקרובה" }, { label: "עוד לא יודע, בודק בינתיים" }
    ]},
    { id: "name", title: "כמעט שכחתי לשאול... מה השם שלך?", input: "text", placeholder: "השם שלך" }
  ],
  softResult: function (a) {
    var name = a.name || "";
    var greet = name ? ("אוקי " + name + ",") : "אוקי,";
    return (
      "<p>" + greet + "</p>" +
      "<p>לפי מה שסיפרתם — שווה שיחה קצרה כדי לעשות סדר באפשרויות, בלי הבטחות תשואה ובלי התחייבות.</p>" +
      "<!--card-->" +
      "<p>" + (name ? name + ", " : "") + "בשיחה קצרה וללא עלות נבין מה מתאים למצב שלכם.</p>" +
      "<!--card-->" +
      "<p>מעולה" + (name ? " " + name : "") + ",</p>" +
      "<p><strong>לאיזה מספר לחזור אליך?</strong></p>"
    );
  }
};
