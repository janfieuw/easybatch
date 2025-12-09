let currentUser = null;
let html5QrCode = null;
let currentScanType = null; // "IN" of "OUT"

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const mainSection = document.getElementById('main-section');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginError = document.getElementById('login-error');
  const userLabel = document.getElementById('user-label');
  const scanInBtn = document.getElementById('scan-in-btn');
  const scanOutBtn = document.getElementById('scan-out-btn');

  const scannerDiv = document.getElementById('scanner');
  const scanStatus = document.getElementById('scan-status');

  // Service worker voor PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service worker registratie mislukt:', err);
    });
  }

  // --- DEMO LOGIN (hardcoded gebruiker) ---
  loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (email === 'demo@demo.be' && password === 'demo') {
      currentUser = { email };
      loginError.textContent = '';
      loginSection.classList.add('hidden');
      mainSection.classList.remove('hidden');
      userLabel.textContent = `Ingelogd als ${email}`;
      loadPunches();
    } else {
      loginError.textContent = 'Onjuiste demo login. Gebruik demo@demo.be / demo.';
    }
  });

  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    stopScannerIfRunning();
    mainSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  // --- Scanknoppen ---
  scanInBtn.addEventListener('click', () => {
    startScan('IN');
  });

  scanOutBtn.addEventListener('click', () => {
    startScan('OUT');
  });

  // --- Scanner functies ---

  function startScan(type) {
    if (!currentUser) {
      alert('Log eerst in.');
      return;
    }

    currentScanType = type;
    scanStatus.textContent = `Camera starten voor ${type}...`;

    stopScannerIfRunning().then(() => {
      scannerDiv.classList.remove('hidden');

      // Html5Qrcode komt van de externe library (via script-tag in index.html)
      html5QrCode = new Html5Qrcode('scanner');

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        decodedText => {
          onQrScanned(decodedText);
        },
        () => {
          // scan errors negeren
        }
      ).then(() => {
        scanStatus.textContent = `Richt de camera op de QR-code (${type})`;
      }).catch(err => {
        scanStatus.textContent = 'Kon camera niet starten: ' + err;
      });
    });
  }

  function stopScannerIfRunning() {
    if (html5QrCode) {
      return html5QrCode
        .stop()
        .then(() => {
          html5QrCode.clear();
          html5QrCode = null;
          scannerDiv.classList.add('hidden');
        })
        .catch(() => {
          scannerDiv.classList.add('hidden');
          html5QrCode = null;
        });
    }
    return Promise.resolve();
  }

  function onQrScanned(decodedText) {
    // Stop scanner zodra we iets hebben
    stopScannerIfRunning();

    // In deze demo is de QR-code simpelweg de locatie (bv. "ENTRANCE")
    const location = decodedText || 'UNKNOWN';

    savePunch({
      email: currentUser.email,
      type: currentScanType,
      location,
      timestamp: new Date().toISOString()
    });

    scanStatus.textContent = `Geregistreerd: ${currentScanType} op locatie "${location}"`;
    loadPunches();
  }

  // --- Registraties in localStorage (per gebruiker) ---

  function getStorageKey() {
    if (!currentUser) return null;
    return `punches_${currentUser.email}`;
  }

  function loadPunches() {
    const key = getStorageKey();
    if (!key) return;
    const raw = localStorage.getItem(key);
    let punches = [];
    if (raw) {
      try {
        punches = JSON.parse(raw);
      } catch (e) {
        punches = [];
      }
    }

    const list = document.getElementById('uren-lijst');
    list.innerHTML = '';

    if (punches.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Nog geen registraties.';
      list.appendChild(li);
      return;
    }

    punches
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach(p => {
        const li = document.createElement('li');
        const dt = new Date(p.timestamp);
        const tijd = dt.toLocaleString();

        const typeSpan = document.createElement('span');
        typeSpan.textContent = p.type;
        typeSpan.className = p.type === 'IN' ? 'type-in' : 'type-out';

        li.appendChild(typeSpan);
        li.appendChild(
          document.createTextNode(
            ` – ${tijd} – locatie: ${p.location}`
          )
        );

        list.appendChild(li);
      });
  }

  function savePunch(punch) {
    const key = getStorageKey();
    if (!key) return;
    const raw = localStorage.getItem(key);
    let punches = [];
    if (raw) {
      try {
        punches = JSON.parse(raw);
      } catch (e) {
        punches = [];
      }
    }
    punches.push(punch);
    localStorage.setItem(key, JSON.stringify(punches));
  }
});
