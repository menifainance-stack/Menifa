/* מניפה — motion + Luski/financeb quiz · internal preview */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Scroll progress */
  const bar = $("[data-progress]");
  const onScrollProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
  };

  /* Sticky header state — navy chrome stays navy */
  const header = $(".site-header");
  const onHeader = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 48);
  };

  /* Mobile sticky CTA — show after hero */
  const sticky = $(".mobile-sticky");
  const hero = $(".hero");
  const onSticky = () => {
    if (!sticky || !hero) return;
    const threshold = hero.offsetHeight * 0.55;
    sticky.classList.toggle("show", window.scrollY > threshold);
  };

  /* Hero parallax (subtle) */
  const heroBg = $(".hero-bg");
  const onParallax = () => {
    if (!heroBg || !hero) return;
    const y = window.scrollY;
    if (y > hero.offsetHeight) return;
    heroBg.style.transform = `scale(1.06) translateY(${y * 0.18}px)`;
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScrollProgress();
      onHeader();
      onSticky();
      onParallax();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Reveal on scroll */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* FAQ accordion */
  $$(".faq-item").forEach((item) => {
    const btn = $(".faq-q", item);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!open) item.classList.add("open");
    });
  });

  /* Quiz — financeb 10Q source copy (Luski voice) */
  const quiz = $("[data-quiz]");
  if (quiz) {
    const questions = [
      {
        title: "מה הסיבה העיקרית לפנייה שלכם?",
        opts: ["חובות מצטברים", "משכנתא גבוהה", "הלוואות רבות", "עסק בקשיים", "רוצים לתכנן נכון", "אחר"],
      },
      {
        title: "כמה הלוואות פעילות יש לכם כרגע?",
        opts: ["אין הלוואות", "הלוואה אחת", "2-3 הלוואות", "4 הלוואות ומעלה"],
      },
      {
        title: "האם יש לכם מינוס קבוע בחשבון הבנק?",
        opts: ["אין מינוס", "מינוס עד 5,000 ₪", "מינוס 5,000-20,000 ₪", "מינוס מעל 20,000 ₪"],
      },
      {
        title: "מה סך ההחזרים החודשיים שלכם (הלוואות + אשראי)?",
        opts: ["עד 2,000 ₪", "2,000–5,000 ₪", "5,000–10,000 ₪", "מעל 10,000 ₪", "לא יודע/ת"],
      },
      {
        title: "האם יש לכם נכס (דירה / רכב) בבעלותכם?",
        opts: ["דירה בבעלותי", "רכב בבעלותי", "דירה + רכב", "אין נכסים"],
      },
      {
        title: "מה רמת ההכנסה החודשית נטו של המשפחה?",
        opts: ["עד 8,000 ₪", "8,000–15,000 ₪", "15,000–25,000 ₪", "מעל 25,000 ₪", "מעדיף/ה לא לציין"],
      },
      {
        title: "האם פניתם בעבר לייעוץ פיננסי?",
        opts: ["לא, זו הפעם הראשונה", "כן, אבל לא עזר", "כן, וזה עזר חלקית", "כן, ואני מחפש/ת פתרון חדש"],
      },
      {
        title: "האם קיבלתם לאחרונה סירוב לאשראי או הלוואה?",
        opts: ["לא", "כן, פעם אחת", "כן, מספר פעמים", "לא ניסיתי לבקש"],
      },
      {
        title: "מה הדבר שהכי מטריד אתכם מבחינה כלכלית?",
        opts: ["אי יכולת לחסוך", "חוסר שליטה בהוצאות", "לחץ מנושים", "חוסר ודאות לגבי העתיד"],
      },
      {
        title: "מה המטרה העיקרית שלכם?",
        opts: ["להיפטר מחובות", "להוריד החזרים חודשיים", "לקבל משכנתא", "לבנות תכנית פיננסית סדורה"],
      },
    ];
    const results = [
      {
        t: "המצב שלכם דורש טיפול מקצועי דחוף",
        b: "על סמך התשובות שלכם, נראה שאתם נמצאים במצב פיננסי שדורש התערבות מהירה של מומחה. אל תחכו – ככל שמטפלים מוקדם יותר, כך הפתרונות טובים יותר.",
      },
      {
        t: "מצבכם הפיננסי דורש בדיקה מקצועית",
        b: "זיהינו מספר נקודות שדורשות תשומת לב. פגישת ייעוץ מקצועית תעזור לכם למפות את המצב ולבנות תכנית פעולה ממוקדת.",
      },
      {
        t: "אתם על הדרך הנכונה!",
        b: "נראה שהמצב הפיננסי שלכם יציב יחסית. עם זאת, ייעוץ מקצועי יכול לעזור לכם למקסם את הפוטנציאל ולתכנן את העתיד בצורה חכמה יותר.",
      },
    ];

    let qi = 0;
    const answers = [];
    const qbox = $("[data-qbox]", quiz);
    const result = $("[data-result]", quiz);
    const barEl = $("[data-bar]", quiz);
    const meta = $("[data-qmeta]", quiz);
    const title = $("[data-qtitle]", quiz);
    const optsEl = $("[data-opts]", quiz);
    const backBtn = $("[data-back]", quiz);

    const render = () => {
      const q = questions[qi];
      meta.textContent = `שאלה ${qi + 1} מתוך ${questions.length}`;
      title.textContent = q.title;
      if (barEl) barEl.style.width = ((qi + 1) / questions.length) * 100 + "%";
      optsEl.innerHTML = "";
      q.opts.forEach((label, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opt";
        btn.innerHTML = `<span class="bullet"></span><span>${label}</span>`;
        btn.addEventListener("click", () => {
          $$(".opt", optsEl).forEach((o) => o.classList.remove("selected"));
          btn.classList.add("selected");
          answers[qi] = i;
          setTimeout(() => {
            if (qi < questions.length - 1) {
              qi++;
              render();
            } else {
              showResult();
            }
          }, 220);
        });
        optsEl.appendChild(btn);
      });
      backBtn.style.visibility = qi === 0 ? "hidden" : "visible";
    };

    const showResult = () => {
      qbox.style.display = "none";
      result.classList.add("show");
      const heavy = answers.filter(
        (a, n) => (n === 1 && a >= 2) || (n === 2 && a >= 2) || (n === 3 && a >= 2)
      ).length;
      const r = heavy >= 2 ? results[0] : heavy === 1 ? results[1] : results[2];
      $("h3", result).textContent = r.t;
      $(".lede", result).textContent = r.b;
    };

    backBtn.addEventListener("click", () => {
      if (qi > 0) {
        qi--;
        render();
      }
    });

    render();
  }

  /* Soft form — no fake submit */
  $$("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = form.querySelector("[data-form-note]");
      if (note) {
        note.textContent = "הפרטים נשלחו בהצלחה! נחזור אליכם בהקדם. (תצוגה מקדימה — אין שליחה אמיתית)";
      }
      const wa =
        "https://wa.me/972524502821?text=" +
        encodeURIComponent("שלום, אשמח לקבוע פגישת ייעוץ חינם.");
      window.open(wa, "_blank", "noopener");
    });
  });

  /* Mobile nav toggle */
  const menuBtn = $(".menu-btn");
  const mobileNav = $("[data-mobile-nav]");
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", () => {
      const open = !mobileNav.classList.contains("open");
      mobileNav.classList.toggle("open", open);
      mobileNav.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", mobileNav).forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        mobileNav.hidden = true;
        menuBtn.setAttribute("aria-expanded", "false");
      })
    );
  }
})();
