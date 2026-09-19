window.MENIFA_QUIZ = {
  product: "pikdonot",
  portraitSrc: "../assets/img/tamir.jpg",
  startLabel: "נתחיל בבדיקה",
  introHtml:
    '<p class="hi">אהלן.</p>' +
    "<p>כאן <strong>תמיר גרמה</strong> מ<strong>מניפה פיננסית</strong>.</p>" +
    "<p>יש סכום פנוי משמעותי — בערך 300 אלף ומעלה — ואתם רוצים להבין מה לעשות איתו בלי רעש ובלי הבטחות ריק.</p>" +
    "<p>כמה שאלות קצרות. בסוף — כיוון שקול לשיחה. בלי הבטחת תשואה.</p>",
  questions: [
    {
      id: "have",
      title: "יש סכום פנוי או פיקדון ששוקלים מה לעשות איתו?",
      sub: "נקודת פתיחה — בלי לחץ.",
      chips: [
        { label: "כן", primary: true },
        { label: "כמעט / בתהליך" },
        { label: "עדיין לא בטוחים" },
      ],
    },
    {
      id: "amount",
      title: "מה טווח הסכום בערך?",
      sub: "טווחים בלבד — בלי לחשוף מספר מדויק אם לא רוצים.",
      chips: [
        { label: "סביב 300 אלף", primary: true },
        { label: "300–500 אלף" },
        { label: "מעל 500 אלף" },
        { label: "מעדיפים לא לפרט" },
      ],
    },
    {
      id: "goal",
      title: "מה המטרה העיקרית לכסף?",
      sub: "אין תשובה נכונה.",
      chips: [
        { label: "לשמור נזילות", primary: true },
        { label: "להשקיע בדירה" },
        { label: "להוריד משכנתא" },
        { label: "עדיין לא בטוחים" },
      ],
    },
    {
      id: "mortgage",
      title: "יש משכנתא קיימת?",
      sub: "עוזר להבין את התמונה המלאה.",
      chips: [
        { label: "כן", primary: true },
        { label: "לא" },
        { label: "בתהליך" },
      ],
    },
    {
      id: "horizon",
      title: "מה אופק הזמן לשימוש בכסף?",
      sub: "מתי בערך תצטרכו אותו — אם בכלל.",
      chips: [
        { label: "שנה–שנתיים" },
        { label: "3–5 שנים", primary: true },
        { label: "ארוך יותר" },
        { label: "גמיש / לא יודעים" },
      ],
    },
    {
      id: "risk",
      title: "איזו רמת סיכון נוחה לכם?",
      sub: "תחושה — לא תיק השקעות.",
      chips: [
        { label: "שמרני", primary: true },
        { label: "ביניים" },
        { label: "עדיין לא יודעים" },
      ],
    },
    {
      id: "urgency",
      title: "מה הדחיפות שלכם?",
      sub: "כדי שנדע איך לתזמן שיחה שקולה.",
      chips: [
        { label: "השבוע", primary: true },
        { label: "החודש" },
        { label: "רק בודקים" },
      ],
    },
  ],
  softResult: function (a) {
    var bits = [];
    if (a.have) bits.push("סכום פנוי: " + a.have);
    if (a.amount) bits.push("טווח: " + a.amount);
    if (a.goal) bits.push("מטרה: " + a.goal);
    if (a.mortgage) bits.push("משכנתא: " + a.mortgage);
    if (a.horizon) bits.push("אופק: " + a.horizon);
    if (a.risk) bits.push("סיכון: " + a.risk);
    if (a.urgency) bits.push("דחיפות: " + a.urgency);
    var summary = bits.length ? bits.join(" · ") : "מה שסיפרתם";
    return (
      "<p><strong>כיוון לשיחה שקולה</strong></p>" +
      "<p>לפי מה שסיפרתם (" +
      summary +
      ") — שווה לשבת יחד על התמונה: מה הכסף צריך לעשות בשבילכם, ובאיזה קצב — בלי הבטחות ובלי רעש.</p>" +
      '<div class="tags"><span>בהירות לפני צעד</span><span>שיחה שקולה</span><span>בלי הבטחת תשואה</span></div>' +
      '<p class="soft-note">זו <strong>המחשה לכיוון</strong> בלבד — לא הצעה, לא המלצה למוצר ספציפי, ולא הבטחת תשואה. כל מקרה נבדק בנפרד.</p>'
    );
  },
};
