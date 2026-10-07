/* ==========================================================================
   GACHA BERHADIAH - JAVASCRIPT LOGIC & ANIMATION ENGINE
   ========================================================================== */

(function () {
  'use strict';

  // --- DEFAULT DATA ---
  const DEFAULT_NAMES = [
    '1',
    '2',
    '3',
    '4',
    '5'
  ];

  // Default Prizes Hierarchy (Top to Bottom)
  // Note: Drawn from the BOTTOM-MOST item first as requested!
  const DEFAULT_STRUCTURED_PRIZES = [
    { name: 'Hadiah 1', count: 1 },
    { name: 'Hadiah 2', count: 1 },
    { name: 'Hadiah 3', count: 1 }
  ];

  // --- STATE ---
  let state = {
    names: [],
    structuredPrizes: [],
    enablePrizes: true,
    prizeMode: 'sequential', // 'sequential' (from bottom up) or 'random'
    removeWinner: true,
    spinDuration: 2000,
    soundEnabled: true
  };

  let isSpinning = false;
  let currentWinner = null;
  let currentPrizeWon = null;

  // DOM Elements
  const reelTrack = document.getElementById('reel-track');
  const btnSpin = document.getElementById('btn-spin');
  const participantCountBadge = document.getElementById('participant-count-badge');
  const prizeStatusBadge = document.getElementById('prize-status-badge');
  const currentPrizeDisplay = document.getElementById('current-prize-display');

  // Header & Menu Controls
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const btnOpenMenu = document.getElementById('btn-open-menu');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const menuDrawer = document.getElementById('menu-drawer');
  const btnResetApp = document.getElementById('btn-reset-app');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Inputs
  const namesInput = document.getElementById('names-input');
  const prizeItemsList = document.getElementById('prize-items-list');
  const btnAddPrizeRow = document.getElementById('btn-add-prize-row');
  const btnLoadPresetPrizes = document.getElementById('btn-load-preset-prizes');
  const toggleEnablePrizes = document.getElementById('toggle-enable-prizes');
  const prizesEditorSection = document.getElementById('prizes-editor-section');
  const prizeModeSelect = document.getElementById('prize-mode-select');
  const toggleRemoveWinner = document.getElementById('toggle-remove-winner');
  const spinDurationSelect = document.getElementById('spin-duration-select');
  const customDurationWrapper = document.getElementById('custom-duration-wrapper');
  const customDurationSlider = document.getElementById('custom-duration-slider');
  const customDurationVal = document.getElementById('custom-duration-val');

  const btnLoadPresetNames = document.getElementById('btn-load-preset-names');
  const btnClearNames = document.getElementById('btn-clear-names');

  // Winner Modal
  const winnerModal = document.getElementById('winner-modal');
  const winnerNameText = document.getElementById('winner-name-text');
  const winnerPrizeContainer = document.getElementById('winner-prize-container');
  const winnerPrizeText = document.getElementById('winner-prize-text');
  const btnSpinAgain = document.getElementById('btn-spin-again');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // Slot constants
  const ITEM_HEIGHT = 56;
  const VISIBLE_COUNT = 7;
  const MIDDLE_INDEX = 3;

  // --- WEB AUDIO API SYNTHESIZER ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
  }

  function playTickSound() {
    if (!state.soundEnabled || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
  }

  function playWinSound() {
    if (!state.soundEnabled || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.07);

        gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.22, audioCtx.currentTime + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.07 + 0.45);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + i * 0.07);
        osc.stop(audioCtx.currentTime + i * 0.07 + 0.45);
      });
    } catch (e) {}
  }

  // --- CONFETTI ANIMATION ENGINE ---
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confettiParticles = [];
  let confettiAnimId = null;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    confettiParticles = [];
    const colors = ['#ff7a29', '#ffbe2e', '#ffffff', '#3b82f6', '#ec4899', '#10b981'];
    for (let i = 0; i < 140; i++) {
      confettiParticles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 - 40,
        vx: (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.7) * 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        opacity: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    animateConfetti();
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38;
      p.rotation += p.rSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (active) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // --- STATE PERSISTENCE ---
  function loadSavedState() {
    const saved = localStorage.getItem('gacha_app_state_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } catch (e) {}
    } else {
      state.names = [...DEFAULT_NAMES];
      state.structuredPrizes = JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_PRIZES));
    }

    if (!state.names || state.names.length === 0) {
      state.names = [...DEFAULT_NAMES];
    }
    if (!state.structuredPrizes || state.structuredPrizes.length === 0) {
      state.structuredPrizes = JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_PRIZES));
    }

    syncInputsWithState();
    updateUI();
  }

  function saveState() {
    localStorage.setItem('gacha_app_state_v5', JSON.stringify(state));
  }

  function syncInputsWithState() {
    namesInput.value = state.names.join('\n');
    renderPrizeItemsEditor();
    toggleEnablePrizes.checked = state.enablePrizes;
    prizesEditorSection.style.display = state.enablePrizes ? 'block' : 'none';
    prizeModeSelect.value = state.prizeMode;
    toggleRemoveWinner.checked = state.removeWinner;

    const knownValues = ['1200', '2000', '3500', '5000', '8000'];
    if (knownValues.includes(String(state.spinDuration))) {
      spinDurationSelect.value = String(state.spinDuration);
      customDurationWrapper.classList.add('hidden');
    } else {
      spinDurationSelect.value = 'custom';
      customDurationWrapper.classList.remove('hidden');
      customDurationSlider.value = (state.spinDuration / 1000).toFixed(1);
      customDurationVal.textContent = (state.spinDuration / 1000).toFixed(1) + 's';
    }

    soundIcon.className = state.soundEnabled ? 'ri-volume-up-line' : 'ri-volume-mute-line';
    btnSoundToggle.classList.toggle('active', state.soundEnabled);
  }

  // Get active prize to be drawn next
  // Rule: Sequential draw starts from the BOTTOM-MOST item first!
  function getActivePrizeToDraw() {
    if (!state.enablePrizes || !state.structuredPrizes || state.structuredPrizes.length === 0) {
      return null;
    }

    if (state.prizeMode === 'sequential') {
      // Loop from the BOTTOM-MOST item (last index) down to top (index 0)
      for (let i = state.structuredPrizes.length - 1; i >= 0; i--) {
        if (state.structuredPrizes[i].count > 0) {
          return { prize: state.structuredPrizes[i], index: i };
        }
      }
      return null;
    } else {
      // Random mode: pick randomly among prizes with count > 0
      const available = [];
      state.structuredPrizes.forEach((p, idx) => {
        if (p.count > 0) available.push({ prize: p, index: idx });
      });
      if (available.length === 0) return null;
      const randIdx = Math.floor(Math.random() * available.length);
      return available[randIdx];
    }
  }

  function updateUI() {
    participantCountBadge.textContent = state.names.length;
    btnSpin.disabled = state.names.length === 0 || isSpinning;

    // Display ONLY the Prize Name on the main screen banner
    if (state.enablePrizes) {
      prizeStatusBadge.classList.remove('hidden');
      const activeObj = getActivePrizeToDraw();
      if (activeObj && activeObj.prize) {
        // Display ONLY the prize name as requested!
        currentPrizeDisplay.textContent = activeObj.prize.name;
      } else {
        currentPrizeDisplay.textContent = 'Semua Stok Hadiah Telah Habis!';
      }
    } else {
      prizeStatusBadge.classList.add('hidden');
    }

    renderInitialReel();
  }

  // --- DYNAMIC PRIZE LIST EDITOR WITH LEVERS & STOCK ---
  function renderPrizeItemsEditor() {
    prizeItemsList.innerHTML = '';
    const activeObj = getActivePrizeToDraw();
    const activeBottomIdx = activeObj ? activeObj.index : -1;

    state.structuredPrizes.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'prize-item-row' + (index === activeBottomIdx ? ' is-bottom' : '');

      // Lever Up / Down controls
      const levers = document.createElement('div');
      levers.className = 'lever-controls';

      const btnUp = document.createElement('button');
      btnUp.className = 'lever-btn';
      btnUp.title = 'Naikkan Hierarki (Ke Atas)';
      btnUp.innerHTML = '<i class="ri-arrow-up-s-line"></i>';
      btnUp.disabled = index === 0;
      btnUp.onclick = () => movePrizeHierarchy(index, -1);

      const btnDown = document.createElement('button');
      btnDown.className = 'lever-btn';
      btnDown.title = 'Turunkan Hierarki (Ke Bawah)';
      btnDown.innerHTML = '<i class="ri-arrow-down-s-line"></i>';
      btnDown.disabled = index === state.structuredPrizes.length - 1;
      btnDown.onclick = () => movePrizeHierarchy(index, 1);

      levers.appendChild(btnUp);
      levers.appendChild(btnDown);

      // Rank Badge (#1, #2...)
      const rankBadge = document.createElement('span');
      rankBadge.className = 'prize-rank-badge';
      rankBadge.textContent = `#${index + 1}`;

      // Name Input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'prize-name-input';
      nameInput.value = item.name;
      nameInput.placeholder = 'Nama Hadiah';
      nameInput.onchange = (e) => {
        item.name = e.target.value.trim() || 'Hadiah';
      };

      // Stock Column Input
      const stockWrapper = document.createElement('div');
      stockWrapper.className = 'prize-stock-wrapper';
      
      const stockLabel = document.createElement('label');
      stockLabel.textContent = 'Stok:';

      const stockInput = document.createElement('input');
      stockInput.type = 'number';
      stockInput.min = '0';
      stockInput.className = 'prize-stock-input';
      stockInput.value = item.count;
      stockInput.onchange = (e) => {
        item.count = Math.max(0, parseInt(e.target.value, 10) || 0);
      };

      stockWrapper.appendChild(stockLabel);
      stockWrapper.appendChild(stockInput);

      // Remove Button
      const btnRemove = document.createElement('button');
      btnRemove.className = 'btn-remove-row';
      btnRemove.title = 'Hapus Hadiah Ini';
      btnRemove.innerHTML = '<i class="ri-delete-bin-line"></i>';
      btnRemove.onclick = () => removePrizeRow(index);

      row.appendChild(levers);
      row.appendChild(rankBadge);
      row.appendChild(nameInput);
      row.appendChild(stockWrapper);
      row.appendChild(btnRemove);

      prizeItemsList.appendChild(row);
    });
  }

  function movePrizeHierarchy(index, delta) {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= state.structuredPrizes.length) return;

    // Swap items
    const temp = state.structuredPrizes[index];
    state.structuredPrizes[index] = state.structuredPrizes[targetIdx];
    state.structuredPrizes[targetIdx] = temp;

    renderPrizeItemsEditor();
  }

  function addPrizeRow() {
    state.structuredPrizes.push({
      name: 'Hadiah Baru',
      count: 1
    });
    renderPrizeItemsEditor();
  }

  function removePrizeRow(index) {
    if (state.structuredPrizes.length <= 1) {
      alert('Minimal harus ada 1 jenis hadiah!');
      return;
    }
    state.structuredPrizes.splice(index, 1);
    renderPrizeItemsEditor();
  }

  // --- REEL RENDER & TOP-TO-BOTTOM ANIMATION ---
  function renderInitialReel() {
    reelTrack.innerHTML = '';
    reelTrack.classList.remove('spinning-fast');

    if (state.names.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'slot-item';
      emptyItem.textContent = 'Daftar Kosong';
      reelTrack.appendChild(emptyItem);
      reelTrack.style.transform = 'translateY(0px)';
      return;
    }

    const fragment = document.createDocumentFragment();
    state.names.forEach((name) => {
      const item = document.createElement('div');
      item.className = 'slot-item';
      item.textContent = name;
      fragment.appendChild(item);
    });

    reelTrack.appendChild(fragment);
    reelTrack.style.transform = 'translateY(0px)';
  }

  function spinVerticalReel() {
    if (isSpinning || state.names.length === 0) return;

    initAudio();
    isSpinning = true;
    btnSpin.disabled = true;

    // Pick Winner Name
    const winnerIndex = Math.floor(Math.random() * state.names.length);
    currentWinner = state.names[winnerIndex];

    // Pick Prize (Sequential starts from the BOTTOM-MOST item first!)
    currentPrizeWon = null;
    const activeObj = getActivePrizeToDraw();
    if (activeObj && activeObj.prize) {
      currentPrizeWon = activeObj.prize.name;
      activeObj.prize.count--; // Decrement stock
      saveState();
    }

    // Build Scrolling Sequence for Top to Bottom reel
    const duration = parseInt(state.spinDuration, 10) || 2000;
    const isUltraFast = duration <= 2000;
    const minItems = isUltraFast ? 75 : 45;

    let sequence = [];
    while (sequence.length < minItems) {
      sequence = sequence.concat(state.names);
    }
    
    // Add Winner item
    sequence.push(currentWinner);
    
    // Add bottom padding items
    for (let i = 0; i < VISIBLE_COUNT; i++) {
      sequence.push(state.names[i % state.names.length]);
    }

    // Render sequence to DOM
    reelTrack.innerHTML = '';
    if (isUltraFast) {
      reelTrack.classList.add('spinning-fast');
    }

    const fragment = document.createDocumentFragment();
    sequence.forEach((name) => {
      const item = document.createElement('div');
      item.className = 'slot-item';
      item.textContent = name;
      fragment.appendChild(item);
    });
    reelTrack.appendChild(fragment);

    // Target Y Offset
    const winnerSequenceIdx = sequence.length - 1 - VISIBLE_COUNT;
    const finalOffsetY = -(winnerSequenceIdx * ITEM_HEIGHT - MIDDLE_INDEX * ITEM_HEIGHT);

    const startTime = performance.now();
    let lastTickIndex = -1;

    function easeOutQuart(x) {
      return 1 - Math.pow(1 - x, 4);
    }

    function animateReel(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentOffsetY = finalOffsetY * easedProgress;
      reelTrack.style.transform = `translateY(${currentOffsetY}px)`;

      if (progress > 0.85) {
        reelTrack.classList.remove('spinning-fast');
      }

      const currentTickIndex = Math.floor(Math.abs(currentOffsetY) / ITEM_HEIGHT);
      if (currentTickIndex !== lastTickIndex) {
        lastTickIndex = currentTickIndex;
        playTickSound();
      }

      if (progress < 1) {
        requestAnimationFrame(animateReel);
      } else {
        reelTrack.style.transform = `translateY(${finalOffsetY}px)`;
        reelTrack.classList.remove('spinning-fast');
        onSpinComplete();
      }
    }

    requestAnimationFrame(animateReel);
  }

  function onSpinComplete() {
    isSpinning = false;
    btnSpin.disabled = false;
    playWinSound();
    triggerConfetti();

    // Show Winner Popup
    showWinnerModal(currentWinner, currentPrizeWon);

    // Remove winner if option enabled
    if (state.removeWinner) {
      const winIdx = state.names.indexOf(currentWinner);
      if (winIdx !== -1) {
        state.names.splice(winIdx, 1);
        saveState();
        syncInputsWithState();
        participantCountBadge.textContent = state.names.length;
      }
    }
  }

  // --- WINNER MODAL POPUP ---
  function showWinnerModal(winner, prize) {
    winnerNameText.textContent = winner;

    if (state.enablePrizes && prize) {
      winnerPrizeContainer.style.display = 'block';
      winnerPrizeText.textContent = prize;
    } else if (state.enablePrizes && !prize) {
      winnerPrizeContainer.style.display = 'block';
      winnerPrizeText.textContent = 'Maaf, Stok Hadiah Telah Habis!';
    } else {
      winnerPrizeContainer.style.display = 'none';
    }

    winnerModal.classList.remove('hidden');
  }

  function hideWinnerModal() {
    winnerModal.classList.add('hidden');
    updateUI();
  }

  // --- DRAWER & SETTINGS CONTROLS ---
  function openDrawer() {
    syncInputsWithState();
    menuDrawer.classList.remove('hidden');
  }

  function closeDrawer() {
    menuDrawer.classList.add('hidden');
  }

  function handleSaveSettings() {
    const nameLines = namesInput.value
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (nameLines.length === 0) {
      alert('Mohon masukkan minimal 1 nama peserta!');
      return;
    }

    state.names = nameLines;
    state.enablePrizes = toggleEnablePrizes.checked;
    state.prizeMode = prizeModeSelect.value;
    state.removeWinner = toggleRemoveWinner.checked;

    if (spinDurationSelect.value === 'custom') {
      state.spinDuration = Math.round(parseFloat(customDurationSlider.value) * 1000);
    } else {
      state.spinDuration = parseInt(spinDurationSelect.value, 10);
    }

    saveState();
    updateUI();
    closeDrawer();
  }

  // --- EVENT LISTENERS ---
  btnSpin.addEventListener('click', spinVerticalReel);

  btnSoundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    saveState();
    syncInputsWithState();
    initAudio();
  });

  btnOpenMenu.addEventListener('click', openDrawer);
  btnCloseDrawer.addEventListener('click', closeDrawer);
  btnSaveSettings.addEventListener('click', handleSaveSettings);

  btnAddPrizeRow.addEventListener('click', addPrizeRow);

  btnLoadPresetPrizes.addEventListener('click', () => {
    state.structuredPrizes = JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_PRIZES));
    renderPrizeItemsEditor();
  });

  btnResetApp.addEventListener('click', () => {
    if (confirm('Ulangi dan muat ulang daftar nama & stok hadiah awal?')) {
      state.names = [...DEFAULT_NAMES];
      state.structuredPrizes = JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_PRIZES));
      saveState();
      syncInputsWithState();
      updateUI();
    }
  });

  spinDurationSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customDurationWrapper.classList.remove('hidden');
    } else {
      customDurationWrapper.classList.add('hidden');
    }
  });

  customDurationSlider.addEventListener('input', (e) => {
    customDurationVal.textContent = parseFloat(e.target.value).toFixed(1) + 's';
  });

  // Drawer Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Presets & Clear Buttons
  btnLoadPresetNames.addEventListener('click', () => {
    namesInput.value = DEFAULT_NAMES.join('\n');
  });

  btnClearNames.addEventListener('click', () => {
    namesInput.value = '';
  });

  toggleEnablePrizes.addEventListener('change', (e) => {
    prizesEditorSection.style.display = e.target.checked ? 'block' : 'none';
  });

  // Winner Modal buttons
  btnSpinAgain.addEventListener('click', () => {
    hideWinnerModal();
    if (state.names.length > 0) {
      setTimeout(spinVerticalReel, 250);
    }
  });

  btnCloseModal.addEventListener('click', hideWinnerModal);

  // Close drawer/modal on backdrop click
  menuDrawer.addEventListener('click', (e) => {
    if (e.target === menuDrawer) closeDrawer();
  });

  winnerModal.addEventListener('click', (e) => {
    if (e.target === winnerModal) hideWinnerModal();
  });

  // Initialize App
  loadSavedState();
})();
