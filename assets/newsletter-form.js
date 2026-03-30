class NewsletterForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.submitBtn = this.querySelector('#newsletter-submit');

    if (!this.form) return;

    this.form.addEventListener('submit', () => {
      this.setLoading(true);
    });
  }

  setLoading(isLoading) {
    if (!this.submitBtn) return;

    this.submitBtn.disabled = isLoading;

    if (isLoading) {
      this.submitBtn.dataset.originalText = this.submitBtn.textContent;
      this.submitBtn.innerHTML = `
        <span class="flex items-center gap-2">
          <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor"
              stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          Subscribing...
        </span>`;
    } else {
      this.submitBtn.textContent = this.submitBtn.dataset.originalText || 'Subscribe →';
    }
  }
}

if (!customElements.get('newsletter-form')) {
  customElements.define('newsletter-form', NewsletterForm);
}
