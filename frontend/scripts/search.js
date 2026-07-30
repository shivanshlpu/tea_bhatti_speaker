/**
 * search.js — Client-side fuzzy filter over loaded items.
 * Filters the currently displayed items based on the search input.
 */

const Search = {
  input: null,
  clearBtn: null,

  init() {
    this.input = document.getElementById('searchInput');
    this.clearBtn = document.getElementById('searchClear');

    if (!this.input) return;

    // Debounced search on input
    let debounceTimer = null;
    this.input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.applyFilter();
      }, 150);

      // Show/hide clear button
      this.clearBtn.classList.toggle('visible', this.input.value.length > 0);
    });

    // Clear button
    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.clearBtn.classList.remove('visible');
      this.applyFilter();
      this.input.focus();
    });

    // Escape key clears
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.input.value = '';
        this.clearBtn.classList.remove('visible');
        this.applyFilter();
        this.input.blur();
      }
    });
  },

  /**
   * Apply the current search filter to the items grid.
   */
  applyFilter() {
    const query = (this.input?.value || '').toLowerCase().trim();

    if (typeof App !== 'undefined' && App.filterBySearch) {
      App.filterBySearch(query);
    }
  },

  /**
   * Simple fuzzy match: checks if the query characters appear in order in the target.
   * @param {string} target
   * @param {string} query
   * @returns {boolean}
   */
  fuzzyMatch(target, query) {
    if (!query) return true;
    const tLower = target.toLowerCase();
    const qLower = query.toLowerCase();

    // Simple substring match first (fast path)
    if (tLower.includes(qLower)) return true;

    // Fuzzy: characters appear in order
    let qi = 0;
    for (let i = 0; i < tLower.length && qi < qLower.length; i++) {
      if (tLower[i] === qLower[qi]) qi++;
    }
    return qi === qLower.length;
  },

  /**
   * Check if an item matches the search query.
   * Searches across all language fields.
   * @param {Object} item
   * @param {string} query
   * @returns {boolean}
   */
  matchesItem(item, query) {
    if (!query) return true;
    return (
      this.fuzzyMatch(item.name_en || '', query) ||
      this.fuzzyMatch(item.name_hi || '', query) ||
      this.fuzzyMatch(item.name_bho || '', query)
    );
  }
};
