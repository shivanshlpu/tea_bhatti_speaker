/**
 * Toast.js — Non-blocking notification toasts.
 * Shows "Announced ✓", errors, and info messages.
 */

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  /**
   * Show a toast notification.
   * @param {string} message - The message to display
   * @param {'success'|'error'|'info'} [type='success'] - Toast type
   * @param {number} [duration=2500] - Auto-dismiss duration in ms
   */
  show(message, type = 'success', duration = 2500) {
    if (!this.container) this.init();

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || '✅'}</span>
      <span class="toast__message">${message}</span>
    `;

    this.container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);

    // Limit visible toasts to 5
    while (this.container.children.length > 5) {
      this.container.removeChild(this.container.firstChild);
    }
  },

  success(message) {
    this.show(message, 'success');
  },

  error(message) {
    this.show(message, 'error', 4000);
  },

  info(message) {
    this.show(message, 'info');
  }
};
