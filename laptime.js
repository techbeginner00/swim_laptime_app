// =================================================================
// Constants
// =================================================================
const RECORD_TYPES = {
    LAP: 'lap',
    TEMPO: 'tempo',
    STROKE: 'stroke',
};

const KEY_CODES = {
    SPACE: 'Space',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    SHIFT_LEFT: 'ShiftLeft',
    SHIFT_RIGHT: 'ShiftRight',
    BACKSPACE: 'Backspace',
    ENTER: 'Enter',
    KEY_A: 'KeyA',
    KEY_S: 'KeyS',
    KEY_D: 'KeyD',
    KEY_Q: 'KeyQ',
    KEY_W: 'KeyW',
    KEY_E: 'KeyE',
    KEY_R: 'KeyR',
    KEY_T: 'KeyT',
    KEY_X: 'KeyX',
    KEY_Z: 'KeyZ',
    KEY_C: 'KeyC',
    ESCAPE: 'Escape',
};

const DEFAULTS = {
    VIDEO_FPS: 30,
    FRAME_INTERVAL_MS: 100,
    LINE_COLOR: 'rgba(255, 255, 0, 0.8)',
    POINT_COLOR: 'rgba(255, 0, 0, 0.7)',
    LINE_WIDTH: 2,
    ZOOM_FACTOR: 1.1,
    SKIP_TIME_SECONDS: 5,
};


// =================================================================
// DOM Elements
// =================================================================
const dom = {};


// =================================================================
// State
// =================================================================
const state = {
    videoFPS: DEFAULTS.VIDEO_FPS,
    collectedPoints: [],
    videoLoaded: false,
    timeRecords: {},
    keysPressed: {},
    frameIntervalId: null,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    didPan: false,
    pinching: false,
    initialPinchDistance: 0,
    drawing: {
        lineColor: DEFAULTS.LINE_COLOR,
        pointColor: DEFAULTS.POINT_COLOR,
        lineWidth: DEFAULTS.LINE_WIDTH,
    }
};

// =================================================================
// Initialization
// =================================================================
function initialize() {
    // Assign DOM elements
    dom.fileSelectorContainer = document.getElementById('file-selector-container');
    dom.videoFile = document.getElementById('videoFile');
    dom.mainContent = document.getElementById('main-content');
    dom.tablesColumn = document.getElementById('tables-column');
    dom.controlsOverlay = document.getElementById('controls-overlay');
    dom.mobileControlsOverlay = document.getElementById('mobile-controls-overlay'); // Add this
    dom.videoPlayer = document.getElementById('videoPlayer');
    dom.overlayCanvas = document.getElementById('overlayCanvas');
    dom.ctx = dom.overlayCanvas.getContext('2d');
    dom.currentTimeDisplay = document.getElementById('currentTimeDisplay');
    dom.speedBtn1x = document.getElementById('speedBtn1x');
    dom.speedBtn15x = document.getElementById('speedBtn15x');
    dom.speedBtn2x = document.getElementById('speedBtn2x');
    dom.fpsDisplay = document.getElementById('fpsDisplay');
    dom.fpsInput = document.getElementById('fpsInput');
    dom.applyFpsBtn = document.getElementById('applyFpsBtn');
    dom.playPauseBtn = document.getElementById('playPauseBtn');
    dom.prevFrameBtn = document.getElementById('prevFrameBtn');
    dom.nextFrameBtn = document.getElementById('nextFrameBtn');
    dom.recordLapBtn = document.getElementById('recordLapBtn');
    dom.recordTempoBtn = document.getElementById('recordTempoBtn');
    dom.recordStrokeBtn = document.getElementById('recordStrokeBtn');
    dom.resetLinesBtn = document.getElementById('resetLinesBtn');
    dom.resetAllTimesBtn = document.getElementById('resetAllTimesBtn');
    dom.restartBtn = document.getElementById('restartBtn');
    dom.resetAllBtn = document.getElementById('resetAllBtn');
    dom.lapTimesBody = document.getElementById('lapTimesBody');
    dom.tempoTimesBody = document.getElementById('tempoTimesBody');
    dom.strokeCountDisplay = document.getElementById('strokeCountDisplay');
    dom.mobile_lapTimesBody = document.getElementById('mobile-lapTimesBody');
    dom.mobile_tempoTimesBody = document.getElementById('mobile-tempoTimesBody');
    dom.mobile_strokeCountDisplay = document.getElementById('mobile-strokeCountDisplay');
    dom.messageArea = document.getElementById('messageArea');
    dom.shortcutsOverlay = document.getElementById('shortcuts-overlay');
    dom.shortcutDetails = dom.shortcutsOverlay.querySelector('.shortcut-details');
    dom.shortcutHint = dom.shortcutsOverlay.querySelector('.shortcut-hint');
    dom.lineColorPicker = document.getElementById('lineColorPicker');
    dom.pointColorPicker = document.getElementById('pointColorPicker');
    dom.lineWidthSlider = document.getElementById('lineWidthSlider');
    dom.lineWidthValue = document.getElementById('lineWidthValue');
    dom.fileNameDisplay = document.getElementById('fileNameDisplay');

    // Initialize time records
    state.timeRecords = {
        [RECORD_TYPES.LAP]: { data: [], els: [dom.lapTimesBody, dom.mobile_lapTimesBody], render: renderLapTimesTable, name: '通過タイム' },
        [RECORD_TYPES.TEMPO]: { data: [], els: [dom.tempoTimesBody, dom.mobile_tempoTimesBody], render: renderTempoTimesTable, name: 'テンポタイム' },
        [RECORD_TYPES.STROKE]: { data: [], els: [dom.strokeCountDisplay, dom.mobile_strokeCountDisplay], render: renderStrokeCount, name: 'ストローク数' }
    };

    // Add event listeners
    dom.videoFile.addEventListener('change', handleFileSelect);
    dom.videoPlayer.addEventListener('loadedmetadata', handleVideoMetadata);
    dom.videoPlayer.addEventListener('timeupdate', updateCurrentTimeDisplay);
    dom.videoPlayer.addEventListener('play', () => { 
        dom.playPauseBtn.textContent = '一時停止 (Space)';
        if(dom.m_play_pause_btn) dom.m_play_pause_btn.textContent = '||';
    });
    dom.videoPlayer.addEventListener('pause', () => { 
        dom.playPauseBtn.textContent = '再生 (Space)'; 
        if(dom.m_play_pause_btn) dom.m_play_pause_btn.textContent = '▶';
    });

    dom.speedBtn1x.addEventListener('click', () => setPlaybackSpeed(1.0));
    dom.speedBtn15x.addEventListener('click', () => setPlaybackSpeed(1.5));
    dom.speedBtn2x.addEventListener('click', () => setPlaybackSpeed(2.0));
    
    dom.overlayCanvas.addEventListener('mousedown', handlePanStart);
    dom.overlayCanvas.addEventListener('mousemove', handlePanMove);
    dom.overlayCanvas.addEventListener('mouseup', handlePanEnd);
    dom.overlayCanvas.addEventListener('mouseleave', handlePanEnd);
    dom.overlayCanvas.addEventListener('click', handleCanvasClick);
    dom.overlayCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    dom.overlayCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    dom.overlayCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    dom.playPauseBtn.addEventListener('click', togglePlayPause);
    dom.prevFrameBtn.addEventListener('click', () => stepFrame(-1));
    dom.nextFrameBtn.addEventListener('click', () => stepFrame(1));
    
    dom.recordLapBtn.addEventListener('click', () => recordTime(RECORD_TYPES.LAP));
    dom.recordTempoBtn.addEventListener('click', () => recordTime(RECORD_TYPES.TEMPO));
    dom.recordStrokeBtn.addEventListener('click', () => recordTime(RECORD_TYPES.STROKE));

    dom.resetLinesBtn.addEventListener('click', resetLinesOnly);
    dom.resetAllTimesBtn.addEventListener('click', resetAllTimes);
    dom.restartBtn.addEventListener('click', restartVideo);
    dom.resetAllBtn.addEventListener('click', resetAll);

    dom.applyFpsBtn.addEventListener('click', applyManualFPS);

    dom.lineColorPicker.addEventListener('input', (e) => {
        state.drawing.lineColor = hexToRgba(e.target.value, 0.8);
        if(dom.m_lineColorPicker) dom.m_lineColorPicker.value = e.target.value;
        drawLines();
    });
    dom.pointColorPicker.addEventListener('input', (e) => {
        state.drawing.pointColor = hexToRgba(e.target.value, 0.7);
        if(dom.m_pointColorPicker) dom.m_pointColorPicker.value = e.target.value;
        drawLines();
    });
    dom.lineWidthSlider.addEventListener('input', (e) => {
        state.drawing.lineWidth = parseFloat(e.target.value);
        dom.lineWidthValue.textContent = `${state.drawing.lineWidth.toFixed(1)}px`;
        if(dom.m_lineWidthSlider) dom.m_lineWidthSlider.value = e.target.value;
        drawLines();
    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    initializeMobileUI();
}


// =================================================================
// Utility Functions
// =================================================================
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showMessage(message, isError = false) {
    dom.messageArea.textContent = message;
    dom.messageArea.className = `text-sm mt-4 min-h-[20px] ${isError ? 'text-red-400' : 'text-green-400'}`;
    setTimeout(() => { if (dom.messageArea.textContent === message) dom.messageArea.textContent = ''; }, 3000);
}

function createTableRow(cellContents) {
    const tr = document.createElement('tr');
    for (const content of cellContents) {
        const td = document.createElement('td');
        td.textContent = content;
        tr.appendChild(td);
    }
    return tr;
}


// =================================================================
// File and Video Handling
// =================================================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
        showMessage('有効な動画ファイルを選択してください。', true);
        return;
    }
    const fileURL = URL.createObjectURL(file);
    fullResetStatesAndUI();
    dom.videoPlayer.src = fileURL;
    dom.videoPlayer.load();
    dom.fileSelectorContainer.style.display = 'none';
    dom.mainContent.style.display = 'block';
    state.videoLoaded = true;
    document.body.classList.add('video-loaded'); // Add class to body
    dom.fileNameDisplay.textContent = file.name;
    showMessage('動画をロード中...', false);
}

function handleVideoMetadata() {
    handleResize(); // Set initial canvas size
    setPlaybackSpeed(1.0);
    state.videoFPS = DEFAULTS.VIDEO_FPS;
    dom.fpsDisplay.textContent = `FPS: ${state.videoFPS} (def)`;
    dom.fpsInput.placeholder = state.videoFPS;
    updateCurrentTimeDisplay();
}

function applyManualFPS() {
    const newFPSRaw = dom.fpsInput.value || (dom.m_fpsInput && dom.m_fpsInput.value);
    const newFPS = parseFloat(newFPSRaw);

    if (!isNaN(newFPS) && newFPS > 0) {
        state.videoFPS = newFPS;
        dom.fpsDisplay.textContent = `FPS: ${state.videoFPS.toFixed(1)}`;
        dom.fpsInput.value = '';
        dom.fpsInput.placeholder = state.videoFPS.toFixed(1);
        if(dom.m_fpsInput) dom.m_fpsInput.value = '';
    } else {
        dom.fpsInput.value = '';
        if(dom.m_fpsInput) dom.m_fpsInput.value = '';
    }
}

function handleResize() {
    if (!state.videoLoaded) return;
    drawLines();
}


// =================================================================
// Video Controls
// =================================================================
function togglePlayPause() {
    if (!state.videoLoaded) return;
    dom.videoPlayer.paused || dom.videoPlayer.ended ? dom.videoPlayer.play() : dom.videoPlayer.pause();
}

function stepFrame(direction) {
    if (!state.videoLoaded) return;
    if (!dom.videoPlayer.paused) dom.videoPlayer.pause();
    const newTime = dom.videoPlayer.currentTime + (direction * (1 / state.videoFPS));
    dom.videoPlayer.currentTime = Math.max(0, Math.min(newTime, dom.videoPlayer.duration));
}

function skipTime(seconds) {
    if (!state.videoLoaded) return;
    dom.videoPlayer.currentTime = Math.max(0, Math.min(dom.videoPlayer.currentTime + seconds, dom.videoPlayer.duration));
}

/*
// 比較用：最初から再生する（ユーザーの指示によりコメントアウト）
function restartAndPlayVideo_original() {
    if (!state.videoLoaded) return;
    dom.videoPlayer.currentTime = 0;
    dom.videoPlayer.play();
}
*/

// 先頭に戻って一時停止する
function restartVideo() {
    if (!state.videoLoaded) return;
    dom.videoPlayer.pause();
    dom.videoPlayer.currentTime = 0;
}

function setPlaybackSpeed(rate) {
    // Update active button UI first, this can be done anytime.
    const allSpeedBtns = [dom.speedBtn1x, dom.speedBtn15x, dom.speedBtn2x];
    if (dom.m_speedBtn1x) allSpeedBtns.push(dom.m_speedBtn1x, dom.m_speedBtn15x, dom.m_speedBtn2x);

    allSpeedBtns.forEach(btn => {
        if(btn) btn.classList.remove('active', 'active-speed');
    });

    if (rate === 1.0) {
        if(dom.speedBtn1x) dom.speedBtn1x.classList.add('active-speed');
        if(dom.m_speedBtn1x) dom.m_speedBtn1x.classList.add('active');
    } else if (rate === 1.5) {
        if(dom.speedBtn15x) dom.speedBtn15x.classList.add('active-speed');
        if(dom.m_speedBtn15x) dom.m_speedBtn15x.classList.add('active');
    } else if (rate === 2.0) {
        if(dom.speedBtn2x) dom.speedBtn2x.classList.add('active-speed');
        if(dom.m_speedBtn2x) dom.m_speedBtn2x.classList.add('active');
    }

    // Only set playback rate if video is loaded
    if (!state.videoLoaded) return;
    dom.videoPlayer.playbackRate = rate;
}


// =================================================================
// UI and Time Display
// =================================================================
function updateCurrentTimeDisplay() {
    if (state.videoLoaded) {
        dom.currentTimeDisplay.textContent = `${dom.videoPlayer.currentTime.toFixed(3)} s`;
    }
}




// =================================================================
// Canvas Drawing and Panning
// =================================================================
function getCanvasCoordinates(event) {
    const container = document.querySelector('.video-container');
    if (!container) return { x: 0, y: 0 };
    const containerRect = container.getBoundingClientRect();

    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;

    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const unTransformedX = (clickX - centerX - state.pan.x) / state.zoom + centerX;
    const unTransformedY = (clickY - centerY - state.pan.y) / state.zoom + centerY;

    const videoRatio = dom.videoPlayer.videoWidth / dom.videoPlayer.videoHeight;
    const containerRatio = containerRect.width / containerRect.height;
    let videoDisplayWidth, videoDisplayHeight, offsetX, offsetY;

    if (containerRatio > videoRatio) {
        videoDisplayHeight = containerRect.height;
        videoDisplayWidth = videoDisplayHeight * videoRatio;
        offsetX = (containerRect.width - videoDisplayWidth) / 2;
        offsetY = 0;
    } else {
        videoDisplayWidth = containerRect.width;
        videoDisplayHeight = videoDisplayWidth / videoRatio;
        offsetX = 0;
        offsetY = (containerRect.height - videoDisplayHeight) / 2;
    }


    const clickRelativeToVideoX = unTransformedX - offsetX;
    const clickRelativeToVideoY = unTransformedY - offsetY;

    const scaleFactor = dom.videoPlayer.videoWidth / videoDisplayWidth;
    const finalX = clickRelativeToVideoX * scaleFactor;
    const finalY = clickRelativeToVideoY * scaleFactor;

    return { x: finalX, y: finalY };
}

function handleCanvasClick(event) {
    if (state.didPan) {
        state.didPan = false;
        return;
    }
    if (!state.videoLoaded) return;
    
    const coords = getCanvasCoordinates(event);
    if (coords.x < 0 || coords.y < 0 || coords.x > dom.videoPlayer.videoWidth || coords.y > dom.videoPlayer.videoHeight) {
        return;
    }

    state.collectedPoints.push(coords);
    drawLines();
}

function drawLines() {
    if (!dom.videoPlayer.videoWidth || !dom.videoPlayer.videoHeight) return;
    dom.overlayCanvas.width = dom.videoPlayer.videoWidth;
    dom.overlayCanvas.height = dom.videoPlayer.videoHeight;
    dom.ctx.clearRect(0, 0, dom.overlayCanvas.width, dom.overlayCanvas.height);
    
    if (state.collectedPoints.length === 0) return;

    dom.ctx.fillStyle = state.drawing.pointColor;
    const pointRadius = Math.max(5, dom.overlayCanvas.width / 200);
    state.collectedPoints.forEach(p => {
        dom.ctx.beginPath();
        dom.ctx.arc(p.x, p.y, pointRadius, 0, 2 * Math.PI);
        dom.ctx.fill();
    });

    if (state.collectedPoints.length >= 2) {
        dom.ctx.strokeStyle = state.drawing.lineColor;
        dom.ctx.lineWidth = state.drawing.lineWidth;
        for (let i = 0; i < state.collectedPoints.length; i += 2) {
            if (state.collectedPoints[i+1]) {
                const p0 = state.collectedPoints[i];
                const p1 = state.collectedPoints[i+1];
                dom.ctx.beginPath();
                dom.ctx.moveTo(p0.x, p0.y);
                dom.ctx.lineTo(p1.x, p1.y);
                dom.ctx.stroke();
            }
        }
    }
}

function updateTransform() {
    const videoRect = dom.videoPlayer.getBoundingClientRect();
    const panLimitX = Math.max(0, (videoRect.width * state.zoom - videoRect.width) / 2);
    const panLimitY = Math.max(0, (videoRect.height * state.zoom - videoRect.height) / 2);

    state.pan.x = Math.max(-panLimitX, Math.min(panLimitX, state.pan.x));
    state.pan.y = Math.max(-panLimitY, Math.min(panLimitY, state.pan.y));

    if (state.zoom <= 1.01) {
        state.zoom = 1.0;
        state.pan.x = 0;
        state.pan.y = 0;
    }

    const transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
    dom.videoPlayer.style.transform = transform;
    dom.overlayCanvas.style.transform = transform;
}

function handlePanStart(event) {
    if (state.zoom > 1) {
        event.preventDefault();
        state.isPanning = true;
        state.didPan = false;
        state.panStart.x = event.clientX - state.pan.x;
        state.panStart.y = event.clientY - state.pan.y;
        dom.overlayCanvas.style.cursor = 'grabbing';
    }
}

function handlePanMove(event) {
    if (state.isPanning) {
        event.preventDefault();
        state.didPan = true;
        state.pan.x = event.clientX - state.panStart.x;
        state.pan.y = event.clientY - state.panStart.y;
        updateTransform();
    }
}

function handlePanEnd() {
    if (state.isPanning) {
        state.isPanning = false;
        dom.overlayCanvas.style.cursor = 'crosshair';
    }
}

function getDistance(touches) {
    const [touch1, touch2] = touches;
    return Math.sqrt(Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2));
}

function handleTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 2) {
        state.pinching = true;
        state.initialPinchDistance = getDistance(event.touches);
    } else if (event.touches.length === 1 && state.zoom > 1) {
        handlePanStart(event.touches[0]);
    }
}

function handleTouchMove(event) {
    event.preventDefault();
    if (state.pinching && event.touches.length === 2) {
        const newPinchDistance = getDistance(event.touches);
        const scale = newPinchDistance / state.initialPinchDistance;
        state.zoom = Math.max(1.0, state.zoom * scale);
        updateTransform();
        state.initialPinchDistance = newPinchDistance; // Update for continuous zoom
    } else if (state.isPanning && event.touches.length === 1) {
        handlePanMove(event.touches[0]);
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    if (state.pinching) {
        state.pinching = false;
        state.initialPinchDistance = 0;
    }
    if (state.isPanning) {
        handlePanEnd();
    }
}


// =================================================================
// Time Recording
// =================================================================
function recordTime(type) {
    if (!state.videoLoaded || !state.timeRecords[type]) return;
    const record = state.timeRecords[type];
    record.data.push(dom.videoPlayer.currentTime);
    record.render();
}

function deleteLastTime(type) {
    if (!state.videoLoaded || !state.timeRecords[type]) return;
    const record = state.timeRecords[type];
    if (record.data.length > 0) {
        record.data.pop();
        record.render();
    }
}

function deleteLastPoint() {
    if (state.collectedPoints.length > 0) {
        state.collectedPoints.pop();
        drawLines();
    }
}

function renderLapTimesTable() {
    const { els, data } = state.timeRecords[RECORD_TYPES.LAP];
    if (!els || els.length === 0) return;

    const newRows = data.map((time, i) => {
        const lap = (i > 0) ? (time - data[i - 1]) : 0;
        const total = (i > 0) ? (time - data[0]) : 0;
        return createTableRow([
            i + 1,
            time.toFixed(3),
            (i > 0) ? lap.toFixed(3) : '-',
            (i > 0) ? total.toFixed(3) : '-'
        ]);
    });

    els.forEach((el, index) => {
        if (el) {
            const rowsForThisTable = (index === 0) ? newRows : newRows.map(row => row.cloneNode(true));
            el.replaceChildren(...rowsForThisTable);
        }
    });
}

function renderTempoTimesTable() {
    const { els, data } = state.timeRecords[RECORD_TYPES.TEMPO];
    if (!els || els.length === 0) return;
    
    const newRows = data.map((time, i) => {
        const lap = (i > 0) ? (time - data[i-1]) : 0;
        const calcValue = (i > 0) ? (lap / 3).toFixed(3) : '-';
        return createTableRow([
            i + 1,
            time.toFixed(3),
            (i > 0) ? lap.toFixed(3) : '-',
            calcValue
        ]);
    });
    
    els.forEach((el, index) => {
        if (el) {
            const rowsForThisTable = (index === 0) ? newRows : newRows.map(row => row.cloneNode(true));
            el.replaceChildren(...rowsForThisTable);
        }
    });
}

function renderStrokeCount() {
    const { els, data } = state.timeRecords[RECORD_TYPES.STROKE];
    if (!els) return;
    els.forEach(el => {
        if(el) el.textContent = data.length;
    });
}


// =================================================================
// Reset Functions
// =================================================================
function resetLinesOnly() {
    state.collectedPoints = [];
    if (state.videoLoaded) drawLines();
}

function resetAllTimes() {
    if (Object.keys(state.timeRecords).length === 0) return;
    for (const type in state.timeRecords) {
        state.timeRecords[type].data = [];
        if(state.timeRecords[type].render) state.timeRecords[type].render();
    }
}

function fullResetStatesAndUI() {
    dom.videoPlayer.pause();
    if (dom.videoPlayer.src && dom.videoPlayer.src.startsWith('blob:')) URL.revokeObjectURL(dom.videoPlayer.src);
    dom.videoPlayer.removeAttribute('src');
    dom.videoPlayer.currentTime = 0;
    dom.playPauseBtn.textContent = '再生 (Space)';
    state.videoLoaded = false;
    
    resetLinesOnly(); 
    resetAllTimes();

    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
    updateTransform();

    setPlaybackSpeed(1.0);

    state.drawing.lineColor = DEFAULTS.LINE_COLOR;
    state.drawing.pointColor = DEFAULTS.POINT_COLOR;
    state.drawing.lineWidth = DEFAULTS.LINE_WIDTH;
    
    dom.lineColorPicker.value = '#FFFF00';
    dom.pointColorPicker.value = '#FF0000';
    dom.lineWidthSlider.value = DEFAULTS.LINE_WIDTH;
    dom.lineWidthValue.textContent = `${DEFAULTS.LINE_WIDTH.toFixed(1)}px`;

    dom.fpsDisplay.textContent = "FPS: --";
    dom.fpsInput.value = '';
    if (dom.fileNameDisplay) dom.fileNameDisplay.textContent = '';
}

function resetAll() {
    fullResetStatesAndUI();
    dom.videoFile.value = '';
    dom.mainContent.style.display = 'none';
    dom.fileSelectorContainer.style.display = 'block';
    document.body.classList.remove('video-loaded'); // Remove class from body
    showMessage("新しい動画を選択してください。", false);
}


// =================================================================
// Keyboard Event Handlers
// =================================================================
function handleKeyDown(event) {
    if (event.target.tagName === 'INPUT' || !state.videoLoaded) return;
    
    const keysToPrevent = [
        KEY_CODES.SPACE, KEY_CODES.ARROW_LEFT, KEY_CODES.ARROW_RIGHT, KEY_CODES.ENTER, 
        KEY_CODES.KEY_Q, KEY_CODES.KEY_W, KEY_CODES.KEY_S, KEY_CODES.KEY_D, KEY_CODES.KEY_Z, 
        KEY_CODES.KEY_E, KEY_CODES.KEY_X, KEY_CODES.KEY_C, KEY_CODES.ESCAPE, KEY_CODES.BACKSPACE
    ];
    if (keysToPrevent.includes(event.code)) {
        event.preventDefault();
    }

    state.keysPressed[event.code] = true;

    if (state.frameIntervalId === null) { 
        if (event.code === KEY_CODES.ARROW_RIGHT && !event.shiftKey) {
            stepFrame(1);
            state.frameIntervalId = setInterval(() => stepFrame(1), DEFAULTS.FRAME_INTERVAL_MS);
        } else if (event.code === KEY_CODES.ARROW_LEFT && !event.shiftKey) {
            stepFrame(-1);
            state.frameIntervalId = setInterval(() => stepFrame(-1), DEFAULTS.FRAME_INTERVAL_MS);
        }
    }
}

function handleKeyUp(event) {
    const releasedKey = event.code;
    
    if (state.videoLoaded && !event.repeat) {
        const shiftIsPressed = state.keysPressed[KEY_CODES.SHIFT_LEFT] || state.keysPressed[KEY_CODES.SHIFT_RIGHT];

        if (shiftIsPressed) {
            switch(releasedKey) {
                case KEY_CODES.KEY_A: deleteLastTime(RECORD_TYPES.LAP); break;
                case KEY_CODES.KEY_S: deleteLastTime(RECORD_TYPES.TEMPO); break;
                case KEY_CODES.KEY_D: deleteLastTime(RECORD_TYPES.STROKE); break;
                case KEY_CODES.ARROW_RIGHT: skipTime(DEFAULTS.SKIP_TIME_SECONDS); break;
                case KEY_CODES.ARROW_LEFT: skipTime(-DEFAULTS.SKIP_TIME_SECONDS); break;
                case KEY_CODES.KEY_R: restartVideo(); break;
                case KEY_CODES.KEY_X: resetAllTimes(); break;
                case KEY_CODES.KEY_Z: 
                    resetLinesOnly(); 
                    break;
            }
        } 
        else {
            switch(releasedKey) {
                case KEY_CODES.SPACE: togglePlayPause(); break;
                case KEY_CODES.KEY_A: recordTime(RECORD_TYPES.LAP); break;
                case KEY_CODES.KEY_S: recordTime(RECORD_TYPES.TEMPO); break;
                case KEY_CODES.KEY_D: recordTime(RECORD_TYPES.STROKE); break;
                case KEY_CODES.KEY_Q: state.zoom *= DEFAULTS.ZOOM_FACTOR; updateTransform(); break;
                case KEY_CODES.KEY_W: 
                    state.zoom = Math.max(1.0, state.zoom / DEFAULTS.ZOOM_FACTOR);
                    if (state.zoom === 1.0) state.pan = { x: 0, y: 0 };
                    updateTransform();
                    break;
                case KEY_CODES.KEY_E: if (dom.tablesColumn) dom.tablesColumn.classList.toggle('hidden'); break;
                case KEY_CODES.KEY_R: if (dom.controlsOverlay) dom.controlsOverlay.classList.toggle('hidden'); break;
                case KEY_CODES.KEY_T:
                    if (dom.shortcutDetails) dom.shortcutDetails.classList.toggle('hidden');
                    if (dom.shortcutHint) dom.shortcutHint.classList.toggle('hidden');
                    break;
                case KEY_CODES.BACKSPACE: deleteLastPoint(); break;
            }
        }
    }

    if (releasedKey === KEY_CODES.ARROW_RIGHT || releasedKey === KEY_CODES.ARROW_LEFT) {
        if (state.frameIntervalId !== null) {
            clearInterval(state.frameIntervalId);
            state.frameIntervalId = null;
        }
    }
    delete state.keysPressed[releasedKey];
}

// =================================================================
// Mobile UI
// =================================================================
function initializeMobileUI() {
    // New mobile UI elements
    dom.m_skip_rewind_btn = document.getElementById('m-skip-rewind-btn');
    dom.m_prev_frame_btn = document.getElementById('m-prev-frame-btn');
    dom.m_play_pause_btn = document.getElementById('m-play-pause-btn');
    dom.m_next_frame_btn = document.getElementById('m-next-frame-btn');
    dom.m_skip_forward_btn = document.getElementById('m-skip-forward-btn');
    dom.m_record_lap_btn = document.getElementById('m-record-lap-btn');
    dom.m_record_tempo_btn = document.getElementById('m-record-tempo-btn');
    dom.m_record_stroke_btn = document.getElementById('m-record-stroke-btn');
    dom.right_panel_tab = document.getElementById('right-panel-tab');
    dom.bottom_panel_tab = document.getElementById('bottom-panel-tab');
    dom.right_panel = document.getElementById('right-panel');
    dom.bottom_panel = document.getElementById('bottom-panel');
    dom.m_restart_btn = document.getElementById('m-restart-btn');
    dom.m_choose_video_btn = document.getElementById('m-choose-video-btn');
    dom.m_reset_lines_btn = document.getElementById('m-reset-lines-btn');
    dom.m_reset_times_btn = document.getElementById('m-reset-times-btn');
    dom.m_fps_input = document.getElementById('m-fps-input');
    dom.m_apply_fps_btn = document.getElementById('m-apply-fps-btn');
    dom.close_right_panel_btn = document.getElementById('close-right-panel-btn');
    dom.close_bottom_panel_btn = document.getElementById('close-bottom-panel-btn');


    // --- Event Listeners for new Mobile Buttons ---
    if(dom.m_play_pause_btn) dom.m_play_pause_btn.addEventListener('click', togglePlayPause);
    if(dom.m_prev_frame_btn) dom.m_prev_frame_btn.addEventListener('click', () => stepFrame(-1));
    if(dom.m_next_frame_btn) dom.m_next_frame_btn.addEventListener('click', () => stepFrame(1));
    if(dom.m_skip_rewind_btn) dom.m_skip_rewind_btn.addEventListener('click', () => skipTime(-DEFAULTS.SKIP_TIME_SECONDS));
    if(dom.m_skip_forward_btn) dom.m_skip_forward_btn.addEventListener('click', () => skipTime(DEFAULTS.SKIP_TIME_SECONDS));

    if(dom.m_record_lap_btn) dom.m_record_lap_btn.addEventListener('click', () => recordTime(RECORD_TYPES.LAP));
    if(dom.m_record_tempo_btn) dom.m_record_tempo_btn.addEventListener('click', () => recordTime(RECORD_TYPES.TEMPO));
    if(dom.m_record_stroke_btn) dom.m_record_stroke_btn.addEventListener('click', () => recordTime(RECORD_TYPES.STROKE));

    // Panel Toggling
    if(dom.right_panel_tab) {
        dom.right_panel_tab.addEventListener('click', () => {
            dom.right_panel.classList.add('open');
        });
    }
    if(dom.close_right_panel_btn) {
        dom.close_right_panel_btn.addEventListener('click', () => {
            dom.right_panel.classList.remove('open');
        });
    }
    if(dom.bottom_panel_tab) {
        dom.bottom_panel_tab.addEventListener('click', () => {
            dom.bottom_panel.classList.add('open');
        });
    }
    if(dom.close_bottom_panel_btn) {
        dom.close_bottom_panel_btn.addEventListener('click', () => {
            dom.bottom_panel.classList.remove('open');
        });
    }

    // Bottom panel controls
    if(dom.m_restart_btn) dom.m_restart_btn.addEventListener('click', restartVideo);
    if(dom.m_choose_video_btn) dom.m_choose_video_btn.addEventListener('click', resetAll);
    if(dom.m_reset_lines_btn) dom.m_reset_lines_btn.addEventListener('click', resetLinesOnly);
    if(dom.m_reset_times_btn) dom.m_reset_times_btn.addEventListener('click', resetAllTimes);
    if(dom.m_apply_fps_btn) dom.m_apply_fps_btn.addEventListener('click', () => {
        const newFPS = parseFloat(dom.m_fps_input.value);
        if (!isNaN(newFPS) && newFPS > 0) {
            state.videoFPS = newFPS;
            dom.fpsDisplay.textContent = `FPS: ${state.videoFPS.toFixed(1)}`;
            dom.m_fps_input.value = '';
            dom.m_fps_input.placeholder = state.videoFPS.toFixed(1);
        } else {
            dom.m_fps_input.value = '';
        }
    });
}

// =================================================================
// App Entry Point
// =================================================================
initialize();
