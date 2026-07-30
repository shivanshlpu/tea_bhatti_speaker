/**
 * favorites.js — LocalStorage-backed favorites (device-local, not per-user).
 * Manages favorite item IDs stored in the browser's localStorage.
 */

const Favorites = {
  STORAGE_KEY: 'cafe-voice-favorites',

  /**
   * Get all favorite item IDs.
   * @returns {Set<number>}
   */
  getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch {
      return new Set();
    }
  },

  /**
   * Check if an item is a favorite.
   * @param {number} itemId
   * @returns {boolean}
   */
  isFavorite(itemId) {
    return this.getAll().has(Number(itemId));
  },

  /**
   * Toggle an item's favorite status.
   * @param {number} itemId
   * @returns {boolean} New favorite state
   */
  toggle(itemId) {
    const favs = this.getAll();
    const id = Number(itemId);

    if (favs.has(id)) {
      favs.delete(id);
    } else {
      favs.add(id);
    }

    this.save(favs);
    return favs.has(id);
  },

  /**
   * Add an item to favorites.
   * @param {number} itemId
   */
  add(itemId) {
    const favs = this.getAll();
    favs.add(Number(itemId));
    this.save(favs);
  },

  /**
   * Remove an item from favorites.
   * @param {number} itemId
   */
  remove(itemId) {
    const favs = this.getAll();
    favs.delete(Number(itemId));
    this.save(favs);
  },

  /**
   * Save favorites to localStorage.
   * @param {Set<number>} favs
   */
  save(favs) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...favs]));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }
};
