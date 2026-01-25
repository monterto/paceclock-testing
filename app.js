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
    singleHand: false, // New toggle: if true, only Red hand is shown
    handStyle: 'standard', // 'thin', 'standard', 'bold', 'tapered', 'diamond'
    handWidth: 'standard' // 'thin', 'standard', 'bold'
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
    ghostColor: null,
    ghostHandOffset: null,
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
      state.display.handStyle = s.handStyle ?? state.display.handStyle;
      state.display.handWidth = s.handWidth ?? state.display.handWidth;
      state.display.singleHand = s.singleHand ?? state.display.singleHand;
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
      handStyle: state.display.handStyle,
      handWidth: state.display.handWidth,
      singleHand: state.display.singleHand,
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
// HAND DRAWING FUNCTIONS
// ============================================================================

function getHandWidth(widthCategory) {
  if (widthCategory === 'thin') return 6;
  if (widthCategory === 'bold') return 12;
  return 8; // standard
}

/**
 * Creates the path for a hand based on style.
 * Used for both the filled hand and the ghost outline.
 */
function createHandPath(ctx, style, widthCategory, length) {
  let width = getHandWidth(widthCategory);

  // Style overrides for width
  if (style === 'bold') width = 12;
  if (style === 'thin') width = 4;

  ctx.beginPath();

  if (style === 'tapered') {
    const tipWidth = width * 0.2; 
    // Left Base -> Left Tip -> Right Tip -> Right Base
    ctx.moveTo(-width / 2, 0);
    ctx.lineTo(-tipWidth / 2, -length);
    ctx.lineTo(tipWidth / 2, -length);
    ctx.lineTo(width / 2, 0);
    ctx.closePath();

  } else if (style === 'diamond') {
    // Overlapping Diamond Logic
    // Shaft enters the diamond. 
    // We draw the SILHOUETTE so the ghost outline doesn't have internal lines.
    
    const diamondSize = width * 2.8; 
    const diamondHeight = diamondSize * 1.6;
    const shaftWidth = width;
    
    // The diamond sits at the end.
    // Tip is at (0, -length).
    // Diamond vertical range: from -length down to (-length + diamondHeight).
    // Shaft goes from 0 up to (-length + diamondHeight).
    // Actually, to overlap, the shaft goes up INTO the diamond.
    
    const diamondCenterY = -length + (diamondHeight / 2);
    // Shaft intersection point (visually):
    // We'll run the shaft up to the bottom half of the diamond.
    
    const diamondBottomY = -length + diamondHeight;
    const shaftTopY = diamondBottomY - (diamondHeight * 0.25); // Overlap slightly

    // 1. Bottom Left Shaft
    ctx.moveTo(-shaftWidth / 2, 0);
    
    // 2. Up to where diamond starts widening (Left side)
    // Calculating intersection is complex, let's approximate the silhouette:
    // Shaft goes up to overlap, Diamond sits on top.
    
    // For a clean outline, we trace:
    // Bottom Left Shaft -> Top Left Shaft (hidden inside) -> Left Diamond Corner -> Tip -> Right Diamond Corner -> Top Right Shaft -> Bottom Right Shaft
    
    // To make it look "merged", we start the diamond widening from the shaft width.
    
    // Start at bottom left of shaft
    ctx.moveTo(-shaftWidth / 2, 0);
    
    // Go up shaft to transition point
    ctx.lineTo(-shaftWidth / 2, diamondBottomY);
    
    // Go out to Diamond Left
    ctx.lineTo(-diamondSize / 2, diamondCenterY);
    
    // Go to Tip
    ctx.lineTo(0, -length);
    
    // Go to Diamond Right
    ctx.lineTo(diamondSize / 2, diamondCenterY);
    
    // Go in to Shaft Right
    ctx.lineTo(shaftWidth / 2, diamondBottomY);
    
    // Go down Shaft Right
    ctx.lineTo(shaftWidth / 2, 0);
    
    ctx.closePath();

  } else {
    // Standard / Bold / Thin (Rectangular)
    ctx.rect(-width / 2, -length, width, length);
  }
}

// ============================================================================
// CLOCK RENDERING
// ============================================================================

let drawCount = 0;

function drawClock() {
  if (!canvas) {
    if (drawCount === 0) console.error('drawClock: Canvas not found!');
    return;
  }
  
  try {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 540, 540);
    const cx = 270, cy = 270, r = 243;
    
    drawCount++;

    // Background
    ctx.fillStyle = state.display.dark ? '#0b0f14' : '#f2f2f2';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.lineWidth = 5;
    ctx.strokeStyle = state.display.dark ? '#444' : '#111';
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      ctx.lineWidth = isMajor ? 4 : 2;
      ctx.strokeStyle = state.display.dark ? '#555' : '#111';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r - (isMajor ? 32 : 16)), cy + Math.sin(a) * (r - (isMajor ? 32 : 16)));
      ctx.stroke();
    }

    // Numbers
    ctx.fillStyle = state.display.dark ? '#9aa4b2' : '#000';
    ctx.font = 'bold 32px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let n = 5; n <= 60; n += 5) {
      const a = n * Math.PI / 30 - Math.PI / 2;
      ctx.fillText(n, cx + Math.cos(a) * (r - 58), cy + Math.sin(a) * (r - 58));
    }

    // ==========================================
    // DRAW HANDS
    // ==========================================
    const now = Date.now();
    const base = (now / 1000) % 60;
    const length = r - 32;
    const currentStyle = state.display.handStyle;
    const isSingleHand = state.display.singleHand;

    // --- GHOST HAND RENDERING ---
    // Determined by mode
    let ghostData = null;
    
    if (state.display.ghostHand) {
      if (state.currentMode === 'lapTimer' && state.lapTimer.ghost) {
        // In Single Hand mode, the ghost is always the Red hand ghost
        if (isSingleHand) {
           // If we are in single hand mode, the ghost should reflect where the 
           // RED hand was (index 0). 
           // The standard calculateGhostHand logic finds the "best" hand.
           // However, if we only see Red, we want to see Red's ghost.
           // We will rely on the ghost stored in state, but override color if needed.
           ghostData = { ...state.lapTimer.ghost };
           // Ensure color matches the visible hand
           ghostData.color = state.lapTimer.hands[0].color;
        } else {
           ghostData = state.lapTimer.ghost;
        }
      } else if (state.currentMode === 'intervalTimer' && state.intervalTimer.ghostSeconds !== null) {
        ghostData = {
          seconds: state.intervalTimer.ghostSeconds,
          color: state.intervalTimer.ghostColor || '#ff4d4d'
        };
      }
    }

    if (ghostData) {
      const a = ghostData.seconds * Math.PI / 30; // 0 is top (which is -PI/2 in canvas arc, but rotate handles differently)
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);

      // Ghost uses the SAME geometry as active hands
      ctx.strokeStyle = state.display.dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2; // Outline width
      
      createHandPath(ctx, currentStyle, state.display.handWidth, length);
      ctx.stroke();

      ctx.restore();
    }

    // --- ACTIVE HANDS RENDERING ---
    let handsToDraw = state.lapTimer.hands;

    // Filter for Single Hand Mode
    if (isSingleHand) {
      if (state.currentMode === 'lapTimer') {
        handsToDraw = [state.lapTimer.hands[0]]; // Only Red
      } else {
        // In interval mode, we might want to show the hand corresponding to the interval color
        // Or just Red. Let's stick to Red for consistency unless logic dictates otherwise.
        // Actually, interval logic usually highlights specific colors. 
        // If single hand is ON, let's only show the hand that matches the ghost color if present, or Red.
        const activeColor = state.intervalTimer.ghostColor || '#ff4d4d';
        handsToDraw = handsToDraw.filter(h => h.color === activeColor);
        if (handsToDraw.length === 0) handsToDraw = [state.lapTimer.hands[0]];
      }
    }

    handsToDraw.forEach(h => {
      const s = (base + h.offset) % 60;
      const a = s * Math.PI / 30; // Radians
      
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);

      ctx.fillStyle = h.color;
      createHandPath(ctx, currentStyle, state.display.handWidth, length);
      ctx.fill();
      
      ctx.restore();
    });

    // Center dot
    ctx.fillStyle = state.display.dark ? '#777' : '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  
  } catch (err) {
    if (drawCount === 0) console.error('drawClock error:', err);
  }
}

// ============================================================================
// GHOST HAND CALCULATION
// ============================================================================

function calculateGhostHand(now) {
  const base = (now / 1000) % 60;
  
  // If Single Hand Mode, we strictly track the Red Hand (index 0)
  if (state.display.singleHand) {
    const h = state.lapTimer.hands[0];
    const s = (base + h.offset) % 60;
    return { seconds: s, color: h.color };
  }

  // Standard Multi-Hand Logic: Find hand closest to top
  let best = null;
  let minDistance = Infinity;

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
const RESET_HOLD_TIME = 800;
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

let canvas, digital, totalClock, list, toggleRestBtn, ghostToggle;
let guardToggle, darkToggle, menuBtn, resetBtn, saveBtn, options, menu;
let lapTimerControls, intervalTimerControls, intervalDisplay, intervalStatus, intervalRounds;
let configIntervalsBtn, stopIntervalBtn, intervalConfigPanel;
let countdownInput, workInput, restInput, roundsInput, infiniteRounds, beepEnabled;
let volumeSlider, volumeValue, saveIntervalConfig, cancelIntervalConfig, menuOverlay;
let summaryCountdown, summaryWork, summaryRest, summaryRounds;
let styleButtons, singleHandToggle;

// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeDOM() {
  // Get all DOM elements
  canvas = document.getElementById('clock');
  digital = document.getElementById('digital');
  totalClock = document.getElementById('totalClock');
  list = document.getElementById('list');
  toggleRestBtn = document.getElementById('toggleRestBtn');
  ghostToggle = document.getElementById('ghostToggle');
  guardToggle = document.getElementById('guardToggle');
  darkToggle = document.getElementById('darkToggle');
  menuBtn = document.getElementById('menuBtn');
  resetBtn = document.getElementById('resetBtn');
  saveBtn = document.getElementById('saveBtn');
  options = document.querySelector('.settings-panel'); // Panel inside overlay
  menu = document.getElementById('menu');
  
  // Hand UI
  singleHandToggle = document.getElementById('singleHandToggle');
  styleButtons = document.querySelectorAll('.style-btn');
  
  // Lap timer elements
  lapTimerControls = document.getElementById('lapTimerControls');
  
  // Interval timer elements
  intervalTimerControls = document.getElementById('intervalTimerControls');
  intervalDisplay = document.getElementById('intervalDisplay');
  intervalStatus = document.getElementById('intervalStatus');
  intervalRounds = document.getElementById('intervalRounds');
  configIntervalsBtn = document.getElementById('configIntervalsBtn');
  stopIntervalBtn = document.getElementById('stopIntervalBtn');
  intervalConfigPanel = document.getElementById('intervalConfigPanel');
  countdownInput = document.getElementById('countdownInput');
  workInput = document.getElementById('workInput');
  restInput = document.getElementById('restInput');
  roundsInput = document.getElementById('roundsInput');
  infiniteRounds = document.getElementById('infiniteRounds');
  beepEnabled = document.getElementById('beepEnabled');
  volumeSlider = document.getElementById('volumeSlider');
  volumeValue = document.getElementById('volumeValue');
  saveIntervalConfig = document.getElementById('saveIntervalConfig');
  cancelIntervalConfig = document.getElementById('cancelIntervalConfig');
  menuOverlay = document.getElementById('menuOverlay');
  
  // Summary displays
  summaryCountdown = document.getElementById('summaryCountdown');
  summaryWork = document.getElementById('summaryWork');
  summaryRest = document.getElementById('summaryRest');
  summaryRounds = document.getElementById('summaryRounds');
  
  console.log('DOM initialized. Canvas:', canvas);
}

function initializeUI() {
  darkToggle.checked = state.display.dark;
  toggleRestBtn.textContent = state.lapTimer.trackRest ? 'Rest ☑' : 'Rest ☐';
  digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
  ghostToggle.checked = state.display.ghostHand;
  guardToggle.checked = state.lapTimer.guard;
  
  // Initialize Style Buttons
  styleButtons.forEach(btn => {
    if (btn.dataset.style === state.display.handStyle) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Initialize Single Hand Toggle
  if (singleHandToggle) {
    singleHandToggle.checked = state.display.singleHand;
  }
  
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

function init() {
  console.log('Initializing app...');
  
  initializeDOM();
  
  if (!canvas) {
    console.error('CRITICAL: Canvas element not found!');
    return;
  }
  
  loadSettings();
  setupEventListeners();
  initializeUI();
  requestWakeLock();
  
  let frameCount = 0;
  
  (function render() {
    drawClock();
    frameCount++;
    if (frameCount === 1) console.log('First frame rendered');
    requestAnimationFrame(render);
  })();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================================
// MODE SWITCHING
// ============================================================================

function switchMode(newMode) {
  if (state.currentMode === newMode) {
    menu.classList.remove('open');
    menuOverlay.classList.remove('visible');
    return;
  }
  
  const hasActiveSession = 
    (state.currentMode === 'lapTimer' && state.lapTimer.sessionStart) ||
    (state.currentMode === 'intervalTimer' && state.intervalTimer.sessionStart);
  
  if (hasActiveSession) {
    if (!confirm('Switch modes? Current session will be reset.')) {
      return;
    }
  }
  
  resetSession();
  state.currentMode = newMode;
  updateModeUI();
  saveSettings();
  
  menu.classList.remove('open');
  menuOverlay.classList.remove('visible');
}

function updateModeUI() {
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
  
  if (state.currentMode === 'lapTimer') {
    lapTimerControls.classList.remove('hidden');
    list.classList.remove('hidden');
    intervalTimerControls.classList.add('hidden');
    intervalDisplay.classList.add('hidden');
    canvas.classList.remove('glow-green', 'glow-blue', 'glow-yellow', 'glow-gray');
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
  
  const ghostHand = calculateGhostHand(now);
  state.intervalTimer.ghostColor = ghostHand.color;
  
  const chosenHand = state.lapTimer.hands.find(h => h.color === ghostHand.color);
  state.intervalTimer.ghostHandOffset = chosenHand ? chosenHand.offset : 0;
  
  const baseSeconds = (now / 1000) % 60;
  state.intervalTimer.ghostSeconds = (baseSeconds + state.intervalTimer.ghostHandOffset) % 60;
  
  canvas.classList.add('glow-gray');
  intervalStatus.textContent = 'GET READY';
  intervalStatus.className = 'interval-status countdown';
  
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
  
  digital.textContent = fmt(Math.max(0, remaining));
  if (state.intervalTimer.sessionStart) {
    totalClock.textContent = fmt(now - state.intervalTimer.sessionStart);
  }
  
  const secondsRemaining = Math.ceil(remaining / 1000);
  if (secondsRemaining === 3 || secondsRemaining === 2 || secondsRemaining === 1) {
    const lastBeepKey = `${state.intervalTimer.phase}-${secondsRemaining}`;
    if (state.intervalTimer.lastBeep !== lastBeepKey) {
      beep(600, 100); 
      state.intervalTimer.lastBeep = lastBeepKey;
    }
  }
  
  if (remaining <= 0) {
    transitionIntervalPhase();
  }
}

function transitionIntervalPhase() {
  const now = Date.now();
  beep(1000, 500);
  
  const baseSeconds = (now / 1000) % 60;
  state.intervalTimer.ghostSeconds = (baseSeconds + state.intervalTimer.ghostHandOffset) % 60;
  
  if (state.intervalTimer.phase === 'countdown') {
    state.intervalTimer.phase = 'work';
    state.intervalTimer.timeRemaining = state.intervalTimer.workTime * 1000;
    state.intervalTimer.intervalStart = now;
    intervalStatus.textContent = `WORK: ${state.intervalTimer.currentRound}`;
    intervalStatus.className = 'interval-status work';
    canvas.classList.remove('glow-gray', 'glow-blue', 'glow-yellow');
    canvas.classList.add('glow-green');
    state.intervalTimer.lastBeep = null;
    
  } else if (state.intervalTimer.phase === 'work') {
    const totalRounds = state.intervalTimer.totalRounds;
    const isLastRound = totalRounds !== null && state.intervalTimer.currentRound >= totalRounds;
    
    if (isLastRound) {
      beep(1000, 200);
      setTimeout(() => beep(1000, 200), 400);
      setTimeout(() => beep(1000, 200), 800);
      
      stopIntervalTimer();
      intervalStatus.textContent = 'DONE!';
      intervalStatus.className = 'interval-status done';
      canvas.classList.remove('glow-green', 'glow-blue', 'glow-yellow', 'glow-gray');
    } else {
      state.intervalTimer.phase = 'rest';
      state.intervalTimer.timeRemaining = state.intervalTimer.restTime * 1000;
      state.intervalTimer.intervalStart = now;
      intervalStatus.textContent = `REST: ${state.intervalTimer.currentRound}`;
      intervalStatus.className = 'interval-status rest';
      canvas.classList.remove('glow-green', 'glow-gray', 'glow-yellow');
      canvas.classList.add('glow-blue');
      state.intervalTimer.lastBeep = null;
    }
    
  } else if (state.intervalTimer.phase === 'rest') {
    state.intervalTimer.currentRound++;
    state.intervalTimer.phase = 'work';
    state.intervalTimer.timeRemaining = state.intervalTimer.workTime * 1000;
    state.intervalTimer.intervalStart = now;
    intervalStatus.textContent = `WORK: ${state.intervalTimer.currentRound}`;
    intervalStatus.className = 'interval-status work';
    canvas.classList.remove('glow-blue', 'glow-gray', 'glow-yellow');
    canvas.classList.add('glow-green');
    state.intervalTimer.lastBeep = null;
    updateIntervalRounds();
  }
}

function toggleIntervalPause() {
  state.intervalTimer.isPaused = !state.intervalTimer.isPaused;
  
  if (state.intervalTimer.isPaused) {
    canvas.classList.remove('glow-green', 'glow-blue', 'glow-gray');
    canvas.classList.add('glow-yellow');
    intervalStatus.textContent = 'PAUSED';
    intervalStatus.className = 'interval-status paused';
    state.intervalTimer.pauseTime = Date.now();
    
  } else {
    canvas.classList.remove('glow-yellow');
    const pauseDuration = Date.now() - state.intervalTimer.pauseTime;
    state.intervalTimer.intervalStart += pauseDuration;
    state.intervalTimer.sessionStart += pauseDuration;
    
    const phase = state.intervalTimer.phase;
    if (phase === 'countdown') {
      intervalStatus.textContent = 'GET READY';
      intervalStatus.className = 'interval-status countdown';
      canvas.classList.add('glow-gray');
    } else if (phase === 'work') {
      intervalStatus.textContent = `WORK: ${state.intervalTimer.currentRound}`;
      intervalStatus.className = 'interval-status work';
      canvas.classList.add('glow-green');
    } else if (phase === 'rest') {
      intervalStatus.textContent = `REST: ${state.intervalTimer.currentRound}`;
      intervalStatus.className = 'interval-status rest';
      canvas.classList.add('glow-blue');
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
  canvas.classList.remove('glow-green', 'glow-blue', 'glow-yellow', 'glow-gray');
  
  digital.textContent = '00:00.0';
  intervalStatus.textContent = 'TAP TO START';
  intervalStatus.className = 'interval-status waiting';
  intervalRounds.textContent = '';
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
  stopDigitalTimer();
  
  if (state.currentMode === 'lapTimer') {
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
    
    list.innerHTML = '';
    digital.textContent = '00:00.0';
    totalClock.textContent = '00:00.0';
    digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
    
  } else if (state.currentMode === 'intervalTimer') {
    if (intervalTimerInterval) {
      clearInterval(intervalTimerInterval);
      intervalTimerInterval = null;
    }
    
    state.intervalTimer.currentRound = 0;
    state.intervalTimer.completedRounds = [];
    state.intervalTimer.phase = 'waiting';
    state.intervalTimer.timeRemaining = 0;
    state.intervalTimer.sessionStart = null;
    state.intervalTimer.intervalStart = null;
    state.intervalTimer.isPaused = false;
    state.intervalTimer.ghostSeconds = null;
    state.intervalTimer.ghostColor = null;
    state.intervalTimer.ghostHandOffset = null;
    state.intervalTimer.lastBeep = null;
    state.intervalTimer.pauseTime = null;
    
    digital.textContent = '00:00.0';
    totalClock.textContent = '00:00.0';
    intervalStatus.textContent = 'TAP TO START';
    intervalStatus.className = 'interval-status waiting';
    intervalRounds.textContent = '';
    
    canvas.classList.remove('glow-green', 'glow-blue', 'glow-yellow', 'glow-gray');
  }
}

function startResetHold() {
  resetHoldStart = Date.now();
  resetBtn.classList.add('holding');
  
  resetHoldTimer = setTimeout(() => {
    resetBtn.classList.remove('holding');
    resetBtn.classList.add('reset-complete');
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
  if (state.currentMode !== 'lapTimer') return;
  
  saveHoldStart = Date.now();
  saveBtn.classList.add('holding');
  
  saveHoldTimer = setTimeout(() => {
    saveBtn.classList.remove('holding');
    saveBtn.classList.add('save-complete');
    
    stopDigitalTimer();
    state.lapTimer.isFinished = true;
    digital.textContent = 'Session Finished';
    totalClock.textContent = fmt(Date.now() - state.lapTimer.sessionStart);
    
    if (state.lapTimer.laps.length > 0) {
      const sessionStart = new Date(state.lapTimer.sessionStart);
      const defaultName = formatDateForFilename(sessionStart);
      
      const sessionName = prompt('Enter a name for this session (or leave blank for default):', defaultName);
      
      if (sessionName !== null) { 
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

// ============================================================================
// EVENT HANDLERS SETUP
// ============================================================================

function setupEventListeners() {
  // Menu button
  menuBtn.onclick = () => {
    menu.classList.add('open');
    menuOverlay.classList.add('visible');
  };

  // Close Menu Logic
  const closeAllMenus = () => {
    menu.classList.remove('open');
    menuOverlay.classList.remove('visible');
    // Also close settings panel if open
    const settingsPanel = document.querySelector('.settings-panel');
    if (settingsPanel) settingsPanel.parentElement.classList.remove('visible'); // actually overlay
  };
  
  // The 'menu-close' button in the slide-out menu
  const menuClose = document.querySelector('.menu-close');
  if (menuClose) menuClose.onclick = closeAllMenus;

  // Settings Panel Close Button (Sticky Header)
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  if (closeMenuBtn) {
    closeMenuBtn.onclick = () => {
      menuOverlay.classList.remove('visible');
    };
  }

  // Overlay click behavior
  menuOverlay.onclick = (e) => {
    if (e.target === menuOverlay) {
      menu.classList.remove('open');
      menuOverlay.classList.remove('visible');
      if (intervalConfigPanel) intervalConfigPanel.classList.remove('open');
    }
  };

  // Mode switching
  document.querySelectorAll('.mode-item').forEach(item => {
    item.addEventListener('click', () => {
      const mode = item.dataset.mode;
      switchMode(mode);
    });
  });

  // Settings from menu
  const menuSettingsBtn = document.getElementById('menuSettings');
  if (menuSettingsBtn) {
    menuSettingsBtn.onclick = () => {
      menu.classList.remove('open');
      // Show settings overlay
      menuOverlay.classList.add('visible');
      // Ensure settings panel is visible (handled by CSS targeting .settings-panel inside overlay)
    };
  }

  // Canvas interaction
  if (canvas) {
    canvas.addEventListener('pointerdown', handleTap);
    
    const preventSelectElements = [canvas, resetBtn, saveBtn, toggleRestBtn, menuBtn];
    if (configIntervalsBtn) preventSelectElements.push(configIntervalsBtn);
    if (stopIntervalBtn) preventSelectElements.push(stopIntervalBtn);

    preventSelectElements.forEach(el => {
      if (el) {
        el.addEventListener('selectstart', (e) => e.preventDefault());
        el.addEventListener('mousedown', (e) => {
          if (e.detail > 1) {
            e.preventDefault();
          }
        });
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Disable shortcuts if a menu/panel is open
    if (menuOverlay.classList.contains('visible') || menu.classList.contains('open')) {
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

    toggleRestBtn.textContent = state.lapTimer.trackRest ? 'Rest ☑' : 'Rest ☐';
    digital.classList.toggle('rest', state.lapTimer.mode === 'rest');
    saveSettings();
  });

  // Ghost hand toggle
  ghostToggle.onchange = () => {
    state.display.ghostHand = ghostToggle.checked;
    saveSettings();
  };

  // Updated Hand Style Logic
  if (styleButtons) {
    styleButtons.forEach(btn => {
      btn.onclick = () => {
        // UI Update
        styleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // State Update
        state.display.handStyle = btn.dataset.style;
        saveSettings();
      };
    });
  }

  // Single Hand Toggle Logic
  if (singleHandToggle) {
    singleHandToggle.onchange = () => {
      state.display.singleHand = singleHandToggle.checked;
      saveSettings();
    };
  }

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

  // Reset/Save Button Handlers (Hold logic)
  [resetBtn, saveBtn].forEach(btn => {
    if (!btn) return;
    const isReset = btn === resetBtn;
    
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      isReset ? startResetHold() : startSaveHold();
    });
    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      isReset ? cancelResetHold() : cancelSaveHold();
    });
    btn.addEventListener('pointerleave', () => {
      isReset ? cancelResetHold() : cancelSaveHold();
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      isReset ? cancelResetHold() : cancelSaveHold();
    });
  });

  // Interval timer controls
  if (configIntervalsBtn) {
    configIntervalsBtn.onclick = () => {
      intervalConfigPanel.classList.add('open');
      menuOverlay.classList.add('visible');
    };
  }

  if (stopIntervalBtn) {
    stopIntervalBtn.onclick = () => {
      if (confirm('Stop interval timer?')) {
        stopIntervalTimer();
        resetSession();
      }
    };
  }

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
    menuOverlay.classList.remove('visible');
  };

  cancelIntervalConfig.onclick = () => {
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
    menuOverlay.classList.remove('visible');
  };
}
