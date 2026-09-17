(function () {
  "use strict";

  var WA_URL =
    "https://wa.me/972524502821?text=" +
    encodeURIComponent("שלום, אשמח לתיאום שיחה");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DELAY_SHORT = reduceMotion ? 0 : 420;
  var DELAY_TYPING = reduceMotion ? 0 : 700;
  var DELAY_NEXT = reduceMotion ? 80 : 380;

  var answers = {
    loans: null,
    payment: null,
    mortgage: null,
    name: "",
    phone: "",
  };

  var logEl = document.getElementById("chat-log");
  var repliesEl = document.getElementById("chat-replies");
  var stageEl = document.getElementById("chat-stage");

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function scrollBottom() {
    stageEl.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    var last = logEl.lastElementChild;
    if (last) last.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "typing";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<i></i><i></i><i></i>";
    logEl.appendChild(el);
    scrollBottom();
    return el;
  }

  function addBotBubble(html, extraClass) {
    var el = document.createElement("div");
    el.className = "bubble bubble--bot" + (extraClass ? " " + extraClass : "");
    el.innerHTML = html;
    logEl.appendChild(el);
    scrollBottom();
    return el;
  }

  function addUserBubble(text) {
    var el = document.createElement("div");
    el.className = "bubble bubble--user";
    el.textContent = text;
    logEl.appendChild(el);
    scrollBottom();
    return el;
  }

  function clearReplies() {
    repliesEl.innerHTML = "";
  }

  function setChips(items) {
    clearReplies();
    items.forEach(function (item) {
      var btn = document.createElement(item.href ? "a" : "button");
      btn.className = "chip" + (item.primary ? " chip--primary" : "") + (item.wa ? " chip--wa" : "");
      if (item.href) {
        btn.href = item.href;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
      } else {
        btn.type = "button";
      }
      if (item.html) btn.innerHTML = item.html;
      else btn.textContent = item.label;
      if (item.onClick) {
        btn.addEventListener("click", function (e) {
          if (!item.href) e.preventDefault();
          item.onClick(item.label);
        });
      }
      repliesEl.appendChild(btn);
    });
    var first = repliesEl.querySelector("button, a");
    if (first) first.focus({ preventScroll: true });
    scrollBottom();
  }

  async function botSay(html, extraClass) {
    var typing = showTyping();
    await sleep(DELAY_TYPING);
    typing.remove();
    addBotBubble(html, extraClass);
    await sleep(DELAY_SHORT);
  }

  function softResultCopy() {
    var loans = answers.loans || "";
    var pay = answers.payment || "";
    var mort = answers.mortgage === "כן" ? "עם משכנתא ברקע" : "בלי משכנתא בשיחה הזו";

    var hint =
      "לפי מה שסיפרתם (" +
      loans +
      " הלוואות, החזר " +
      pay +
      ", " +
      mort +
      ") — יש מקום לבדוק כיוון של איחוד שיכול להקל על העומס החודשי.";

    return (
      "<p><strong>המחשה לטווח אפשרות להקלה</strong></p>" +
      "<p>" +
      hint +
      "</p>" +
      '<div class="range"><span>סדר + בהירות</span><span>פחות פיצול</span><span>נשימה חודשית</span></div>' +
      '<p class="soft-note"><strong>המחשה בלבד</strong> — לא הצעה ולא התחייבות. כל מקרה נבדק בנפרד בשיחה.</p>'
    );
  }

  function showLeadForm() {
    clearReplies();
    var wrap = document.createElement("div");
    wrap.className = "bubble bubble--bot";
    wrap.innerHTML =
      "<p><strong>רוצים שנחזור אליכם?</strong></p>" +
      "<p>השאירו שם וטלפון — או עברו ישר לוואטסאפ לתיאום שיחה.</p>" +
      '<form class="lead-form" id="lead-form" novalidate>' +
      '<label>שם<input name="name" type="text" autocomplete="name" required placeholder="השם שלכם" /></label>' +
      '<label>טלפון<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="05X-XXXXXXX" /></label>' +
      '<div class="lead-actions">' +
      '<button type="submit" class="chip chip--primary">שמירה והמשך</button>' +
      "</div></form>";
    logEl.appendChild(wrap);
    scrollBottom();

    setChips([
      {
        label: "וואטסאפ — לתיאום שיחה",
        wa: true,
        href: WA_URL,
        html:
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> וואטסאפ — לתיאום שיחה',
      },
    ]);

    var form = document.getElementById("lead-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      answers.name = String(fd.get("name") || "").trim();
      answers.phone = String(fd.get("phone") || "").trim();
      if (!answers.name || !answers.phone) return;
      form.querySelectorAll("input,button").forEach(function (n) {
        n.disabled = true;
      });
      addUserBubble(answers.name + " · " + answers.phone);
      finishAfterLead();
    });
  }

  async function finishAfterLead() {
    clearReplies();
    await botSay(
      "<p>תודה" +
        (answers.name ? ", " + answers.name : "") +
        ".</p><p>אפשר עכשיו לתאם שיחה קצרה בוואטסאפ — בלי לחץ ובלי התחייבות.</p>"
    );
    setChips([
      {
        label: "וואטסאפ — לתיאום שיחה",
        primary: true,
        wa: true,
        href: WA_URL,
        html:
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> וואטסאפ — לתיאום שיחה',
      },
    ]);
  }

  async function askMortgage() {
    await botSay("<p><strong>יש גם משכנתא?</strong></p><p>גם אם היא לא במרכז — זה עוזר להבין את התמונה.</p>");
    setChips([
      {
        label: "כן",
        primary: true,
        onClick: async function (label) {
          answers.mortgage = label;
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await showResult();
        },
      },
      {
        label: "לא",
        onClick: async function (label) {
          answers.mortgage = label;
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await showResult();
        },
      },
    ]);
  }

  async function askPayment() {
    await botSay(
      "<p><strong>כמה בערך ההחזר החודשי הכולל?</strong></p><p>סכום גס של כל ההלוואות יחד — בלי צורך בדיוק.</p>"
    );
    setChips(
      [
        { label: "עד 3,000" },
        { label: "3,000–6,000" },
        { label: "6,000–10,000" },
        { label: "מעל 10,000" },
      ].map(function (item, idx) {
        return {
          label: item.label,
          primary: idx === 1,
          onClick: async function (label) {
            answers.payment = label;
            clearReplies();
            addUserBubble(label);
            await sleep(DELAY_NEXT);
            await askMortgage();
          },
        };
      })
    );
  }

  async function askLoans() {
    await botSay(
      "<p><strong>כמה הלוואות פעילות בערך?</strong></p><p>מספר גס מספיק — אנחנו רק מכוונים את הכיוון.</p>"
    );
    setChips([
      {
        label: "1",
        onClick: async function (label) {
          answers.loans = label;
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await askPayment();
        },
      },
      {
        label: "2–3",
        primary: true,
        onClick: async function (label) {
          answers.loans = label;
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await askPayment();
        },
      },
      {
        label: "4+",
        onClick: async function (label) {
          answers.loans = label;
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await askPayment();
        },
      },
    ]);
  }

  async function showResult() {
    await botSay(softResultCopy(), "bubble--result");
    await sleep(DELAY_NEXT);
    showLeadForm();
  }

  async function start() {
    // Try optional local Tamir portrait
    var slot = document.getElementById("tamir-photo-slot");
    var img = new Image();
    img.onload = function () {
      slot.classList.add("has-photo");
      slot.innerHTML = "";
      img.alt = "תמיר גרמה";
      slot.appendChild(img);
    };
    img.src = "assets/img/tamir.jpg";

    await botSay(
      '<p class="hi">אהלן.</p>' +
        "<p>כאן <strong>תמיר גרמה</strong> מ<strong>מניפה פיננסית</strong>.</p>" +
        "<p>כמה הלוואות. החזרים שונים. לחץ כל חודש — זה בדיוק המקום שבו איחוד הלוואות יכול לעזור לנשום קצת יותר.</p>" +
        "<p>נעבור יחד כמה שאלות קצרות — בסוף תקבלו <strong>המחשה בלבד</strong> לכיוון אפשרי. לא הצעה ולא התחייבות.</p>"
    );
    setChips([
      {
        label: "נתחיל בבדיקה",
        primary: true,
        onClick: async function (label) {
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await askLoans();
        },
      },
    ]);
  }

  // Sync floating WA href
  document.querySelectorAll("[data-wa]").forEach(function (a) {
    a.setAttribute("href", WA_URL);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
