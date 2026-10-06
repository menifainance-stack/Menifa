(function () {
  const qs = [
    {
      id: "count",
      bot: "אוקיי — כמה הלוואות פעילות יש לכם עכשיו (בלי המשכנתא)?",
      chips: ["אחת", "2–3", "4 ומעלה", "אין בכלל"],
    },
    {
      id: "pay",
      bot: "בערך כמה יוצא בחודש על הלוואות ואשראי (בלי המשכנתא)?",
      chips: ["עד 2,000 ₪", "2,000–5,000 ₪", "5,000–10,000 ₪", "מעל 10,000 ₪"],
    },
    {
      id: "feel",
      bot: "איך התזרים מרגיש עכשיו?",
      chips: ["לוחץ כל חודש", "יש חודשים קשים", "בסדר אבל רוצים לסדר", "עוד בודקים"],
    },
    {
      id: "when",
      bot: "מתי בא לכם לבדוק איחוד ברצינות?",
      chips: ["כמה שיותר מהר", "השבועיים הקרובים", "עוד אוספים מידע"],
    },
  ];
  const answers = [];
  let i = 0;
  const log = document.getElementById("iq-log");
  const panel = document.getElementById("iq-panel");
  const bar = document.getElementById("iq-bar");
  if (!panel || !log) return;

  function waUrl() {
    const bits = answers.map((a, idx) => qs[idx].bot + " " + a).join("\n");
    const text = encodeURIComponent("שלום, אשמח לבדוק איחוד הלוואות\n" + bits);
    return "https://wa.me/972524502821?text=" + text;
  }

  function addBubble(cls, text) {
    const d = document.createElement("div");
    d.className = "bubble " + cls;
    d.textContent = text;
    log.appendChild(d);
  }

  function softScroll() {
    const el = document.getElementById("ihud-quiz");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function render() {
    bar.style.width = ((i / qs.length) * 100).toFixed(0) + "%";
    if (i >= qs.length) {
      panel.innerHTML =
        '<div class="quiz-result">' +
        "<h3>תודה — יש תמונה ראשונית</h3>" +
        "<p>נשמח לתאם שיחה קצרה על התזרים. בלי הבטחת חיסכון ב־₪.</p>" +
        '<a class="btn btn-wa" href="' +
        waUrl() +
        '">וואטסאפ — לתיאום שיחה</a>' +
        '<div class="quiz-nav"><button type="button" class="quiz-back" id="iq-restart">התחלה מחדש</button></div>' +
        "</div>";
      bar.style.width = "100%";
      addBubble("bot", "מעולה. אפשר להמשיך בוואטסאפ לתיאום שיחה.");
      document.getElementById("iq-restart").onclick = function () {
        answers.length = 0;
        i = 0;
        log.innerHTML = "";
        render();
      };
      softScroll();
      return;
    }
    const q = qs[i];
    // show bot question once per step
    const already = log.querySelectorAll(".bubble.bot").length;
    if (already === i) addBubble("bot", q.bot);

    panel.innerHTML =
      '<div class="chips" id="iq-chips"></div>' +
      '<div class="quiz-nav">' +
      (i > 0 ? '<button type="button" class="quiz-back" id="iq-back">חזרה</button>' : "<span></span>") +
      "<span style=\"font-size:.8rem;color:var(--muted)\">" +
      (i + 1) +
      " / " +
      qs.length +
      "</span></div>";
    const box = document.getElementById("iq-chips");
    q.chips.forEach(function (label) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = label;
      b.onclick = function () {
        answers[i] = label;
        addBubble("me", label);
        i += 1;
        // clear chips before next
        setTimeout(function () {
          render();
          softScroll();
        }, 180);
      };
      box.appendChild(b);
    });
    const back = document.getElementById("iq-back");
    if (back)
      back.onclick = function () {
        // rebuild log up to previous
        i -= 1;
        answers.pop();
        log.innerHTML = "";
        for (let k = 0; k < i; k++) {
          addBubble("bot", qs[k].bot);
          addBubble("me", answers[k]);
        }
        render();
      };
  }
  render();
})();
