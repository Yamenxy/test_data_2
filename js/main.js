/* Minimal main.js
   Purpose: provide small helper functions used by registration page
   - getLoggedInUser(): returns parsed user from localStorage or null
   - showToast(message, type): lightweight toast for feedback
   Keep this file minimal so register.js can run standalone for registration-only flow.
*/
(function () {
  // Basic helpers and UI hooks for this registration-only page
  window.getLoggedInUser = function () {
    try {
      const raw = localStorage.getItem('loggedInUser');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  window.showToast = function (message, type = 'info') {
    try {
      // remove existing
      const existing = document.getElementById('simple-toast');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = 'simple-toast';
      el.textContent = String(message || '');
      Object.assign(el.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        padding: '10px 14px',
        background: type === 'error' ? '#e74c3c' : '#2ecc71',
        color: '#fff',
        borderRadius: '8px',
        zIndex: 99999,
        boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
        transition: 'opacity 0.3s ease',
        opacity: '1'
      });
      document.body.appendChild(el);

      setTimeout(function () {
        try { el.style.opacity = '0'; } catch (e) {}
        setTimeout(function () { try { el.remove(); } catch (e) {} }, 400);
      }, 2600);
    } catch (e) {
      try { console.log(type || 'info', message); } catch (ex) {}
    }
  };

  // Hide loader and perform light DOM initialization
  document.addEventListener('DOMContentLoaded', function () {
    try {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
    } catch (e) {}
  });

  // Minimal UI functions referenced by inline handlers in the HTML
  window.toggleLanguage = function () {
    try {
      const langText = document.getElementById('langText');
      if (!langText) return;
      langText.textContent = (langText.textContent.trim() === 'عربي') ? 'EN' : 'عربي';
    } catch (e) {}
  };

  window.toggleMenu = function () {
    try {
      const navLinks = document.getElementById('navLinks');
      if (!navLinks) return;
      navLinks.classList.toggle('open');
    } catch (e) {}
  };

})();
