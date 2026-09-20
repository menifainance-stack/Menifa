/**
 * AIC-like chat engine · config: window.MENIFA_AIC
 * { product, introHtml, questions[], softResult(answers), portraitSrc?, startLabel? }
 * question: { id, title, sub?, chips?[{label}], input?:"number"|"text", placeholder? }
 */
(function () {
  "use strict";
  var cfg = window.MENIFA_AIC;
  if (!cfg || !cfg.questions) {
    console.error("MENIFA_AIC missing");
    return;
  }
  var WA =
    "https://wa.me/972524502821?text=" +
    encodeURIComponent("שלום, אשמח לתיאום שיחה");
  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var answers = {};
  var stack = []; /* history of question indices for back */
  var qIndex = -1;
  var logEl = document.getElementById("aic-log");
  var repliesEl = document.getElementById("aic-replies");
  var backBtn = document.getElementById("aic-back");
  var hintEl = document.getElementById("aic-hint");

  function sleep(ms) {
    return new Promise(function (r) {
      setTimeout(r, reduce ? 0 : ms);
    });
  }
  function nowTime() {
    var d = new Date();
    return (
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  }
  function scrollEnd() {
    requestAnimationFrame(function () {
      var t = logEl.lastElementChild;
      if (t) t.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
      if (repliesEl && repliesEl.children.length) {
        setTimeout(function () {
          repliesEl.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
        }, 180);
      }
    });
  }
  function clearReplies() {
    repliesEl.innerHTML = "";
    if (hintEl) hintEl.textContent = "";
  }
  function addBotCard(html) {
    var card = document.createElement("div");
    card.className = "aic-card";
    var portrait = cfg.portraitSrc || "../assets/img/tamir.jpg";
    card.innerHTML =
      '<div class="aic-card__row">' +
      '<img class="aic-avatar" src="' +
      portrait +
      '" alt="תמיר גרמה" onerror="this.className=\'aic-badge\';this.removeAttribute(\'src\');this.textContent=\'מניפה\';" />' +
      '<div class="aic-card__body">' +
      html +
      "</div></div>";
    logEl.appendChild(card);
    var time = document.createElement("div");
    time.className = "aic-time";
    time.textContent = nowTime();
    logEl.appendChild(time);
    scrollEnd();
  }
  function addUser(text) {
    var el = document.createElement("div");
    el.className = "aic-user";
    el.textContent = text;
    logEl.appendChild(el);
    scrollEnd();
  }
  function setHint(t) {
    if (hintEl) hintEl.textContent = t || "";
  }
  function setChips(items) {
    clearReplies();
    setHint("בחר אפשרות");
    items.forEach(function (item) {
      var b = document.createElement(item.href ? "a" : "button");
      b.className = "aic-chip";
      if (item.href) {
        b.href = item.href;
        b.target = "_blank";
        b.rel = "noopener noreferrer";
      } else b.type = "button";
      b.textContent = item.label;
      if (item.onClick) {
        b.addEventListener("click", function (e) {
          if (!item.href) e.preventDefault();
          item.onClick(item.label);
        });
      }
      repliesEl.appendChild(b);
    });
    scrollEnd();
  }
  function setInput(kind, placeholder, onSubmit) {
    clearReplies();
    setHint(kind === "number" ? "בבקשה להזין סכום מלא ללא פסיקים וללחוץ על לשליחה" : "ללחוץ על לשליחה");
    var row = document.createElement("form");
    row.className = "aic-input-row";
    row.innerHTML =
      '<input name="v" type="' +
      (kind === "number" ? "number" : "text") +
      '" ' +
      (kind === "number" ? 'inputmode="numeric" ' : "") +
      'required placeholder="' +
      (placeholder || "הקלד כאן...") +
      '" />' +
      '<button type="submit" class="aic-send" aria-label="שליחה">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>' +
      "</button>";
    repliesEl.appendChild(row);
    row.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = String(new FormData(row).get("v") || "").trim();
      if (!v) return;
      onSubmit(v);
    });
    row.querySelector("input").focus();
    scrollEnd();
  }

  async function ask(idx) {
    qIndex = idx;
    if (backBtn) backBtn.hidden = idx < 0;
    var q = cfg.questions[idx];
    addBotCard(
      "<p><strong>" +
        q.title +
        "</strong></p>" +
        (q.sub ? "<p>" + q.sub + "</p>" : "")
    );
    await sleep(220);
    if (q.input === "number" || q.input === "text") {
      setInput(q.input, q.placeholder, function (v) {
        advance(idx, v);
      });
      return;
    }
    setChips(
      (q.chips || []).map(function (c) {
        return {
          label: c.label,
          onClick: function (label) {
            advance(idx, label);
          },
        };
      })
    );
  }

  async function advance(idx, label) {
    answers[cfg.questions[idx].id] = label;
    stack.push(idx);
    clearReplies();
    addUser(label);
    await sleep(280);
    if (idx + 1 < cfg.questions.length) {
      await ask(idx + 1);
    } else {
      await showResult();
    }
  }

  async function showResult() {
    if (backBtn) backBtn.hidden = true;
    var html =
      typeof cfg.softResult === "function"
        ? cfg.softResult(answers)
        : cfg.softResult || "";
    /* split into cards by <!--card--> */
    var parts = String(html).split("<!--card-->");
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      addBotCard(parts[i]);
      await sleep(320);
    }
    setHint("לאיזה מספר לחזור אליך?");
    setInput("text", "הקלד טלפון כאן...", function (phone) {
      answers.phone = phone;
      clearReplies();
      addUser(phone);
      addBotCard(
        "<p>תודה" +
          (answers.name ? ", " + answers.name : "") +
          ". אפשר גם לתאם עכשיו בוואטסאפ — בלי התחייבות.</p>"
      );
      setChips([
        {
          label: "וואטסאפ — לתיאום שיחה",
          href: WA,
        },
      ]);
      setHint("");
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      /* soft back: reload flow from start for simplicity */
      location.reload();
    });
  }

  async function start() {
    addBotCard(cfg.introHtml);
    await sleep(300);
    if (cfg.lockProduct) {
      /* skip product picker — go to Q0 */
      await ask(0);
      return;
    }
    setChips(
      (cfg.openerChips || []).map(function (c) {
        return {
          label: c.label,
          onClick: async function (label) {
            answers.interest = label;
            clearReplies();
            addUser(label);
            await sleep(280);
            await ask(0);
          },
        };
      })
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else start();
})();
