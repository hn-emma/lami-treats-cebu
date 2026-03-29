class CartNotification extends HTMLElement {
  constructor() {
    super();
    this.autoCloseTimer = null;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    clearTimeout(this.autoCloseTimer);
  }

  render() {
    this.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 360px;
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(28,18,8,0.15), 0 2px 8px rgba(28,18,8,0.08);
      border: 1px solid rgba(28,18,8,0.08);
      z-index: 100;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      overflow: hidden;
    `;

    this.fetchContent();
  }

  async fetchContent() {
    try {
      const response = await fetch('/cart?section_id=cart-notification');

      if (!response.ok) throw new Error('Notification fetch failed');

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const section = doc.querySelector('#shopify-section-cart-notification');

      if (!section) {
        this.remove();
        return;
      }

      this.innerHTML = section.innerHTML;
      this.bindEvents();
      this.animateIn();
      this.startAutoClose();
    } catch (error) {
      console.error('Cart Notification Error:', error);
      this.remove();
    }
  }

  bindEvents() {
    this.querySelector('.cart-notification-close')?.addEventListener('click', () => this.close());

    this.addEventListener('mouseenter', () => {
      clearTimeout(this.autoCloseTimer);
    });

    this.addEventListener('mouseleave', () => {
      this.startAutoClose();
    });
  }

  animateIn() {
    requestAnimationFrame(() => {
      this.style.opacity = '1';
      this.style.transform = 'translateX(0)';
    });
  }

  startAutoClose(delay = 4000) {
    clearTimeout(this.autoCloseTimer);
    this.autoCloseTimer = setTimeout(() => this.close(), delay);
  }

  close() {
    clearTimeout(this.autoCloseTimer);
    this.style.opacity = '0';
    this.style.transform = 'translateX(20px)';
    setTimeout(() => this.remove(), 250);
  }
}

if (!customElements.get('cart-notification')) {
  customElements.define('cart-notification', CartNotification);
}

function showCartNotification() {
  document.querySelector('cart-notification')?.remove();

  const notification = document.createElement('cart-notification');
  document.body.appendChild(notification);
}
