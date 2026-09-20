/** VERBATIM zmizrahi Q1–5 → Menifa brand only. No deposits-specific verbatim in pack. */
window.MENIFA_QUIZ = {
  product: "pikdonot",
  portraitSrc: "../assets/img/tamir.jpg",
  startLabel: "נתחיל!",
  introHtml:
    "<p><strong>מניפה פיננסית · תמיר גרמה</strong></p>" +
    "<p>תתייעץ עם תמיר עכשיו</p>" +
    "<p>*הערכה סטטיסטית להמחשה בלבד, אינה ייעוץ פיננסי ואינה התחייבות לתוצאה.</p>",
  questions: [
    { id: "q1", title: "מה המצב שלך?", sub: "שאלה 1 מתוך 5",
      chips: [
        { label: "רוכש דירה ראשונה" }, { label: "משדרג" }, { label: "משקיע" },
        { label: "מיחזור", primary: true }, { label: "לא בטוח" }
      ]},
    { id: "q2", title: "כמה הון עצמי יש לך?", sub: "שאלה 2 מתוך 5 · טווח ₪100,000 … ₪2,000,000",
      chips: [
        { label: "₪100,000" }, { label: "₪400,000", primary: true },
        { label: "₪1,000,000" }, { label: "₪2,000,000" }
      ]},
    { id: "q3", title: "הכנסה נטו של משק הבית בחודש?", sub: "שאלה 3 מתוך 5 · טווח ₪10,000 … ₪50,000",
      chips: [
        { label: "₪10,000" }, { label: "₪20,000", primary: true },
        { label: "₪35,000" }, { label: "₪50,000" }
      ]},
    { id: "q4", title: "מתי תרצה לרכוש / למחזר?", sub: "שאלה 4 מתוך 5",
      chips: [
        { label: "תוך 3 חודשים", primary: true }, { label: "3-12 חודשים" },
        { label: "יותר משנה" }, { label: "רק חוקר בינתיים" }
      ]},
    { id: "q5", title: "ניסית לבד מול הבנקים?", sub: "שאלה 5 מתוך 5",
      chips: [
        { label: "כן, והסתבכתי" }, { label: "עוד לא", primary: true },
        { label: "לא רוצה לבד - לכן באתי" }
      ]},
  ],
  softResult: function () {
    return (
      "<p><strong>תודה על התשובות.</strong></p>" +
      "<p>אפשר לתאם שיחה קצרה להמשך בדיקה — בלי התחייבות.</p>" +
      '<p class="soft-note">VERBATIM zmizrahi שאלות · תוצאה חסרה במקור · מיתוג מניפה · Preview</p>'
    );
  },
};
