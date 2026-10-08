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
  if (window.menifaArmPixel) window.menifaArmPixel(cfg.meta_pixel || "");
  var WA =
    "https://wa.me/972524502821?text=" +
    encodeURIComponent("שלום, אשמח לתיאום שיחה");
  /* Same Make webhook as live assets/site.js. form-urlencoded, no-cors. */
  var LEAD_WEBHOOK = "https://hook.us2.make.com/9pclkzy81xfnlh1nfyista793l9hbdig";
  var SOURCE = {
    ihud: "q-ihud",
    mihzur: "q-mihzur"
  };
  var NEED = {
    ihud: "ihud",
    mihzur: "mihzur"
  };
  var ATT_FIELDS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "gclid", "gbraid", "wbraid", "fbclid", "landing", "referrer"
  ];
  var leadSent = false;
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
    var portrait = cfg.portraitSrc || "/q/assets/img/tamir.jpg";
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

  /* A run of digits, ranges, plus, and ₪. Hebrew letters stay outside it. */
  var LTR_RUN = /[0-9+\u2013\u2014\-₪,.\s]*[0-9][0-9+\u2013\u2014\-₪,.\s]*/g;
  function fillLabel(el, label) {
    label = String(label || "");
    LTR_RUN.lastIndex = 0;
    if (!LTR_RUN.test(label)) {
      el.textContent = label;
      return;
    }
    LTR_RUN.lastIndex = 0;
    var last = 0;
    var match;
    while ((match = LTR_RUN.exec(label))) {
      if (match.index > last) {
        el.appendChild(document.createTextNode(label.slice(last, match.index)));
      }
      var bdi = document.createElement("bdi");
      bdi.dir = "ltr";
      bdi.textContent = match[0];
      el.appendChild(bdi);
      last = match.index + match[0].length;
    }
    if (last < label.length) {
      el.appendChild(document.createTextNode(label.slice(last)));
    }
  }

  function addUser(text) {
    var el = document.createElement("div");
    el.className = "aic-user";
    fillLabel(el, text);
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
      fillLabel(b, item.label);
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
    setPhoneForm();
  }

  function validPhone(raw) {
    var trimmed = String(raw || "").trim();
    var nospace = trimmed.replace(/\s/g, "");
    return /^0?5\d[-\s]?\d{3}[-\s]?\d{4}$/.test(nospace) || /^\+?972/.test(trimmed);
  }

  function answersSummary() {
    var parts = [];
    Object.keys(answers).forEach(function (k) {
      if (k === "phone") return;
      parts.push(k + ": " + answers[k]);
    });
    return parts.join(" | ");
  }

  function fallbackIds() {
    return {
      event_id: "lead_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      fbp: "",
      fbc: ""
    };
  }

  /* Make gets the quiz summary. Meta gets only a Lead event id — no answers. */
  function postLead(phone, marketing) {
    var ids = window.menifaIds ? window.menifaIds() : fallbackIds();
    var source = SOURCE[cfg.product] || "";
    var page = location.pathname;
    var att = {};
    try { att = JSON.parse(sessionStorage.getItem("menifa-att") || "{}"); } catch (e) {}
    var data = {
      phone: phone,
      name: answers.name || "",
      consent: "כן",
      marketing: marketing ? "כן" : "לא",
      page: page,
      source: source,
      event_id: ids.event_id,
      fbp: ids.fbp || "",
      fbc: ids.fbc || "",
      ts: new Date().toISOString(),
      need: NEED[cfg.product] || "",
      answers: answersSummary(),
      ua: navigator.userAgent,
      event_source_url: location.origin + location.pathname,
      cookie_marketing: cookieMarketingLabel()
    };
    ATT_FIELDS.forEach(function (k) {
      data[k] = att[k] == null ? "" : String(att[k]);
    });
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      body.append(k, v == null ? "" : String(v));
    });
    fetch(LEAD_WEBHOOK, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      body: body
    }).then(function () {
      if (window.menifaTrackLead) window.menifaTrackLead(ids.event_id);
    }).catch(function () {});
  }

  function cookieMarketingLabel() {
    try {
      var stored = JSON.parse(localStorage.getItem("menifa-consent") || "null");
      return stored && stored.marketing ? "כן" : "לא";
    } catch (e) {
      return "לא";
    }
  }

  function setPhoneForm() {
    clearReplies();
    var form = document.createElement("form");
    form.className = "aic-phone";
    form.noValidate = true;

    var consent = document.createElement("label");
    consent.className = "aic-consent";
    var consentBox = document.createElement("input");
    consentBox.type = "checkbox";
    consentBox.name = "consent";
    var consentText = document.createElement("span");
    consentText.appendChild(document.createTextNode("אני מאשר/ת שמניפה פיננסית תחזור אליי בטלפון או בוואטסאפ בנוגע לפנייה, ושקראתי את "));
    var privacy = document.createElement("a");
    privacy.href = "https://menifa.org/privacy.html";
    privacy.target = "_blank";
    privacy.rel = "noopener noreferrer";
    privacy.textContent = "מדיניות הפרטיות";
    consentText.appendChild(privacy);
    consentText.appendChild(document.createTextNode(". הפרטים ישמשו רק לטיפול בפנייה."));
    consent.appendChild(consentBox);
    consent.appendChild(consentText);

    var marketing = document.createElement("label");
    marketing.className = "aic-consent";
    var marketingBox = document.createElement("input");
    marketingBox.type = "checkbox";
    marketingBox.name = "marketing";
    var marketingText = document.createElement("span");
    marketingText.textContent = "אשמח לקבל עדכונים מקצועיים ותוכן שיווקי (לא חובה, אפשר להסיר בכל עת).";
    marketing.appendChild(marketingBox);
    marketing.appendChild(marketingText);

    var row = document.createElement("div");
    row.className = "aic-input-row";
    var input = document.createElement("input");
    input.name = "phone";
    input.type = "tel";
    input.inputMode = "tel";
    input.autocomplete = "tel";
    input.placeholder = "050-0000000";
    input.dir = "ltr";
    input.setAttribute("aria-label", "טלפון");
    var send = document.createElement("button");
    send.type = "submit";
    send.className = "aic-send";
    send.setAttribute("aria-label", "שליחה");
    send.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
    row.appendChild(input);
    row.appendChild(send);

    var err = document.createElement("p");
    err.className = "aic-form-err";
    err.setAttribute("role", "alert");

    form.appendChild(consent);
    form.appendChild(marketing);
    form.appendChild(row);
    form.appendChild(err);
    repliesEl.appendChild(form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy || leadSent) return;
      var phone = String(input.value || "").trim();
      if (!consentBox.checked) {
        err.textContent = "כדי שתמיר יוכל לחזור אליכם יש לאשר את מדיניות הפרטיות.";
        consentBox.focus();
        return;
      }
      if (!validPhone(phone)) {
        err.textContent = "נא למלא מספר נייד תקין, לדוגמה 050-1234567.";
        input.focus();
        return;
      }
      err.textContent = "";
      leadSent = true;
      answers.phone = phone;
      postLead(phone, marketingBox.checked);
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
    scrollEnd();
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
