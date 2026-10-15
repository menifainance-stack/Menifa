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
  /* Same Make webhook as live assets/site.js. form-urlencoded, cors. Lead only on a 2xx response. */
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
  window.MENIFA_QUIZ_STEP = -1;
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

  var quizStarted = false;
  function quizName() {
    return cfg.product === "ihud" || cfg.product === "mihzur" ? cfg.product : "";
  }
  function trackQuiz(name, extra) {
    if (!window.menifaTrack) return;
    if (name === "quiz_step") {
      window.menifaTrack("quiz_step", { step_number: extra && extra.step_number });
      return;
    }
    window.menifaTrack(name, { quiz: quizName() });
  }

  async function ask(idx) {
    phase = "ask";
    qIndex = idx;
    window.MENIFA_QUIZ_STEP = qIndex;
    if (!quizStarted) {
      quizStarted = true;
      trackQuiz("quiz_start");
    }
    trackQuiz("quiz_step", { step_number: idx + 1 });
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
    trackQuiz("quiz_complete");
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

  function quizFormVersion() {
    var path = '';
    try { path = location.pathname || ''; } catch (e) { path = ''; }
    if (path.indexOf('/q/mihzur') !== -1) return 'q-mihzur-v1';
    if (path.indexOf('/q/ihud') !== -1) return 'q-ihud-v1';
    var parts = String(path).split('/').filter(function (part) { return part; });
    var last = parts.length ? parts[parts.length - 1] : 'quiz';
    last = last.replace(/\.html$/i, '');
    try { last = decodeURIComponent(last); } catch (e2) {}
    if (!last) last = 'quiz';
    return 'q-' + last + '-v1';
  }

  var LEAD_QUEUE_KEY = "menifa-lead-queue";
  var SENT_KEY = "menifa-lead-sent";
  var LOCK_KEY = "menifa-lead-lock";
  var QUEUE_TTL = 48 * 60 * 60 * 1000;
  var LOCK_MS = 30000;
  var MAX_ATTEMPTS = 3;
  var RETRY_MS = 500;
  var QUEUE_ALLOW = {
    name: 1, phone: 1, source: 1, landing_page: 1, page: 1, need: 1,
    consent: 1, marketing: 1,
    gclid: 1, gbraid: 1, wbraid: 1,
    event_id: 1, ts: 1, form_version: 1, referrer: 1
  };
  var lockOwner = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function queueKeyAllowed(k) {
    if (!k || k === "[]" || /^q\d+$/.test(k)) return false;
    if (k.indexOf("utm_") === 0) return true;
    return !!QUEUE_ALLOW[k];
  }
  var TRACK_KEYS = {
    form_id: 1, lead_uuid: 1, page_path: 1, landing_page_path: 1,
    utm_source: 1, utm_medium: 1, utm_campaign: 1, utm_content: 1, utm_term: 1
  };

  function filled(v) { return v != null && String(v).trim() !== ""; }

  function referrerHost() {
    var raw = "";
    try { raw = document.referrer || ""; } catch (e) { raw = ""; }
    if (!raw) return "direct";
    try {
      var host = new URL(raw).hostname;
      return host || "direct";
    } catch (e2) {
      var loose = String(raw).replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split("/")[0].split("?")[0].split("#")[0];
      return loose || "direct";
    }
  }

  /* In-memory copy. FB/IG in-app browsers throw on sessionStorage; click ids still reach Make. */
  var attMem = {};
  function readAtt() {
    try {
      var parsed = JSON.parse(sessionStorage.getItem("menifa-att") || "{}");
      if (parsed && typeof parsed === "object") {
        Object.keys(parsed).forEach(function (k) {
          if (!filled(parsed[k])) return;
          if (k === "utm_source" && String(parsed[k]) === "direct/unknown") return;
          attMem[k] = parsed[k];
        });
      }
    } catch (e) {}
    return attMem;
  }
  function captureClickIds() {
    var current = {};
    try {
      var parsed = JSON.parse(sessionStorage.getItem("menifa-att") || "{}");
      if (parsed && typeof parsed === "object") current = parsed;
    } catch (e) {}
    Object.keys(current).forEach(function (k) {
      if (!filled(current[k]) || filled(attMem[k])) return;
      if (k === "utm_source" && String(current[k]) === "direct/unknown") return;
      attMem[k] = current[k];
    });
    var qp;
    try { qp = new URLSearchParams(location.search || ""); } catch (e2) { qp = new URLSearchParams(); }
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid"].forEach(function (k) {
      var v = "";
      try { v = qp.get(k) || ""; } catch (e3) { v = ""; }
      if (filled(v)) attMem[k] = v;
    });
    Object.keys(attMem).forEach(function (k) {
      if (!filled(attMem[k])) return;
      if (k === "utm_source" && String(attMem[k]) === "direct/unknown") return;
      current[k] = attMem[k];
    });
    if (String(current.utm_source) === "direct/unknown") delete current.utm_source;
    try { sessionStorage.setItem("menifa-att", JSON.stringify(current)); } catch (e4) {}
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function pruneSent(map) {
    var now = Date.now();
    var out = {};
    Object.keys(map || {}).forEach(function (id) {
      var t = map[id];
      if (typeof t === "number" && (now - t) < QUEUE_TTL) out[id] = t;
    });
    return out;
  }
  function readSentMap() {
    try {
      var parsed = JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return pruneSent(parsed);
    } catch (e) { return {}; }
  }
  function writeSentMap(map) {
    try { localStorage.setItem(SENT_KEY, JSON.stringify(pruneSent(map))); return true; }
    catch (e) { return false; }
  }
  function markSent(eventId) {
    if (!eventId) return;
    var map = readSentMap();
    map[String(eventId)] = Date.now();
    writeSentMap(map);
  }
  function wasSent(eventId) {
    if (!eventId) return false;
    return !!readSentMap()[String(eventId)];
  }
  function readLocks() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch (e) { return {}; }
  }
  function writeLocks(map) {
    try {
      if (!map || !Object.keys(map).length) {
        localStorage.removeItem(LOCK_KEY);
        return true;
      }
      localStorage.setItem(LOCK_KEY, JSON.stringify(map));
      return true;
    } catch (e) { return false; }
  }
  function lockFresh(entry) {
    return !!(entry && entry.owner && typeof entry.ts === "number" && (Date.now() - entry.ts) < LOCK_MS);
  }
  function claimLock(eventId) {
    return new Promise(function (resolve) {
      var id = String(eventId || "");
      if (!id) { resolve(true); return; }
      var token = lockOwner + ":" + Date.now().toString(36) + ":" + Math.random().toString(36).slice(2);
      var map = readLocks();
      var cur = map[id];
      if (lockFresh(cur) && cur.owner !== lockOwner) { resolve(false); return; }
      map[id] = { owner: lockOwner, token: token, ts: Date.now() };
      if (!writeLocks(map)) { resolve(true); return; }
      try {
        if (window.BroadcastChannel) {
          var ch = new BroadcastChannel("menifa-lead-lock");
          ch.postMessage({ eventId: id, token: token, ts: Date.now() });
          ch.close();
        }
      } catch (e) {}
      setTimeout(function () {
        var again = readLocks()[id];
        resolve(!!(again && again.token === token));
      }, 50 + Math.floor(Math.random() * 40));
    });
  }
  function releaseLock(eventId) {
    var id = String(eventId || "");
    if (!id) return;
    var map = readLocks();
    var cur = map[id];
    if (cur && cur.owner === lockOwner) {
      delete map[id];
      writeLocks(map);
    }
  }
  function pickQueueFields(data) {
    var fields = {};
    Object.keys(data || {}).forEach(function (k) {
      if (!queueKeyAllowed(k)) return;
      var raw = data[k];
      if (Array.isArray(raw)) {
        if (!raw.length) return;
        fields[k] = raw.join(" | ");
        return;
      }
      if (raw === true) { fields[k] = "כן"; return; }
      if (raw === false) { fields[k] = "לא"; return; }
      if (raw == null) return;
      var s = String(raw);
      if (s === "" || s === "[]") return;
      fields[k] = s;
    });
    return fields;
  }
  function fieldsFromBody(body) {
    var fields = {};
    try {
      body.forEach(function (v, k) { fields[k] = v; });
    } catch (e) {}
    return pickQueueFields(fields);
  }
  function cleanTrack(track) {
    var clean = {};
    Object.keys(TRACK_KEYS).forEach(function (k) {
      if (!filled(track && track[k])) return;
      if (k === "utm_source" && String(track[k]) === "direct/unknown") return;
      clean[k] = String(track[k]).slice(0, 120);
    });
    return clean;
  }
  function normalizeQueue(items) {
    var now = Date.now();
    var kept = [];
    (items || []).forEach(function (item) {
      if (!item || typeof item !== "object") return;
      if (item.body && !item.fields) return;
      if (!item.event_id || !item.fields) return;
      if (wasSent(item.event_id)) return;
      var savedAt = typeof item.savedAt === "number" ? item.savedAt : 0;
      if (!savedAt || (now - savedAt) > QUEUE_TTL) return;
      var attempts = typeof item.attempts === "number" ? item.attempts : 0;
      if (attempts >= MAX_ATTEMPTS) return;
      kept.push({
        event_id: String(item.event_id),
        savedAt: savedAt,
        attempts: attempts,
        fields: pickQueueFields(item.fields),
        track: cleanTrack(item.track)
      });
    });
    return kept;
  }
  function readLeadQueue() {
    var items = [];
    try {
      var parsed = JSON.parse(localStorage.getItem(LEAD_QUEUE_KEY) || "[]");
      items = Array.isArray(parsed) ? parsed : [];
    } catch (e) { items = []; }
    var kept = normalizeQueue(items);
    writeLeadQueue(kept);
    return kept;
  }
  function writeLeadQueue(items) {
    try {
      if (!items || !items.length) {
        localStorage.removeItem(LEAD_QUEUE_KEY);
        return true;
      }
      localStorage.setItem(LEAD_QUEUE_KEY, JSON.stringify(items));
      return true;
    } catch (e) { return false; }
  }
  function enqueueLead(data, track) {
    try {
      if (!data || !data.event_id || wasSent(data.event_id)) return false;
      var q = readLeadQueue().filter(function (item) { return item.event_id !== String(data.event_id); });
      q.push({
        event_id: String(data.event_id),
        savedAt: Date.now(),
        attempts: 0,
        fields: pickQueueFields(data),
        track: cleanTrack(track)
      });
      return writeLeadQueue(q);
    } catch (e) { return false; }
  }
  function bodyFromFields(fields) {
    var body = new URLSearchParams();
    Object.keys(fields || {}).forEach(function (k) {
      if (!queueKeyAllowed(k)) return;
      var v = fields[k];
      if (Array.isArray(v)) {
        if (!v.length) return;
        v = v.join(" | ");
      }
      if (v == null) return;
      var s = String(v);
      if (s === "[]") return;
      body.append(k, s);
    });
    return body;
  }

  function trackParams(ids, source, page, att) {
    var landing = filled(att.landing_page) ? att.landing_page : (filled(att.landing) ? att.landing : page);
    try { if (/^https?:/i.test(landing)) landing = new URL(landing).pathname; } catch (err) {}
    var out = {
      form_id: source,
      lead_uuid: ids.event_id,
      page_path: page,
      landing_page_path: String(landing).split("?")[0].split("#")[0] || page
    };
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      if (!filled(att[k])) return;
      if (k === "utm_source" && String(att[k]) === "direct/unknown") return;
      out[k] = String(att[k]);
    });
    return out;
  }

  /* Lead and GA only after a real 2xx. Params stay on the allowlist — no phone, name, or answers. */
  function fireLeadEvents(track, eventId) {
    var clean = cleanTrack(track);
    if (window.menifaTrack) window.menifaTrack("form_submit_success", clean);
    if (window.menifaTrackLead && eventId) window.menifaTrackLead(eventId);
  }

  function postOnce(body) {
    return fetch(LEAD_WEBHOOK, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      body: body
    }).then(function (res) {
      if (!res || !res.ok) throw new Error("http");
      return res;
    });
  }

  function postWithRetry(body, eventId) {
    var encoded = body.toString();
    function once() { return postOnce(new URLSearchParams(encoded)); }
    return claimLock(eventId).then(function (got) {
      if (!got) throw new Error("locked");
      return once().catch(function () { return wait(RETRY_MS).then(once); });
    }).then(function (res) {
      releaseLock(eventId);
      return res;
    }, function (err) {
      releaseLock(eventId);
      throw err;
    });
  }

  function flushLeadQueue() {
    if (window.__menifaLeadFlushing) return;
    window.__menifaLeadFlushing = true;
    function step() {
      var rest = readLeadQueue();
      if (!rest.length) { window.__menifaLeadFlushing = false; return; }
      var item = rest[0];
      if (wasSent(item.event_id)) {
        writeLeadQueue(rest.slice(1));
        step();
        return;
      }
      claimLock(item.event_id).then(function (got) {
        if (!got) { window.__menifaLeadFlushing = false; return; }
        if (wasSent(item.event_id)) {
          releaseLock(item.event_id);
          writeLeadQueue(readLeadQueue().filter(function (x) { return x.event_id !== item.event_id; }));
          step();
          return;
        }
        var curQ = readLeadQueue();
        var idx = -1;
        curQ.forEach(function (x, i) { if (x.event_id === item.event_id) idx = i; });
        if (idx === -1) { releaseLock(item.event_id); step(); return; }
        var current = curQ[idx];
        current.attempts = (current.attempts || 0) + 1;
        if (current.attempts > MAX_ATTEMPTS) {
          curQ.splice(idx, 1);
          writeLeadQueue(curQ);
          releaseLock(item.event_id);
          step();
          return;
        }
        curQ[idx] = current;
        writeLeadQueue(curQ);
        var eventId = current.event_id;
        postOnce(bodyFromFields(current.fields)).then(function () {
          markSent(eventId);
          releaseLock(eventId);
          writeLeadQueue(readLeadQueue().filter(function (x) { return x.event_id !== eventId; }));
          fireLeadEvents(current.track, eventId);
          step();
        }).catch(function () {
          releaseLock(eventId);
          if (current.attempts >= MAX_ATTEMPTS) {
            writeLeadQueue(readLeadQueue().filter(function (x) { return x.event_id !== eventId; }));
          }
          window.__menifaLeadFlushing = false;
        });
      });
    }
    step();
  }

  /* Make gets the quiz summary. Meta gets only a Lead event id — no answers. */
  function postLead(phone, marketing) {
    var ids = window.menifaIds ? window.menifaIds() : fallbackIds();
    var source = SOURCE[cfg.product] || referrerHost();
    var page = location.pathname;
    var att = readAtt();
    var data = {
      phone: phone,
      name: answers.name || "",
      consent: "כן",
      marketing: marketing ? "כן" : "לא",
      page: page,
      source: source,
      event_id: ids.event_id,
      form_version: quizFormVersion(),
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
      if (filled(att[k])) data[k] = String(att[k]);
    });
    data.landing_page = page;
    if (!filled(data.landing)) data.landing = page;
    if (!filled(data.referrer)) data.referrer = referrerHost();
    if (!filled(data.utm_source)) data.utm_source = "direct/unknown";
    if (!filled(data.source)) data.source = referrerHost();
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (!k || k === "[]") return;
      if (Array.isArray(v)) {
        if (!v.length) return;
        v = v.join(" | ");
      }
      if (v == null || v === "" || v === "[]") return;
      body.append(k, String(v));
    });
    var track = trackParams(ids, source, page, {
      landing: data.landing,
      landing_page: data.landing_page,
      utm_source: att.utm_source,
      utm_medium: att.utm_medium,
      utm_campaign: att.utm_campaign,
      utm_content: att.utm_content,
      utm_term: att.utm_term
    });
    var queuedFields = fieldsFromBody(body);
    return postWithRetry(body, ids.event_id).then(function () {
      markSent(ids.event_id);
      fireLeadEvents(track, ids.event_id);
      return "sent";
    }).catch(function () {
      var queued = enqueueLead(queuedFields, track);
      return queued ? "queued" : "failed";
    });
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
      busy = true;
      answers.phone = phone;
      setHint("שולחים את הפרטים...");
      send.disabled = true;
      postLead(phone, marketingBox.checked).then(function (result) {
        busy = false;
        clearReplies();
        addUser(phone);
        if (result === "sent") {
          addBotCard(
            "<p>תודה" +
              (answers.name ? ", " + answers.name : "") +
              ". אפשר גם לתאם עכשיו בוואטסאפ — בלי התחייבות.</p>"
          );
        } else if (result === "queued") {
          addBotCard(
            "<p>הפרטים לא נשלחו עכשיו. שמרנו אותם במכשיר לזמן קצר, וננסה לשלוח אותם שוב.</p>" +
            "<p>אפשר לתאם שיחה בוואטסאפ, בלי התחייבות.</p>"
          );
        } else {
          addBotCard(
            "<p>הפרטים לא נשלחו עכשיו. אפשר לתאם שיחה בוואטסאפ, בלי התחייבות.</p>"
          );
        }
        setChips([{ label: "וואטסאפ — לתיאום שיחה", href: WA }]);
        setHint("");
        if (backBtn) backBtn.hidden = true;
      }, function () {
        busy = false;
        leadSent = false;
        send.disabled = false;
        err.textContent = "הפרטים לא נשלחו עכשיו. אפשר לתאם שיחה בוואטסאפ.";
      });
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
      window.MENIFA_QUIZ_STEP = qIndex;
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

  captureClickIds();
  flushLeadQueue();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else start();
})();
