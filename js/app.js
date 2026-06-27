const TRIPS_MANIFEST = [
  { id: 'chongqing-2026-08', emoji: '🌶️', file: 'trips/chongqing-2026-08.json' }
];

let state = { trips: [], currentTrip: null, currentPlace: null, tts: null, speaking: false };
let availableVoices = [];

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

// ── Audio (TTS) ───────────────────────────────────────────
function initVoices() {
  const load = () => { availableVoices = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.onvoiceschanged = load;
  // iOS unlock: fire a silent utterance on first touch so voices become available
  document.addEventListener('touchstart', function unlock() {
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    window.speechSynthesis.cancel();
    availableVoices = window.speechSynthesis.getVoices();
    document.removeEventListener('touchstart', unlock);
  }, { once: true });
}

function getVoice(lang) {
  const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

  if (lang === 'zh') {
    // On iOS: Meijia (zh-TW) sounds warmer and more natural than Tingting (zh-CN)
    const zhPrefs = ['Meijia', 'Tingting', 'zh-TW', 'zh-CN', 'zh'];
    for (const p of zhPrefs) {
      const v = voices.find(v => v.name === p || v.lang === p || v.name.includes(p));
      if (v) return v;
    }
    // Fallback: any Chinese voice
    return voices.find(v => v.lang.startsWith('zh')) || null;
  } else {
    const enPrefs = ['Samantha', 'Karen', 'Moira', 'Serena', 'en-AU', 'en-GB', 'en-US'];
    for (const p of enPrefs) {
      const v = voices.find(v => v.name === p || v.lang === p || v.name.includes(p));
      if (v) return v;
    }
    return voices.find(v => v.lang.startsWith('en')) || null;
  }
}

function buildScript(place, isZh) {
  if (isZh) {
    return `${place.name}！${place.hook} 实用小贴士：${place.practical.join('。')}。素食和美食：${place.food.join('。')}。`;
  }
  return `${place.name}! ${place.hook} Here are some tips: ${place.practical.join('. ')}. Food highlights: ${place.food.join('. ')}.`;
}

function toggleAudio() {
  if (state.speaking) {
    stopAudio();
  } else {
    playAudio();
  }
}

function playAudio() {
  if (!window.speechSynthesis) return;
  stopAudio();

  const place = state.currentPlace;
  const isZh = state.currentTrip.language === 'zh';
  const script = buildScript(place, isZh);

  const utt = new SpeechSynthesisUtterance(script);
  utt.lang = isZh ? 'zh-CN' : 'en-US';
  utt.rate = 1.05;   // slightly faster = livelier
  utt.pitch = 1.15;  // slightly higher = younger, friendlier

  const voice = getVoice(isZh ? 'zh' : 'en');
  if (voice) utt.voice = voice;

  let start = Date.now();
  const approxDuration = script.length * (isZh ? 160 : 55);

  const progressInterval = setInterval(() => {
    if (!state.speaking) { clearInterval(progressInterval); return; }
    const pct = Math.min(100, ((Date.now() - start) / approxDuration) * 100);
    const fill = document.getElementById('audio-progress-fill');
    if (fill) fill.style.width = pct + '%';
  }, 200);

  utt.onend = () => {
    clearInterval(progressInterval);
    state.speaking = false;
    state.tts = null;
    const btn = document.getElementById('play-btn');
    const status = document.getElementById('audio-status');
    const fill = document.getElementById('audio-progress-fill');
    if (btn) btn.textContent = '▶';
    if (status) status.textContent = isZh ? '播放完毕 ✓' : 'Done ✓';
    if (fill) fill.style.width = '100%';
  };

  utt.onerror = () => { clearInterval(progressInterval); stopAudio(); };

  state.tts = utt;
  state.speaking = true;
  window.speechSynthesis.speak(utt);

  const btn = document.getElementById('play-btn');
  const statusEl = document.getElementById('audio-status');
  if (btn) btn.textContent = '⏸';
  if (statusEl) statusEl.textContent = isZh ? '正在播放…' : 'Playing…';
}

function stopAudio() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  state.speaking = false;
  state.tts = null;
  const btn = document.getElementById('play-btn');
  const status = document.getElementById('audio-status');
  const fill = document.getElementById('audio-progress-fill');
  const isZh = state.currentTrip?.language === 'zh';
  if (btn) btn.textContent = '▶';
  if (status) status.textContent = isZh ? '点击播放' : 'Tap to play';
  if (fill) fill.style.width = '0%';
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

initVoices();
loadHome();
