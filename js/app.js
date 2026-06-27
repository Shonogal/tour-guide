const TRIPS_MANIFEST = [
  { id: 'chongqing-2026-08', emoji: '🌶️', file: 'trips/chongqing-2026-08.json' }
];

let state = { trips: [], currentTrip: null, currentPlace: null, speaking: false };

// ── Routing ──────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Home ─────────────────────────────────────────────────
async function loadHome() {
  showScreen('screen-home');
  updateHeader('🗺️ Family Tour Guide', '', false);

  const list = document.getElementById('trip-list');
  list.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading trips...</p></div>';

  const trips = await Promise.all(
    TRIPS_MANIFEST.map(async m => {
      const r = await fetch(m.file);
      const data = await r.json();
      return { ...data, emoji: m.emoji };
    })
  );
  state.trips = trips;

  list.innerHTML = trips.map(t => `
    <div class="trip-card" onclick="loadTrip('${t.id}')">
      <div class="trip-count">${t.places.length} places</div>
      <div class="trip-emoji">${t.emoji}</div>
      <div class="trip-name">${t.title}</div>
      <div class="trip-dest">${t.destination}</div>
      <div class="trip-month">${t.month}</div>
    </div>
  `).join('');
}

// ── Trip (place list) ─────────────────────────────────────
function loadTrip(tripId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;
  state.currentTrip = trip;

  updateHeader(trip.title, trip.destination, true, () => loadHome());
  showScreen('screen-trip');

  const list = document.getElementById('places-list');
  list.innerHTML = trip.places.map(p => `
    <div class="place-item" onclick="loadPlace('${p.id}')">
      ${p.image
        ? `<div class="place-thumb"><img src="${p.image}" alt="${p.name}" loading="lazy" /></div>`
        : `<div class="place-emoji">${p.emoji}</div>`
      }
      <div class="place-info">
        <div class="place-name">${p.name}</div>
        <div class="place-meta">
          <span class="place-day">${p.date}</span>
          <span class="place-time">${p.time}</span>
          <span class="place-category">· ${p.category}</span>
        </div>
      </div>
      <div class="place-arrow">›</div>
    </div>
  `).join('');
}

// ── Place Detail ──────────────────────────────────────────
function loadPlace(placeId) {
  const place = state.currentTrip.places.find(p => p.id === placeId);
  if (!place) return;
  state.currentPlace = place;

  stopAudio();

  updateHeader(place.name, state.currentTrip.title, true, () => loadTrip(state.currentTrip.id));
  showScreen('screen-place');

  const isZh = state.currentTrip.language === 'zh';

  const imageHtml = place.image
    ? `<div class="detail-image-wrap">
        <img class="detail-image" src="${place.image}" alt="${place.name}" />
        <div class="detail-image-overlay"></div>
       </div>`
    : `<div class="detail-image-wrap">
        <div class="detail-image-placeholder">${place.emoji}</div>
       </div>`;

  document.getElementById('place-detail').innerHTML = `
    ${imageHtml}

    <div class="detail-inner">
      <div class="detail-hero">
        <div class="detail-emoji">${place.emoji}</div>
        <div class="detail-name">${place.name}</div>
        <div class="detail-meta">
          <span class="badge badge-day">${place.date}</span>
          <span class="badge badge-time">${place.time}</span>
          <span class="badge badge-cat">${place.category}</span>
        </div>
      </div>

      <div class="audio-player" id="audio-player">
        <button class="play-btn" id="play-btn" onclick="toggleAudio()">▶</button>
        <div class="audio-info">
          <div class="audio-label">${isZh ? '语音导览' : 'Audio Guide'}</div>
          <div class="audio-status" id="audio-status">${isZh ? '点击播放' : 'Tap to play'}</div>
          <div class="audio-progress"><div class="audio-progress-fill" id="audio-progress-fill"></div></div>
        </div>
      </div>

      <div class="section-card">
        <h3><span class="icon">✨</span>${isZh ? '为什么值得来' : "Why It's Worth It"}</h3>
        <p class="hook-text">${place.hook}</p>
      </div>

      <div class="section-card">
        <h3><span class="icon">📋</span>${isZh ? '实用贴士' : 'Practical Tips'}</h3>
        <ul class="tip-list">
          ${place.practical.map(t => `<li>${t}</li>`).join('')}
        </ul>
      </div>

      <div class="section-card">
        <h3><span class="icon">🥗</span>${isZh ? '素食 & 美食' : 'Food Highlights'}</h3>
        <ul class="food-list">
          ${place.food.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ── Audio ─────────────────────────────────────────────────
let audioEl = null;

function toggleAudio() {
  if (state.speaking) {
    stopAudio();
  } else {
    playAudio();
  }
}

function playAudio() {
  stopAudio();
  const place = state.currentPlace;
  const trip = state.currentTrip;
  const isZh = trip.language === 'zh';
  const mp3 = `audio/${trip.id}-${place.id}.mp3`;

  audioEl = new Audio(mp3);

  audioEl.addEventListener('canplay', () => {
    setAudioUI('playing', isZh);
    audioEl.play();
    state.speaking = true;
  });

  audioEl.addEventListener('timeupdate', () => {
    if (!audioEl.duration) return;
    const pct = (audioEl.currentTime / audioEl.duration) * 100;
    const fill = document.getElementById('audio-progress-fill');
    if (fill) fill.style.width = pct + '%';
  });

  audioEl.addEventListener('ended', () => {
    state.speaking = false;
    setAudioUI('done', isZh);
    const fill = document.getElementById('audio-progress-fill');
    if (fill) fill.style.width = '100%';
  });

  audioEl.addEventListener('error', () => {
    // MP3 not found — fall back to Web Speech API
    audioEl = null;
    playWebSpeech(place, isZh);
  });

  audioEl.load();
}

function stopAudio() {
  if (audioEl) { audioEl.pause(); audioEl.src = ''; audioEl = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  state.speaking = false;
  const isZh = state.currentTrip?.language === 'zh';
  setAudioUI('idle', isZh);
  const fill = document.getElementById('audio-progress-fill');
  if (fill) fill.style.width = '0%';
}

function setAudioUI(mode, isZh) {
  const btn = document.getElementById('play-btn');
  const status = document.getElementById('audio-status');
  if (!btn || !status) return;
  if (mode === 'playing') {
    btn.textContent = '⏸';
    status.textContent = isZh ? '正在播放…' : 'Playing…';
  } else if (mode === 'done') {
    btn.textContent = '▶';
    status.textContent = isZh ? '播放完毕 ✓' : 'Done ✓';
  } else {
    btn.textContent = '▶';
    status.textContent = isZh ? '点击播放' : 'Tap to play';
  }
}

// Web Speech API fallback (used when MP3 not yet generated)
function playWebSpeech(place, isZh) {
  if (!window.speechSynthesis) return;
  const foodItems = place.food.filter(f => !f.startsWith('📖'));
  const script = isZh
    ? `${place.name}！${place.hook} 实用贴士：${place.practical.join('。')}。美食推荐：${foodItems.join('。')}。`
    : `${place.name}! ${place.hook} Tips: ${place.practical.join('. ')}. Food: ${foodItems.join('. ')}.`;

  const utt = new SpeechSynthesisUtterance(script);
  utt.lang = isZh ? 'zh-CN' : 'en-US';
  utt.rate = 1.0; utt.pitch = 1.1;

  const voices = window.speechSynthesis.getVoices();
  const prefs = isZh ? ['Meijia', 'Tingting', 'zh-TW', 'zh-CN'] : ['Samantha', 'Karen', 'en-AU', 'en-US'];
  for (const p of prefs) {
    const v = voices.find(v => v.name === p || v.lang === p || v.name.includes(p));
    if (v) { utt.voice = v; break; }
  }

  let start = Date.now();
  const approxMs = script.length * (isZh ? 160 : 55);
  const interval = setInterval(() => {
    if (!state.speaking) { clearInterval(interval); return; }
    const pct = Math.min(95, ((Date.now() - start) / approxMs) * 100);
    const fill = document.getElementById('audio-progress-fill');
    if (fill) fill.style.width = pct + '%';
  }, 300);

  utt.onend = () => { clearInterval(interval); state.speaking = false; setAudioUI('done', isZh); };
  utt.onerror = () => { clearInterval(interval); stopAudio(); };

  state.speaking = true;
  setAudioUI('playing', isZh);
  window.speechSynthesis.speak(utt);
}

// ── Header ────────────────────────────────────────────────
function updateHeader(title, subtitle, showBack, backFn) {
  document.getElementById('header-title').textContent = title;
  document.getElementById('header-subtitle').textContent = subtitle;
  const back = document.getElementById('header-back');
  if (showBack && backFn) {
    back.style.display = 'flex';
    back.onclick = () => { stopAudio(); backFn(); };
  } else {
    back.style.display = 'none';
  }
}

// ── Init ──────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/tour-guide/sw.js');
}

loadHome();
