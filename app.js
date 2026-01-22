/*
Copyright © 2026 monterto
Licensed under the PolyForm Noncommercial License 1.0.0.
Commercial use is prohibited.
*/

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const DEFAULT_STATE = {
  dark: true,
  trackRest: true,
  guard: true,
  ghostHand: true,
  thickerHands: true,
  hands: [
    { color: '#ff4d4d', offset: 0 },
    { color: '#4da3ff', offset: 15 },
    { color: '#4dff88', offset: 30 },
    { color: '#ffd24d', offset: 45 }
  ],
  ghost: null,
  laps: [],
  lastTap: null,
  sessionStart: null,
  mode: 'rest',
  hasCompletedLap: false,
  lastSplit: 0,
  timerRunning: false,
  digitalTimerRunning: false,
  isFinished: false,
  lapCount: 1
};

const state = { ...DEFAULT_STATE };

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

function loadSettings() {
  try {
    const saved = localStorage.getItem('clockSettings');
    if (saved) {
      const s = JSON.parse(saved);
      state.dark = s.dark ?? state.dark;
      state.trackRest = s.trackRest ?? state.trackRest;
      state.guard = s.guard ?? state.guard;
      state.ghostHand = s.ghostHand ?? state.ghostHand;
      state.thickerHands = s.thickerHands ?? state.thickerHands;
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function saveSettings() {
  try {
    const settings = {
      dark: state.dark,
      trackRest: state.trackRest,
      guard: state.guard,
      ghostHand: state.ghostHand,
      thickerHands: state.thickerHands
    };
    localStorage.setItem('clockSettings', JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

function formatDateForXML(date) {
  return date.toISOString();
}

function exportWorkout(sessionName = null) {
  if (state.laps.length === 0) {
    alert('No workout data to export');
    return;
  }

  const sessionStart = new Date(state.sessionStart);
  const sessionEnd = new Date();
  
  // Default session name if not provided
  if (!sessionName) {
    sessionName = formatDateForFilename(sessionStart);
  }

  // Build XML spreadsheet (SpreadsheetML format)
  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += ' <Worksheet ss:Name="Workout">\n';
  xml += '  <Table>\n';
  
  // Header row
  xml += '   <Row>\n';
  xml += '    <Cell><Data ss:Type="String">Session Name</Data></Cell>\n';
  xml += `    <Cell><Data ss:Type="String">${escapeXml(sessionName)}</Data></Cell>\n`;
  xml += '   </Row>\n';
  
  xml += '   <Row>\n';
  xml += '    <Cell><Data ss:Type="String">Session Start</Data></Cell>\n';
  xml += `    <Cell><Data ss:Type="String">${formatDateForXML(sessionStart)}</Data></Cell>\n`;
  xml += '   </Row>\n';
  
  xml += '   <Row>\n';
  xml += '    <Cell><Data ss:Type="String">Session End</Data></Cell>\n';
  xml += `    <Cell><Data ss:Type="String">${formatDateForXML(sessionEnd)}</Data></Cell>\n`;
  xml += '   </Row>\n';
  
  xml += '   <Row>\n';
  xml += '    <Cell><Data ss:Type="String">Total Duration</Data></Cell>\n';
  xml += `    <Cell><Data ss:Type="String">${fmt(sessionEnd - sessionStart)}</Data></Cell>\n`;
  xml += '   </Row>\n';
  
  // Empty row
  xml += '   <Row/>\n';
  
  // Column headers
  xml += '   <Row>\n';
  xml += '    <Cell><Data ss:Type="String">Number</Data></Cell>\n';
  xml += '    <Cell><Data ss:Type="String">Type</Data></Cell>\n';
  xml += '    <Cell><Data ss:Type="String">Duration</Data></Cell>\n';
  xml += '    <Cell><Data ss:Type="String">Milliseconds</Data></Cell>\n';
  xml += '   </Row>\n';
  
  // Data rows
  state.laps.forEach((lap, i) => {
    xml += '   <Row>\n';
    xml += `    <Cell><Data ss:Type="Number">${lap.number || i + 1}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${lap.type}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="String">${fmt(lap.time)}</Data></Cell>\n`;
    xml += `    <Cell><Data ss:Type="Number">${lap.time}</Data></Cell>\n`;
    xml += '   </Row>\n';
  });
  
  xml += '  </Table>\n';
  xml += ' </Worksheet>\n';
  xml += '</Workbook>';

  // Create and download file
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sessionName}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// WAKE LOCK MANAGEMENT
// ============================================================================

let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock released');
      });
    }
  } catch (err) {
    console.error('Error requesting wake lock:', err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
    }).catch(err => console.error('Error releasing wake lock:', err));
  }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

function fmt(ms) {
  const t = Math.floor(ms / 100);
  return `${String(Math.floor(t / 600)).padStart(2, '0')}:${String(Math.floor(t / 10) % 60).padStart(2, '0')}.${t % 10}`;
}

// ============================================================================
// CLOCK RENDERING
// ============================================================================

function drawClock() {
  const canvas = document.getElementById('clock');
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, 360, 360);
  const cx = 180, cy = 180, r = 162;

  // Background
  ctx.fillStyle = state.dark ? '#0b0f14' : '#f2f2f2';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.lineWidth = 4;
  ctx.strokeStyle = state.dark ? '#444' : '#111';
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    ctx.lineWidth = isMajor ? 3 : 1;
    ctx.strokeStyle = state.dark ? '#555' : '#111';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r - (isMajor ? 28 : 14)), cy + Math.sin(a) * (r - (isMajor ? 28 : 14)));
    ctx.stroke();
  }

  // Numbers
  ctx.fillStyle = state.dark ? '#9aa4b2' : '#000';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let n = 5; n <= 60; n += 5) {
    const a = n * Math.PI / 30 - Math.PI / 2;
    ctx.fillText(n, cx + Math.cos(a) * (r - 52), cy + Math.sin(a) * (r - 52));
  }

  // Clock hands
  const base = (Date.now() / 1000) % 60;
  const length = r - 28;
  const baseWidth = state.thickerHands ? 6 : 3;

  state.hands.forEach(h => {
    const s = (base + h.offset) % 60;
    const a = s * Math.PI / 30 - Math.PI / 2;

    // Outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = baseWidth + 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * length, cy + Math.sin(a) * length);
    ctx.stroke();

    // Colored hand
    ctx.strokeStyle = h.color;
    ctx.lineWidth = baseWidth;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * length, cy + Math.sin(a) * length);
    ctx.stroke();
  });

  // Ghost hand
  if (state.ghost && state.ghostHand) {
    const a = state.ghost.seconds * Math.PI / 30 - Math.PI / 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = state.ghost.color;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Center dot
  ctx.fillStyle = state.dark ? '#777' : '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
}

// ============================================================================
// GHOST HAND CALCULATION
// ============================================================================

function calculateGhostHand(now) {
  const base = (now / 1000) % 60;
  let best = null;
  let minDistance = Infinity;

  // Find hand closest to top (0/60 seconds)
  state.hands.forEach(h => {
    const s = (base + h.offset) % 60;
    
    // Check if in top window (45-60 or 0-2)
    if ((s >= 45 && s <= 60) || (s >= 0 && s <= 2)) {
      const distance = s <= 2 ? s : 60 - s;
      if (distance < minDistance) {
        minDistance = distance;
        best = { seconds: s, color: h.color };
      }
    }
  });

  // Fallback: snap nearest hand to top
  if (!best) {
    let closest = state.hands[0];
    let closestDist = Math.min(
      (base + closest.offset) % 60,
      60 - ((base + closest.offset) % 60)
    );

    state.hands.forEach(h => {
      const s = (base + h.offset) % 60;
      const d = Math.min(s, 60 - s);
      if (d < closestDist) {
        closest = h;
        closestDist = d;
      }
    });

    best = { seconds: 0, color: closest.color };
  }

  return best;
}

// ============================================================================
// TIMER MANAGEMENT
// ============================================================================

const MIN_PRESS = 1000;
const RESET_HOLD_TIME = 1500; // 1.5 seconds - fast enough for intentional, slow enough to prevent accidents
let digitalTimerInterval = null;

function startDigitalTimer() {
  if (digitalTimerInterval) return;
  
  digitalTimerInterval = setInterval(() => {
    if (state.lastTap && !state.isFinished) {
      const now = Date.now();
      digital.textContent = fmt(now - state.lastTap);
      totalClock.textContent = fmt(now - state.sessionStart);
    }
  }, 100);
}

function stopDigitalTimer() {
  if (digitalTimerInterval) {
    clearInterval(digitalTimerInterval);
    digitalTimerInterval = null;
  }
}

// ============================================================================
// LAP MANAGEMENT
// ============================================================================

function addRow(lap) {
  if (lap.type === 'rest' && !state.trackRest) return;

  let delta = '', cls = '';
  
  if (lap.type === 'lap') {
    const lapsOnly = state.laps.filter(x => x.type === 'lap');
    if (lapsOnly.length > 1) {
      const prev = lapsOnly[lapsOnly.length - 2].time;
      const diff = lap.time - prev;
      delta = (diff < 0 ? '-' : '+') + fmt(Math.abs(diff));
      cls = diff < 0 ? 'fast' : 'slow';
    }
  }

  const row = document.createElement('div');
  row.className = 'row' + (lap.type === 'rest' ? ' rest' : '');
  row.innerHTML = `
    <span>${lap.type === 'lap' ? `Lap ${lap.number}` : 'Rest'}</span>
    <span>
      ${delta ? `<span class="delta ${cls}">${delta}</span>` : ''}
      ${fmt(lap.time)}
    </span>`;
  list.prepend(row);
}

function handleTap() {
  if (state.isFinished) return;

  const now = Date.now();
  
  // Initialize session
  if (!state.sessionStart) {
    state.sessionStart = now;
  }

  // Guard against accidental double-tap
  if (state.guard && state.lastTap && now - state.lastTap < MIN_PRESS) {
    return;
  }

  // Record lap
  if (state.lastTap) {
    const duration = now - state.lastTap;
    const lap = { 
      type: state.mode, 
      time: duration,
      number: state.mode === 'lap' ? state.lapCount++ : undefined
    };
    
    state.laps.push(lap);
    
    if (state.mode === 'lap') {
      state.hasCompletedLap = true;
    }
    
    addRow(lap);

    // Calculate split
    if (state.laps.length > 1) {
      const lastLap = state.laps[state.laps.length - 1];
      const prevLap = state.laps[state.laps.length - 2];
      state.lastSplit = lastLap.time - prevLap.time;
    }
  }

  state.lastTap = now;

  // Toggle mode
  if (state.trackRest && state.mode === 'lap') {
    state.mode = 'rest';
  } else if (state.mode === 'rest') {
    state.mode = 'lap';
  }

  digital.classList.toggle('rest', state.mode === 'rest');

  // Update ghost hand
  state.ghost = calculateGhostHand(now);

  // Start timer
  if (!state.digitalTimerRunning) {
    startDigitalTimer();
    state.digitalTimerRunning = true;
  }
}

// ============================================================================
// UI ELEMENTS
// ============================================================================

// Get DOM elements
const digital = document.getElementById('digital');
const totalClock = document.getElementById('totalClock');
const list = document.getElementById('list');
const toggleRestBtn = document.getElementById('toggleRestBtn');
const ghostToggle = document.getElementById('ghostToggle');
const thickerHandsToggle = document.getElementById('thickerHandsToggle');
const guardToggle = document.getElementById('guardToggle');
const darkToggle = document.getElementById('darkToggle');
const optionsBtn = document.getElementById('optionsBtn');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const options = document.getElementById('options');

// ============================================================================
// RESET BUTTON WITH HOLD INTERACTION
// ============================================================================

let resetHoldTimer = null;
let resetHoldStart = null;
let saveHoldTimer = null;
let saveHoldStart = null;

function startResetHold() {
  resetHoldStart = Date.now();
  resetBtn.classList.add('holding');
  
  resetHoldTimer = setTimeout(() => {
    // Reset completed
    resetBtn.classList.remove('holding');
    resetBtn.classList.add('reset-complete');
    setTimeout(() => {
      location.reload();
    }, 200);
  }, RESET_HOLD_TIME);
}

function cancelResetHold() {
  if (resetHoldTimer) {
    clearTimeout(resetHoldTimer);
    resetHoldTimer = null;
  }
  resetHoldStart = null;
  resetBtn.classList.remove('holding');
}

function startSaveHold() {
  saveHoldStart = Date.now();
  saveBtn.classList.add('holding');
  
  saveHoldTimer = setTimeout(() => {
    // Save completed
    saveBtn.classList.remove('holding');
    saveBtn.classList.add('save-complete');
    
    // Execute save
    stopDigitalTimer();
    state.isFinished = true;
    digital.textContent = 'Session Finished';
    totalClock.textContent = fmt(Date.now() - state.sessionStart);
    
    // Prompt for session name if there are laps
    if (state.laps.length > 0) {
      const sessionStart = new Date(state.sessionStart);
      const defaultName = formatDateForFilename(sessionStart);
      
      const sessionName = prompt('Enter a name for this session (or leave blank for default):', defaultName);
      
      if (sessionName !== null) { // User didn't cancel
        const finalName = sessionName.trim() || defaultName;
        exportWorkout(finalName);
      }
    }
    
    setTimeout(() => {
      saveBtn.classList.remove('save-complete');
    }, 500);
  }, RESET_HOLD_TIME);
}

function cancelSaveHold() {
  if (saveHoldTimer) {
    clearTimeout(saveHoldTimer);
    saveHoldTimer = null;
  }
  saveHoldStart = null;
  saveBtn.classList.remove('holding');
}

resetBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startResetHold();
});

resetBtn.addEventListener('pointerup', (e) => {
  e.preventDefault();
  cancelResetHold();
});

resetBtn.addEventListener('pointerleave', (e) => {
  cancelResetHold();
});

resetBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  cancelResetHold();
});

saveBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startSaveHold();
});

saveBtn.addEventListener('pointerup', (e) => {
  e.preventDefault();
  cancelSaveHold();
});

saveBtn.addEventListener('pointerleave', (e) => {
  cancelSaveHold();
});

saveBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  cancelSaveHold();
});

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function initializeUI() {
  darkToggle.checked = state.dark;
  toggleRestBtn.textContent = state.trackRest ? 'Rest ✓' : 'Rest ✗';
  digital.classList.toggle('rest', state.mode === 'rest');
  ghostToggle.checked = state.ghostHand;
  thickerHandsToggle.checked = state.thickerHands;
  guardToggle.checked = state.guard;
}

// Clock tap
const canvas = document.getElementById('clock');
canvas.addEventListener('pointerdown', handleTap);

// Prevent text selection on buttons and controls
const preventSelectElements = [canvas, resetBtn, saveBtn, toggleRestBtn, optionsBtn];
preventSelectElements.forEach(el => {
  el.addEventListener('selectstart', (e) => e.preventDefault());
  el.addEventListener('mousedown', (e) => {
    if (e.detail > 1) {
      e.preventDefault(); // Prevent double-click selection
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && !options.classList.contains('open')) {
    e.preventDefault();
    handleTap();
  } else if (e.key === 's' && e.ctrlKey) {
    e.preventDefault();
    // Simulate hold for keyboard save
    startSaveHold();
  } else if (e.key === 'Delete' && e.shiftKey) {
    e.preventDefault();
    // Simulate hold for keyboard reset
    startResetHold();
  }
});

// Finish with session name prompt - REMOVED, now handled by hold interaction

// Options
optionsBtn.onclick = () => options.classList.add('open');

// Dark mode toggle
darkToggle.onchange = e => {
  state.dark = e.target.checked;
  saveSettings();
};

// Rest tracking toggle
toggleRestBtn.addEventListener('click', () => {
  state.trackRest = !state.trackRest;

  if (!state.trackRest) {
    state.mode = 'lap';
  } else if (state.mode === 'lap') {
    state.mode = 'rest';
  }

  toggleRestBtn.textContent = state.trackRest ? 'Rest ✓' : 'Rest ✗';
  digital.classList.toggle('rest', state.mode === 'rest');
  saveSettings();
});

// Ghost hand toggle
ghostToggle.onchange = () => {
  state.ghostHand = ghostToggle.checked;
  saveSettings();
};

// Thicker hands toggle
thickerHandsToggle.onchange = () => {
  state.thickerHands = thickerHandsToggle.checked;
  saveSettings();
};

// Guard toggle
guardToggle.onchange = e => {
  state.guard = e.target.checked;
  saveSettings();
};

// Visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

loadSettings();
initializeUI();
requestWakeLock();

(function render() {
  drawClock();
  requestAnimationFrame(render);
})();
