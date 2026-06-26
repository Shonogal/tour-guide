const TRIPS_MANIFEST = [
  { id: 'chongqing-2026-08', emoji: '🌶️', file: 'trips/chongqing-2026-08.json' }
];

let state = { trips: [], currentTrip: null, currentPlace: null, tts: null, speaking: false };

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
      <div class="place-emoji">${p.emoji}</div>
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

  document.getElementById('place-detail').innerHTML = `
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
      <h3><span class="icon">✨</span>${isZh ? '为什么值得来' : 'Why It\'s Worth It'}</h3>
      <p class="hook-text">${place.hook}</p>
    </div>

    <div class="section-card">
      <h3><span class="icon">📋</span>${isZh ? '实用贴士' : 'Practical Tips'}</h3>
      <ul class="tip-list">
        ${place.practical.map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>

    <div class="section-card">
      <h3><span class="icon">🍜</span>${isZh ? '美食推荐' : 'Food Highlights'}</h3>
      <ul class="food-list">
        ${place.food.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ── Audio (TTS) ───────────────────────────────────────────
function buildScript(place, isZh) {
  if (isZh) {
    return `${place.name}。${place.hook} 实用提示：${place.practical.join('。')}。美食推荐：${place.food.join('。')}。`;
  }
  return `${place.name}. ${place.hook} Practical tips: ${place.practical.join('. ')}. Food highlights: ${place.food.join('. ')}.`;
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
  utt.rate = 0.92;
  utt.pitch = 1;

  let start = Date.now();
  const approxDuration = script.length * (isZh ? 180 : 60);

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
    if (status) status.textContent = isZh ? '播放完毕' : 'Finished';
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

loadHome();
