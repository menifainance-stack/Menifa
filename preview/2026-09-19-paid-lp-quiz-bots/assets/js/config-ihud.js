window.MENIFA_QUIZ = {
  product: "ihud",
  portraitSrc: "../assets/img/tamir.jpg",
  startLabel: "נתחיל בבדיקה",
  introHtml:
    '<p class="hi">אהלן.</p>' +
    "<p>כאן <strong>תמיר גרמה</strong> מ<strong>מניפה פיננסית</strong>.</p>" +
    "<p>כמה הלוואות וכרטיסים. החזרים שונים. לחץ כל חודש — זה בדיוק המקום לבדוק אם איחוד יכול להחזיר קצת אוויר.</p>" +
    "<p>נעבור יחד כמה שאלות קצרות. בסוף — כיוון רך. בלי מספרים מומצאים, בלי התחייבות.</p>",
  questions: [
    {
      id: "count",
      title: "כמה החזרים או הלוואות פעילים יש לכם היום?",
      sub: "מספר גס מספיק — אנחנו רק מכוונים.",
      chips: [
        { label: "1–2" },
        { label: "3–4", primary: true },
        { label: "5+" },
        { label: "לא בטוחים" },
      ],
    },
    {
      id: "payment",
      title: "מה סדר גודל ההחזר החודשי הכולל?",
      sub: "טווח גס של הכול יחד — בלי צורך בדיוק.",
      chips: [
        { label: "עד 3,000" },
        { label: "3,000–6,000", primary: true },
        { label: "6,000–10,000" },
        { label: "מעל 10,000" },
      ],
    },
    {
      id: "mortgage",
      title: "יש גם משכנתא על נכס?",
      sub: "גם אם היא לא במרכז — זה עוזר להבין את התמונה.",
      chips: [
        { label: "כן", primary: true },
        { label: "לא" },
        { label: "בתהליך" },
      ],
    },
    {
      id: "credit",
      title: "יש מינוס קבוע או כרטיסי אשראי שלוחצים?",
      sub: "תחושה אמיתית — לא צריך פירוט.",
      chips: [
        { label: "כן, די לוחץ", primary: true },
        { label: "לפעמים" },
        { label: "לא ממש" },
      ],
    },
    {
      id: "goal",
      title: "מה המטרה העיקרית עכשיו?",
      sub: "אין תשובה נכונה — רק כיוון.",
      chips: [
        { label: "להוריד החזר", primary: true },
        { label: "לסדר תזרים" },
        { label: "שניהם" },
      ],
    },
    {
      id: "owner",
      title: "אתם בעלים של דירה או נכס?",
      sub: "עוזר להבין אפשרויות — בלי בדיקה מחייבת.",
      chips: [
        { label: "כן", primary: true },
        { label: "לא" },
        { label: "בשותפות / מורכב" },
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
    if (a.count) bits.push(a.count + " מסלולים");
    if (a.payment) bits.push("החזר " + a.payment);
    if (a.mortgage) bits.push("משכנתא: " + a.mortgage);
    if (a.credit) bits.push("אשראי/מינוס: " + a.credit);
    if (a.goal) bits.push("מטרה: " + a.goal);
    if (a.owner) bits.push("נכס: " + a.owner);
    if (a.urgency) bits.push("דחיפות: " + a.urgency);
    var summary = bits.length ? bits.join(" · ") : "מה שסיפרתם";
    return (
      "<p><strong>כיוון אפשרי — בלי הבטחות</strong></p>" +
      "<p>לפי מה שסיפרתם (" +
      summary +
      ") — יש מקום לבדוק האם איחוד יכול להקל על העומס החודשי ולהחזיר סדר.</p>" +
      '<div class="tags"><span>סדר + בהירות</span><span>פחות פיצול</span><span>נשימה חודשית</span></div>' +
      '<p class="soft-note">זו <strong>המחשה לכיוון</strong> בלבד — לא הצעה ולא התחייבות. כל מקרה נבדק בנפרד בשיחה.</p>'
    );
  },
};
