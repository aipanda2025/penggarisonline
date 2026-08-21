import { deviceDB, autoDetectDevice, detectDeviceAdvanced } from '../data/devices.js';

(function () {
  const PIXELS_PER_INCH_KEY = 'penggaris_ppi';
  const CALIBRATION_MODE_KEY = 'penggaris_cal_mode';
  const SELECTED_DEVICE_KEY = 'penggaris_device_name';

  let PPI = 96;
  let PPM = PPI / 25.4;
  let R = 80;
  let unit = 'cm';

  const cvH = document.getElementById('cv-h');
  const ctxH = cvH.getContext('2d');
  const cvV = document.getElementById('cv-v');
  const ctxV = cvV.getContext('2d');

  const btnCm = document.getElementById('btn-cm');
  const btnIn = document.getElementById('btn-inch');
  const calTrigger = document.getElementById('cal-trigger');
  const calModal = document.getElementById('cal-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const applyCalBtn = document.getElementById('apply-cal');

  const radAuto = document.getElementById('rad-auto');
  const radDevice = document.getElementById('rad-device');
  const cardAuto = document.getElementById('card-auto');
  const cardDevice = document.getElementById('card-device');

  const autoDetectLabel = document.getElementById('auto-detect-label');
  const deviceSelect = document.getElementById('device-select');

  // Populate Device Select Dropdown
  function populateDeviceSelect() {
    deviceSelect.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Select Your Device --';
    deviceSelect.appendChild(defaultOpt);

    const grouped = {};
    for (const dev of deviceDB) {
      if (!grouped[dev.brand]) grouped[dev.brand] = [];
      grouped[dev.brand].push(dev);
    }

    const brandPriority = ['Samsung', 'Oppo', 'Vivo', 'Xiaomi', 'Realme', 'Infinix', 'Tecno', 'Apple', 'itel', 'Advan (Indonesia)', 'Google', 'Laptop/PC', 'Generic'];

    const brands = Object.keys(grouped).sort((a, b) => {
      const idxA = brandPriority.indexOf(a);
      const idxB = brandPriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    for (const brand of brands) {
      const group = document.createElement('optgroup');
      group.label = brand;

      grouped[brand].sort((a, b) => a.name.localeCompare(b.name)).forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev.ppi;
        opt.textContent = dev.name;
        opt.dataset.name = dev.name;
        group.appendChild(opt);
      });

      deviceSelect.appendChild(group);
    }
  }

  // Load Saved or Auto-Detected Calibration
  async function initCalibration() {
    populateDeviceSelect();

    const detected = autoDetectDevice();
    if (detected) {
      autoDetectLabel.textContent = detected.name;
    } else {
      autoDetectLabel.textContent = `Standard Display`;
    }

    detectDeviceAdvanced().then((detectedAdv) => {
      if (detectedAdv) {
        autoDetectLabel.textContent = detectedAdv.name;
      }
    });

    const savedPPI = localStorage.getItem(PIXELS_PER_INCH_KEY);
    const savedMode = localStorage.getItem(CALIBRATION_MODE_KEY) || 'auto';
    const savedDeviceName = localStorage.getItem(SELECTED_DEVICE_KEY) || '';

    if (savedPPI && !isNaN(parseFloat(savedPPI))) {
      PPI = parseFloat(savedPPI);
    } else if (detected) {
      PPI = detected.ppi;
    } else {
      PPI = 96.0;
    }
    PPM = PPI / 25.4;

    // Set modal initial radio selection
    if (savedMode === 'device' && savedDeviceName) {
      radDevice.checked = true;
      cardDevice.classList.add('selected');
      cardAuto.classList.remove('selected');
      // Set dropdown selection
      for (let i = 0; i < deviceSelect.options.length; i++) {
        if (deviceSelect.options[i].dataset.name === savedDeviceName) {
          deviceSelect.selectedIndex = i;
          break;
        }
      }
    } else {
      radAuto.checked = true;
      cardAuto.classList.add('selected');
      cardDevice.classList.remove('selected');
    }
  }

  // Modal Interactivity
  function setupModalEvents() {
    calTrigger.addEventListener('click', () => {
      calModal.classList.add('open');
    });

    closeModalBtn.addEventListener('click', () => {
      calModal.classList.remove('open');
    });

    calModal.addEventListener('click', (e) => {
      if (e.target === calModal) {
        calModal.classList.remove('open');
      }
    });

    cardAuto.addEventListener('click', () => {
      radAuto.checked = true;
      cardAuto.classList.add('selected');
      cardDevice.classList.remove('selected');
    });

    cardDevice.addEventListener('click', () => {
      radDevice.checked = true;
      cardDevice.classList.add('selected');
      cardAuto.classList.remove('selected');
    });

    deviceSelect.addEventListener('change', () => {
      radDevice.checked = true;
      cardDevice.classList.add('selected');
      cardAuto.classList.remove('selected');
    });

    applyCalBtn.addEventListener('click', () => {
      if (radDevice.checked) {
        const selectedOpt = deviceSelect.options[deviceSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          const newPPI = parseFloat(selectedOpt.value);
          const devName = selectedOpt.dataset.name;

          PPI = newPPI;
          PPM = PPI / 25.4;

          localStorage.setItem(PIXELS_PER_INCH_KEY, PPI.toString());
          localStorage.setItem(CALIBRATION_MODE_KEY, 'device');
          localStorage.setItem(SELECTED_DEVICE_KEY, devName);
        } else {
          alert('Please select a device from the list.');
          return;
        }
      } else {
        // Auto detect selected
        const detected = autoDetectDevice();
        const newPPI = detected ? detected.ppi : 96.0;

        PPI = newPPI;
        PPM = PPI / 25.4;

        localStorage.setItem(PIXELS_PER_INCH_KEY, PPI.toString());
        localStorage.setItem(CALIBRATION_MODE_KEY, 'auto');
        localStorage.removeItem(SELECTED_DEVICE_KEY);
      }

      calModal.classList.remove('open');
      draw();
    });
  }

  // --- Main draw ---
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;

    cvH.width = W * dpr; cvH.height = R * dpr;
    cvH.style.width = W + 'px'; cvH.style.height = R + 'px';
    ctxH.setTransform(dpr, 0, 0, dpr, 0, 0);

    cvV.width = R * dpr; cvV.height = H * dpr;
    cvV.style.width = R + 'px'; cvV.style.height = H + 'px';
    ctxV.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctxH.clearRect(0, 0, W, R);
    ctxV.clearRect(0, 0, R, H);

    if (unit === 'cm') { drawCmH(W); drawCmV(H); }
    else { drawInH(W); drawInV(H); }
  }

  // --- CM Horizontal ---
  function drawCmH(W) {
    const tot = Math.ceil((W - R) / PPM);
    for (let mm = 0; mm <= tot; mm++) {
      const x = R + mm * PPM;
      if (x > W) break;
      const th = mm % 10 === 0 ? 36 : mm % 5 === 0 ? 22 : 12;
      const lw = mm % 10 === 0 ? 1.4 : mm % 5 === 0 ? 1 : 0.7;
      ctxH.strokeStyle = mm % 10 === 0 ? '#222' : '#666';
      ctxH.lineWidth = lw;
      ctxH.beginPath(); ctxH.moveTo(x, 0); ctxH.lineTo(x, th); ctxH.stroke();

      if (mm % 5 === 0) {
        const rh = mm % 10 === 0 ? 18 : 11;
        ctxH.strokeStyle = '#aaa'; ctxH.lineWidth = 0.7;
        ctxH.beginPath(); ctxH.moveTo(x, R); ctxH.lineTo(x, R - rh); ctxH.stroke();
      }
      if (mm % 10 === 0 && mm > 0) {
        ctxH.font = '600 12px system-ui'; ctxH.fillStyle = '#222';
        ctxH.textAlign = 'center'; ctxH.textBaseline = 'top';
        ctxH.fillText(mm / 10, x, th + 3);
      }
    }
  }

  // --- CM Vertical ---
  function drawCmV(H) {
    const tot = Math.ceil((H - R) / PPM);
    for (let mm = 0; mm <= tot; mm++) {
      const y = R + mm * PPM;
      if (y > H) break;
      const tw = mm % 10 === 0 ? 36 : mm % 5 === 0 ? 22 : 12;
      const lw = mm % 10 === 0 ? 1.4 : mm % 5 === 0 ? 1 : 0.7;
      ctxV.strokeStyle = mm % 10 === 0 ? '#222' : '#666';
      ctxV.lineWidth = lw;
      ctxV.beginPath(); ctxV.moveTo(0, y); ctxV.lineTo(tw, y); ctxV.stroke();

      if (mm % 5 === 0) {
        const rw = mm % 10 === 0 ? 18 : 11;
        ctxV.strokeStyle = '#aaa'; ctxV.lineWidth = 0.7;
        ctxV.beginPath(); ctxV.moveTo(R, y); ctxV.lineTo(R - rw, y); ctxV.stroke();
      }
      if (mm % 10 === 0 && mm > 0) {
        ctxV.save();
        ctxV.font = '600 12px system-ui'; ctxV.fillStyle = '#222';
        ctxV.textAlign = 'center'; ctxV.textBaseline = 'middle';
        ctxV.translate(tw + 14, y);
        ctxV.rotate(-Math.PI / 2);
        ctxV.fillText(mm / 10, 0, 0);
        ctxV.restore();
      }
    }
  }

  // --- INCH Horizontal ---
  function drawInH(W) {
    const px16 = PPI / 16;
    const tot = Math.ceil((W - R) / px16);
    for (let i = 0; i <= tot; i++) {
      const x = R + i * px16;
      if (x > W) break;
      let th, lw;
      if (i % 16 === 0) { th = 36; lw = 1.4; }
      else if (i % 8 === 0) { th = 24; lw = 1; }
      else if (i % 4 === 0) { th = 16; lw = 0.8; }
      else if (i % 2 === 0) { th = 10; lw = 0.7; }
      else { th = 6; lw = 0.5; }
      ctxH.strokeStyle = i % 16 === 0 ? '#222' : '#666';
      ctxH.lineWidth = lw;
      ctxH.beginPath(); ctxH.moveTo(x, 0); ctxH.lineTo(x, th); ctxH.stroke();

      if (i % 8 === 0) {
        const rh = i % 16 === 0 ? 18 : 12;
        ctxH.strokeStyle = '#aaa'; ctxH.lineWidth = 0.7;
        ctxH.beginPath(); ctxH.moveTo(x, R); ctxH.lineTo(x, R - rh); ctxH.stroke();
      }
      if (i % 16 === 0) {
        ctxH.font = '600 12px system-ui'; ctxH.fillStyle = '#222';
        ctxH.textAlign = 'center'; ctxH.textBaseline = 'top';
        ctxH.fillText(i / 16, x, th + 3);
      }
    }
  }

  // --- INCH Vertical ---
  function drawInV(H) {
    const px16 = PPI / 16;
    const tot = Math.ceil((H - R) / px16);
    for (let i = 0; i <= tot; i++) {
      const y = R + i * px16;
      if (y > H) break;
      let tw, lw;
      if (i % 16 === 0) { tw = 36; lw = 1.4; }
      else if (i % 8 === 0) { tw = 24; lw = 1; }
      else if (i % 4 === 0) { tw = 16; lw = 0.8; }
      else if (i % 2 === 0) { tw = 10; lw = 0.7; }
      else { tw = 6; lw = 0.5; }
      ctxV.strokeStyle = i % 16 === 0 ? '#222' : '#666';
      ctxV.lineWidth = lw;
      ctxV.beginPath(); ctxV.moveTo(0, y); ctxV.lineTo(tw, y); ctxV.stroke();

      if (i % 8 === 0) {
        const rw = i % 16 === 0 ? 18 : 12;
        ctxV.strokeStyle = '#aaa'; ctxV.lineWidth = 0.7;
        ctxV.beginPath(); ctxV.moveTo(R, y); ctxV.lineTo(R - rw, y); ctxV.stroke();
      }
      if (i % 16 === 0) {
        ctxV.save();
        ctxV.font = '600 12px system-ui'; ctxV.fillStyle = '#222';
        ctxV.textAlign = 'center'; ctxV.textBaseline = 'middle';
        ctxV.translate(tw + 14, y);
        ctxV.rotate(-Math.PI / 2);
        ctxV.fillText(i / 16, 0, 0);
        ctxV.restore();
      }
    }
  }

  // Toggle unit
  btnCm.onclick = function () {
    unit = 'cm';
    btnCm.classList.add('active'); btnIn.classList.remove('active');
    draw();
  };
  btnIn.onclick = function () {
    unit = 'inch';
    btnIn.classList.add('active'); btnCm.classList.remove('active');
    draw();
  };

  initCalibration();
  setupModalEvents();
  draw();
  window.addEventListener('resize', draw);
})();
