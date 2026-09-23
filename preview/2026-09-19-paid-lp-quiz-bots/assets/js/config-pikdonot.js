/** הפקדות · עברית טבעית · מניפה · בלי הבטחות תשואה */
window.MENIFA_AIC = {
  product: "pikdonot",
  lockProduct: true,
  portraitSrc: "../assets/img/tamir.jpg",
  introHtml:
    "<p>אהלן, כאן <strong>תמיר גרמה</strong> ממניפה.</p>" +
    "<p>כמה שאלות קצרות על כסף פנוי / הפקדות — בלי הבטחות תשואה, רק כדי להבין מה מתאים לכם.</p>",
  questions: [
    { id: "amount", title: "בערך על איזה סכום אנחנו מדברים?", chips: [
      { label: "עד 300 אלף" }, { label: "300–500 אלף" }, { label: "500 אלף–מיליון" }, { label: "מעל מיליון" }
    ]},
    { id: "where", title: "איפה הכסף יושב היום?", chips: [
      { label: "פיקדון בבנק" }, { label: "בעו״ש / נזיל" }, { label: "מפוזר בכמה מקומות" }, { label: "אחר" }
    ]},
    { id: "goal", title: "מה בא לכם לעשות עם זה בעיקר?", chips: [
      { label: "שיישאר נזיל" }, { label: "לדירה / הון עצמי" }, { label: "להקטין משכנתא" }, { label: "עדיין לא סגורים" }
    ]},
    { id: "horizon", title: "לכמה זמן אתם חושבים קדימה?", chips: [
      { label: "עד שנה" }, { label: "1–3 שנים" }, { label: "יותר מ-3 שנים" }, { label: "רק בודקים" }
    ]},
    { id: "mortgage", title: "יש משכנתא היום?", chips: [{ label: "כן" }, { label: "לא" }] },
    { id: "when", title: "מתי בא לכם להתקדם?", chips: [
      { label: "כמה שיותר מהר" }, { label: "בקרוב" }, { label: "עוד בודקים" }
    ]},
    { id: "name", title: "רגע — איך קוראים לך?", input: "text", placeholder: "השם שלך" }
  ],
  softResult: function (a) {
    var name = a.name || "";
    var hi = name ? ("אוקיי " + name + ",") : "אוקיי,";
    return (
      "<p>" + hi + "</p>" +
      "<p>לפי מה שסיפרתם — שווה שיחה קצרה כדי לעשות סדר באפשרויות. בלי הבטחות תשואה ובלי לחץ.</p>" +
      "<!--card-->" +
      "<p>" + (name ? name + ", " : "") + "נדבר כמה דקות, בלי עלות ובלי התחייבות, ונראה מה הגיוני אצלכם.</p>" +
      "<!--card-->" +
      "<p>סבבה" + (name ? " " + name : "") + " —</p>" +
      "<p><strong>לאיזה מספר לחזור אליך?</strong></p>"
    );
  }
};
