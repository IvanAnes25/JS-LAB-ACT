(function () {
  "use strict";

  const WORDS = (
    "the quick brown fox jumps over lazy dog while morning light spreads across quiet field " +
    "every journey begins with single step forward into unknown territory ahead of us all " +
    "simple ideas often carry more weight than complicated ones ever could hope to achieve " +
    "practice makes progress not perfection so keep moving steady pace toward your goal " +
    "clear thinking comes from calm mind and patient heart working together in harmony " +
    "small habits repeated daily build foundation for lasting change over time words " +
    "on a page can shape way we see world around us each day focus what matters " +
    "most let rest quietly fade background noise water flows gently down river toward " +
    "open sea trees sway softly wind blows through tall grass stars shine bright above " +
    "silent city streets empty late night warm cup hands books stacked shelf waiting " +
    "read music plays low volume room clock ticks steady rhythm paper pen ink smoothly " +
    "bird sings early dawn breaks slowly hills roll far horizon line boats drift harbor " +
    "candle flickers desk covered notes coffee cools beside window rain taps glass pane"
  ).split(" ");

  let bag = [];
  function refillBag() {
    bag = WORDS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }

  const STORE_KEY = "typeflow_attempts";
  const KEEP_BEHIND = 25; 
  const BUFFER_AHEAD = 40; 

  let DURATION = 30;
  let chars = [];
  let pos = 0;
  let started = false;
  let timeLeft = DURATION;
  let timer = null;
  let correctCount = 0;
  let typedCount = 0;
  let currentView = "type";

  const textDisplay = document.getElementById("textDisplay");
  const typeArea = document.getElementById("typeArea");
  const hiddenInput = document.getElementById("hiddenInput");
  const timeEl = document.getElementById("time");
  const wpmEl = document.getElementById("wpm");
  const accEl = document.getElementById("acc");
  const hint = document.getElementById("hint");
  const result = document.getElementById("result");
  const restartBtn = document.getElementById("restartBtn");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const screenType = document.getElementById("screen-type");
  const screenProfile = document.getElementById("screen-profile");
  const toProfileBtn = document.getElementById("toProfileBtn");
  const toTypeBtn = document.getElementById("toTypeBtn");
  const attemptList = document.getElementById("attemptList");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const pBest = document.getElementById("pBest");
  const pAvg = document.getElementById("pAvg");
  const pCount = document.getElementById("pCount");

  function makeId() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase();
  }

  function nextWords(count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      if (bag.length === 0) refillBag();
      out.push(bag.pop());
    }
    return out.join(" ");
  }

  function buildText() {
    chars = nextWords(20).split("").map((ch) => ({ ch, status: "pending" }));
    pos = 0;
    renderText();
  }

  
  function pruneConsumed() {
    if (pos > KEEP_BEHIND) {
      const cut = pos - KEEP_BEHIND;
      chars = chars.slice(cut);
      pos -= cut;
    }
  }

  function renderText() {
    textDisplay.innerHTML = chars
      .map((c, i) => {
        let cls = "";
        if (c.status === "correct") cls = "char-correct";
        else if (c.status === "incorrect") cls = "char-incorrect";
        if (i === pos) cls += " char-current";
        const displayCh = c.ch;
        return `<span class="${cls.trim()}">${displayCh}</span>`;
      })
      .join("");
    const current = textDisplay.querySelector(".char-current");
    if (current) current.scrollIntoView({ block: "nearest" });
  }

  function updateStats() {
    const elapsed = DURATION - timeLeft || 1 / 60;
    const minutes = elapsed / 60;
    const wpm = Math.round(correctCount / 5 / minutes) || 0;
    const acc = typedCount > 0 ? Math.round((correctCount / typedCount) * 100) : 100;
    wpmEl.textContent = wpm;
    accEl.textContent = acc;
    return { wpm, acc };
  }

  function startTimer() {
    started = true;
    hint.textContent = "Typing...";
    typeArea.classList.add("listening");
    timer = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      updateStats();
      if (timeLeft <= 0) finish();
    }, 1000);
  }

  function loadAttempts() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAttempts(list) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {
     
    }
  }

  function recordAttempt(wpm, acc) {
    const list = loadAttempts();
    list.push({ id: makeId(), wpm, acc, duration: DURATION, ts: Date.now() });
    saveAttempts(list);
    renderProfile();
  }

  function deleteAttempt(id) {
    const list = loadAttempts().filter((a) => a.id !== id);
    saveAttempts(list);
    renderProfile();
  }

  function formatDateTime(ts) {
    const d = new Date(ts);
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  function renderProfile() {
    const list = loadAttempts();
    const ranked = [...list].sort((a, b) => b.wpm - a.wpm);

    if (!list.length) {
      pBest.textContent = 0;
      pAvg.textContent = 0;
      pCount.textContent = 0;
      attemptList.innerHTML =
        '<div class="empty-state">No attempts yet — finish a test to see it ranked here.</div>';
      return;
    }

    const best = ranked[0].wpm;
    const avg = Math.round(list.reduce((s, a) => s + a.wpm, 0) / list.length);
    pBest.textContent = best;
    pAvg.textContent = avg;
    pCount.textContent = list.length;

    const header = `<div class="attempt-row header-row">
      <span>#</span><span>Speed</span><span class="col-duration">Mode</span><span>Accuracy</span>
      <span class="col-date">Date &amp; time</span><span></span>
    </div>`;

    const rows = ranked
      .map(
        (a, i) => `
      <div class="attempt-row ${i === 0 ? "rank-1" : ""}">
        <span>${i + 1}</span>
        <b>${a.wpm} wpm</b>
        <span class="col-duration">${a.duration}s</span>
        <span>${a.acc}%</span>
        <span class="col-date">${formatDateTime(a.ts)}</span>
        <button class="del-btn" data-id="${a.id}" aria-label="Delete ${a.wpm} wpm attempt from ${formatDateTime(a.ts)}">×</button>
      </div>`
      )
      .join("");

    attemptList.innerHTML = header + rows;

    attemptList.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteAttempt(btn.dataset.id));
    });
  }

  const CONFETTI_COLORS = ["#2f9e5c", "#37d67a", "#8ee6ac", "#c8f2d6", "#e8c468"];

  function triggerConfetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    const COUNT = 40;
    for (let i = 0; i < COUNT; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.animationDuration = 2.2 + Math.random() * 1.2 + "s";
      piece.style.animationDelay = Math.random() * 0.4 + "s";
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3800);
  }

  function finish() {
    clearInterval(timer);
    typeArea.classList.remove("listening");
    const { wpm, acc } = updateStats();
    hint.textContent = "Time's up";

    const priorList = loadAttempts();
    const priorBest = priorList.reduce((max, a) => Math.max(max, a.wpm), 0);
    const isNewBest = priorList.length > 0 && wpm > priorBest;

    result.textContent = isNewBest
      ? `New best! ${wpm} wpm, ${acc}% accuracy — you just beat your previous record.`
      : `Finished at ${wpm} wpm, ${acc}% accuracy. Saved to your profile.`;
    result.classList.add("show");

    recordAttempt(wpm, acc);
    if (isNewBest) triggerConfetti();
  }

  function reset() {
    clearInterval(timer);
    started = false;
    timeLeft = DURATION;
    correctCount = 0;
    typedCount = 0;
    timeEl.textContent = DURATION;
    wpmEl.textContent = 0;
    accEl.textContent = 100;
    hint.textContent = "Just start typing";
    result.classList.remove("show");
    typeArea.classList.remove("listening");
    hiddenInput.value = "";
    refillBag();
    buildText();
  }

  function typeChar(ch) {
    if (timeLeft <= 0) return;
    if (!started) startTimer();
    const expected = chars[pos];
    if (!expected) return;
    typedCount++;
    if (ch === expected.ch) {
      expected.status = "correct";
      correctCount++;
    } else {
      expected.status = "incorrect";
    }
    pos++;
    if (chars.length - pos < BUFFER_AHEAD) {
      const more = " " + nextWords(10);
      chars = chars.concat(more.split("").map((c) => ({ ch: c, status: "pending" })));
    }
    pruneConsumed();
    updateStats();
    renderText();
  }

  function backspace() {
    if (pos === 0 || timeLeft <= 0) return;
    pos--;
    chars[pos].status = "pending";
    renderText();
  }

  
  function focusHiddenInput() {
    if (currentView === "type") hiddenInput.focus({ preventScroll: true });
  }


  document.addEventListener("keydown", (e) => {
    if (currentView !== "type") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "Tab" || e.key === "Enter") {

      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
      focusHiddenInput();
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      typeChar(" ");
      focusHiddenInput();
      return;
    }
   
    if (e.key.length === 1) {
      focusHiddenInput();
    }
  });

  hiddenInput.addEventListener("input", () => {
    const val = hiddenInput.value;
    if (val.length > 0) typeChar(val[val.length - 1]);
    hiddenInput.value = "";
  });

  typeArea.addEventListener("click", focusHiddenInput);
  window.addEventListener("load", focusHiddenInput);

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      DURATION = parseInt(btn.dataset.time, 10);
      reset();
    });
  });

  toProfileBtn.addEventListener("click", () => {
    currentView = "profile";
    screenType.classList.remove("active");
    screenProfile.classList.add("active");
    renderProfile();
  });

  toTypeBtn.addEventListener("click", () => {
    currentView = "type";
    screenProfile.classList.remove("active");
    screenType.classList.add("active");
    focusHiddenInput();
  });

  restartBtn.addEventListener("click", () => {
    reset();
    focusHiddenInput();
  });
  clearAllBtn.addEventListener("click", () => {
    saveAttempts([]);
    renderProfile();
  });

  buildText();
  renderProfile();
  focusHiddenInput();
})();
