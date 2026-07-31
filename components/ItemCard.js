const ITEM_EMOJIS = {
  1: '🍔', 2: '🍔', 3: '🧀🍔', 4: '🧀🍔', 5: '🔥🍔', 6: '🍔', 7: '👑🍔',
  8: '🥪', 9: '🌽🥪', 10: '🔥🥪', 11: '🥪', 12: '🌟🥪',
  13: '🍕', 14: '🍕', 15: '🍕', 16: '🌽🍕', 17: '🌶️🍕', 18: '🔥🍕', 19: '🥘🍕', 20: '🧀🍕',
  21: '🍟', 22: '🌶️🍟', 23: '🧀🍟',
  24: '🍝', 25: '🍝', 26: '🧀🍝',
  27: '🍜', 28: '🍜', 29: '🧀🍜', 30: '🧀🍜', 31: '🔥🍜',
  32: '🌭', 33: '🧀🌭', 34: '🔥🌭', 39: '🥣',
  35: '🍽️', 36: '👑🍽️', 37: '🍽️', 38: '☕'
};

const ItemCard = {
  /**
   * Create an item card DOM element.
   * @param {Object} item - Item data from the API
   * @param {string} categoryIcon - Category emoji icon
   * @param {boolean} [isFavoriteVariant=false] - Render as favorite card style
   * @returns {HTMLElement}
   */
  create(item, categoryIcon, isFavoriteVariant = false) {
    const card = document.createElement('div');
    card.className = `item-card${isFavoriteVariant ? ' item-card--favorite' : ''}`;
    card.dataset.itemId = item.id;
    card.dataset.categoryId = item.category_id;

    const isFav = Favorites.isFavorite(item.id);

    const emoji = item.emoji || ITEM_EMOJIS[item.id] || categoryIcon || '🍽️';

    card.innerHTML = `
      <span class="item-card__icon" style="font-size: 2.6rem; line-height: 1.2; margin-bottom: 8px; display: block;">${emoji}</span>
      <span class="item-card__name">${item.name_en}</span>
      <button class="item-card__fav ${isFav ? 'is-favorite' : ''}" 
              data-item-id="${item.id}" 
              aria-label="Toggle favorite"
              title="Toggle favorite">
        ${isFav ? '⭐' : '☆'}
      </button>
    `;

    // Tap to announce
    card.addEventListener('click', (e) => {
      // Don't trigger announce if clicking the favorite button
      if (e.target.closest('.item-card__fav')) return;

      this.handleTap(card, item);
    });

    // Favorite toggle
    const favBtn = card.querySelector('.item-card__fav');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(favBtn, item);
    });

    return card;
  },

  /**
   * Handle a tap on an item card — trigger announcement.
   * @param {HTMLElement} card
   * @param {Object} item
   */
  async handleTap(card, item) {
    // Visual flash feedback
    card.classList.remove('flash');
    // Force reflow to restart animation
    void card.offsetWidth;
    card.classList.add('flash');

    // Trigger announcement via API
    try {
      const result = await AnnounceClient.announce(item.id);

      if (result.success) {
        Toast.success(`Announced: ${item.name_en}`);
      } else {
        Toast.info(result.error || 'Already announced');
      }
    } catch (err) {
      Toast.error('Failed to announce');
      console.error('Announce error:', err);
    }
  },

  /**
   * Toggle favorite state on an item card.
   * @param {HTMLButtonElement} btn
   * @param {Object} item
   */
  toggleFavorite(btn, item) {
    const isFav = Favorites.toggle(item.id);
    btn.classList.toggle('is-favorite', isFav);
    btn.innerHTML = isFav ? '⭐' : '☆';

    // Refresh favorites row
    if (typeof App !== 'undefined' && App.renderFavorites) {
      App.renderFavorites();
    }

    Toast.info(isFav ? `${item.name_en} added to favorites` : `${item.name_en} removed from favorites`);
  }
};
