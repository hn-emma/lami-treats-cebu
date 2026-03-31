const GIFT_WRAP_VARIANT_ID = parseInt(document.body.dataset.giftWrapId || '0');

function getCartErrorMessage(error, response) {
  if (!navigator.onLine) return CartErrors.network_error;
  if (response?.status === 422) {
    const desc = response?.description?.toLowerCase() || '';
    if (desc.includes('sold out') || desc.includes('all available stock')) return CartErrors.sold_out;
    if (desc.includes('not enough') || desc.includes('only')) return CartErrors.not_enough;
    return response.description || CartErrors.cart_error;
  }
  return CartErrors.generic;
}

const CartAPI = (() => {
  async function handleShopifyError(response) {
    const data = await response.json().catch(() => ({}));
    const message = data.description ?? data.message ?? 'An unexpected error occurred.';

    showErrorNotification(message, `Error ${response.status}`);

    return Promise.reject({
      status: response.status,
      message: message,
    });
  }
  return {
    async updateItem(key, quantity) {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity }),
      });
      if (!response.ok) return handleShopifyError(response);
      return response.json();
    },

    async updateAttributes(attributes) {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes }),
      });
      if (!response.ok) throw new Error('Cart attribute update failed');
      return response.json();
    },

    async getCart() {
      const response = await fetch('/cart.js');
      if (!response.ok) throw new Error('Cart fetch failed');
      return response.json();
    },

    async clearCart() {
      const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Cart clear failed');
      return response.json();
    },

    async addItem(variantId, quantity = 1, properties = {}) {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity, properties }),
      });

      if (!response.ok) return handleShopifyError(response);
      return response.json();
    },

    async updateAll(updates) {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error('Cart global update failed');
      return response.json();
    },
  };
})();

async function updateCartBadge(cartOrCount) {
  let count = 0;

  if (typeof cartOrCount === 'object' && cartOrCount.items) {
    count = cartOrCount.items.reduce((total, item) => {
      return item.variant_id === GIFT_WRAP_VARIANT_ID ? total : total + item.quantity;
    }, 0);
  } else if (typeof cartOrCount === 'object') {
    count = cartOrCount.item_count;
  } else {
    count = cartOrCount;
  }

  const cart = await CartAPI.getCart();

  const formatted = (cart.total_price / 100).toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });

  document.querySelectorAll('.cart-count-badge').forEach((badge) => {
    badge.textContent = count;
  });

  const subtotalEl = document.getElementById('cart-subtotal');
  const totalEl = document.getElementById('cart-total');

  if (subtotalEl) {
    subtotalEl.classList.remove('price-loading');
    subtotalEl.textContent = formatted;
  }
  if (totalEl) {
    totalEl.classList.remove('price-loading');
    totalEl.textContent = formatted;
  }
}
async function handleGiftWrapToggle(toggle, onSuccess) {
  const variantId = toggle.dataset.giftVariantId;
  if (!variantId) {
    showErrorNotification('Gift wrap is not configured. Please contact support.', 'Gift Wrap Unavailable');
    return;
  }

  toggle.disabled = true;
  const container = toggle.closest('label') || toggle.parentElement;
  container?.classList.add('opacity-50', 'pointer-events-none');

  const priceElements = document.querySelectorAll(
    '#cart-subtotal, #cart-total, #drawer-subtotal, .checkout-total-price',
  );
  priceElements.forEach((item) => {
    item.dataset.originalText = item.textContent;
    item.classList.add('price-loading');
  });

  try {
    if (toggle.checked) {
      await CartAPI.addItem(parseInt(variantId), 1, { _gift_wrap: 'true' });
    } else {
      await CartAPI.updateAll({ [variantId]: 0 });
    }

    await CartAPI.updateAttributes({
      gift_wrapping: toggle.checked ? 'true' : 'false',
    });

    const cart = await CartAPI.getCart();
    updateCartBadge(cart);

    const formatted = (cart.total_price / 100).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
    });

    priceElements.forEach((item) => {
      item.classList.remove('price-loading');
      item.textContent = formatted;
      delete item.dataset.originalText;
    });

    if (typeof onSuccess === 'function') onSuccess(cart);
  } catch (error) {
    console.error('Gift wrap toggle failed', error);
    toggle.checked = !toggle.checked;

    priceElements.forEach((item) => {
      item.classList.remove('price-loading');
      if (item.dataset.originalText) {
        item.textContent = item.dataset.originalText;
        delete item.dataset.originalText;
      }
    });

    showErrorNotification(CartErrors.gift_error, 'Gift Wrap Error');
  } finally {
    toggle.disabled = false;
    container?.classList.remove('opacity-50', 'pointer-events-none');
  }
}

class CartItems extends HTMLElement {
  connectedCallback() {
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('.cart-qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.itemKey;
        const action = btn.dataset.action;
        const qtyEl = btn.closest('.cart-item')?.querySelector('.cart-qty-value');
        if (!qtyEl) return;

        const currentQty = parseInt(qtyEl.textContent);
        const newQty = action === 'increase' ? currentQty + 1 : Math.max(0, currentQty - 1);

        this.updateItemQty(key, newQty, btn.closest('.cart-item'), qtyEl);
      });
    });

    this.querySelectorAll('.cart-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.itemKey;
        this.updateItemQty(key, 0, btn.closest('.cart-item'), null);
      });
    });

    const giftToggle = document.getElementById('cart-gift-toggle');
    const giftMessageWrap = document.getElementById('gift-message-wrap');

    giftToggle?.addEventListener('change', async () => {
      giftMessageWrap?.classList.toggle('hidden', !giftToggle.checked);
      await handleGiftWrapToggle(giftToggle, (cart) => {
        this.updateTotals(cart);
      });
    });

    const giftMessageInput = document.getElementById('cart-gift-message');
    giftMessageInput?.addEventListener('change', async () => {
      try {
        await CartAPI.updateAttributes({ gift_message: giftMessageInput.value });
      } catch {
        showErrorNotification("We couldn't save your gift message. Please try again.", 'Gift Message Error');
      }
    });

    const cartNote = document.getElementById('cart-note');
    cartNote?.addEventListener('change', async () => {
      const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: cartNote.value }),
      });
      if (!response.ok) return handleShopifyError(response);
    });
  }

  async updateItemQty(key, newQty, itemEl, qtyEl) {
    if (qtyEl) qtyEl.textContent = newQty;
    if (itemEl) {
      itemEl.style.opacity = '0.5';
      itemEl.style.pointerEvents = 'none';
    }

    document.getElementById('cart-subtotal')?.classList.add('price-loading');
    document.getElementById('cart-total')?.classList.add('price-loading');

    try {
      const cart = await CartAPI.updateItem(key, newQty);

      if (newQty === 0 && itemEl) {
        itemEl.style.transition = 'all 0.2s ease';
        itemEl.style.opacity = '0';
        itemEl.style.height = '0';
        itemEl.style.overflow = 'hidden';
        setTimeout(() => {
          itemEl.remove();
          this.checkEmpty(cart);
        }, 200);
      } else if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = '';

        const updatedItem = cart.items.find((i) => i.key === key);
        if (updatedItem) {
          const lineTotalEl = itemEl.querySelector('.cart-line-total');
          if (lineTotalEl) {
            lineTotalEl.textContent = (updatedItem.line_price / 100).toLocaleString('en-PH', {
              style: 'currency',
              currency: 'PHP',
            });
          }
        }
      }

      this.updateTotals(cart);
      updateCartBadge(cart);
    } catch (error) {
      console.error('Cart update failed', error);
      if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = '';
      }
      if (qtyEl) {
        const cart = await CartAPI.getCart().catch(() => null);
        const item = cart?.items?.find((i) => i.key === key);
        if (item && qtyEl) qtyEl.textContent = item.quantity;
      }
      showErrorNotification(getCartErrorMessage(error, error), 'Cart Update Failed');
    }
  }

  updateTotals(cart) {
    const formatted = (cart.total_price / 100).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
    });
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) {
      subtotalEl.classList.remove('price-loading');
      subtotalEl.textContent = formatted;
    }
    if (totalEl) {
      totalEl.classList.remove('price-loading');
      totalEl.textContent = formatted;
    }
  }

  checkEmpty(cart) {
    if (cart.item_count === 0) window.location.reload();
  }
}

if (!customElements.get('cart-items')) {
  customElements.define('cart-items', CartItems);
}

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.isFetching = false;
  }

  connectedCallback() {
    this.innerHTML = `
      <div
        id="cart-drawer-overlay"
        class="fixed inset-0 z-50 flex justify-end"
        style="background: rgba(28,18,8,0); transition: background 0.3s ease;">
        <div id="cart-drawer-backdrop" class="absolute inset-0 cursor-pointer"></div>
        <div
          id="cart-drawer-panel"
          class="relative w-80 max-w-full bg-white h-full flex flex-col shadow-2xl"
          style="transform: translateX(100%); transition: transform 0.3s ease;">
          <div id="cart-drawer-content" class="flex flex-col h-full">
            <div class="flex items-center justify-between px-5 py-4 border-b border-bark/10">
              <span class="font-display text-lg font-bold text-bark">Your Cart</span>
              <button
                id="cart-drawer-close-temp"
                class="w-8 h-8 rounded-full border border-bark/10 flex items-center justify-center text-sm hover:bg-sand transition-colors cursor-pointer">
                ✕
              </button>
            </div>
            <div class="flex-1 flex items-center justify-center">
              <div class="flex flex-col items-center gap-3 text-bark/30">
                <svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10"/>
                </svg>
                <span class="text-xs">Loading cart...</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('cart-drawer-backdrop')?.addEventListener('click', () => this.close());
    document.getElementById('cart-drawer-close-temp')?.addEventListener('click', () => this.close());

    setTimeout(() => {
      const overlay = document.getElementById('cart-drawer-overlay');
      const panel = document.getElementById('cart-drawer-panel');
      if (overlay) overlay.style.background = 'rgba(28,18,8,0.5)';
      if (panel) panel.style.transform = 'translateX(0)';
    }, 10);

    this.fetchDrawerContent();
  }

  fetchDrawerContent() {
    this.isFetching = true;

    fetch('/cart?section_id=cart-drawer')
      .then((r) => {
        if (!r.ok) throw new Error('Drawer fetch failed');
        return r.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const sectionContent = doc.querySelector('#shopify-section-cart-drawer');
        const contentEl = document.getElementById('cart-drawer-content');

        if (sectionContent && contentEl) {
          contentEl.innerHTML = sectionContent.innerHTML;
          this.bindDrawerEvents();
        }
      })
      .catch((err) => {
        console.error('Cart drawer fetch failed', err);
        const contentEl = document.getElementById('cart-drawer-content');
        if (contentEl) {
          contentEl.innerHTML = `
            <div class="flex items-center justify-between px-5 py-4 border-b border-bark/10">
              <span class="font-display text-lg font-bold text-bark">Your Cart</span>
              <button class="cart-drawer-close w-8 h-8 rounded-full border border-bark/10 flex items-center justify-center text-sm hover:bg-sand cursor-pointer">✕</button>
            </div>
            <div class="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <div class="text-3xl mb-3 opacity-30">⚠️</div>
                <p class="text-sm text-bark/50 mb-2">Could not load your cart.</p>
                <p class="text-xs text-bark/40 mb-4">
                  ${
                    !navigator.onLine
                      ? 'You appear to be offline. Check your connection and try again.'
                      : 'There was a problem connecting to Shopify. Please try again.'
                  }
                </p>
                <div class="flex gap-2 justify-center">
                  <button
                    onclick="this.closest('cart-drawer').fetchDrawerContent()"
                    class="text-xs bg-cebu-green text-white px-4 py-2 rounded-lg cursor-pointer">
                    Retry
                  </button>
                  <a href="/cart" class="text-xs border border-cebu-green text-cebu-green px-4 py-2 rounded-lg">
                    View Cart
                  </a>
                </div>
              </div>
            </div>`;
          this.bindDrawerEvents();
        }
      })
      .finally(() => {
        this.isFetching = false;
      });
  }

  bindDrawerEvents() {
    this.querySelectorAll('.cart-drawer-close, #cart-drawer-close-temp').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    this.querySelectorAll('.drawer-qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.itemKey;
        const action = btn.dataset.action;
        const itemEl = btn.closest('.cart-drawer-item');
        const qtyEl = itemEl?.querySelector('.drawer-qty-value');
        if (!qtyEl) return;

        const currentQty = parseInt(qtyEl.textContent);
        const newQty = action === 'increase' ? currentQty + 1 : Math.max(0, currentQty - 1);

        this.updateDrawerItem(key, newQty, itemEl);
      });
    });

    this.querySelectorAll('.drawer-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.updateDrawerItem(btn.dataset.itemKey, 0, btn.closest('.cart-drawer-item'));
      });
    });

    const giftToggle = this.querySelector('.drawer-gift-toggle');
    const giftMessageWrap = this.querySelector('#gift-message-wrap');
    giftToggle?.addEventListener('change', async () => {
      if (giftMessageWrap) {
        giftMessageWrap.classList.toggle('hidden', !giftToggle.checked);
      }

      await handleGiftWrapToggle(giftToggle, () => {});
    });

    this.querySelector('.drawer-clear-cart-btn')?.addEventListener('click', async () => {
      const confirmed = window.confirm('Remove all items from your cart?');
      if (!confirmed) return;

      const btn = this.querySelector('.drawer-clear-cart-btn');
      if (btn) {
        btn.textContent = 'Clearing...';
        btn.disabled = true;
      }

      try {
        await CartAPI.clearCart();
        updateCartBadge(0);
        this.fetchDrawerContent();
      } catch {
        if (btn) {
          btn.textContent = 'Clear Cart';
          btn.disabled = false;
        }
        showErrorNotification(CartErrors.clear_error, 'Clear Cart Failed');
      }
    });
  }

  async updateDrawerItem(key, newQty, itemEl) {
    if (itemEl) {
      itemEl.style.transition = 'opacity 0.15s ease';
      itemEl.style.opacity = '0.4';
      itemEl.style.pointerEvents = 'none';
    }

    const priceElements = document.querySelectorAll(
      '#cart-subtotal, #cart-total, #drawer-subtotal, .checkout-total-price',
    );

    priceElements.forEach((item) => item.classList.add('price-loading'));

    try {
      const cart = await CartAPI.updateItem(key, newQty);
      updateCartBadge(cart);
      this.fetchDrawerContent();
    } catch (error) {
      console.error('Drawer cart update failed', error);
      if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = '';
      }
      showErrorNotification(getCartErrorMessage(error, error), 'Cart Update Failed');
    }
  }

  close() {
    const overlay = document.getElementById('cart-drawer-overlay');
    const panel = document.getElementById('cart-drawer-panel');
    if (panel) panel.style.transform = 'translateX(100%)';
    if (overlay) overlay.style.background = 'rgba(28,18,8,0)';
    setTimeout(() => {
      this.remove();
      document.body.style.overflow = '';
    }, 300);
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}

function openCartDrawer() {
  document.querySelector('cart-drawer')?.remove();
  document.body.style.overflow = 'hidden';
  document.body.appendChild(document.createElement('cart-drawer'));
}

document.addEventListener('click', async function (e) {
  const btn = e.target.closest('.add-to-cart-btn');
  if (!btn?.dataset.variantId) return;

  const originalContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10"/>
    </svg>`;

  try {
    await CartAPI.addItem(parseInt(btn.dataset.variantId), 1);
    const cart = await CartAPI.getCart();
    updateCartBadge(cart);
    showCartNotification();
  } catch (error) {
    console.error('Add to cart failed', error);
    showErrorNotification(getCartErrorMessage(error, error), "Couldn't Add to Cart");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
});
