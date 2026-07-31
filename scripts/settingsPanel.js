/**
 * settingsPanel.js — Settings screen logic.
 * Theme toggle, language toggle, volume slider, speaker device picker.
 */

const SettingsPanel = {
  init() {
    this.bindThemeToggle();
    this.bindVolumeSlider();
    this.bindSpeedSlider();
    this.bindPitchSlider();
    this.bindDefaultLanguage();
    this.bindClearCache();
    this.loadSettings();
  },

  /**
   * Load settings from the API and apply them.
   */
  async loadSettings() {
    try {
      // Local storage overrides / fallbacks
      const savedRate = localStorage.getItem('cafe_speech_rate') || '0.85';
      const savedPitch = localStorage.getItem('cafe_speech_pitch') || '1.0';

      const speedSlider = document.getElementById('speedSlider');
      const speedDisplay = document.getElementById('speedValue');
      if (speedSlider) {
        speedSlider.value = savedRate;
        if (speedDisplay) speedDisplay.textContent = `${savedRate}x`;
        AnnounceClient.setSpeechRate(Number(savedRate));
      }

      const pitchSlider = document.getElementById('pitchSlider');
      const pitchDisplay = document.getElementById('pitchValue');
      if (pitchSlider) {
        pitchSlider.value = savedPitch;
        if (pitchDisplay) pitchDisplay.textContent = `${savedPitch}x`;
        AnnounceClient.setSpeechPitch(Number(savedPitch));
      }

      const response = await fetch(`${AnnounceClient.getBackendUrl()}/api/settings`);
      const result = await response.json();

      if (result.success) {
        const settings = result.data;

        // Apply theme
        this.applyTheme(settings.theme || 'light');

        // Apply volume
        const slider = document.getElementById('volumeSlider');
        const valueDisplay = document.getElementById('volumeValue');
        if (slider) {
          slider.value = Math.round((settings.volume || 0.9) * 100);
          valueDisplay.textContent = `${slider.value}%`;
        }

        // Apply default language
        const langSelect = document.getElementById('settingsDefaultLang');
        if (langSelect) {
          langSelect.value = settings.default_language || 'en';
        }

        // Set active language button in the top bar
        this.setActiveLang(settings.default_language || 'en');

        // Apply volume to announce client
        AnnounceClient.setVolume(settings.volume || 0.9);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  },

  /**
   * Save a settings update to the API.
   * @param {Object} updates
   */
  async saveSettings(updates) {
    try {
      await fetch(`${AnnounceClient.getBackendUrl()}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      Toast.error('Failed to save settings');
    }
  },

  /**
   * Bind theme toggle buttons.
   */
  bindThemeToggle() {
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');

    if (lightBtn) {
      lightBtn.addEventListener('click', () => {
        this.applyTheme('light');
        this.saveSettings({ theme: 'light' });
      });
    }

    if (darkBtn) {
      darkBtn.addEventListener('click', () => {
        this.applyTheme('dark');
        this.saveSettings({ theme: 'dark' });
      });
    }
  },

  /**
   * Apply a theme to the document.
   * @param {'light'|'dark'} theme
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Toggle stylesheet
    const lightSheet = document.getElementById('theme-light');
    const darkSheet = document.getElementById('theme-dark');

    if (lightSheet) lightSheet.disabled = (theme !== 'light');
    if (darkSheet) darkSheet.disabled = (theme !== 'dark');

    // Update toggle buttons
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
    if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
  },

  /**
   * Bind volume slider.
   */
  bindVolumeSlider() {
    const slider = document.getElementById('volumeSlider');
    const valueDisplay = document.getElementById('volumeValue');

    if (slider) {
      slider.addEventListener('input', () => {
        const vol = Number(slider.value);
        valueDisplay.textContent = `${vol}%`;
        AnnounceClient.setVolume(vol / 100);
      });

      slider.addEventListener('change', () => {
        const vol = Number(slider.value) / 100;
        this.saveSettings({ volume: vol });
      });
    }
  },

  /**
   * Bind speech speed slider.
   */
  bindSpeedSlider() {
    const slider = document.getElementById('speedSlider');
    const valueDisplay = document.getElementById('speedValue');

    if (slider) {
      slider.addEventListener('input', () => {
        const val = Number(slider.value).toFixed(2);
        if (valueDisplay) valueDisplay.textContent = `${val}x`;
        AnnounceClient.setSpeechRate(Number(val));
        localStorage.setItem('cafe_speech_rate', val);
      });
    }
  },

  /**
   * Bind voice pitch slider.
   */
  bindPitchSlider() {
    const slider = document.getElementById('pitchSlider');
    const valueDisplay = document.getElementById('pitchValue');

    if (slider) {
      slider.addEventListener('input', () => {
        const val = Number(slider.value).toFixed(2);
        if (valueDisplay) valueDisplay.textContent = `${val}x`;
        AnnounceClient.setSpeechPitch(Number(val));
        localStorage.setItem('cafe_speech_pitch', val);
      });
    }
  },

  /**
   * Bind default language selector.
   */
  bindDefaultLanguage() {
    const select = document.getElementById('settingsDefaultLang');
    if (select) {
      select.addEventListener('change', () => {
        const lang = select.value;
        this.saveSettings({ default_language: lang });
        this.setActiveLang(lang);
        Toast.success(`Default language set to ${select.options[select.selectedIndex].text}`);
      });
    }

    // Also bind the top-bar language switch
    const langBtns = document.querySelectorAll('.lang-switch__btn');
    langBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        this.setActiveLang(lang);
        this.saveSettings({ default_language: lang });

        // Also update the settings dropdown
        if (select) select.value = lang;
      });
    });
  },

  /**
   * Set the active language button in the top bar.
   * @param {string} lang
   */
  setActiveLang(lang) {
    const btns = document.querySelectorAll('.lang-switch__btn');
    btns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  },

  /**
   * Bind clear cache button.
   */
  bindClearCache() {
    const btn = document.getElementById('clearCacheBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        Toast.info('Cache cleared');
      });
    }
  }
};
