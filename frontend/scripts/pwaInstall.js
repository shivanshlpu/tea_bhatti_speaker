/**
 * pwaInstall.js — PWA Web App Installation controller.
 * Intercepts beforeinstallprompt and provides a clean "📲 Install App" button in the UI.
 */

const PWAInstall = {
  deferredPrompt: null,

  init() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('⚡ [PWA] Service Worker registered:', reg.scope);
        }).catch((err) => {
          console.warn('⚠️ [PWA] Service Worker registration failed:', err);
        });
      });
    }

    // Intercept native install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('🎉 [PWA] Tea Bhatti App installed successfully!');
      this.deferredPrompt = null;
      this.hideInstallButton();
      if (typeof Toast !== 'undefined') {
        Toast.success('Tea Bhatti App installed on your device!');
      }
    });

    this.bindInstallBtn();
  },

  showInstallButton() {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'inline-flex';
  },

  hideInstallButton() {
    const btn = document.getElementById('pwaInstallBtn');
    if (btn) btn.style.display = 'none';
  },

  bindInstallBtn() {
    const btn = document.getElementById('pwaInstallBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!this.deferredPrompt) {
        alert('To install Tea Bhatti on your phone/PC:\n\n• On iPhone: Tap Share ➔ Add to Home Screen\n• On Android/Chrome: Tap 3 dots (⋮) ➔ Install App / Add to Home screen');
        return;
      }

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA installation');
      }
      this.deferredPrompt = null;
      this.hideInstallButton();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => PWAInstall.init());
