/* ============================================================
   ลอจิกทั้งหมดอยู่ที่นี่ — ปกติไม่ต้องแก้ไฟล์นี้
   (แก้ค่าต่าง ๆ ที่ config.js แทน)
   ============================================================ */
(() => {
  "use strict";
  const CFG = window.CONFIG || {};

  /* ---------- helper ---------- */
  const $ = (id) => document.getElementById(id);
  const rand = (min, max) => Math.random() * (max - min) + min;

  /* ---------- เติมข้อความจาก config ---------- */
  $("greeting").textContent = CFG.greeting || "สุขสันต์วันเกิด";
  $("age").textContent = CFG.age != null ? CFG.age : "69";
  $("photoCaption").textContent = CFG.photoCaption || "";
  $("startBtn").textContent = CFG.startButtonText || "click me";
  $("nextBtn").textContent = CFG.nextButtonText || "ไปต่อ";
  $("finalTitle").textContent = CFG.finalTitle || "";
  $("finalMsg").textContent = CFG.finalMessage || "";
  $("restartBtn").textContent = CFG.restartText || "เริ่มใหม่";

  /* ============================================================
     รูปหน้าพ่อ (โหลดจาก config; ถ้าไม่มีให้กดเลือกเองได้)
     ============================================================ */
  const photo = $("photo");
  const photoPlaceholder = $("photoPlaceholder");
  const photoInput = $("photoInput");
  const changePhoto = $("changePhoto");

  function showPhoto(src) {
    photo.src = src;
    if (CFG.photoFocus) photo.style.objectPosition = CFG.photoFocus;
    photo.classList.add("is-loaded");
    photoPlaceholder.hidden = true;
    changePhoto.hidden = false;
  }
  function showPlaceholder() {
    photo.classList.remove("is-loaded");
    photoPlaceholder.hidden = false;
    changePhoto.hidden = true;
  }
  if (CFG.photoUrl) {
    const test = new Image();
    test.onload = () => showPhoto(CFG.photoUrl);
    test.onerror = showPlaceholder;
    test.src = CFG.photoUrl;
  } else {
    showPlaceholder();
  }
  function pickPhoto() { photoInput.click(); }
  photoPlaceholder.addEventListener("click", pickPhoto);
  changePhoto.addEventListener("click", pickPhoto);
  photoInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) showPhoto(URL.createObjectURL(file));
  });

  /* ============================================================
     เพลง Happy Birthday สังเคราะห์เอง (ไม่มีเสียงร้อง วนเบา ๆ)
     ============================================================ */
  const Music = (() => {
    const NOTE = { G4:392.0, A4:440.0, B4:493.88, C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99 };
    // [โน้ต, จำนวนจังหวะ]  — ทำนอง Happy Birthday
    const MELODY = [
      ["G4",0.75],["G4",0.25],["A4",1],["G4",1],["C5",1],["B4",2],
      ["G4",0.75],["G4",0.25],["A4",1],["G4",1],["D5",1],["C5",2],
      ["G4",0.75],["G4",0.25],["G5",1],["E5",1],["C5",1],["B4",1],["A4",2],
      ["F5",0.75],["F5",0.25],["E5",1],["C5",1],["D5",1],["C5",2.5],
    ];
    let ctx = null, master = null, timer = null, on = false;
    const cfg = CFG.music || {};
    const beat = 60 / (cfg.tempo || 132);
    const baseVol = cfg.volume != null ? cfg.volume : 0.06;

    function init() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = baseVol;
      master.connect(ctx.destination);
    }
    function playNote(freq, start, dur) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const a = 0.03, end = start + dur;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(1, start + a);
      g.gain.setValueAtTime(1, end - 0.06);
      g.gain.linearRampToValueAtTime(0, end);
      osc.connect(g); g.connect(master);
      osc.start(start); osc.stop(end + 0.02);
    }
    function schedule() {
      if (!on || !ctx) return;
      let t = ctx.currentTime + 0.05;
      MELODY.forEach(([n, b]) => {
        const d = b * beat;
        playNote(NOTE[n], t, d * 0.92);
        t += d;
      });
      const loopMs = (t - ctx.currentTime + 0.6) * 1000;
      timer = setTimeout(schedule, loopMs);
    }
    return {
      start() {
        init();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        if (on) return;
        on = true;
        schedule();
      },
      // ลดเสียงลงตอนกำลังอ่านกลอน
      duck(d) {
        if (!master || !ctx) return;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(d ? baseVol * 0.45 : baseVol, ctx.currentTime + 0.4);
      },
      setMuted(m) {
        if (!master || !ctx) return;
        master.gain.linearRampToValueAtTime(m ? 0 : baseVol, ctx.currentTime + 0.2);
      },
      get ready() { return !!ctx; }
    };
  })();

  /* ปุ่มเปิด/ปิดเสียง */
  const muteBtn = $("muteBtn");
  let muted = false;
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "🔈" : "🔊";
    Music.setMuted(muted);
    if (muted) {
      cancelPoemAudio();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
    }
  });

  /* ============================================================
     นำทางระหว่างหน้า
     ============================================================ */
  const pages = { 1: $("page1"), 2: $("page2"), 3: $("page3") };
  let current = 1;
  function goTo(n) {
    if (!pages[n]) return;
    pages[current].classList.remove("is-active");
    pages[n].classList.add("is-active");
    current = n;
  }

  /* ============================================================
     สไลด์รูปความทรงจำ — เล่นค่อย ๆ เฟดสลับระหว่างอ่านกลอน (หน้า 2)
     ============================================================ */
  const PoemSlides = (() => {
    const wrap = $("poemPhotos");
    const slidesEl = $("slides");
    const list = Array.isArray(CFG.poemPhotos) ? CFG.poemPhotos.slice() : [];
    const interval = CFG.poemPhotoIntervalMs || 3200;
    let slides = [], idx = 0, timer = null, built = false;

    function build() {
      if (built) return;
      built = true;
      list.forEach((item) => {
        const src = typeof item === "string" ? item : item.src;
        const focus = typeof item === "string" ? "" : item.focus;
        const img = document.createElement("img");
        img.className = "slide";
        img.alt = "รูปความทรงจำ";
        img.loading = "eager";
        if (focus) img.style.objectPosition = focus;
        img.addEventListener("error", () => {
          slides = slides.filter((s) => s !== img);
          img.remove();
        });
        img.src = src;
        slidesEl.appendChild(img);
        slides.push(img);
      });
    }
    function show(n) {
      if (!slides.length) return;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === n));
      idx = n;
    }
    return {
      start() {
        if (!list.length) return;
        build();
        if (!slides.length) return;
        wrap.hidden = false;
        show(0);
        clearInterval(timer);
        if (slides.length > 1) {
          timer = setInterval(() => show((idx + 1) % slides.length), interval);
        }
      },
      stop() { clearInterval(timer); timer = null; },
      reset() { this.stop(); wrap.hidden = true; show(0); },
    };
  })();

  /* ============================================================
     หน้า 1 -> หน้า 2 : เริ่มเพลง + อ่านกลอน
     ============================================================ */
  $("startBtn").addEventListener("click", () => {
    if (CFG.music && CFG.music.enabled) {
      Music.start();
      muteBtn.hidden = false;
    }
    goTo(2);
    startPoem();
  });

  /* ============================================================
     อ่านกลอนทีละวรรค + เสียงอ่าน (Web Speech API)
     ============================================================ */
  const versesEl = $("verses");
  const nextBtn = $("nextBtn");
  const poemRaw = Array.isArray(CFG.poem) ? CFG.poem : [];
  const sp = CFG.speech || {};
  const poemAudio = Array.isArray(sp.audio) ? sp.audio : [];
  let thaiVoice = null;
  let activePoemAudio = null;

  // จัดกลอนเป็น "บท" (คั่นด้วยบรรทัดว่าง) แต่ละบทมีหลาย "วรรค"
  const stanzas = (() => {
    const out = [];
    let cur = [];
    let audioIndex = 0;
    poemRaw.forEach((line) => {
      if (String(line).trim() === "") {
        if (cur.length) { out.push(cur); cur = []; }
      } else {
        const text = String(line);
        cur.push({
          text,
          spokenText: text,
          audioSrc: poemAudio[audioIndex] || "",
        });
        audioIndex++;
      }
    });
    if (cur.length) out.push(cur);
    return out;
  })();

  const phraseGap = sp.phraseGapMs != null ? sp.phraseGapMs : 240;
  const lineGap = sp.lineGapMs != null ? sp.lineGapMs : (sp.pauseBetweenMs || 650);
  const stanzaGap = sp.stanzaGapMs != null ? sp.stanzaGapMs : 1100;
  let poemRun = 0; // ไว้ยกเลิกการอ่านชุดเก่าเวลาเริ่มใหม่

  function loadVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices();
    const scoreVoice = (voice) => {
      const lang = (voice.lang || "").toLowerCase();
      const name = (voice.name || "").toLowerCase();
      let score = 0;
      if (lang === "th-th") score += 100;
      else if (lang.startsWith("th")) score += 80;
      if (/thai|premwadee|niwat|narisa|achara|kanya/.test(name)) score += 20;
      if (/natural|online|google|microsoft/.test(name)) score += 10;
      if (voice.localService) score += 3;
      return score;
    };
    thaiVoice = voices
      .map((voice) => ({ voice, score: scoreVoice(voice) }))
      .filter((item) => item.score >= 80)
      .sort((a, b) => b.score - a.score)[0]?.voice || null;
  }
  if ("speechSynthesis" in window) {
    loadVoice();
    speechSynthesis.onvoiceschanged = loadVoice;
  }

  function estimateMs(text) {
    return Math.max(900, text.length * 165) + 350;
  }

  function startPoem() {
    cancelPoemAudio();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    versesEl.innerHTML = "";
    PoemSlides.start();
    Music.duck(true);
    revealStanza(0, ++poemRun);
  }

  function cancelPoemAudio() {
    if (!activePoemAudio) return;
    activePoemAudio.pause();
    activePoemAudio.removeAttribute("src");
    activePoemAudio.load();
    activePoemAudio = null;
  }

  // ค่อย ๆ จางวรรคบทเก่าก่อนขึ้นบทใหม่
  function clearVerses(done) {
    const kids = Array.prototype.slice.call(versesEl.children);
    if (!kids.length) { done(); return; }
    kids.forEach((k) => k.classList.add("verse--out"));
    setTimeout(() => { versesEl.innerHTML = ""; done(); }, 460);
  }

  function revealStanza(si, run) {
    if (run !== poemRun) return;
    if (si >= stanzas.length) {
      Music.duck(false);
      showNextButton();
      return;
    }
    clearVerses(() => { if (run === poemRun) revealLine(si, 0, run); });
  }

  function revealLine(si, li, run) {
    if (run !== poemRun) return;
    const stanza = stanzas[si];
    if (li >= stanza.length) {
      setTimeout(() => revealStanza(si + 1, run), stanzaGap);
      return;
    }
    const el = document.createElement("p");
    el.className = "verse speaking";
    el.textContent = stanza[li].text;
    versesEl.appendChild(el);

    speakLine(stanza[li], run, () => {
      if (run !== poemRun) return;
      el.classList.remove("speaking");
      setTimeout(() => revealLine(si, li + 1, run), lineGap);
    });
  }

  // อ่านหนึ่งวรรคต่อหนึ่งเสียงหลัก แต่คงจังหวะหยุดตามช่องว่างในกลอน
  function speakLine(item, run, done) {
    const text = item.text;
    const spokenText = item.spokenText || text;
    const phrases = text.split(/\s+/).filter(Boolean);

    if (sp.enabled !== false && !muted && item.audioSrc) {
      playLineAudio(item.audioSrc, run, () => {
        if (run !== poemRun) return;
        done();
      }, () => speakWithBrowser(spokenText, run, done));
      return;
    }

    speakPhrasesWithBrowser(phrases.length ? phrases : [spokenText], run, done);
  }

  function playLineAudio(src, run, done, fallback) {
    cancelPoemAudio();
    const audio = new Audio(src);
    activePoemAudio = audio;
    audio.preload = "auto";
    audio.playbackRate = sp.audioRate || 1;

    let advanced = false;
    const adv = () => {
      if (advanced) return;
      advanced = true;
      if (activePoemAudio === audio) activePoemAudio = null;
      done();
    };
    const fail = () => {
      if (advanced) return;
      advanced = true;
      if (activePoemAudio === audio) activePoemAudio = null;
      fallback();
    };

    audio.onended = adv;
    audio.onerror = fail;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(fail);
    }

    setTimeout(adv, estimateMs(src) + 9000);
  }

  function speakWithBrowser(text, run, done) {
    const minDuration = Math.max(1400, estimateMs(text) * 0.65);
    const startedAt = Date.now();
    if (sp.enabled === false || !("speechSynthesis" in window) || muted) {
      setTimeout(done, minDuration);
      return;
    }
    let advanced = false;
    const adv = () => {
      if (advanced) return;
      advanced = true;
      const remaining = Math.max(0, minDuration - (Date.now() - startedAt));
      setTimeout(done, remaining);
    };
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ", "));
      u.lang = sp.lang || "th-TH";
      if (thaiVoice) u.voice = thaiVoice;
      u.rate = sp.rate || 0.82;
      u.pitch = sp.pitch || 1.0;
      u.onend = adv;
      u.onerror = adv;
      setTimeout(adv, estimateMs(text) + 2500); // กัน onend ไม่ทำงาน
      speechSynthesis.cancel();
      if (run === poemRun) speechSynthesis.speak(u);
    } catch (_) {
      setTimeout(adv, estimateMs(text));
    }
  }

  function speakPhrasesWithBrowser(phrases, run, done) {
    let i = 0;
    const step = () => {
      if (run !== poemRun) return;
      if (i >= phrases.length) { done(); return; }
      const phrase = phrases[i];
      i++;
      speakWithBrowser(phrase, run, () => setTimeout(step, phraseGap));
    };
    step();
  }

  /* ============================================================
     ปุ่ม "ไปต่อ" ที่หนีก่อน แล้วค่อยยอมให้กด
     ============================================================ */
  let dodges = 0;
  const maxDodges = CFG.nextDodges != null ? CFG.nextDodges : 3;
  const teaseText = ["จับให้ได้สิ! 😜", "เกือบแล้ว~", "อีกนิดเดียว!"];

  function showNextButton() {
    nextBtn.hidden = false;
    nextBtn.classList.add("pulse");
  }

  function dodge() {
    nextBtn.classList.remove("pulse");
    nextBtn.classList.add("is-loose");
    const w = nextBtn.offsetWidth || 140;
    const h = nextBtn.offsetHeight || 56;
    const x = rand(12, Math.max(12, window.innerWidth - w - 12));
    const y = rand(80, Math.max(80, window.innerHeight - h - 24));
    nextBtn.style.left = x + "px";
    nextBtn.style.top = y + "px";
    nextBtn.textContent = teaseText[Math.min(dodges, teaseText.length - 1)];
    dodges++;
  }

  // desktop: หนีตอนเอาเมาส์ไปจ่อ
  nextBtn.addEventListener("mouseenter", () => {
    if (dodges < maxDodges) dodge();
  });
  // กดจริง (ทั้ง desktop/มือถือ)
  nextBtn.addEventListener("click", () => {
    if (dodges < maxDodges) {
      dodge();
      return;
    }
    PoemSlides.stop();
    goTo(3);
    launchFireworks();
  });

  /* ============================================================
     เอฟเฟกต์ canvas : confetti (หน้า 1) + พลุ (หน้า 3)
     ============================================================ */
  const canvas = $("fx");
  const fxCtx = canvas.getContext("2d");
  let W, H, particles = [], mode = "confetti", raf = null;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const COLORS = ["#ff7eb3", "#ffd166", "#9b8cff", "#6ee7c7", "#ff5e98", "#ffa600"];

  function spawnConfetti(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: rand(0, W), y: rand(-H, 0),
        vx: rand(-0.6, 0.6), vy: rand(1.2, 3.2),
        size: rand(5, 11), rot: rand(0, 6.28), vr: rand(-0.15, 0.15),
        color: COLORS[(Math.random() * COLORS.length) | 0],
        type: "confetti", life: Infinity,
      });
    }
  }

  function burst(x, y) {
    const color = COLORS[(Math.random() * COLORS.length) | 0];
    const count = 50;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const sp2 = rand(2, 6);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2,
        size: rand(2, 4), color, type: "spark",
        life: 1, decay: rand(0.012, 0.026),
      });
    }
  }

  function loop() {
    fxCtx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.type === "confetti") {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = rand(0, W); }
        fxCtx.save();
        fxCtx.translate(p.x, p.y);
        fxCtx.rotate(p.rot);
        fxCtx.fillStyle = p.color;
        fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        fxCtx.restore();
      } else {
        p.vy += 0.05; // แรงโน้มถ่วง
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        fxCtx.globalAlpha = Math.max(0, p.life);
        fxCtx.fillStyle = p.color;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, p.size, 0, 6.28);
        fxCtx.fill();
        fxCtx.globalAlpha = 1;
      }
    }
    raf = requestAnimationFrame(loop);
  }

  // confetti เบา ๆ ตั้งแต่หน้าแรก
  spawnConfetti(70);
  loop();

  let fwTimer = null;
  function launchFireworks() {
    mode = "fireworks";
    // เคลียร์ confetti ที่ค้าง แล้วยิงพลุรัว ๆ
    const fire = () => {
      burst(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.55));
      fwTimer = setTimeout(fire, rand(350, 750));
    };
    // ชุดแรกยิงพร้อมกันหลายลูก
    for (let i = 0; i < 4; i++) {
      setTimeout(() => burst(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.5)), i * 180);
    }
    fire();
  }

  /* ============================================================
     เริ่มใหม่
     ============================================================ */
  $("restartBtn").addEventListener("click", () => {
    if (fwTimer) { clearTimeout(fwTimer); fwTimer = null; }
    cancelPoemAudio();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    poemRun++; // ยกเลิกการอ่านกลอนชุดเก่า (ถ้ายังค้าง)
    dodges = 0;
    nextBtn.hidden = true;
    nextBtn.classList.remove("is-loose", "pulse");
    nextBtn.removeAttribute("style");
    nextBtn.textContent = CFG.nextButtonText || "ไปต่อ";
    versesEl.innerHTML = "";
    PoemSlides.reset();
    goTo(1);
  });
})();
