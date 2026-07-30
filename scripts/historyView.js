/**
 * historyView.js — Renders announcement history list with filters.
 * Supports status and language filtering, tap-to-repeat from any row.
 */

const HistoryView = {
  list: null,
  emptyState: null,

  init() {
    this.list = document.getElementById('historyList');
    this.emptyState = document.getElementById('historyEmpty');

    // Bind filter changes
    const statusFilter = document.getElementById('historyFilterStatus');
    const langFilter = document.getElementById('historyFilterLang');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.load());
    }
    if (langFilter) {
      langFilter.addEventListener('change', () => this.load());
    }

    // Bind clear history button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAll());
    }
  },

  /**
   * Load and render history from the API.
   */
  async load() {
    try {
      const status = document.getElementById('historyFilterStatus')?.value || '';
      const language = document.getElementById('historyFilterLang')?.value || '';

      let url = '/api/history?limit=50';
      if (status) url += `&status=${status}`;
      if (language) url += `&language=${language}`;

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        this.render(result.data.rows);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  },

  /**
   * Render history items.
   * @param {Array} rows
   */
  render(rows) {
    if (!this.list) return;

    if (!rows || rows.length === 0) {
      this.list.innerHTML = '';
      this.list.style.display = 'none';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      return;
    }

    this.list.style.display = 'flex';
    if (this.emptyState) this.emptyState.style.display = 'none';

    this.list.innerHTML = rows.map((row) => {
      const time = this.formatTime(row.triggered_at);
      const langLabel = { en: 'EN', hi: 'हि', bho: 'भो' }[row.language_code] || row.language_code;

      return `
        <div class="history-item" data-history-id="${row.id}">
          <div class="history-item__left">
            <span class="history-item__text">${this.escapeHtml(row.text_spoken)}</span>
            <div class="history-item__meta">
              <span class="history-item__status history-item__status--${row.status}">
                ${this.getStatusIcon(row.status)} ${row.status}
              </span>
              <span>${langLabel}</span>
              <span>${row.priority !== 'normal' ? `⚡ ${row.priority}` : ''}</span>
              <span>${time}</span>
            </div>
          </div>
          <div class="history-item__actions">
            <button class="history-item__repeat-btn" 
                    data-history-id="${row.id}" 
                    aria-label="Repeat this announcement"
                    title="Repeat">
              🔁
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind repeat buttons
    this.list.querySelectorAll('.history-item__repeat-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const historyId = Number(btn.dataset.historyId);
        try {
          const result = await AnnounceClient.repeat(historyId);
          if (result.success) {
            Toast.success('Repeating announcement');
          } else {
            Toast.error(result.error || 'Failed to repeat');
          }
        } catch (err) {
          Toast.error('Failed to repeat');
        }
      });
    });
  },

  /**
   * Get a status icon.
   * @param {string} status
   * @returns {string}
   */
  getStatusIcon(status) {
    const icons = {
      played: '✅',
      failed: '❌',
      cancelled: '🚫',
      queued: '⏳'
    };
    return icons[status] || '●';
  },

  /**
   * Format an ISO timestamp for display.
   * @param {string} isoString
   * @returns {string}
   */
  formatTime(isoString) {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  },

  /**
   * Escape HTML to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Clear all history.
   */
  async clearAll() {
    if (!confirm('Are you sure you want to clear all announcement history?')) return;

    try {
      const response = await fetch('/api/history', { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        Toast.success('History cleared');
        this.load();
      }
    } catch (err) {
      Toast.error('Failed to clear history');
    }
  }
};
