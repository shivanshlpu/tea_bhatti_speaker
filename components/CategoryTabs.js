/**
 * CategoryTabs.js — Horizontal scrollable category tabs.
 * Renders tabs from API data, handles active state and filtering.
 */

const CategoryTabs = {
  container: null,
  activeCategory: 'all',

  init() {
    this.container = document.getElementById('categoryTabs');
  },

  /**
   * Render category tabs from data.
   * @param {Array} categories - Array of category objects with items nested
   */
  render(categories) {
    if (!this.container) this.init();
    this.container.innerHTML = '';

    // "All" tab
    const allTab = this.createTab({
      id: 'all',
      name: 'All Items',
      icon: '🍽️',
      itemCount: categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0)
    });
    this.container.appendChild(allTab);

    // Category tabs
    categories.forEach((cat) => {
      const tab = this.createTab({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '📁',
        itemCount: cat.items?.length || 0
      });
      this.container.appendChild(tab);
    });

    // Set initial active
    this.setActive('all');
  },

  /**
   * Create a single category tab element.
   * @param {Object} data - { id, name, icon, itemCount }
   * @returns {HTMLElement}
   */
  createTab(data) {
    const tab = document.createElement('button');
    tab.className = 'category-tab';
    tab.dataset.categoryId = data.id;

    tab.innerHTML = `
      <span class="category-tab__icon">${data.icon}</span>
      <span class="category-tab__name">${data.name}</span>
      <span class="category-tab__count">${data.itemCount}</span>
    `;

    tab.addEventListener('click', () => {
      this.setActive(data.id);

      // Notify the app to filter items
      if (typeof App !== 'undefined' && App.filterByCategory) {
        App.filterByCategory(data.id);
      }
    });

    return tab;
  },

  /**
   * Set the active category tab.
   * @param {string|number} categoryId
   */
  setActive(categoryId) {
    this.activeCategory = categoryId;
    const tabs = this.container.querySelectorAll('.category-tab');
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.categoryId == categoryId);
    });
  }
};
