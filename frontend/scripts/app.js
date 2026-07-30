/**
 * app.js — Main application boot script.
 * Fetches categories/items from the API, renders the grid, wires all events.
 */

const App = {
  /** @type {Array} All categories with nested items */
  categories: [],

  /** @type {Array} All items (flat list) */
  allItems: [],

  /** @type {Object} Category icon lookup: { categoryId: icon } */
  categoryIcons: {},

  /** @type {string} Current active category filter */
  activeCategory: 'all',

  /** @type {string} Current search query */
  searchQuery: '',

  /**
   * Boot the application.
   */
  async init() {
    console.log('🚀 Cafe Voice System booting...');

    // Initialize modules
    Toast.init();
    Search.init();
    AnnounceClient.init();
    SettingsPanel.init();
    HistoryView.init();

    // Load data
    await this.loadCategories();

    // Bind navigation
    this.bindNavigation();

    // Bind queue bar actions
    this.bindQueueBar();

    // Bind emergency panel
    this.bindEmergencyPanel();

    console.log('✅ Cafe Voice System ready');
  },

  /**
   * Load categories and items from the API.
   */
  async loadCategories(retries = 4) {
    const backendUrl = AnnounceClient.getBackendUrl();
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${backendUrl}/api/categories`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();

        if (result.success) {
          this.categories = result.data;
          this.allItems = [];
          this.categoryIcons = {};

          this.categories.forEach((cat) => {
            this.categoryIcons[cat.id] = cat.icon || '🍽️';
            if (cat.items) {
              this.allItems.push(...cat.items);
            }
          });

          // Render UI
          CategoryTabs.render(this.categories);
          this.renderFavorites();
          this.renderItems();
          return;
        }
      } catch (err) {
        console.warn(`Attempt ${attempt}/${retries} failed to load categories:`, err);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
        } else {
          console.error('Failed to load categories after retries:', err);
          Toast.error('Server connecting... please refresh');
        }
      }
    }
  },

  /**
   * Render the favorites row.
   */
  renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const row = document.getElementById('favoritesRow');
    if (!grid || !row) return;

    const favIds = Favorites.getAll();
    const favItems = this.allItems.filter((item) => favIds.has(item.id));

    if (favItems.length === 0) {
      row.style.display = 'none';
      return;
    }

    row.style.display = 'block';
    grid.innerHTML = '';

    favItems.forEach((item) => {
      const icon = this.categoryIcons[item.category_id] || '🍽️';
      const card = ItemCard.create(item, icon, true);
      grid.appendChild(card);
    });
  },

  /**
   * Render items in the grid based on current filters.
   */
  renderItems() {
    const grid = document.getElementById('itemsGrid');
    if (!grid) return;

    let items = this.allItems;

    // Filter by category
    if (this.activeCategory !== 'all') {
      items = items.filter((item) => item.category_id == this.activeCategory);
    }

    // Filter by search
    if (this.searchQuery) {
      items = items.filter((item) => Search.matchesItem(item, this.searchQuery));
    }

    grid.innerHTML = '';

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">
          <p style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</p>
          <p>No items found</p>
        </div>
      `;
      return;
    }

    items.forEach((item) => {
      const icon = this.categoryIcons[item.category_id] || '🍽️';
      const card = ItemCard.create(item, icon);
      grid.appendChild(card);
    });
  },

  /**
   * Filter items by category (called from CategoryTabs).
   * @param {string|number} categoryId
   */
  filterByCategory(categoryId) {
    this.activeCategory = categoryId;
    this.renderItems();
  },

  /**
   * Filter items by search query (called from Search).
   * @param {string} query
   */
  filterBySearch(query) {
    this.searchQuery = query;
    this.renderItems();
  },

  /**
   * Bind navigation between screens.
   */
  bindNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const mobileItems = document.querySelectorAll('.mobile-nav-item');
    const screens = document.querySelectorAll('.screen');

    const switchScreen = (screenId) => {
      // Sync desktop top tabs
      navTabs.forEach((t) => t.classList.toggle('active', t.dataset.screen === screenId));
      // Sync mobile bottom items
      mobileItems.forEach((m) => m.classList.toggle('active', m.dataset.screen === screenId));

      // Show selected screen
      screens.forEach((s) => s.classList.remove('active'));
      const targetScreen = document.getElementById(`screen${this.capitalize(screenId)}`);
      if (targetScreen) {
        targetScreen.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Load data for history screen
      if (screenId === 'history') {
        HistoryView.load();
      }
    };

    navTabs.forEach((tab) => {
      tab.addEventListener('click', () => switchScreen(tab.dataset.screen));
    });

    mobileItems.forEach((item) => {
      item.addEventListener('click', () => switchScreen(item.dataset.screen));
    });
  },

  /**
   * Bind queue bar actions (repeat, cancel all).
   */
  bindQueueBar() {
    const repeatBtn = document.getElementById('repeatBtn');
    const cancelAllBtn = document.getElementById('cancelAllBtn');

    if (repeatBtn) {
      repeatBtn.addEventListener('click', async () => {
        try {
          const result = await AnnounceClient.repeat();
          if (result.success) {
            Toast.success('Repeating last announcement');
          } else {
            Toast.info(result.error || 'Nothing to repeat');
          }
        } catch (err) {
          Toast.error('Failed to repeat');
        }
      });
    }

    if (cancelAllBtn) {
      cancelAllBtn.addEventListener('click', async () => {
        try {
          const result = await AnnounceClient.cancel(null, true);
          if (result.success) {
            Toast.info('Queue cleared');
            const queueText = document.getElementById('queueText');
            if (queueText) {
              queueText.textContent = 'Ready';
              queueText.classList.remove('playing');
            }
          }
        } catch (err) {
          Toast.error('Failed to clear queue');
        }
      });
    }
  },

  /**
   * Bind emergency panel interactions.
   */
  bindEmergencyPanel() {
    // Preset buttons
    const presetBtns = document.querySelectorAll('.emergency-preset-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.text;
        const lang = btn.dataset.lang || 'en';

        // Confirmation step (Section 9: prevent mis-taps)
        if (!confirm(`Send emergency announcement?\n\n"${text}"`)) return;

        try {
          const result = await AnnounceClient.emergency(text, lang);
          if (result.success) {
            Toast.show('🚨 Emergency announced!', 'error', 3000);
          } else {
            Toast.error(result.error || 'Failed to send emergency');
          }
        } catch (err) {
          Toast.error('Failed to send emergency');
        }
      });
    });

    // Custom emergency send button
    const sendBtn = document.getElementById('emergencySendBtn');
    const textArea = document.getElementById('emergencyText');
    const langSelect = document.getElementById('emergencyLang');

    if (sendBtn && textArea) {
      sendBtn.addEventListener('click', async () => {
        const text = textArea.value.trim();
        if (!text) {
          Toast.error('Please enter an emergency message');
          textArea.focus();
          return;
        }

        const lang = langSelect?.value || 'en';

        // Confirmation step
        if (!confirm(`Send emergency announcement?\n\n"${text}"`)) return;

        try {
          const result = await AnnounceClient.emergency(text, lang);
          if (result.success) {
            Toast.show('🚨 Emergency announced!', 'error', 3000);
            textArea.value = '';
          } else {
            Toast.error(result.error || 'Failed to send emergency');
          }
        } catch (err) {
          Toast.error('Failed to send emergency');
        }
      });
    }
  },

  /**
   * Capitalize first letter.
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// --- Boot on DOM ready ---
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
