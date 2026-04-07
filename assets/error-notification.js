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
      <button class="error-notification-close w-6 h-6 rounded-full border border-custom-green/20 flex items-center justify-center text-[11px] text-custom-green hover:bg-custom-green/5 cursor-pointer">
        ✕
      </button>
    </div>
    <div class="p-4">
      <p class="text-[12px] text-bark/60 leading-relaxed m-0">${message}</p>
    </div>
    `;

    this.querySelector('.error-notification-close')?.addEventListener('click', () => this.close());

    this.addEventListener('mouseenter', () => clearTimeout(this.autoCloseTimer));
    this.addEventListener('mouseleave', () => this.startAutoClose());

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
