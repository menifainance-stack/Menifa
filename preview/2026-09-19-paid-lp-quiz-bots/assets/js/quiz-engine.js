/**
 * Menifa shared quiz engine — sequential bubbles + chips (ichud-sim v2 pattern)
 * Config via window.MENIFA_QUIZ = { product, introHtml, questions[], softResult(answers), footCloser? }
 */
(function () {
  "use strict";

  var WA_URL =
    "https://wa.me/972524502821?text=" +
    encodeURIComponent("שלום, אשמח לתיאום שיחה");

  var WA_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  var cfg = window.MENIFA_QUIZ;
  if (!cfg || !cfg.questions || !cfg.questions.length) {
    console.error("MENIFA_QUIZ config missing");
    return;
  }

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DELAY_SHORT = reduceMotion ? 0 : 400;
  var DELAY_TYPING = reduceMotion ? 0 : 680;
  var DELAY_NEXT = reduceMotion ? 60 : 360;

  var answers = {};
  var qIndex = 0;

  var logEl = document.getElementById("chat-log");
  var repliesEl = document.getElementById("chat-replies");
  var stageEl = document.getElementById("chat-stage");
  var progressEl = document.getElementById("quiz-progress");

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function scrollBottom(opts) {
    opts = opts || {};
    var prefer = opts.prefer || "last"; /* last | replies | bot */
    var target = null;
    if (prefer === "replies" && repliesEl && repliesEl.children.length) {
      target = repliesEl;
    } else if (prefer === "bot") {
      var bots = logEl.querySelectorAll(".bubble--bot");
      target = bots.length ? bots[bots.length - 1] : logEl.lastElementChild;
    } else {
      target = logEl.lastElementChild;
    }
    if (!target) return;
    if (target.classList && target.classList.contains("bubble--bot")) {
      target.classList.add("is-focus-target");
    }
    /* Soft scroll a bit downward into the next question — not a hard jump */
    requestAnimationFrame(function () {
      target.scrollIntoView({
        block: reduceMotion ? "nearest" : "center",
        behavior: reduceMotion ? "auto" : "smooth",
        inline: "nearest",
      });
      /* Extra nudge so chips sit comfortably in view */
      if (!reduceMotion && prefer !== "replies") {
        setTimeout(function () {
          if (repliesEl && repliesEl.children.length) {
            repliesEl.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
              inline: "nearest",
            });
          }
        }, 220);
      }
    });
  }

  function updateProgress(atLead) {
    if (!progressEl) return;
    var n = cfg.questions.length; /* filter Qs */
    var total = n + 1; /* + lead as step 8 */
    var html = "";
    for (var i = 0; i < total; i++) {
      var cls = "";
      if (atLead) {
        cls = i < n ? "done" : "on";
      } else if (i < qIndex) cls = "done";
      else if (i === qIndex) cls = "on";
      html += "<i class=\"" + cls + "\"></i>";
    }
    progressEl.innerHTML = html;
    var step = atLead ? total : Math.min(qIndex + 1, n);
    progressEl.setAttribute("aria-label", "שלב " + step + " מתוך " + total);
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
    scrollBottom({ prefer: "bot" });
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
      btn.className =
        "chip" +
        (item.primary ? " chip--primary" : "") +
        (item.wa ? " chip--wa" : "");
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
    scrollBottom({ prefer: "replies" });
  }

  async function botSay(html, extraClass) {
    var typing = showTyping();
    await sleep(DELAY_TYPING);
    typing.remove();
    addBotBubble(html, extraClass);
    await sleep(DELAY_SHORT);
  }

  function waChip() {
    return {
      label: "וואטסאפ — לתיאום שיחה",
      primary: true,
      wa: true,
      href: WA_URL,
      html: WA_ICON + " וואטסאפ — לתיאום שיחה",
    };
  }

  function showLeadForm() {
    updateProgress(true);
    clearReplies();
    var wrap = document.createElement("div");
    wrap.className = "bubble bubble--bot";
    wrap.innerHTML =
      "<p><strong>שלב אחרון — שם וטלפון</strong></p>" +
      "<p>אחרי הסינון: אפשר להשאיר פרטים או לעבור ישר לוואטסאפ לתיאום שיחה.</p>" +
      '<form class="lead-form" id="lead-form" novalidate>' +
      '<label>שם<input name="name" type="text" autocomplete="name" required placeholder="השם שלכם" /></label>' +
      '<label>טלפון<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="05X-XXXXXXX" dir="ltr" /></label>' +
      '<div class="lead-actions">' +
      '<button type="submit" class="chip chip--primary">שמירה והמשך</button>' +
      "</div></form>";
    logEl.appendChild(wrap);
    scrollBottom();

    setChips([waChip()]);

    var form = document.getElementById("lead-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = String(fd.get("name") || "").trim();
      var phone = String(fd.get("phone") || "").trim();
      if (!name || !phone) return;
      answers.name = name;
      answers.phone = phone;
      form.querySelectorAll("input,button").forEach(function (n) {
        n.disabled = true;
      });
      addUserBubble(name + " · " + phone);
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
    setChips([waChip()]);
  }

  async function showResult() {
    var html =
      typeof cfg.softResult === "function"
        ? cfg.softResult(answers)
        : cfg.softResult || "<p>תודה. אפשר לתאם שיחה קצרה.</p>";
    await botSay(html, "bubble--result");
    await sleep(DELAY_NEXT);
    showLeadForm();
  }

  async function askQuestion(idx) {
    qIndex = idx;
    updateProgress();
    var q = cfg.questions[idx];
    await botSay(
      "<p><strong>" +
        q.title +
        "</strong></p>" +
        (q.sub ? "<p>" + q.sub + "</p>" : "")
    );
    setChips(
      q.chips.map(function (chip, i) {
        return {
          label: chip.label,
          primary: !!chip.primary || i === 0,
          onClick: async function (label) {
            answers[q.id] = label;
            clearReplies();
            addUserBubble(label);
            await sleep(DELAY_NEXT);
            if (idx + 1 < cfg.questions.length) {
              await askQuestion(idx + 1);
            } else {
              qIndex = cfg.questions.length;
              updateProgress();
              await showResult();
            }
          },
        };
      })
    );
  }

  async function start() {
    var slot = document.getElementById("tamir-photo-slot");
    if (slot) {
      var img = new Image();
      img.onload = function () {
        slot.innerHTML = "";
        img.alt = "תמיר גרמה";
        slot.appendChild(img);
      };
      img.onerror = function () {
        /* keep placeholder */
      };
      img.src = cfg.portraitSrc || "../assets/img/tamir.jpg";
    }

    document.querySelectorAll("[data-wa]").forEach(function (a) {
      a.setAttribute("href", WA_URL);
    });

    updateProgress();
    await botSay(cfg.introHtml);
    setChips([
      {
        label: cfg.startLabel || "נתחיל בבדיקה",
        primary: true,
        onClick: async function (label) {
          clearReplies();
          addUserBubble(label);
          await sleep(DELAY_NEXT);
          await askQuestion(0);
        },
      },
    ]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
