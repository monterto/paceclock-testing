/*
Copyright © 2026 monterto
Licensed under the PolyForm Noncommercial License 1.0.0.
Commercial use is prohibited.
*/

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const DEFAULT_STATE = {
  currentMode: 'lapTimer',
  
  // Shared display settings
  display: {
    dark: true,
    ghostHand: true,
    thickerHands: true
  },
  
  // Lap timer state
  lapTimer: {
    trackRest: true,
    guard: true,
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
  },
  
  // Interval timer state
  intervalTimer: {
    countdown: 5,
    workTime: 60,
    restTime: 60,
    totalRounds: null,
    currentRound: 0,
    completedRounds: [],
    phase: 'waiting',
    timeRemaining: 0,
    beepEnabled: true,
    volume: 70,
    sessionStart: null,
    intervalStart: null,
    isPaused: false,
    ghostSeconds: null,
    lastBeep: null,
    pauseTime: null
  }
};

const state = JSON.parse(JSON.stringify(DEFAULT_STATE));

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

function loadSettings() {
  try {
    const saved = localStorage.getItem('clockSettings');
    if (saved) {
      const s = JSON.parse(saved);
      state.display.dark = s.dark ?? state.display.dark;
      state.lapTimer.trackRest = s.trackRest ?? state.lapTimer.trackRest;
      state.lapTimer.guard = s.guard ?? state.lapTimer.guard;
      state.display.ghostHand = s.ghostHand ?? state.display.ghostHand;
      state.display.thickerHands = s.thickerHands ?? state.display.thickerHands;
      state.currentMode = s.currentMode ?? state.currentMode;
      
      // Load interval timer settings
      if (s.intervalTimer) {
        state.intervalTimer.countdown = s.intervalTimer.countdown ?? state.intervalTimer.countdown;
        state.intervalTimer.workTime = s.intervalTimer.workTime ?? state.intervalTimer.workTime;
        state.intervalTimer.restTime = s.intervalTimer.restTime ?? state.intervalTimer.restTime;
        state.intervalTimer.totalRounds = s.intervalTimer.totalRounds ?? state.intervalTimer.totalRounds;
        state.intervalTimer.beepEnabled = s.intervalTimer.beepEnabled ?? state.intervalTimer.beepEnabled;
        state.intervalTimer.volume = s.intervalTimer.volume ?? state.intervalTimer.volume;
      }
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function saveSettings() {
  try {
    const settings = {
      dark: state.display.dark,
      trackRest: state.lapTimer.trackRest,
      guard: state.lapTimer.guard,
      ghostHand: state.display.ghostHand,
      thickerHands: state.display.thickerHands,
      currentMode: state.currentMode,
      intervalTimer: {
        countdown: state.intervalTimer.countdown,
        workTime: state.intervalTimer.workTime,
        restTime: state.intervalTimer.restTime,
        totalRounds: state.intervalTimer.totalRounds,
        beepEnabled: state.intervalTimer.beepEnabled,
        volume: state.intervalTimer.volume
      }
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
  if (state.lapTimer.laps.length === 0) {
    alert('No workout data to export');
    return;
  }

  const sessionStart = new Date(state.lapTimer.sessionStart);
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
  state.lapTimer.laps.forEach((lap, i) => {
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

let canvasElement = null;
let canvasContext = null;

function drawClock() {
  if (!canvasElement) {
    canvasElement = document.getElementById('clock');
    if (!canvasElement) {
      console.error('Canvas not found!');
      return;
    }
    canvasContext = canvasElement.getContext('2d');
  }
  
  const ctx = canvasContext;
  ctx.clearRect(0, 0, 360, 360);
  const cx = 180, cy = 180, r = 162;

  // Background
  ctx.fillStyle = state.display.dark ? '#0b0f14' : '#f2f2f2';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.lineWidth = 4;
  ctx.strokeStyle = state.display.dark ? '#444' : '#111';
  ctx.stroke();

  // Tick marks
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30 - Math.PI / 2;
    const isMajor = i % 5 === 0;
    ctx.lineWidth = isMajor ? 3 : 1;
    ctx.strokeStyle = state.display.dark ? '#555' : '#111';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r - (isMajor ? 28 : 14)), cy + Math.sin(a) * (r - (isMajor ? 28 : 14)));
    ctx.stroke();
  }

  // Numbers
  ctx.fillStyle = state.display.dark ? '#9aa4b2' : '#000';
  ctx.font = 'bold 28px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let n = 5; n <= 60; n += 5) {
    const a = n * Math.PI / 30 - Math.PI / 2;
    ctx.fillText(n, cx + Math.cos(a) * (r - 52), cy + Math.sin(a) * (r - 52));
  }

  // Clock hands - behavior depends on mode
  const base = (Date.now() / 1000) % 60;
  const length = r - 28;
  const baseWidth = state.display.thickerHands ? 6 : 3;

  if (state.currentMode === 'lapTimer') {
    // Lap timer: show all 4 hands
    state.lapTimer.hands.forEach(h => {
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

    // Lap timer ghost hand
    if (state.lapTimer.ghost && state.display.ghostHand) {
      const a = state.lapTimer.ghost.seconds * Math.PI / 30 - Math.PI / 2;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = state.lapTimer.ghost.color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (state.currentMode === 'intervalTimer') {
    // Interval timer: show all 4 hands continuously
    state.lapTimer.hands.forEach(h => {
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

    // Interval timer: red hand as ghost showing last start/stop
    if (state.display.ghostHand && state.intervalTimer.ghostSeconds !== null) {
      const a = state.intervalTimer.ghostSeconds * Math.PI / 30 - Math.PI / 2;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ff4d4d'; // Always red for interval ghost
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Center dot
  ctx.fillStyle = state.display.dark ? '#777' : '#000';
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
  state.lapTimer.hands.forEach(h => {
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
    let closest = state.lapTimer.hands[0];
    let closestDist = Math.min(
      (base + closest.offset) % 60,
      60 - ((base + closest.offset) % 60)
    );

    state.lapTimer.hands.forEach(h => {
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
    if (state.currentMode === 'lapTimer') {
      if (state.lapTimer.lastTap && !state.lapTimer.isFinished) {
        const now = Date.now();
        digital.textContent = fmt(now - state.lapTimer.lastTap);
        if (state.lapTimer.sessionStart) {
          totalClock.textContent = fmt(now - state.lapTimer.sessionStart);
        }
      }
    }
    // Interval timer has its own update function
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
  if (lap.type === 'rest' && !state.lapTimer.trackRest) return;

  let delta = '', cls = '';
  
  if (lap.type === 'lap') {
    const lapsOnly = state.lapTimer.laps.filter(x => x.type === 'lap');
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
  if (state.currentMode === 'lapTimer') {
    handleLapTimerTap();
  } else if (state.currentMode === 'intervalTimer') {
    handleIntervalTimerTap();
  }
}

function handleLapTimerTap() {
  if (state.lapTimer.isFinished) return;

  const now = Date.now();
  
  // Initialize session
  if (!state.lapTimer.sessionStart) {
    state.lapTimer.sessionStart = now;
  }

  // Guard against accidental double-tap
  if (state.lapTimer.guard && state.lapTimer.lastTap && now - state.lapTimer.lastTap < MIN_PRESS) {
    return;
  }

  // Record lap
  if (state.lapTimer.lastTap) {
    const duration = now - state.lapTimer.lastTap;
    const lap = { 
      type: state.lapTimer.mode, 
      time: duration,
      number: state.lapTimer.mode === 'lap' ? state.lapTimer.lapCount++ : undefined
    };
    
    state.lapTimer.laps.push(lap);
    
    if (state.lapTimer.mode === 'lap') {
      state.lapTimer.hasCompletedLap = true;
    }
    
    addRow(lap);

    // Calculate split
    if (state.lapTimer.laps.length > 1) {
      const lastLap = state.lapTimer.laps[state.lapTimer.laps.length - 1];
      const prevLap = state.lapTimer.laps[state.lapTimer.laps.length - 2];
      state.lapTimer.lastSplit = lastLap.time - prevLap.time;
    }
  }

  state.lapTimer.lastTap = now;

  // Toggle mode
  if (state.lapTimer.trackRest && state.lapTimer.mode === 'lap') {
    state.lapTimer.mode = 'rest';
  } else if (state.lapTimer.mode === 'rest') {
    state.lapTimer.mode = 'lap';
  }

  digital.classList.toggle('rest', state.lapTimer.mode === 'rest');

  // Update ghost hand
  state.lapTimer.ghost = calculateGhostHand(now);

  // Start timer
  if (!state.lapTimer.digitalTimerRunning) {
    startDigitalTimer();
    state.lapTimer.digitalTimerRunning = true;
  }
}

function handleIntervalTimerTap() {
  const phase = state.intervalTimer.phase;
  
  if (phase === 'waiting') {
    // Start the countdown
    startIntervalTimer();
  } else if (phase === 'countdown' || phase === 'work' || phase === 'rest') {
    // Toggle pause
    toggleIntervalPause();
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
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const options = document.getElementById('options');

// ============================================================================
// MODE SWITCHING
// ============================================================================

function switchMode(newMode) {
  if (state.currentMode === newMode) {
    menu.classList.remove('open');
    menuOverlay.classList.remove('visible');
    return;
  }
  
  // Check if there's an active session
  const hasActiveSession = 
    (state.currentMode === 'lapTimer' && state.lapTimer.sessionStart) ||
    (state.currentMode === 'intervalTimer' && state.intervalTimer.sessionStart);
  
  if (hasActiveSession) {
    if (!confirm('Switch modes? Current session will be reset.')) {
      return;
    }
  }
  
  // Reset current mode
  resetSession();
  
  // Switch mode
  state.currentMode = newMode;
  
  // Update UI
  updateModeUI();
  
  // Save preference
  saveSettings();
  
  // Close menu
  menu.classList.remove('open');
  menuOverlay.classList.remove('visible');
}

function updateModeUI() {
  // Update menu checkmarks
  document.querySelectorAll('.mode-item').forEach(item => {
    const mode = item.dataset.mode;
    if (mode === state.currentMode) {
      item.classList.add('active');
      item.querySelector('.mode-check').textContent = '✓';
    } else {
      item.classList.remove('active');
      item.querySelector('.mode-check').textContent = '';
    }
  });
  
  // Show/hide appropriate controls and displays
  if (state.currentMode === 'lapTimer') {
    lapTimerControls.classList.remove('hidden');
    list.classList.remove('hidden');
    intervalTimerControls.classList.add('hidden');
    intervalDisplay.classList.add('hidden');
    canvas.classList.remove('glow-green', 'glow-yellow');
    digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
    
  } else if (state.currentMode === 'intervalTimer') {
    lapTimerControls.classList.add('hidden');
    list.classList.add('hidden');
    intervalTimerControls.classList.remove('hidden');
    intervalDisplay.classList.remove('hidden');
    digital.classList.remove('rest');
    updateIntervalSummary();
  }
}

// ============================================================================
// INTERVAL TIMER FUNCTIONS
// ============================================================================

let intervalTimerInterval = null;
let audioContext = null;

function beep(frequency = 800, duration = 150) {
  if (!state.intervalTimer.beepEnabled) return;
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const volume = state.intervalTimer.volume / 100;
    gainNode.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (err) {
    console.error('Beep error:', err);
  }
}

function startIntervalTimer() {
  const now = Date.now();
  state.intervalTimer.sessionStart = now;
  state.intervalTimer.intervalStart = now;
  state.intervalTimer.phase = 'countdown';
  state.intervalTimer.timeRemaining = state.intervalTimer.countdown * 1000;
  state.intervalTimer.isPaused = false;
  state.intervalTimer.currentRound = 1;
  
  // Set ghost hand to current position (red hand at top = 0)
  state.intervalTimer.ghostSeconds = 0;
  
  canvas.classList.add('glow-green');
  intervalStatus.textContent = 'GET READY';
  
  updateIntervalRounds();
  
  if (!intervalTimerInterval) {
    intervalTimerInterval = setInterval(updateIntervalTimer, 50);
  }
}

function updateIntervalTimer() {
  if (state.intervalTimer.isPaused) return;
  
  const now = Date.now();
  const elapsed = now - state.intervalTimer.intervalStart;
  const remaining = state.intervalTimer.timeRemaining - elapsed;
  
  // Update display
  digital.textContent = fmt(Math.max(0, remaining));
  if (state.intervalTimer.sessionStart) {
    totalClock.textContent = fmt(now - state.intervalTimer.sessionStart);
  }
  
  // Check for warning beeps (3, 2, 1 seconds before transition)
  const secondsRemaining = Math.ceil(remaining / 1000);
  if (secondsRemaining === 3 || secondsRemaining === 2 || secondsRemaining === 1) {
    const lastBeepKey = `${state.intervalTimer.phase}-${secondsRemaining}`;
    if (state.intervalTimer.lastBeep !== lastBeepKey) {
      beep(600, 100); // Warning beep
      state.intervalTimer.lastBeep = lastBeepKey;
    }
  }
  
  // Check if phase complete
  if (remaining <= 0) {
    transitionIntervalPhase();
  }
}

function transitionIntervalPhase() {
  const now = Date.now();
  
  // Final beep for transition
  beep(1000, 200);
  
  // Update ghost hand to current clock position
  const currentSeconds = (now / 1000) % 60;
  state.intervalTimer.ghostSeconds = currentSeconds;
  
  if (state.intervalTimer.phase === 'countdown') {
    // Countdown -> Work
    state.intervalTimer.phase = 'work';
    state.intervalTimer.timeRemaining = state.intervalTimer.workTime * 1000;
    state.intervalTimer.intervalStart = now;
    intervalStatus.textContent = `WORK - Round ${state.intervalTimer.currentRound}`;
    state.intervalTimer.lastBeep = null;
    
  } else if (state.intervalTimer.phase === 'work') {
    // Work -> Rest
    state.intervalTimer.phase = 'rest';
    state.intervalTimer.timeRemaining = state.intervalTimer.restTime * 1000;
    state.intervalTimer.intervalStart = now;
    intervalStatus.textContent = `REST - Round ${state.intervalTimer.currentRound}`;
    state.intervalTimer.lastBeep = null;
    
  } else if (state.intervalTimer.phase === 'rest') {
    // Rest -> Next round or finish
    const totalRounds = state.intervalTimer.totalRounds;
    
    if (totalRounds === null || state.intervalTimer.currentRound < totalRounds) {
      // Next round
      state.intervalTimer.currentRound++;
      state.intervalTimer.phase = 'work';
      state.intervalTimer.timeRemaining = state.intervalTimer.workTime * 1000;
      state.intervalTimer.intervalStart = now;
      intervalStatus.textContent = `WORK - Round ${state.intervalTimer.currentRound}`;
      state.intervalTimer.lastBeep = null;
      updateIntervalRounds();
      
    } else {
      // Finish
      stopIntervalTimer();
      intervalStatus.textContent = 'Session Complete!';
      canvas.classList.remove('glow-green');
    }
  }
}

function toggleIntervalPause() {
  state.intervalTimer.isPaused = !state.intervalTimer.isPaused;
  
  if (state.intervalTimer.isPaused) {
    // Paused
    canvas.classList.remove('glow-green');
    canvas.classList.add('glow-yellow');
    intervalStatus.textContent = 'PAUSED';
    state.intervalTimer.pauseTime = Date.now();
    
  } else {
    // Resumed
    canvas.classList.remove('glow-yellow');
    canvas.classList.add('glow-green');
    
    // Adjust interval start to account for pause duration
    const pauseDuration = Date.now() - state.intervalTimer.pauseTime;
    state.intervalTimer.intervalStart += pauseDuration;
    state.intervalTimer.sessionStart += pauseDuration;
    
    // Restore status
    const phase = state.intervalTimer.phase;
    if (phase === 'countdown') {
      intervalStatus.textContent = 'GET READY';
    } else if (phase === 'work') {
      intervalStatus.textContent = `WORK - Round ${state.intervalTimer.currentRound}`;
    } else if (phase === 'rest') {
      intervalStatus.textContent = `REST - Round ${state.intervalTimer.currentRound}`;
    }
  }
}

function stopIntervalTimer() {
  if (intervalTimerInterval) {
    clearInterval(intervalTimerInterval);
    intervalTimerInterval = null;
  }
  
  state.intervalTimer.phase = 'waiting';
  state.intervalTimer.isPaused = false;
  canvas.classList.remove('glow-green', 'glow-yellow');
  
  // Don't reset the session - keep the completed data
  digital.textContent = '00:00.0';
  intervalStatus.textContent = 'Tap clock to start';
}

function updateIntervalRounds() {
  const total = state.intervalTimer.totalRounds;
  const current = state.intervalTimer.currentRound;
  
  if (total === null) {
    intervalRounds.textContent = `Round ${current}`;
  } else {
    intervalRounds.textContent = `Round ${current}/${total}`;
  }
}

function updateIntervalSummary() {
  summaryCountdown.textContent = `${state.intervalTimer.countdown}s`;
  summaryWork.textContent = `${state.intervalTimer.workTime}s`;
  summaryRest.textContent = `${state.intervalTimer.restTime}s`;
  summaryRounds.textContent = state.intervalTimer.totalRounds === null ? '∞' : state.intervalTimer.totalRounds;
}

let resetHoldTimer = null;
let resetHoldStart = null;
let saveHoldTimer = null;
let saveHoldStart = null;

function resetSession() {
  // Stop any running timers
  stopDigitalTimer();
  
  if (state.currentMode === 'lapTimer') {
    // Reset lap timer state while preserving user settings
    state.lapTimer.ghost = null;
    state.lapTimer.laps = [];
    state.lapTimer.lastTap = null;
    state.lapTimer.sessionStart = null;
    state.lapTimer.hasCompletedLap = false;
    state.lapTimer.lastSplit = 0;
    state.lapTimer.timerRunning = false;
    state.lapTimer.digitalTimerRunning = false;
    state.lapTimer.isFinished = false;
    state.lapTimer.lapCount = 1;
    
    // Clear UI
    list.innerHTML = '';
    digital.textContent = '00:00.0';
    totalClock.textContent = '00:00.0';
    digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
    
  } else if (state.currentMode === 'intervalTimer') {
    // Stop interval timer
    if (intervalTimerInterval) {
      clearInterval(intervalTimerInterval);
      intervalTimerInterval = null;
    }
    
    // Reset interval timer state
    state.intervalTimer.currentRound = 0;
    state.intervalTimer.completedRounds = [];
    state.intervalTimer.phase = 'waiting';
    state.intervalTimer.timeRemaining = 0;
    state.intervalTimer.sessionStart = null;
    state.intervalTimer.intervalStart = null;
    state.intervalTimer.isPaused = false;
    state.intervalTimer.ghostSeconds = null;
    state.intervalTimer.lastBeep = null;
    state.intervalTimer.pauseTime = null;
    
    // Clear UI
    digital.textContent = '00:00.0';
    totalClock.textContent = '00:00.0';
    intervalStatus.textContent = 'Tap clock to start';
    intervalRounds.textContent = '';
    
    // Remove glow
    canvas.classList.remove('glow-green', 'glow-yellow');
  }
}

function startResetHold() {
  resetHoldStart = Date.now();
  resetBtn.classList.add('holding');
  
  resetHoldTimer = setTimeout(() => {
    // Reset completed
    resetBtn.classList.remove('holding');
    resetBtn.classList.add('reset-complete');
    
    // Execute reset
    resetSession();
    
    setTimeout(() => {
      resetBtn.classList.remove('reset-complete');
    }, 500);
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
  // Only for lap timer mode
  if (state.currentMode !== 'lapTimer') return;
  
  saveHoldStart = Date.now();
  saveBtn.classList.add('holding');
  
  saveHoldTimer = setTimeout(() => {
    // Save completed
    saveBtn.classList.remove('holding');
    saveBtn.classList.add('save-complete');
    
    // Execute save
    stopDigitalTimer();
    state.lapTimer.isFinished = true;
    digital.textContent = 'Session Finished';
    totalClock.textContent = fmt(Date.now() - state.lapTimer.sessionStart);
    
    // Prompt for session name if there are laps
    if (state.lapTimer.laps.length > 0) {
      const sessionStart = new Date(state.lapTimer.sessionStart);
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
  darkToggle.checked = state.display.dark;
  toggleRestBtn.textContent = state.lapTimer.trackRest ? 'Rest ✓' : 'Rest ✗';
  digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
  ghostToggle.checked = state.display.ghostHand;
  thickerHandsToggle.checked = state.display.thickerHands;
  guardToggle.checked = state.lapTimer.guard;
  
  // Initialize interval config inputs
  countdownInput.value = state.intervalTimer.countdown;
  workInput.value = state.intervalTimer.workTime;
  restInput.value = state.intervalTimer.restTime;
  infiniteRounds.checked = state.intervalTimer.totalRounds === null;
  roundsInput.value = state.intervalTimer.totalRounds || '';
  roundsInput.disabled = infiniteRounds.checked;
  beepEnabled.checked = state.intervalTimer.beepEnabled;
  volumeSlider.value = state.intervalTimer.volume;
  volumeValue.textContent = `${state.intervalTimer.volume}%`;
  
  // Set initial mode
  updateModeUI();
}

// Menu button
menuBtn.onclick = () => {
  menu.classList.add('open');
  menuOverlay.classList.add('visible');
};

// Menu close button and overlay
document.querySelector('.menu-close').onclick = () => {
  menu.classList.remove('open');
  menuOverlay.classList.remove('visible');
};

menuOverlay.onclick = () => {
  menu.classList.remove('open');
  menuOverlay.classList.remove('visible');
  options.classList.remove('open');
  intervalConfigPanel.classList.remove('open');
};

// Mode switching
document.querySelectorAll('.mode-item').forEach(item => {
  item.addEventListener('click', () => {
    const mode = item.dataset.mode;
    switchMode(mode);
  });
});

// Settings from menu
document.getElementById('menuSettings').onclick = () => {
  menu.classList.remove('open');
  menuOverlay.classList.remove('visible');
  options.classList.add('open');
};

// Prevent text selection on buttons and controls
const canvas = document.getElementById('clock');
const preventSelectElements = [canvas, resetBtn, saveBtn, toggleRestBtn, menuBtn, configIntervalsBtn, stopIntervalBtn];
preventSelectElements.forEach(el => {
  if (el) {
    el.addEventListener('selectstart', (e) => e.preventDefault());
    el.addEventListener('mousedown', (e) => {
      if (e.detail > 1) {
        e.preventDefault(); // Prevent double-click selection
      }
    });
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Prevent shortcuts when panels are open
  if (options.classList.contains('open') || intervalConfigPanel.classList.contains('open') || menu.classList.contains('open')) {
    return;
  }
  
  if (e.key === ' ') {
    e.preventDefault();
    handleTap();
  } else if (e.key === 's' && e.ctrlKey) {
    e.preventDefault();
    if (state.currentMode === 'lapTimer') {
      startSaveHold();
    }
  } else if (e.key === 'Delete' && e.shiftKey) {
    e.preventDefault();
    startResetHold();
  }
});

// Finish with session name prompt - REMOVED, now handled by hold interaction


// Dark mode toggle
darkToggle.onchange = e => {
  state.display.dark = e.target.checked;
  saveSettings();
};

// Rest tracking toggle
toggleRestBtn.addEventListener('click', () => {
  state.lapTimer.trackRest = !state.lapTimer.trackRest;

  if (!state.lapTimer.trackRest) {
    state.lapTimer.mode = 'lap';
  } else if (state.lapTimer.mode === 'lap') {
    state.lapTimer.mode = 'rest';
  }

  toggleRestBtn.textContent = state.lapTimer.trackRest ? 'Rest ✓' : 'Rest ✗';
  digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
  saveSettings();
});

// Ghost hand toggle
ghostToggle.onchange = () => {
  state.display.ghostHand = ghostToggle.checked;
  saveSettings();
};

// Thicker hands toggle
thickerHandsToggle.onchange = () => {
  state.display.thickerHands = thickerHandsToggle.checked;
  saveSettings();
};

// Guard toggle
guardToggle.onchange = e => {
  state.lapTimer.guard = e.target.checked;
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

// Interval timer controls
configIntervalsBtn.onclick = () => {
  intervalConfigPanel.classList.add('open');
};

stopIntervalBtn.onclick = () => {
  if (confirm('Stop interval timer?')) {
    stopIntervalTimer();
    resetSession();
  }
};

// Interval config panel
infiniteRounds.onchange = () => {
  roundsInput.disabled = infiniteRounds.checked;
  if (infiniteRounds.checked) {
    roundsInput.value = '';
  }
};

volumeSlider.oninput = () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
};

saveIntervalConfig.onclick = () => {
  state.intervalTimer.countdown = parseInt(countdownInput.value) || 5;
  state.intervalTimer.workTime = parseInt(workInput.value) || 60;
  state.intervalTimer.restTime = parseInt(restInput.value) || 60;
  state.intervalTimer.totalRounds = infiniteRounds.checked ? null : (parseInt(roundsInput.value) || null);
  state.intervalTimer.beepEnabled = beepEnabled.checked;
  state.intervalTimer.volume = parseInt(volumeSlider.value);
  
  updateIntervalSummary();
  saveSettings();
  intervalConfigPanel.classList.remove('open');
};

cancelIntervalConfig.onclick = () => {
  // Reset to current values
  countdownInput.value = state.intervalTimer.countdown;
  workInput.value = state.intervalTimer.workTime;
  restInput.value = state.intervalTimer.restTime;
  infiniteRounds.checked = state.intervalTimer.totalRounds === null;
  roundsInput.value = state.intervalTimer.totalRounds || '';
  roundsInput.disabled = infiniteRounds.checked;
  beepEnabled.checked = state.intervalTimer.beepEnabled;
  volumeSlider.value = state.intervalTimer.volume;
  volumeValue.textContent = `${state.intervalTimer.volume}%`;
  
  intervalConfigPanel.classList.remove('open');
};

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
