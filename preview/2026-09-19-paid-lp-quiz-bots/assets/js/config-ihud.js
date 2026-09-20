/** VERBATIM financeb → Menifa brand only. NO AI rewrite. */
window.MENIFA_QUIZ = {
  product: "ihud",
  portraitSrc: "../assets/img/tamir.jpg",
  startLabel: "נתחיל!",
  introHtml:
    '<p class="hi">נעים מאוד!</p>' +
    "<p>שמי <strong>תמיר גרמה</strong>, <strong>מניפה פיננסית</strong>.</p>" +
    "<p><strong>בדקו את עצמכם</strong></p>" +
    "<p><strong>שאלון אבחון פיננסי</strong></p>" +
    "<p>ענו על מספר שאלות קצרות וגלו את המצב הפיננסי שלכם</p>",
  questions: [
    { id: "q1", title: "מה הסיבה העיקרית לפנייה שלכם?", sub: "שאלה 1 מתוך 10",
      chips: [
        { label: "חובות מצטברים" }, { label: "משכנתא גבוהה" },
        { label: "הלוואות רבות", primary: true }, { label: "עסק בקשיים" },
        { label: "רוצים לתכנן נכון" }, { label: "אחר" }
      ]},
    { id: "q2", title: "כמה הלוואות פעילות יש לכם כרגע?", sub: "שאלה 2 מתוך 10",
      chips: [
        { label: "אין הלוואות" }, { label: "הלוואה אחת" },
        { label: "2-3 הלוואות", primary: true }, { label: "4 הלוואות ומעלה" }
      ]},
    { id: "q3", title: "האם יש לכם מינוס קבוע בחשבון הבנק?", sub: "שאלה 3 מתוך 10",
      chips: [
        { label: "אין מינוס" }, { label: "מינוס עד 5,000 ₪" },
        { label: "מינוס 5,000-20,000 ₪", primary: true }, { label: "מינוס מעל 20,000 ₪" }
      ]},
    { id: "q4", title: "מה סך ההחזרים החודשיים שלכם (הלוואות + אשראי)?", sub: "שאלה 4 מתוך 10",
      chips: [
        { label: "עד 2,000 ₪" }, { label: "2,000-5,000 ₪" },
        { label: "5,000-10,000 ₪", primary: true }, { label: "מעל 10,000 ₪" },
        { label: "לא יודע/ת" }
      ]},
    { id: "q5", title: "האם יש לכם נכס (דירה / רכב) בבעלותכם?", sub: "שאלה 5 מתוך 10",
      chips: [
        { label: "דירה בבעלותי", primary: true }, { label: "רכב בבעלותי" },
        { label: "דירה + רכב" }, { label: "אין נכסים" }
      ]},
    { id: "q6", title: "מה רמת ההכנסה החודשית נטו של המשפחה?", sub: "שאלה 6 מתוך 10",
      chips: [
        { label: "עד 8,000 ₪" }, { label: "8,000-15,000 ₪", primary: true },
        { label: "15,000-25,000 ₪" }, { label: "מעל 25,000 ₪" },
        { label: "מעדיף/ה לא לציין" }
      ]},
    { id: "q7", title: "האם פניתם בעבר לייעוץ פיננסי?", sub: "שאלה 7 מתוך 10",
      chips: [
        { label: "לא, זו הפעם הראשונה", primary: true }, { label: "כן, אבל לא עזר" },
        { label: "כן, וזה עזר חלקית" }, { label: "כן, ואני מחפש/ת פתרון חדש" }
      ]},
    { id: "q8", title: "האם קיבלתם לאחרונה סירוב לאשראי או הלוואה?", sub: "שאלה 8 מתוך 10",
      chips: [
        { label: "לא", primary: true }, { label: "כן, פעם אחת" },
        { label: "כן, מספר פעמים" }, { label: "לא ניסיתי לבקש" }
      ]},
    { id: "q9", title: "מה הדבר שהכי מטריד אתכם מבחינה כלכלית?", sub: "שאלה 9 מתוך 10",
      chips: [
        { label: "אי יכולת לחסוך", primary: true }, { label: "חוסר שליטה בהוצאות" },
        { label: "לחץ מנושים" }, { label: "חוסר ודאות לגבי העתיד" }
      ]},
    { id: "q10", title: "מה המטרה העיקרית שלכם?", sub: "שאלה 10 מתוך 10",
      chips: [
        { label: "להיפטר מחובות" }, { label: "להוריד החזרים חודשיים", primary: true },
        { label: "לקבל משכנתא" }, { label: "לבנות תכנית פיננסית סדורה" }
      ]},
  ],
  softResult: function () {
    return (
      "<p><strong>מצבכם הפיננסי דורש בדיקה מקצועית</strong></p>" +
      "<p>זיהינו מספר נקודות שדורשות תשומת לב. פגישת ייעוץ מקצועית תעזור לכם למפות את המצב ולבנות תכנית פעולה ממוקדת.</p>" +
      '<p class="soft-note">VERBATIM financeb · מיתוג מניפה בלבד · Preview · לא merge</p>'
    );
  },
};
