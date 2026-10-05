/**
 * AIC-like chat engine · window.MENIFA_AIC
 * Fixes: working Back, stacked history (no overlap), photoreal bg via CSS
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
  var qIndex = -1;
  var phase = "intro"; /* intro | ask | result */
  var busy = false;
  /* each turn: { qIdx, botNodes:[], userNode, timeNode, answerKey, answerVal } */
  var turns = [];
  var introNodes = [];

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
    /* Soft nudge toward latest bot card — conversation advance, not hard jump */
    requestAnimationFrame(function () {
      if (!logEl) return;
      var reduceMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var bots = logEl.querySelectorAll(".aic-card");
      var target = bots.length ? bots[bots.length - 1] : logEl.lastElementChild;
      if (!target) return;
      target.classList.add("aic-focus");
      try {
        target.scrollIntoView({
          block: reduceMotion ? "nearest" : "center",
          behavior: reduceMotion ? "auto" : "smooth",
          inline: "nearest",
        });
      } catch (e) {
        logEl.scrollTop = logEl.scrollHeight;
      }
      /* Extra soft nudge so docked chips stay comfortable */
      if (!reduceMotion) {
        setTimeout(function () {
          var dock = document.querySelector(".aic-dock");
          if (dock) {
            dock.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
          }
        }, 220);
      }
    });
  }
  function updateBack() {
    if (!backBtn) return;
    /* Show Back only when there is a previous answered step to restore */
    var answered = 0;
    for (var i = 0; i < turns.length; i++) {
      if (!turns[i].pending && !turns[i].isResult) answered++;
    }
    var can =
      (phase === "ask" && (answered > 0 || turns.length > 1)) ||
      phase === "result";
    backBtn.hidden = !can;
  }
  function clearReplies() {
    if (repliesEl) repliesEl.innerHTML = "";
    if (hintEl) hintEl.textContent = "";
  }
  function setHint(t) {
    if (hintEl) hintEl.textContent = t || "";
  }

  function addBotCard(html, trackArr) {
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
    if (trackArr) {
      trackArr.push(card);
      trackArr.push(time);
    }
    scrollEnd();
    return { card: card, time: time };
  }

  function addUser(text) {
    var el = document.createElement("div");
    el.className = "aic-user";
    el.textContent = text;
    logEl.appendChild(el);
    scrollEnd();
    return el;
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
          if (busy) return;
          item.onClick(item.label);
        });
      }
      repliesEl.appendChild(b);
    });
    scrollEnd();
  }

  function setInput(kind, placeholder, onSubmit) {
    clearReplies();
    setHint(
      kind === "number"
        ? "בבקשה להזין סכום מלא ללא פסיקים וללחוץ על שליחה"
        : "ללחוץ על שליחה"
    );
    var row = document.createElement("form");
    row.className = "aic-input-row";
    row.innerHTML =
      '<input name="v" type="' +
      (kind === "number" ? "number" : "text") +
      '" ' +
      (kind === "number" ? 'inputmode="numeric" ' : "") +
      'required placeholder="' +
      (placeholder || "הקלד כאן...") +
      '" autocomplete="off" />' +
      '<button type="submit" class="aic-send" aria-label="שליחה">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>' +
      "</button>";
    repliesEl.appendChild(row);
    row.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var v = String(new FormData(row).get("v") || "").trim();
      if (!v) return;
      onSubmit(v);
    });
    var inp = row.querySelector("input");
    if (inp) inp.focus();
    scrollEnd();
  }

  async function ask(idx) {
    phase = "ask";
    qIndex = idx;
    updateBack();
    var q = cfg.questions[idx];
    var botNodes = [];
    addBotCard(
      "<p><strong>" +
        q.title +
        "</strong></p>" +
        (q.sub ? "<p>" + q.sub + "</p>" : ""),
      botNodes
    );
    /* stash open turn (answer filled on advance) */
    turns.push({
      qIdx: idx,
      botNodes: botNodes,
      userNode: null,
      answerKey: q.id,
      answerVal: null,
      pending: true,
    });
    await sleep(200);
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
    if (busy) return;
    busy = true;
    try {
      var q = cfg.questions[idx];
      answers[q.id] = label;
      clearReplies();
      var userNode = addUser(label);
      /* close pending turn */
      var turn = turns[turns.length - 1];
      if (turn && turn.pending && turn.qIdx === idx) {
        turn.userNode = userNode;
        turn.answerVal = label;
        turn.pending = false;
      }
      await sleep(260);
      if (idx + 1 < cfg.questions.length) {
        busy = false;
        await ask(idx + 1);
      } else {
        busy = false;
        await showResult();
      }
    } catch (err) {
      busy = false;
      console.error(err);
    }
  }

  async function showResult() {
    phase = "result";
    updateBack();
    var html =
      typeof cfg.softResult === "function"
        ? cfg.softResult(answers)
        : cfg.softResult || "";
    var parts = String(html).split("<!--card-->");
    var resultNodes = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      addBotCard(parts[i], resultNodes);
      await sleep(280);
    }
    turns.push({
      qIdx: -1,
      botNodes: resultNodes,
      userNode: null,
      answerKey: "__result",
      answerVal: null,
      pending: false,
      isResult: true,
    });
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
      setChips([{ label: "וואטסאפ — לתיאום שיחה", href: WA }]);
      setHint("");
      if (backBtn) backBtn.hidden = true;
    });
  }

  function removeNodes(nodes) {
    (nodes || []).forEach(function (n) {
      if (n && n.parentNode) n.parentNode.removeChild(n);
    });
  }

  async function goBack() {
    if (busy) return;
    if (phase === "result") {
      /* peel result turn, restore last question */
      busy = true;
      var last = turns.pop();
      if (last && last.isResult) {
        removeNodes(last.botNodes);
        if (last.userNode && last.userNode.parentNode) {
          last.userNode.parentNode.removeChild(last.userNode);
        }
      }
      /* also remove pending phone user if any — handled above */
      clearReplies();
      /* re-open last answered question: remove its user bubble + answer, re-ask */
      var prev = turns[turns.length - 1];
      if (prev && !prev.pending) {
        if (prev.userNode && prev.userNode.parentNode) {
          prev.userNode.parentNode.removeChild(prev.userNode);
        }
        if (prev.answerKey) delete answers[prev.answerKey];
        removeNodes(prev.botNodes);
        turns.pop();
        busy = false;
        await ask(prev.qIdx);
        return;
      }
      busy = false;
      updateBack();
      return;
    }

    if (phase !== "ask") return;
    busy = true;
    clearReplies();

    var cur = turns[turns.length - 1];
    if (cur && cur.pending) {
      /* remove unanswered question card, restore previous */
      removeNodes(cur.botNodes);
      turns.pop();
      var prev2 = turns[turns.length - 1];
      if (prev2 && !prev2.pending) {
        if (prev2.userNode && prev2.userNode.parentNode) {
          prev2.userNode.parentNode.removeChild(prev2.userNode);
        }
        if (prev2.answerKey) delete answers[prev2.answerKey];
        removeNodes(prev2.botNodes);
        var idx = prev2.qIdx;
        turns.pop();
        busy = false;
        if (idx >= 0) await ask(idx);
        else {
          phase = "intro";
          updateBack();
        }
        return;
      }
      /* back to intro */
      busy = false;
      phase = "intro";
      qIndex = -1;
      updateBack();
      setHint("בחר אפשרות");
      /* if lockProduct, re-ask q0 */
      if (cfg.lockProduct) {
        await ask(0);
      }
      return;
    }

    busy = false;
    updateBack();
  }

  if (backBtn) {
    backBtn.addEventListener("click", function (e) {
      e.preventDefault();
      goBack();
    });
  }

  async function start() {
    phase = "intro";
    addBotCard(cfg.introHtml, introNodes);
    await sleep(280);
    if (cfg.lockProduct) {
      await ask(0);
      return;
    }
    updateBack();
    setChips(
      (cfg.openerChips || []).map(function (c) {
        return {
          label: c.label,
          onClick: async function (label) {
            answers.interest = label;
            clearReplies();
            addUser(label);
            await sleep(260);
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
