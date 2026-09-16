(function () {
  const screens = ["home", "chat", "sim", "docs", "pricing"];

  function nav(name) {
    if (!screens.includes(name)) name = "home";
    screens.forEach((s) => {
      const el = document.getElementById("screen-" + s);
      if (el) el.classList.toggle("active", s === name);
    });
    document.querySelectorAll(".bottom-nav button").forEach((b) => {
      b.classList.toggle("on", b.getAttribute("data-nav") === name);
    });
    if (location.hash !== "#" + name) {
      history.replaceState(null, "", "#" + name);
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (name === "sim") recalc();
  }
  window.nav = nav;

  function fmt(n) {
    return "₪" + Math.round(n).toLocaleString("he-IL");
  }

  function pmt(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  function recalc() {
    const amt = Number(document.getElementById("amt").value) || 0;
    const yrs = Number(document.getElementById("yrs").value) || 1;
    const rate = Number(document.getElementById("rate").value) || 0;
    const income = Number(document.getElementById("income").value) || 1;
    const pay = pmt(amt, rate, yrs);
    const totalPay = pay * yrs * 12;
    const interest = Math.max(0, totalPay - amt);
    const pti = (pay / income) * 100;

    document.getElementById("out-pay").textContent = fmt(pay);
    document.getElementById("out-pti").textContent = pti.toFixed(1) + "%";
    document.getElementById("out-interest").textContent = fmt(interest);

    let feas = "לבדיקה";
    if (pti <= 30) feas = "סביר לבדיקה";
    else if (pti <= 40) feas = "גבולי — בדקו";
    else feas = "יחס גבוה";
    document.getElementById("out-feas").textContent = feas;
  }

  function syncMix(changed) {
    const k = document.getElementById("m-katz");
    const p = document.getElementById("m-prime");
    const v = document.getElementById("m-var");
    let a = Number(k.value), b = Number(p.value), c = Number(v.value);
    let sum = a + b + c;
    if (sum !== 100 && changed) {
      const others = [k, p, v].filter((x) => x !== changed);
      let rest = 100 - Number(changed.value);
      if (rest < 0) {
        changed.value = 100;
        rest = 0;
      }
      const o0 = Number(others[0].value);
      const o1 = Number(others[1].value);
      const oSum = o0 + o1 || 1;
      others[0].value = Math.max(0, Math.round((rest * o0) / oSum));
      others[1].value = Math.max(0, rest - Number(others[0].value));
      a = Number(k.value); b = Number(p.value); c = Number(v.value);
      sum = a + b + c;
    }
    document.getElementById("o-katz").textContent = k.value;
    document.getElementById("o-prime").textContent = p.value;
    document.getElementById("o-var").textContent = v.value;
    const sumEl = document.getElementById("mix-sum");
    sumEl.textContent = sum === 100 ? "סה״כ 100% ✓" : "סה״כ " + sum + "% — התאימו ל־100%";
    sumEl.style.color = sum === 100 ? "var(--ok)" : "var(--danger)";
  }

  ["amt", "yrs", "rate", "income"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", recalc);
  });
  ["m-katz", "m-prime", "m-var"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => syncMix(el));
  });

  document.querySelectorAll(".upload-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      li.classList.add("done");
      li.querySelector(".st").textContent = "הועלה (דמו)";
      const cb = li.querySelector('input[type="checkbox"]');
      if (cb) cb.checked = true;
    });
  });

  const send = document.getElementById("chat-send");
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");
  if (send && input && log) {
    send.addEventListener("click", () => {
      const t = (input.value || "").trim();
      if (!t) return;
      const me = document.createElement("div");
      me.className = "bubble me";
      me.textContent = t;
      log.appendChild(me);
      input.value = "";
      const bot = document.createElement("div");
      bot.className = "bubble bot";
      bot.textContent = "קיבלתי (דמו). בתצוגה הזו אין שרת AI — עברו לסימולטור עם המספרים שלכם, או קבעו שיחה עם תמיר.";
      log.appendChild(bot);
      log.scrollTop = log.scrollHeight;
    });
  }

  const replay = document.getElementById("chat-replay");
  if (replay) {
    replay.addEventListener("click", () => {
      log.scrollTop = 0;
      alert("השיחה המוצגת היא דמו קבוע בעברית. בפרוד יחברו מודל AI ממותג מניפה.");
    });
  }

  window.addEventListener("hashchange", () => {
    const h = (location.hash || "#home").slice(1);
    nav(screens.includes(h) ? h : "home");
  });

  const start = (location.hash || "#home").slice(1);
  nav(screens.includes(start) ? start : "home");
  syncMix(null);
  recalc();
})();
