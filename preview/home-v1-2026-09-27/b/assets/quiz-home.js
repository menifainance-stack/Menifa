(function () {
  const qs = [
    { id: "pain", title: "מה הכי לוחץ עכשיו?", chips: ["החזר שחונק", "הלוואות בצד", "פחד לחתום", "עוד בודקים כיוון"] },
    { id: "stage", title: "איפה אתם בתהליך?", chips: ["יש משכנתא פעילה", "לפני רכישה", "שוקלים מחזור/איחוד", "רק אוספים מידע"] },
    { id: "when", title: "מתי נוח לשיחה קצרה?", chips: ["היום־מחר", "השבוע", "עוד בודקים", "רק וואטסאפ בינתיים"] },
  ];
  const answers = [];
  let i = 0;
  const panel = document.getElementById("hq-panel");
  const bar = document.getElementById("hq-bar");
  if (!panel) return;
  function waUrl() {
    const base = "שלום, אשמח לתיאום שיחה";
    const bits = answers.map((a, idx) => qs[idx].title + ": " + a).join(" · ");
    return "https://wa.me/972524502821?text=" + encodeURIComponent(base + (bits ? "\n" + bits : ""));
  }
  function render() {
    bar.style.width = ((i / qs.length) * 100).toFixed(0) + "%";
    if (i >= qs.length) {
      panel.innerHTML = '<div class="quiz-result"><h3>יש כיוון ראשוני</h3><p>נשמח לתאם שיחה קצרה — בלי התחייבות.</p><a class="btn btn-wa" href="' + waUrl() + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.01zm-7.01 15.24h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.22 8.23z"/></svg> וואטסאפ — לתיאום שיחה</a><div class="quiz-nav"><button type="button" class="quiz-back" id="hq-restart">התחלה מחדש</button></div></div>';
      bar.style.width = "100%";
      document.getElementById("hq-restart").onclick = function () { answers.length = 0; i = 0; render(); };
      return;
    }
    const q = qs[i];
    panel.innerHTML = '<p class="quiz-q">' + q.title + '</p><div class="chips" id="hq-chips"></div><div class="quiz-nav">' + (i > 0 ? '<button type="button" class="quiz-back" id="hq-back">חזרה</button>' : "<span></span>") + '<span style="font-size:.8rem;color:var(--muted)">' + (i + 1) + " / " + qs.length + "</span></div>";
    const box = document.getElementById("hq-chips");
    q.chips.forEach(function (label) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = label;
      b.onclick = function () { answers[i] = label; i += 1; render(); document.getElementById("home-quiz").scrollIntoView({ behavior: "smooth", block: "center" }); };
      box.appendChild(b);
    });
    const back = document.getElementById("hq-back");
    if (back) back.onclick = function () { i -= 1; answers.pop(); render(); };
  }
  render();
})();
