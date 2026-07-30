/**
 * ItemCard.js — Renders one tappable item card.
 * Handles the flash animation on tap and favorite toggling.
 */

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

    const hasImage = !!item.image_url;
    const imageUrl = hasImage ? encodeURI(item.image_url) : '';

    card.innerHTML = `
      ${hasImage ? `
        <div class="item-card__img-container">
          <img class="item-card__img" src="${imageUrl}" alt="${item.name_en}" loading="lazy" onerror="this.parentElement.style.display='none'; this.parentElement.nextElementSibling.style.display='block';" />
        </div>
        <span class="item-card__icon" style="display:none;">${categoryIcon || '🍽️'}</span>
      ` : `
        <span class="item-card__icon">${categoryIcon || '🍽️'}</span>
      `}
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
