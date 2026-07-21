(() => {
  "use strict";

  /* =========================================================
     1. Standard Iranian keyboard layout mapping
     Physical key position (independent of the OS layout in use)
     -> Farsi letter. This lets people practice the *layout*
     even if their OS is set to a US/English keyboard.
     ========================================================= */

  const CODE_TO_BASE = {
    KeyQ: "q", KeyW: "w", KeyE: "e", KeyR: "r", KeyT: "t", KeyY: "y",
    KeyU: "u", KeyI: "i", KeyO: "o", KeyP: "p",
    BracketLeft: "[", BracketRight: "]",
    KeyA: "a", KeyS: "s", KeyD: "d", KeyF: "f", KeyG: "g", KeyH: "h",
    KeyJ: "j", KeyK: "k", KeyL: "l", Semicolon: ";", Quote: "'",
    KeyZ: "z", KeyX: "x", KeyC: "c", KeyV: "v", KeyB: "b", KeyN: "n",
    KeyM: "m", Comma: ",", Backquote: "`", Space: " "
  };

  const BASE_TO_FARSI = {
    q: "ض", w: "ص", e: "ث", r: "ق", t: "ف", y: "غ", u: "ع", i: "ه", o: "خ", p: "ح",
    "[": "ج", "]": "چ",
    a: "ش", s: "س", d: "ی", f: "ب", g: "ل", h: "ا", j: "ت", k: "ن", l: "م",
    ";": "ک", "'": "گ",
    z: "ظ", x: "ط", c: "ز", v: "ر", b: "ذ", n: "د", m: "پ", ",": "و",
    "`": "ژ", " ": " "
  };

  const KEY_DISPLAY = {
    q: "Q", w: "W", e: "E", r: "R", t: "T", y: "Y", u: "U", i: "I", o: "O", p: "P",
    "[": "[", "]": "]",
    a: "A", s: "S", d: "D", f: "F", g: "G", h: "H", j: "J", k: "K", l: "L",
    ";": ";", "'": "'",
    z: "Z", x: "X", c: "C", v: "V", b: "B", n: "N", m: "M", ",": ",",
    "`": "`", " ": "␣"
  };

  // Reverse map: farsi character -> { base, shift }
  const FARSI_TO_KEY = {};
  for (const base in BASE_TO_FARSI) {
    FARSI_TO_KEY[BASE_TO_FARSI[base]] = { base, shift: false };
  }
  FARSI_TO_KEY["آ"] = { base: "h", shift: true }; // Shift + H

  /* =========================================================
     2. Word list loading
     ========================================================= */

  let WORDS = [];
  let lastIndex = -1;

  // Minimal quote-aware CSV line splitter (handles "quoted, fields" and "" escapes).
  function parseCsvLine(line) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        fields.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    fields.push(cur);
    return fields.map((f) => f.trim());
  }

  // Find the first header (by name, case-insensitive) matching any of the given aliases.
  function findColumn(headers, aliases) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) return idx;
    }
    return -1;
  }

  async function loadWords() {
    const statusEl = document.getElementById("loadStatus");
    try {
      const res = await fetch("words.csv");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      const headerLine = lines.shift();
      const headers = parseCsvLine(headerLine || "").map((h) => h.toLowerCase());

      // Columns are matched by name so adding unrelated columns later can
      // never accidentally get read as pronunciation (or anything else).
      let farsiIdx = findColumn(headers, ["farsi", "word", "persian"]);
      let enIdx = findColumn(headers, ["english", "en", "meaning", "translation", "definition"]);
      const pronIdx = findColumn(headers, ["pronunciation", "pron", "transliteration", "phonetic"]);

      // Fall back to the original two-column position only if no header
      // names matched at all (keeps old plain "farsi,english" files working).
      if (farsiIdx === -1 && enIdx === -1) {
        farsiIdx = 0;
        enIdx = 1;
      }

      WORDS = lines
        .map((line) => {
          const fields = parseCsvLine(line);
          const farsi = farsiIdx !== -1 ? fields[farsiIdx] || "" : "";
          const en = enIdx !== -1 ? fields[enIdx] || "" : "";
          const pronunciation = pronIdx !== -1 ? fields[pronIdx] || "" : "";
          return { farsi, en, pronunciation };
        })
        .filter((w) => w.farsi);

      if (statusEl) statusEl.textContent = "";
    } catch (err) {
      console.error("Could not load words.csv:", err);
      if (statusEl) {
        statusEl.textContent = "couldn't load words.csv";
      }
      document.getElementById("definitionText").textContent =
        "Serve this folder with a local web server (e.g. \"python3 -m http.server\") and reload — browsers block file:// requests for words.csv.";
    }
  }

  function pickWord() {
    if (WORDS.length === 0) return null;
    let idx;
    do {
      idx = Math.floor(Math.random() * WORDS.length);
    } while (WORDS.length > 1 && idx === lastIndex);
    lastIndex = idx;
    return WORDS[idx];
  }

  /* =========================================================
     3. Rendering the current word as tiles
     ========================================================= */

  let letters = [];
  let posIndex = 0;
  let wordStartTime = null;
  let confirmedText = ""; // Farsi characters typed correctly so far, this word

  function renderWord(word) {
    document.getElementById("pronunciationText").textContent = word.pronunciation || "";
    document.getElementById("definitionText").textContent = word.en || "";

    letters = Array.from(word.farsi).map((ch) => {
      const info = FARSI_TO_KEY[ch] || { base: null, shift: false };
      return { char: ch, base: info.base, shift: info.shift };
    });
    posIndex = 0;
    wordStartTime = null;
    confirmedText = "";

    const typerReset = document.getElementById("typer");
    if (typerReset) typerReset.value = "";

    // Build the big Farsi word out of one <span> per letter (kept as plain
    // inline elements, no layout properties) so the browser still shapes
    // and joins the Persian script normally, while letting us color each
    // letter individually as it's typed correctly.
    const farsiWordEl = document.getElementById("farsiWord");
    farsiWordEl.innerHTML = "";
    letters.forEach((l) => {
      const span = document.createElement("span");
      span.className = "word-letter";
      span.textContent = l.char;
      farsiWordEl.appendChild(span);
    });

    const tilesEl = document.getElementById("tiles");
    tilesEl.innerHTML = "";

    letters.forEach((l, i) => {
      const tile = document.createElement("div");
      tile.className = "tile" + (i === 0 ? " active" : "");
      if (l.char === " ") tile.classList.add("space-tile");

      const charSpan = document.createElement("span");
      charSpan.className = "tile-char";
      charSpan.textContent = l.char === " " ? "␣" : l.char;

      const keySpan = document.createElement("span");
      keySpan.className = "key-label";
      keySpan.textContent = (l.shift ? "⇧" : "") + (KEY_DISPLAY[l.base] || "?");

      tile.appendChild(charSpan);
      tile.appendChild(keySpan);
      tilesEl.appendChild(tile);
    });

    const typer = document.getElementById("typer");
    if (typer) typer.focus();
  }

  /* =========================================================
     4. Stats: localStorage persistence
     ========================================================= */

  const STORAGE_KEY = "vajehTyping_v1";

  function dateKey(d) {
    return d.toISOString().slice(0, 10);
  }

  function loadStats() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      data = {};
    }
    data.days = data.days || {};
    data.allTime = data.allTime || {
      totalWords: 0,
      bestWpm: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null
    };
    return data;
  }

  const statsData = loadStats();
  const todayK = dateKey(new Date());
  statsData.days[todayK] = statsData.days[todayK] || {
    words: 0,
    correctChars: 0,
    mistakes: 0,
    timeMs: 0
  };
  const todayStats = statsData.days[todayK];

  function saveStats() {
    statsData.allTime.totalWords = Object.values(statsData.days).reduce(
      (sum, d) => sum + d.words,
      0
    );
    const liveWpm = Number(document.getElementById("wpmValue").textContent) || 0;
    if (liveWpm > statsData.allTime.bestWpm) statsData.allTime.bestWpm = liveWpm;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statsData));
    } catch (e) {
      console.warn("Could not save stats to localStorage:", e);
    }
  }

  function updateStreakOnActivity() {
    const at = statsData.allTime;
    if (at.lastActiveDate === todayK) return; // already logged today
    const yesterdayK = dateKey(new Date(Date.now() - 86400000));
    at.currentStreak = at.lastActiveDate === yesterdayK ? (at.currentStreak || 0) + 1 : 1;
    at.longestStreak = Math.max(at.longestStreak || 0, at.currentStreak);
    at.lastActiveDate = todayK;
  }

  function computeWpm(stat) {
    const minutes = stat.timeMs / 60000;
    return minutes > 0 ? Math.round(stat.correctChars / 5 / minutes) : 0;
  }

  function computeAccuracy(stat) {
    const total = stat.correctChars + stat.mistakes;
    return total > 0 ? Math.round((stat.correctChars / total) * 100) : 100;
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderDelta(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;
    if (delta > 0) {
      el.textContent = "▲ " + delta;
      el.className = "delta up";
    } else if (delta < 0) {
      el.textContent = "▼ " + Math.abs(delta);
      el.className = "delta down";
    } else {
      el.textContent = "—";
      el.className = "delta flat";
    }
  }

  function renderStatsPanel() {
    const yesterdayK = dateKey(new Date(Date.now() - 86400000));
    const yStats = statsData.days[yesterdayK] || {
      words: 0,
      correctChars: 0,
      mistakes: 0,
      timeMs: 0
    };

    setText("todayWpm", computeWpm(todayStats));
    setText("todayWords", todayStats.words);
    setText("todayAcc", computeAccuracy(todayStats) + "%");
    setText("todayMistakes", todayStats.mistakes);

    setText("yestWpm", computeWpm(yStats));
    setText("yestWords", yStats.words);
    setText("yestAcc", computeAccuracy(yStats) + "%");
    setText("yestMistakes", yStats.mistakes);

    setText("bestWpm", statsData.allTime.bestWpm || 0);
    setText("streak", statsData.allTime.currentStreak || 0);
    setText("totalWords", statsData.allTime.totalWords || 0);

    renderDelta("wpmDelta", computeWpm(todayStats) - computeWpm(yStats));
    renderDelta("wordsDelta", todayStats.words - yStats.words);
  }

  /* =========================================================
     5. Live session WPM
     ========================================================= */

  let sessionStart = null;
  let sessionCorrectChars = 0;

  function updateLiveWpm() {
    if (!sessionStart) return;
    const minutes = (performance.now() - sessionStart) / 60000;
    const wpm = minutes > 0 ? Math.round(sessionCorrectChars / 5 / minutes) : 0;
    setText("wpmValue", wpm);
  }

  /* =========================================================
     6. Word completion
     ========================================================= */

  function completeWord() {
    const now = performance.now();
    todayStats.words += 1;
    todayStats.timeMs += now - wordStartTime;
    updateStreakOnActivity();
    saveStats();
    renderStatsPanel();

    setTimeout(() => {
      const w = pickWord();
      if (w) renderWord(w);
    }, 250);
  }

  /* =========================================================
     7. Keyboard handling
     ========================================================= */

  function resolveBase(e) {
    if (CODE_TO_BASE[e.code] !== undefined) return CODE_TO_BASE[e.code];
    // Fallback for mobile / virtual keyboards where e.code is unreliable
    if (e.key && e.key.length === 1) {
      const k = e.key.toLowerCase();
      if (BASE_TO_FARSI[k] !== undefined) return k;
    }
    return undefined;
  }

  document.addEventListener("keydown", (e) => {
    if (!letters.length) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal && !settingsModal.hidden) return;

    // Non-character keys (Backspace, Tab, Enter, arrows, Shift alone, etc.)
    // are ignored entirely — they're not typing attempts, right or wrong.
    if (e.key.length !== 1) {
      if (e.key === "Backspace" || e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
      }
      return;
    }

    e.preventDefault();

    if (sessionStart === null) sessionStart = performance.now();
    if (wordStartTime === null) wordStartTime = performance.now();

    const base = resolveBase(e);
    // What Farsi character this keystroke actually produces, given our
    // physical-key mapping. If the key isn't part of the Farsi layout at
    // all (digits, punctuation, stray Latin letters, etc.) we fall back to
    // the raw character typed — which will simply never match the
    // expected Farsi letter, so it's correctly counted as a mistake.
    let typedChar;
    if (base === "h") {
      typedChar = e.shiftKey ? "آ" : "ا";
    } else if (base !== undefined) {
      typedChar = BASE_TO_FARSI[base];
    } else {
      typedChar = e.key;
    }

    const typer = document.getElementById("typer");
    const expected = letters[posIndex];
    const isCorrect = typedChar === expected.char;

    const tiles = document.querySelectorAll(".tile");
    const tileEl = tiles[posIndex];
    if (!tileEl) return;

    const wordLetterEls = document.querySelectorAll("#farsiWord .word-letter");
    const letterEl = wordLetterEls[posIndex];

    if (isCorrect) {
      tileEl.classList.remove("active");
      tileEl.classList.add("correct");
      if (letterEl) letterEl.classList.add("correct");
      posIndex += 1;
      sessionCorrectChars += 1;
      todayStats.correctChars += 1;

      confirmedText += expected.char;
      if (typer) typer.value = confirmedText;

      if (posIndex < letters.length) {
        tiles[posIndex].classList.add("active");
      } else {
        completeWord();
      }
    } else {
      tileEl.classList.add("wrong");
      setTimeout(() => tileEl.classList.remove("wrong"), 300);
      todayStats.mistakes += 1;

      if (letterEl) {
        letterEl.classList.add("wrong");
        setTimeout(() => letterEl.classList.remove("wrong"), 300);
      }

      // Briefly preview the wrong character, then fall back to whatever
      // was correctly typed so far.
      if (typer) {
        typer.value = confirmedText + typedChar;
        setTimeout(() => {
          if (typer.value === confirmedText + typedChar) {
            typer.value = confirmedText;
          }
        }, 300);
      }
    }

    updateLiveWpm();
    saveStats();
    renderStatsPanel();
  });

  document.addEventListener("click", () => {
    const typer = document.getElementById("typer");
    if (typer) typer.focus();
  });

  /* =========================================================
     8. Settings modal (theme, key hint, definition, pronunciation)
     ========================================================= */

  const APP_EL = document.querySelector(".app");

  function initSettings() {
    const savedTheme = localStorage.getItem("vajehTyping_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const hideHints = localStorage.getItem("vajehTyping_hideHints") === "true";
    const hideDefinition = localStorage.getItem("vajehTyping_hideDefinition") === "true";
    const hidePronunciation = localStorage.getItem("vajehTyping_hidePronunciation") === "true";

    if (APP_EL) {
      APP_EL.classList.toggle("hide-hints", hideHints);
      APP_EL.classList.toggle("hide-definition", hideDefinition);
      APP_EL.classList.toggle("hide-pronunciation", hidePronunciation);
    }

    const darkModeSwitch = document.getElementById("darkModeSwitch");
    const keyHintSwitch = document.getElementById("keyHintSwitch");
    const definitionSwitch = document.getElementById("definitionSwitch");
    const pronunciationSwitch = document.getElementById("pronunciationSwitch");

    if (darkModeSwitch) darkModeSwitch.checked = savedTheme === "dark";
    if (keyHintSwitch) keyHintSwitch.checked = !hideHints;
    if (definitionSwitch) definitionSwitch.checked = !hideDefinition;
    if (pronunciationSwitch) pronunciationSwitch.checked = !hidePronunciation;
  }

  function wireSettingsSwitches() {
    const darkModeSwitch = document.getElementById("darkModeSwitch");
    const keyHintSwitch = document.getElementById("keyHintSwitch");
    const definitionSwitch = document.getElementById("definitionSwitch");
    const pronunciationSwitch = document.getElementById("pronunciationSwitch");

    if (darkModeSwitch) {
      darkModeSwitch.addEventListener("change", (e) => {
        const theme = e.target.checked ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("vajehTyping_theme", theme);
      });
    }

    if (keyHintSwitch) {
      keyHintSwitch.addEventListener("change", (e) => {
        const visible = e.target.checked;
        if (APP_EL) APP_EL.classList.toggle("hide-hints", !visible);
        localStorage.setItem("vajehTyping_hideHints", String(!visible));
      });
    }

    if (definitionSwitch) {
      definitionSwitch.addEventListener("change", (e) => {
        const visible = e.target.checked;
        if (APP_EL) APP_EL.classList.toggle("hide-definition", !visible);
        localStorage.setItem("vajehTyping_hideDefinition", String(!visible));
      });
    }

    if (pronunciationSwitch) {
      pronunciationSwitch.addEventListener("change", (e) => {
        const visible = e.target.checked;
        if (APP_EL) APP_EL.classList.toggle("hide-pronunciation", !visible);
        localStorage.setItem("vajehTyping_hidePronunciation", String(!visible));
      });
    }
  }

  function openSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.hidden = false;
  }

  function closeSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.hidden = true;
    const typer = document.getElementById("typer");
    if (typer) typer.focus();
  }

  function wireSettingsModal() {
    const settingsBtn = document.getElementById("settingsBtn");
    const closeBtn = document.getElementById("closeSettings");
    const modal = document.getElementById("settingsModal");

    if (settingsBtn) settingsBtn.addEventListener("click", openSettings);
    if (closeBtn) closeBtn.addEventListener("click", closeSettings);

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeSettings();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && !modal.hidden) closeSettings();
    });
  }

  /* =========================================================
     9. Init
     ========================================================= */

  async function init() {
    initSettings();
    wireSettingsSwitches();
    wireSettingsModal();

    renderStatsPanel();

    await loadWords();
    if (WORDS.length) {
      renderWord(pickWord());
    }
  }

  init();
})();
