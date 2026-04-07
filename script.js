/* =========================================
   AgroSense  |  script.js
   All navigation, charts, voice AI and
   disease simulation logic.
   i18n.js must load before this file.
========================================= */

/* ── STATE ── */
var farmer = { name: 'Raju Patil', crop: 'Tomato', acres: '5' };
var voiceOpen       = false;
var chartsBuilt     = false;
var cropChartsBuilt = false;
var diseaseSimmed   = false;
var aiIdx           = 0;

var aiReplies = [
  'Your tomato crop at Day 67 is in the flowering stage. Light irrigation every 3 days is ideal. Avoid overhead watering to prevent fungal issues.',
  'Tomato prices at Pune APMC are ₹24/kg, up 8% this week. Best window to sell: Apr 7–12 when prices may peak at ₹26–28/kg.',
  'Late blight risk is HIGH this week due to 72% humidity. Apply Mancozeb 75 WP @ 2g/litre immediately. Avoid spraying before forecast rain.',
  'Farm health score is 82/100 — Good range! Continue current NPK schedule. Watch for yellow patches on lower leaves in next 5 days.',
  'Friday forecast shows 20mm rainfall. Postpone fertiliser application by 3–4 days. Check field drainage to avoid waterlogging.'
];

/* =========================================
   SCREEN NAVIGATION
========================================= */
function goPage(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('active');
  });
  var target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  } else {
    console.error('goPage: cannot find element #' + id);
    return;
  }
  if (id === 'pg-dash') {
    updateFarmerUI();
    buildHomeCharts();
  }
  /* re-apply translations each time a new page becomes visible */
  if (typeof applyTranslations === 'function') applyTranslations();
}

/* =========================================
   SAVE SETUP FORM AND ENTER DASHBOARD
========================================= */
function enterDashboard() {
  var nEl = document.getElementById('inp-name');
  var cEl = document.getElementById('inp-crop');
  var aEl = document.getElementById('inp-acres');

  farmer.name  = (nEl && nEl.value.trim())  ? nEl.value.trim() : 'Farmer';
  farmer.crop  = (cEl)                       ? cEl.value        : 'Tomato';
  farmer.acres = (aEl && aEl.value.trim())   ? aEl.value.trim() : '5';

  goPage('pg-dash');
}

/* =========================================
   SYNC FARMER NAME/CROP ACROSS UI
========================================= */
function updateFarmerUI() {
  var words    = farmer.name.trim().split(/\s+/);
  var initials = words.map(function (w) { return w.charAt(0); }).join('').toUpperCase().slice(0, 2);

  var map = {
    'sb-av':    initials,
    'tb-av':    initials,
    'sb-name':  farmer.name,
    'tb-name':  farmer.name,
    'hero-name': farmer.name
  };

  Object.keys(map).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = map[id];
  });

  var sbCrop = document.getElementById('sb-crop');
  if (sbCrop) sbCrop.textContent = farmer.crop + ' · ' + farmer.acres + ' acres';

  var crCrop = document.getElementById('cr-crop');
  if (crCrop) crCrop.textContent = '🌾 ' + farmer.crop;

  var crAcres = document.getElementById('cr-acres');
  if (crAcres) crAcres.textContent = farmer.acres + ' Acres';
}

/* =========================================
   DASHBOARD SECTION SWITCHING
========================================= */
var sectionTitles = {
  home:     'Farm Overview',
  crops:    'Crop Recommendations',
  disease:  'Disease Detection',
  alerts:   'Alerts & Notifications',
  settings: 'Settings'
};
var sectionOrder = ['home', 'crops', 'disease', 'alerts', 'settings'];

/* map section → i18n key for the topbar title */
var sectionTitleKeys = {
  home:     'title_home',
  crops:    'title_crops',
  disease:  'title_disease',
  alerts:   'title_alerts',
  settings: 'title_settings'
};

function showSection(name, navEl) {
  /* hide all sections */
  document.querySelectorAll('.dash-section').forEach(function (s) {
    s.classList.remove('on');
  });

  /* show the requested section */
  var sec = document.getElementById('sec-' + name);
  if (sec) {
    sec.classList.add('on');
  } else {
    console.error('showSection: cannot find #sec-' + name);
    return;
  }

  /* highlight nav item */
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.remove('on');
  });
  if (navEl) {
    navEl.classList.add('on');
  } else {
    var idx   = sectionOrder.indexOf(name);
    var items = document.querySelectorAll('.nav-item');
    if (items[idx]) items[idx].classList.add('on');
  }

  /* update topbar title — use i18n key if available */
  var tb = document.getElementById('tb-title');
  if (tb) {
    var key = sectionTitleKeys[name];
    if (key && typeof t === 'function') {
      tb.textContent = t(key);
      tb.setAttribute('data-i18n-live', key);
    } else {
      tb.textContent = sectionTitles[name] || name;
    }
  }

  /* lazy-build crop charts first time */
  if (name === 'crops') buildCropCharts();
}

/* =========================================
   LANGUAGE SWITCHER  — defined in i18n.js
   (setLang is fully handled there, but we
   keep a no-op shim here in case i18n.js
   hasn't loaded yet for any reason)
========================================= */
if (typeof setLang === 'undefined') {
  function setLang(btn) {
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.classList.remove('on'); });
    if (btn) btn.classList.add('on');
  }
}

/* =========================================
   VOICE AI PANEL
========================================= */
function toggleVoice() {
  voiceOpen = !voiceOpen;
  var panel = document.getElementById('vpanel');
  var btn   = document.getElementById('vfab-btn');
  if (panel) panel.classList.toggle('open', voiceOpen);
  if (btn)   btn.classList.toggle('pulse', voiceOpen);
}

function sendVoice() {
  var inp  = document.getElementById('vp-inp');
  var msgs = document.getElementById('vp-msgs');
  if (!inp || !msgs) return;

  var text = inp.value.trim();
  if (!text) return;

  /* user bubble */
  var um = document.createElement('div');
  um.className   = 'vmsg usr';
  um.textContent = text;
  msgs.appendChild(um);
  inp.value = '';
  msgs.scrollTop = msgs.scrollHeight;

  /* AI reply */
  setTimeout(function () {
    var am = document.createElement('div');
    am.className   = 'vmsg ai';
    am.textContent = aiReplies[aiIdx % aiReplies.length];
    aiIdx++;
    msgs.appendChild(am);
    msgs.scrollTop = msgs.scrollHeight;
  }, 750);
}

/* =========================================
   HOME CHARTS  (Yield + Profit)
========================================= */
function buildHomeCharts() {
  if (chartsBuilt) return;
  chartsBuilt = true;

  var yCtx = document.getElementById('yieldChart');
  var pCtx = document.getElementById('profitChart');
  if (!yCtx || !pCtx) return;

  new Chart(yCtx, {
    type: 'line',
    data: {
      labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      datasets: [{
        data: [0, 200, 800, 2400, 4100, 4750],
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(102,187,106,.12)',
        fill: true, tension: .4,
        pointRadius: 4, pointBackgroundColor: '#2e7d32'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: function (v) { return v + 'kg'; } }, grid: { color: 'rgba(0,0,0,.04)' } }
      }
    }
  });

  new Chart(pCtx, {
    type: 'bar',
    data: {
      labels: ['Seeds & Input', 'Labour', 'Gross Revenue', 'Net Profit'],
      datasets: [{
        data: [32000, 8000, 114000, 74000],
        backgroundColor: ['#fca5a5', '#fcd34d', '#86efac', '#2e7d32'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: function (v) { return '₹' + Math.round(v / 1000) + 'K'; } }, grid: { color: 'rgba(0,0,0,.04)' } }
      }
    }
  });
}

/* =========================================
   CROP SECTION CHARTS  (lazy)
========================================= */
function buildCropCharts() {
  if (cropChartsBuilt) return;
  cropChartsBuilt = true;

  var wCtx = document.getElementById('weatherChart');
  var mCtx = document.getElementById('marketChart');
  var plCtx= document.getElementById('plChart');
  if (!wCtx || !mCtx || !plCtx) return;

  new Chart(wCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        { label: 'Temp °C',   data: [26,28,30,27,25,29,31], backgroundColor: 'rgba(102,187,106,.75)', borderRadius: 4 },
        { label: 'Humidity %',data: [68,72,70,75,80,71,65], backgroundColor: 'rgba(46,125,50,.25)',  borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }
  });

  new Chart(mCtx, {
    type: 'line',
    data: {
      labels: ['Mar 20', 'Mar 25', 'Apr 1', 'Apr 3', 'Apr 5'],
      datasets: [
        { label: 'Tomato', data: [18,20,21,22,24], borderColor: '#e53935', fill: false, tension: .4, pointRadius: 4, pointBackgroundColor: '#e53935' },
        { label: 'Chilli',  data: [115,112,108,113,110], borderColor: '#f59e0b', fill: false, tension: .4, pointRadius: 4, pointBackgroundColor: '#f59e0b' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }
  });

  new Chart(plCtx, {
    type: 'doughnut',
    data: {
      labels: ['Seeds & Input', 'Labour', 'Net Revenue'],
      datasets: [{ data: [32000, 8000, 114000], backgroundColor: ['#fca5a5','#fcd34d','#2e7d32'], borderWidth: 0, hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } } }
  });
}

/* =========================================
   DISEASE DETECTION SIMULATION
========================================= */
function simDisease() {
  if (diseaseSimmed) return;
  diseaseSimmed = true;

  var uIcon = document.getElementById('u-icon');
  var uText = document.getElementById('u-text');
  var uSub  = document.getElementById('u-sub');

  if (uIcon) uIcon.textContent = '⏳';
  if (uText) {
    uText.textContent = typeof t === 'function' ? t('dis_analysing') : 'Analysing with AI…';
    uText.setAttribute('data-i18n-live', 'dis_analysing');
  }
  if (uSub) {
    uSub.textContent = typeof t === 'function' ? t('dis_scanning') : 'Scanning 47 disease patterns…';
    uSub.setAttribute('data-i18n-live', 'dis_scanning');
  }

  setTimeout(function () {
    var panel = document.getElementById('dis-result');
    if (!panel) return;

    panel.innerHTML = [
      '<div class="card" style="animation:fadeInUp .4s ease">',
      '<style>@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style>',

      /* header */
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem;padding-bottom:.875rem;border-bottom:1px solid #d4e6d4">',
        '<div style="width:44px;height:44px;background:#fee2e2;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0">🍂</div>',
        '<div>',
          '<div style="font-weight:800;font-size:1rem;color:#dc2626">Late Blight Detected</div>',
          '<div style="font-size:.76rem;color:#718096">Phytophthora infestans · 91% confidence</div>',
        '</div>',
        '<span class="badge bdg-r" style="margin-left:auto">High Risk</span>',
      '</div>',

      /* symptoms */
      '<div style="margin-bottom:.875rem">',
        '<div style="font-size:.74rem;font-weight:700;color:#4a5568;margin-bottom:.4rem">SYMPTOMS IDENTIFIED</div>',
        '<span class="tag">Brown patches</span><span class="tag">Leaf lesions</span><span class="tag">White sporulation</span>',
      '</div>',

      /* treatments */
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.875rem">',
        '<div style="padding:.8rem;background:#fef3c7;border-radius:10px;border:1px solid #fbbf24">',
          '<div style="font-size:.72rem;font-weight:800;color:#92400e;margin-bottom:.35rem">🧪 CHEMICAL</div>',
          '<div style="font-size:.78rem;color:#78350f;line-height:1.6">• Mancozeb 75 WP @ 2g/L<br>• Metalaxyl 8% @ 1.5g/L<br>• Every 7–10 days<br>• Stop 14d before harvest</div>',
        '</div>',
        '<div style="padding:.8rem;background:#dcfce7;border-radius:10px;border:1px solid #86efac">',
          '<div style="font-size:.72rem;font-weight:800;color:#166534;margin-bottom:.35rem">🌿 ORGANIC</div>',
          '<div style="font-size:.78rem;color:#14532d;line-height:1.6">• Copper hydroxide @ 3g/L<br>• Neem oil 1500ppm @ 5mL/L<br>• Trichoderma viride<br>• Spray at dusk</div>',
        '</div>',
      '</div>',

      /* buy nearby */
      '<div style="font-size:.74rem;font-weight:700;color:#4a5568;margin-bottom:.5rem">🛒 BUY NEARBY</div>',
      '<div style="display:flex;flex-direction:column;gap:.45rem">',

        '<div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .8rem;background:#f0f7f0;border-radius:8px">',
          '<div><div style="font-size:.8rem;font-weight:600">Mancozeb 75 WP – 1 kg</div><div style="font-size:.72rem;color:#718096">Agro Centre, Hadapsar · 2.4 km</div></div>',
          '<div style="text-align:right"><div style="font-size:.85rem;font-weight:800;color:#2e7d32">₹280</div>',
          '<button class="btn btn-p btn-sm" style="margin-top:.2rem">Buy</button></div>',
        '</div>',

        '<div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .8rem;background:#f0f7f0;border-radius:8px">',
          '<div><div style="font-size:.8rem;font-weight:600">Metalaxyl 8% WP – 500 g</div><div style="font-size:.72rem;color:#718096">Kissan Agri Store · 4.1 km</div></div>',
          '<div style="text-align:right"><div style="font-size:.85rem;font-weight:800;color:#2e7d32">₹195</div>',
          '<button class="btn btn-p btn-sm" style="margin-top:.2rem">Buy</button></div>',
        '</div>',

      '</div>',
      '</div>'
    ].join('');

    if (uIcon) uIcon.textContent = '✅';
    if (uText) {
      uText.textContent = typeof t === 'function' ? t('dis_done') : 'Analysis complete';
      uText.setAttribute('data-i18n-live', 'dis_done');
    }
    if (uSub) {
      uSub.textContent = typeof t === 'function' ? t('dis_rescan') : 'Click to scan another image';
      uSub.setAttribute('data-i18n-live', 'dis_rescan');
    }
  }, 1800);
}
