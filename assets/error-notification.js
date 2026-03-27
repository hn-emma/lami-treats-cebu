class ErrorNotification extends HTMLElement {
  constructor() {
    super();
    this.autoCloseTimer = null;
  }

  connectedCallback() {
    this.className =
      'fixed top-20 right-5 w-[340px] max-w-[calc(100vw-40px)] bg-white rounded-[14px] shadow-xl border border-custom-green/20 z-[101] opacity-0 translate-x-5 transition-all duration-250 overflow-hidden';
  }

  show(message, title = 'Something went wrong') {
    this.innerHTML = `
    <div class="flex items-center justify-between p-4 border-b border-custom-green/10">
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span class="text-[13px] font-medium text-custom-green">${title}</span>
      </div>
      <button class="error-notification-close w-6 h-6 rounded-full border border-custom-green/20 flex items-center justify-center text-[11px] text-custom-green hover:bg-custom-green/5">
        ✕
      </button>
    </div>
    <div class="p-4">
      <p class="text-[12px] text-bark/60 leading-relaxed m-0">${message}</p>
    </div>
  `;
  }

  // Show with a message — can be called directly
  show(message, title = 'Something went wrong') {
    this.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid rgba(199,91,60,0.12);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:15px;">⚠️</span>
            <span style="font-size:13px;font-weight:500;color:#C75B3C;">${title}</span>
          </div>
          <button
            class="error-notification-close"
            style="width:26px;height:26px;border-radius:50%;border:1px solid rgba(199,91,60,0.2);background:transparent;display:flex;align-items:center;justify-content:center;font-size:11px;color:#C75B3C;cursor:pointer;">
            ✕
          </button>
        </div>
        <div style="padding:14px 18px;">
          <p style="font-size:12px;color:rgba(28,18,8,0.6);line-height:1.7;margin:0;">
            ${message}
          </p>
        </div>
      </div>`;

    this.querySelector('.error-notification-close')?.addEventListener('click', () => this.close());

    this.addEventListener('mouseenter', () => clearTimeout(this.autoCloseTimer));
    this.addEventListener('mouseleave', () => this.startAutoClose());

    // Animate in
    requestAnimationFrame(() => {
      this.style.opacity = '1';
      this.style.transform = 'translateX(0)';
    });

    this.startAutoClose();
  }

  startAutoClose(delay = 5000) {
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

if (!customElements.get('error-notification')) {
  customElements.define('error-notification', ErrorNotification);
}

function showErrorNotification(message, title = 'Something went wrong') {
  document.querySelector('error-notification')?.remove();

  const notification = document.createElement('error-notification');
  document.body.appendChild(notification);

  setTimeout(() => notification.show(message, title), 10);
}
