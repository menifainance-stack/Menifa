window.MENIFA_QUIZ = {
  product: "mihzur",
  portraitSrc: "../assets/img/tamir.jpg",
  startLabel: "נתחיל בבדיקה",
  introHtml:
    '<p class="hi">אהלן.</p>' +
    "<p>כאן <strong>תמיר גרמה</strong> מ<strong>מניפה פיננסית</strong>.</p>" +
    "<p>משכנתא שיושבת כבר זמן. החזר שמרגיש לוחץ. ותחושה שלא בדקתם לאחרונה אם יש כיוון אחר — זה בדיוק המקום לבדיקה שקולה.</p>" +
    "<p>כמה שאלות קצרות. בסוף — כיוון רך. בלי מיתוסים, בלי מספרים מומצאים.</p>",
  questions: [
    {
      id: "active",
      title: "יש משכנתא פעילה היום?",
      sub: "נקודת הפתיחה — בלי פרטים מיותרים.",
      chips: [
        { label: "כן", primary: true },
        { label: "לא" },
        { label: "בתהליך / מורכב" },
      ],
    },
    {
      id: "years",
      title: "בערך כמה זמן מאז שלקחתם או מיחזרתם לאחרונה?",
      sub: "אומדן מספיק.",
      chips: [
        { label: "עד 3 שנים" },
        { label: "3–7 שנים", primary: true },
        { label: "מעל 7 שנים" },
        { label: "לא זוכרים בדיוק" },
      ],
    },
    {
      id: "pressure",
      title: "ההחזר החודשי מרגיש לוחץ?",
      sub: "תחושה — לא צריך מספר מדויק.",
      chips: [
        { label: "כן, די לוחץ", primary: true },
        { label: "לפעמים" },
        { label: "לא ממש" },
      ],
    },
    {
      id: "how",
      title: "לקחתם לבד מהבנק או עם יועץ?",
      sub: "עוזר להבין מאיפה התחלתם.",
      chips: [
        { label: "לבד מהבנק", primary: true },
        { label: "עם יועץ" },
        { label: "שילוב / לא זוכרים" },
      ],
    },
    {
      id: "checked",
      title: "בדקתם הצעות ממספר בנקים בשנה האחרונה?",
      sub: "גם שיחה אחת נחשבת.",
      chips: [
        { label: "לא בדקנו", primary: true },
        { label: "בנק אחד בלבד" },
        { label: "כן, כמה כיוונים" },
      ],
    },
    {
      id: "goal",
      title: "מה המטרה העיקרית?",
      sub: "אין תשובה נכונה.",
      chips: [
        { label: "להוריד החזר", primary: true },
        { label: "לקצר שנים" },
        { label: "לבדוק כדאיות בלבד" },
      ],
    },
    {
      id: "urgency",
      title: "מה הדחיפות שלכם?",
      sub: "כדי שנדע איך לתזמן שיחה.",
      chips: [
        { label: "השבוע", primary: true },
        { label: "החודש" },
        { label: "רק בודקים" },
      ],
    },
  ],
  softResult: function (a) {
    var bits = [];
    if (a.active) bits.push("משכנתא: " + a.active);
    if (a.years) bits.push("זמן: " + a.years);
    if (a.pressure) bits.push("לחץ: " + a.pressure);
    if (a.how) bits.push("איך נלקחה: " + a.how);
    if (a.checked) bits.push("בדיקות: " + a.checked);
    if (a.goal) bits.push("מטרה: " + a.goal);
    if (a.urgency) bits.push("דחיפות: " + a.urgency);
    var summary = bits.length ? bits.join(" · ") : "מה שסיפרתם";
    return (
      "<p><strong>כיוון לבדיקה — בלי הבטחות</strong></p>" +
      "<p>לפי מה שסיפרתם (" +
      summary +
      ") — שווה לבדוק יחד האם יש מקום לסדר מחדש את התמונה, בהשוואה ובהירות.</p>" +
      '<div class="tags"><span>השוואה שקולה</span><span>בהירות מסלולים</span><span>בלי לחץ לחתום</span></div>' +
      '<p class="soft-note">זו <strong>המחשה לכיוון</strong> בלבד — לא הצעה ולא התחייבות. כל מקרה נבדק בנפרד בשיחה.</p>'
    );
  },
};
