const CartAPI = {
  async updateItem(key, quantity) {
    const response = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity }),
    });
    if (!response.ok) throw new Error('Cart update failed');
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

function updateCartBadge(cartOrCount) {
  let count;

  if (typeof cartOrCount === 'object') {
    const giftId = Number('{{ settings.global_gift_wrap_variant_id }}');
    count = cartOrCount.items.reduce((total, item) => {
      return item.variant_id === giftId ? total : total + item.quantity;
    }, 0);
  } else {
    count = cartOrCount;
  }

  document.querySelectorAll('.cart-count-badge').forEach((badge) => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
}

async function handleGiftWrapToggle(toggle, onSuccess) {
  const variantId = toggle.dataset.giftVariantId;
  const container = toggle.closest('label') || toggle.parentElement; // Find the wrapper

  if (!variantId) return;

  toggle.disabled = true;
  container.classList.add('opacity-50', 'pointer-events-none', 'animate-pulse');

  try {
    if (toggle.checked) {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId),
          quantity: 1,
          properties: { _gift_wrap: 'true' },
        }),
      });
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

    document.querySelectorAll('#cart-subtotal, #cart-total').forEach((el) => {
      el.textContent = formatted;
    });

    if (typeof onSuccess === 'function') onSuccess(cart);
  } catch (error) {
    console.error('Gift wrap toggle failed', error);
    toggle.checked = !toggle.checked;
  } finally {
    toggle.disabled = false;
    container.classList.remove('opacity-50', 'pointer-events-none', 'animate-pulse');
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
        const formatted = (cart.total_price / 100).toLocaleString('en-PH', {
          style: 'currency',
          currency: 'PHP',
        });
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        if (subtotalEl) subtotalEl.textContent = formatted;
        if (totalEl) totalEl.textContent = formatted;
      });
    });

    const giftMessageInput = document.getElementById('cart-gift-message');

    giftToggle?.addEventListener('change', async () => {
      giftMessageWrap?.classList.toggle('hidden', !giftToggle.checked);
      await CartAPI.updateAttributes({
        gift_wrapping: giftToggle.checked ? 'true' : 'false',
      });
    });

    giftMessageInput?.addEventListener('change', async () => {
      await CartAPI.updateAttributes({
        gift_message: giftMessageInput.value,
      });
    });

    const hiddenAttr = document.getElementById('gift-attr-input');
    if (hiddenAttr) hiddenAttr.value = giftMessageInput.value;

    const cartNote = document.getElementById('cart-note');
    cartNote?.addEventListener('change', async () => {
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: cartNote.value }),
      });
    });

    document.getElementById('promo-apply-btn')?.addEventListener('click', () => {
      const code = document.getElementById('promo-code-input')?.value?.trim();
      if (!code) return;
      window.location.href = `/checkout?discount=${encodeURIComponent(code)}`;
    });
  }

  async updateItemQty(key, newQty, itemEl, qtyEl) {
    if (qtyEl) qtyEl.textContent = newQty;

    if (itemEl) {
      itemEl.style.opacity = '0.5';
      itemEl.style.pointerEvents = 'none';
    }

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
      }

      this.updateTotals(cart);
      updateCartBadge(cart.item_count);
    } catch (error) {
      console.error('Cart update failed', error);
      if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = '';
      }
    }
  }

  updateTotals(cart) {
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const formatted = (cart.total_price / 100).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
    });
    if (subtotalEl) subtotalEl.textContent = formatted;
    if (totalEl) totalEl.textContent = formatted;
  }

  checkEmpty(cart) {
    if (cart.item_count === 0) {
      window.location.reload();
    }
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

        <div
          id="cart-drawer-backdrop"
          class="absolute inset-0 cursor-pointer">
        </div>

        <div
          id="cart-drawer-panel"
          class="relative w-80 max-w-full bg-white h-full flex flex-col shadow-2xl"
          style="transform: translateX(100%); transition: transform 0.3s ease;">

          <!-- Loading state shown immediately -->
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
                <p class="text-sm text-bark/50 mb-4">Could not load cart.<br>Please try again.</p>
                <a href="/cart" class="text-xs text-custom-green font-medium hover:underline">View Cart Page →</a>
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
        const key = btn.dataset.itemKey;
        this.updateDrawerItem(key, 0, btn.closest('.cart-drawer-item'));
      });
    });

    const giftToggle = this.querySelector('.drawer-gift-toggle');
    giftToggle?.addEventListener('change', async () => {
      const priceElements = document.querySelectorAll('#cart-subtotal, #cart-total');
      priceElements.forEach((item) => item.classList.add('opacity-50'));

      await handleGiftWrapToggle(giftToggle, (cart) => {
        this.fetchDrawerContent();
      });
    });

    this.querySelector('.drawer-clear-cart-btn')?.addEventListener('click', async () => {
      const confirmed = window.confirm('Remove all items from your cart?');
      if (!confirmed) return;

      try {
        const btn = this.querySelector('.drawer-clear-cart-btn');
        if (btn) {
          btn.textContent = 'Clearing...';
          btn.disabled = true;
        }

        await CartAPI.clearCart();

        updateCartBadge(0);

        this.fetchDrawerContent();
      } catch (error) {
        console.error('Clear cart failed', error);
        const btn = this.querySelector('.drawer-clear-cart-btn');
        if (btn) {
          btn.textContent = 'Clear Cart';
          btn.disabled = false;
        }
      }
    });
  }

  async updateDrawerItem(key, newQty, itemEl) {
    if (itemEl) {
      itemEl.style.transition = 'opacity 0.15s ease';
      itemEl.style.opacity = '0.4';
      itemEl.style.pointerEvents = 'none';
    }

    try {
      const cart = await CartAPI.updateItem(key, newQty);

      updateCartBadge(cart.item_count);

      this.fetchDrawerContent();
    } catch (error) {
      console.error('Drawer cart update failed', error);
      if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = '';
      }
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
  const existing = document.querySelector('cart-drawer');
  if (existing) {
    existing.remove();
  }

  document.body.style.overflow = 'hidden';

  const drawer = document.createElement('cart-drawer');
  document.body.appendChild(drawer);
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
    await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: parseInt(btn.dataset.variantId),
        quantity: 1,
      }),
    });

    const cart = await CartAPI.getCart();
    updateCartBadge(cart.item_count);

    showCartNotification();
  } catch (error) {
    console.error('Add to cart failed', error);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalContent;
  }
});
