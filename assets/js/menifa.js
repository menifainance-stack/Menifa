/* מניפה — motion + quiz · internal preview */
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

  /* Sticky header state */
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

  /* Quiz — Menifa voice (relevance check, not eligibility promise) */
  const quiz = $("[data-quiz]");
  if (quiz) {
    const questions = [
      {
        title: "מה הכי לוחץ עכשיו?",
        opts: [
          "ההחזר החודשי של המשכנתא",
          "הלוואות בצד מעל המשכנתא",
          "סירוב מהבנק / קושי לקבל אישור",
          "רוצים לבדוק מיחזור לפני שמחליטים",
        ],
      },
      {
        title: "יש לכם דירה עם משכנתא פעילה?",
        opts: ["כן", "בתהליך רכישה / דירה ראשונה", "עדיין לא", "לא בטוחים"],
      },
      {
        title: "איך נסגר החודש?",
        opts: [
          "נסגר בדוחק",
          "הלוואות בצד כל חודש",
          "ההחזר לא משאיר אוויר",
          "בסדר יחסית — רוצים לבדוק בכל זאת",
        ],
      },
      {
        title: "כמה הלוואות יש מחוץ למשכנתא?",
        opts: ["אין", "1–2", "3 ומעלה", "לא בטוחים במספר"],
      },
      {
        title: "מה חשוב לכם לבדוק קודם?",
        opts: [
          "אם מיחזור בכלל משתלם",
          "אם איחוד הלוואות הגיוני",
          "למה הבנק אמר לא",
          "עלות כוללת — לא רק ריבית",
        ],
      },
      {
        title: "איך נוח לכם להמשיך?",
        opts: [
          "וואטסאפ — לתיאום שיחה",
          "שיחה טלפונית קצרה",
          "השארת פרטים ונחזור",
          "עוד לא — רק רציתי לבדוק",
        ],
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
          }, 280);
        });
        optsEl.appendChild(btn);
      });
      backBtn.style.visibility = qi === 0 ? "hidden" : "visible";
    };

    const showResult = () => {
      qbox.style.display = "none";
      result.classList.add("show");
      const h = $("h3", result);
      const p = $(".lede", result);
      h.textContent = "מה לבדוק עכשיו";
      p.textContent =
        "אם כמה מהסעיפים נכונים לכם — שווה שיחה קצרה. שמים על השולחן משכנתא, הלוואות, ומה נשאר בפועל. בלי הבטחה מראש כמה יישאר בכיס.";
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
        note.textContent = "תודה. נחזור אליכם בהקדם לתיאום — או פתחו וואטסאפ עכשיו.";
      }
      const wa = "https://wa.me/972524502821?text=" + encodeURIComponent("שלום תמיר, הגעתי מאתר מניפה ואשמח לתיאום שיחה.");
      window.open(wa, "_blank", "noopener");
    });
  });

  /* Mobile nav toggle (minimal) */
  const menuBtn = $(".menu-btn");
  const mobileNav = $("[data-mobile-nav]");
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", () => {
      const open = mobileNav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", mobileNav).forEach((a) =>
      a.addEventListener("click", () => mobileNav.classList.remove("open"))
    );
  }
})();
