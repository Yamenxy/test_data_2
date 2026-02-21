/* ===== Registration Page JS ===== */
const REGISTER_API = 'https://script.google.com/macros/s/AKfycbyc1ARUyRvini8qeLxYDi1uSZlq3fDR_mQCecq50PJcuZZLvZ337pLPGgS7Qgw3cBQjrA/exec';

let scannerRunning = false;
// Detection confirmation state to reduce false positives
let _lastDetectedCode = null;
let _lastDetectedCount = 0;
let _lastDetectedTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  // Always keep the user on this registration page.
  // Do not redirect to `profile.html` from here under any login state.

  // Prevent typing in the code field — scan only
  const codeInput = document.getElementById('studentCode');
  if (codeInput) {
    // Manual entry enabled by default for registration-only flow
    codeInput.dataset.manualEnabled = 'true';
    codeInput.removeAttribute('readonly');
  }

  // Scanner buttons
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');
  if (startBtn) startBtn.addEventListener('click', startScanner);
  if (stopBtn) stopBtn.addEventListener('click', stopScanner);

  // Form submission
  const form = document.getElementById('registerForm');
  if (form) form.addEventListener('submit', handleRegistration);
});

/* ==================== Barcode Scanner ==================== */
function startScanner() {
  const scannerEl = document.getElementById('scannerArea');
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');

  if (!scannerEl) return;
  scannerEl.style.display = 'block';
  startBtn.style.display = 'none';
  stopBtn.style.display = 'inline-flex';

  // create or reset a confirmation badge to show detection progress
  let confirmBadge = scannerEl.querySelector('.scan-confirm-badge');
  if (!confirmBadge) {
    confirmBadge = document.createElement('div');
    confirmBadge.className = 'scan-confirm-badge';
    Object.assign(confirmBadge.style, {
      position: 'absolute',
      right: '10px',
      top: '10px',
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      borderRadius: '8px',
      fontSize: '13px',
      zIndex: 9999,
      pointerEvents: 'none'
    });
    scannerEl.style.position = 'relative';
    scannerEl.appendChild(confirmBadge);
  }
  confirmBadge.textContent = '';

  if (typeof Quagga === 'undefined') {
    showToast('Scanner library not loaded', 'error');
    return;
  }

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: scannerEl,
      constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    },
    locator: {
      patchSize: "medium",
      halfSample: false
    },
    numOfWorkers: (navigator.hardwareConcurrency || 2),
    frequency: 10,
    decoder: {
      readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader", "upc_reader", "i2of5_reader"],
      multiple: false
    }
  }, (err) => {
    if (err) {
      showToast('Camera error: ' + err.message, 'error');
      stopScanner();
      return;
    }
    Quagga.start();
    scannerRunning = true;
  });

  // Require multiple consistent detections before accepting the code
  Quagga.onDetected((result) => {
    try {
      if (!result || !result.codeResult || !result.codeResult.code) return;
      const code = String(result.codeResult.code).trim();
      const now = Date.now();
      const CONFIRM_THRESHOLD = 3; // number of identical reads required
      const TIME_WINDOW = 2000; // ms window to accumulate reads

      if (code === _lastDetectedCode && (now - _lastDetectedTime) < TIME_WINDOW) {
        _lastDetectedCount++;
      } else {
        _lastDetectedCode = code;
        _lastDetectedCount = 1;
      }
      _lastDetectedTime = now;

      // update badge with progress if present
      try {
        const badge = document.querySelector('#scannerArea .scan-confirm-badge');
        if (badge) badge.textContent = `Confirming: ${_lastDetectedCount}/${CONFIRM_THRESHOLD}`;
      } catch (ex) {}

      if (_lastDetectedCount >= CONFIRM_THRESHOLD) {
        document.getElementById('studentCode').value = code;
        // reset confirmation state
        _lastDetectedCode = null;
        _lastDetectedCount = 0;
        _lastDetectedTime = 0;
        // clear badge
        try { const b = document.querySelector('#scannerArea .scan-confirm-badge'); if (b) b.textContent = ''; } catch(e){}
        stopScanner();
        showToast('تم مسح الكود: ' + code, 'success');
      }
    } catch (e) {
      // ignore detection parsing errors
    }
  });
}

function stopScanner() {
  if (scannerRunning && typeof Quagga !== 'undefined') {
    Quagga.stop();
    scannerRunning = false;
  }
  const scannerEl = document.getElementById('scannerArea');
  if (scannerEl) scannerEl.style.display = 'none';
  // clear any confirmation badge
  try { const b = document.querySelector('#scannerArea .scan-confirm-badge'); if (b) b.remove(); } catch(e){}
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
}

/* ==================== Name Validation ==================== */
function isArabicName(name) {
  // Allow Arabic letters, spaces, and common diacritics only
  return /^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/.test(name);
}

function validateFullName(name) {
  const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 4) return { valid: false, reason: 'short' };
  if (!isArabicName(name)) return { valid: false, reason: 'notArabic' };
  // Each part must be at least 2 characters
  if (parts.some(p => p.length < 2)) return { valid: false, reason: 'partTooShort' };
  return { valid: true };
}

/* ==================== Phone Validation ==================== */
function validatePhone(phone) {
  // Accept local (01XXXXXXXXX) or international (+201XXXXXXXXX / 201XXXXXXXXX)
  const s = String(phone || '').replace(/\D/g, '');
  // If starts with country code '20', strip it for validation
  const local = s.replace(/^20/, '').replace(/^0+/, '');
  return /^1[0-9]{9}$/.test(local);
}

function formatToPlus20(phone) {
  let s = String(phone || '').replace(/\D/g, '');
  // remove leading zeros
  s = s.replace(/^0+/, '');
  // remove leading country code if present
  s = s.replace(/^20/, '');
  return '+20' + s;
}

/* ==================== Registration Handler ==================== */
async function handleRegistration(e) {
  e.preventDefault();
  const form = e.target;
  const alertEl = document.getElementById('regAlert');
  const submitBtn = document.getElementById('submitBtn');

  const studentCode = document.getElementById('studentCode').value.trim();
  const studentName = document.getElementById('studentName').value.trim();
  const studentPhone = document.getElementById('studentPhone').value.trim();
  const parentPhone = document.getElementById('parentPhone').value.trim();
  const center = document.getElementById('center').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Clear previous errors
  alertEl.innerHTML = '';

  // Validate code was scanned
  if (!studentCode) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Please scan your barcode first" data-ar="يرجى مسح الباركود أولاً">Please scan your barcode first</span></div>';
    return;
  }

  // Validate name: Arabic, at least 4 parts
  const nameCheck = validateFullName(studentName);
  if (!nameCheck.valid) {
    let msg = '';
    if (nameCheck.reason === 'notArabic') {
      msg = '<span data-en="Name must be in Arabic only" data-ar="الاسم يجب أن يكون بالعربي فقط">الاسم يجب أن يكون بالعربي فقط</span>';
    } else if (nameCheck.reason === 'short') {
      msg = '<span data-en="Enter your full 4-part name" data-ar="أدخل اسمك الرباعي (4 أجزاء على الأقل)">أدخل اسمك الرباعي (4 أجزاء على الأقل)</span>';
    } else {
      msg = '<span data-en="Each name part must be at least 2 letters" data-ar="كل جزء من الاسم يجب أن يكون حرفين على الأقل">كل جزء من الاسم يجب أن يكون حرفين على الأقل</span>';
    }
    alertEl.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    document.getElementById('studentName').focus();
    return;
  }

  // Validate all fields
  if (!studentName || !studentPhone || !parentPhone || !center || !password) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Please fill all fields" data-ar="يرجى ملء جميع الحقول">Please fill all fields</span></div>';
    return;
  }

  // Validate phones
  if (!validatePhone(studentPhone)) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Invalid student phone (01XXXXXXXXX)" data-ar="رقم الطالب غير صحيح (01XXXXXXXXX)">Invalid student phone (01XXXXXXXXX)</span></div>';
    return;
  }
  if (!validatePhone(parentPhone)) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Invalid parent phone (01XXXXXXXXX)" data-ar="رقم ولي الأمر غير صحيح (01XXXXXXXXX)">Invalid parent phone (01XXXXXXXXX)</span></div>';
    return;
  }

  // Format phones to international +20 for comparison and submission
  const formattedStudentPhone = formatToPlus20(studentPhone);
  const formattedParentPhone = formatToPlus20(parentPhone);

  // Student phone and parent phone must not be the same
  if (formattedStudentPhone === formattedParentPhone) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Student phone and parent phone must be different" data-ar="رقم الطالب ورقم ولي الأمر يجب أن يكونا مختلفين">Student phone and parent phone must be different</span></div>';
    return;
  }

  // Password checks
  if (password.length < 6) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Password must be at least 6 characters" data-ar="كلمة المرور يجب أن تكون 6 أحرف على الأقل">Password must be at least 6 characters</span></div>';
    return;
  }
  if (password !== confirmPassword) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Passwords do not match" data-ar="كلمتا المرور غير متطابقتين">Passwords do not match</span></div>';
    return;
  }

  // Submit
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span data-en="Registering..." data-ar="جاري التسجيل...">Registering...</span>';

  const formData = new FormData();
  formData.append('studentCode', studentCode);
  formData.append('studentName', studentName);
  // Send phones prefixed with +20
  formData.append('phone', formattedStudentPhone);
  formData.append('parentPhone', formattedParentPhone);
  formData.append('center', center);
  formData.append('password', password);

  try {
    const response = await fetch(REGISTER_API, {
      method: 'POST',
      body: formData,
      credentials: 'omit',
      redirect: 'follow'
    });

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      // Could not read response — try a verification GET to confirm registration
      try {
        const verifyResp = await fetch(`${REGISTER_API}?action=login&code=${encodeURIComponent(studentCode)}&password=${encodeURIComponent(password)}`);
        const verifyData = await verifyResp.json();
        if (verifyData.status === 'success') {
          data = { status: 'success' };
        } else {
          data = { status: 'error', message: 'حدث خطأ أثناء التسجيل. حاول مرة أخرى / Registration error. Please try again.' };
        }
      } catch (verifyErr) {
        data = { status: 'error', message: 'حدث خطأ أثناء التسجيل. حاول مرة أخرى / Registration error. Please try again.' };
      }
    }

    if (data.status === 'error') {
      alertEl.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> ${data.message || 'Registration failed'}</div>`;
      alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alertEl.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle"></i> <span data-en="Registration successful!" data-ar="تم التسجيل بنجاح!">Registration successful!</span></div>';
      showToast('تم التسجيل بنجاح!', 'success');

      // KEEP THE USER ON THIS PAGE so they can add another registration.
      // Reset the form fields and focus the first input for convenience.
      try {
        form.reset();
        const codeEl = document.getElementById('studentCode');
        if (codeEl) codeEl.focus();
        // If a loggedInUser object exists, mark profileCompleted so future visits
        // to `profile.html` will go there instead of showing a missing profile.
        try {
          const existing = getLoggedInUser();
          if (existing) {
            existing.profileCompleted = true;
            localStorage.setItem('loggedInUser', JSON.stringify(existing));
          }
        } catch (e) {}
      } catch (e) {}
    }
  } catch (err) {
    alertEl.innerHTML = '<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> <span data-en="Registration failed. Please try again." data-ar="فشل التسجيل. حاول مرة أخرى.">فشل التسجيل. حاول مرة أخرى.</span></div>';
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span data-en="Register" data-ar="تسجيل">Register</span>';
  }
}
