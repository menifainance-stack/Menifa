(function () {
  const params = new URLSearchParams(location.search);
  if (params.get("qc") === "1") document.body.classList.add("qc");

  document.querySelectorAll(".acc-btn").forEach((btn) => {
    btn.addEventListener("click", () => btn.parentElement.classList.toggle("open"));
  });

  document.querySelectorAll("form[data-lab-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = form.querySelector(".ok");
      if (ok) ok.style.display = "block";
    });
  });

  const cookie = document.querySelector(".cookie");
  const accept = document.querySelector("[data-cookie-ok]");
  if (accept && cookie) accept.addEventListener("click", () => (cookie.style.display = "none"));

  /* financeb 10-question quiz — source copy */
  const QUESTIONS = [
    { q: "מה הסיבה העיקרית לפנייה שלכם?", opts: ["חובות מצטברים", "משכנתא גבוהה", "הלוואות רבות", "עסק בקשיים", "רוצים לתכנן נכון", "אחר"] },
    { q: "כמה הלוואות פעילות יש לכם כרגע?", opts: ["אין הלוואות", "הלוואה אחת", "2-3 הלוואות", "4 הלוואות ומעלה"] },
    { q: "האם יש לכם מינוס קבוע בחשבון הבנק?", opts: ["אין מינוס", "מינוס עד 5,000 ₪", "מינוס 5,000-20,000 ₪", "מינוס מעל 20,000 ₪"] },
    { q: "מה סך ההחזרים החודשיים שלכם (הלוואות + אשראי)?", opts: ["עד 2,000 ₪", "2,000–5,000 ₪", "5,000–10,000 ₪", "מעל 10,000 ₪", "לא יודע/ת"] },
    { q: "האם יש לכם נכס (דירה / רכב) בבעלותכם?", opts: ["דירה בבעלותי", "רכב בבעלותי", "דירה + רכב", "אין נכסים"] },
    { q: "מה רמת ההכנסה החודשית נטו של המשפחה?", opts: ["עד 8,000 ₪", "8,000–15,000 ₪", "15,000–25,000 ₪", "מעל 25,000 ₪", "מעדיף/ה לא לציין"] },
    { q: "האם פניתם בעבר לייעוץ פיננסי?", opts: ["לא, זו הפעם הראשונה", "כן, אבל לא עזר", "כן, וזה עזר חלקית", "כן, ואני מחפש/ת פתרון חדש"] },
    { q: "האם קיבלתם לאחרונה סירוב לאשראי או הלוואה?", opts: ["לא", "כן, פעם אחת", "כן, מספר פעמים", "לא ניסיתי לבקש"] },
    { q: "מה הדבר שהכי מטריד אתכם מבחינה כלכלית?", opts: ["אי יכולת לחסוך", "חוסר שליטה בהוצאות", "לחץ מנושים", "חוסר ודאות לגבי העתיד"] },
    { q: "מה המטרה העיקרית שלכם?", opts: ["להיפטר מחובות", "להוריד החזרים חודשיים", "לקבל משכנתא", "לבנות תכנית פיננסית סדורה"] },
  ];
  const RESULTS = [
    { t: "המצב שלכם דורש טיפול מקצועי דחוף", b: "על סמך התשובות שלכם, נראה שאתם נמצאים במצב פיננסי שדורש התערבות מהירה של מומחה. אל תחכו – ככל שמטפלים מוקדם יותר, כך הפתרונות טובים יותר." },
    { t: "מצבכם הפיננסי דורש בדיקה מקצועית", b: "זיהינו מספר נקודות שדורשות תשומת לב. פגישת ייעוץ מקצועית תעזור לכם למפות את המצב ולבנות תכנית פעולה ממוקדת." },
    { t: "אתם על הדרך הנכונה!", b: "נראה שהמצב הפיננסי שלכם יציב יחסית. עם זאת, ייעוץ מקצועי יכול לעזור לכם למקסם את הפוטנציאל ולתכנן את העתיד בצורה חכמה יותר." },
  ];

  const root = document.querySelector("[data-quiz]");
  if (root) {
    let i = 0;
    const answers = [];
    const meta = root.querySelector("[data-qmeta]");
    const title = root.querySelector("[data-qtitle]");
    const optsEl = root.querySelector("[data-opts]");
    const bar = root.querySelector("[data-bar]");
    const back = root.querySelector("[data-back]");
    const result = root.querySelector("[data-result]");
    const qbox = root.querySelector("[data-qbox]");

    function render() {
      const item = QUESTIONS[i];
      meta.textContent = `שאלה ${i + 1} מתוך 10`;
      title.textContent = item.q;
      bar.style.width = ((i + 1) / 10) * 100 + "%";
      optsEl.innerHTML = "";
      item.opts.forEach((o, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opt";
        b.textContent = o;
        b.addEventListener("click", () => {
          answers[i] = idx;
          if (i < 9) {
            i += 1;
            render();
          } else finish();
        });
        optsEl.appendChild(b);
      });
      back.style.visibility = i === 0 ? "hidden" : "visible";
    }
    function finish() {
      qbox.style.display = "none";
      result.classList.add("show");
      const heavy = answers.filter((a, n) => (n === 1 && a >= 2) || (n === 2 && a >= 2) || (n === 3 && a >= 2)).length;
      const r = heavy >= 2 ? RESULTS[0] : heavy === 1 ? RESULTS[1] : RESULTS[2];
      result.querySelector("h3").textContent = r.t;
      result.querySelector("p").textContent = r.b;
    }
    back.addEventListener("click", () => {
      if (i > 0) {
        i -= 1;
        render();
      }
    });
    render();
  }

  /* byhdf budget calculator (visual) */
  const calcBtn = document.querySelector("[data-calc]");
  if (calcBtn) {
    calcBtn.addEventListener("click", () => {
      const out = document.querySelector("[data-calc-out]");
      if (out) {
        out.hidden = false;
        out.querySelector("[data-alloc]").textContent = "הקצאה לדוגמה חושבה לפי מינימום/מקסימום/תועלת — מעבדה בלבד, לא ייעוץ.";
      }
    });
  }
})();
