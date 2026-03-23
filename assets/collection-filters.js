class CollectionFilters extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.sectionId;
  }

  connectedCallback() {
    // 1. Listen for Checkbox/Input changes
    this.addEventListener('change', (event) => {
      if (event.target.tagName === 'INPUT') {
        this.onInputChange();
      }
    });

    // 2. Listen for Pill or Link clicks (Event Delegation)
    this.addEventListener('click', (event) => {
      const target = event.target.closest('button.type-pill, a');
      if (!target) return;

      // Handle Pill buttons specifically
      if (target.classList.contains('type-pill')) {
        event.preventDefault();
        this.renderSection(target.dataset.url);
      }

      // Handle Pagination links
      if (target.tagName === 'A' && target.getAttribute('href').includes('collection')) {
        event.preventDefault();
        this.renderSection(target.getAttribute('href'));
      }
    });
  }

  onInputChange() {
    const formData = new FormData(this.querySelector('form'));
    const params = new URLSearchParams(formData).toString();
    const url = `${window.location.pathname}?${params}`;
    this.renderSection(url);
  }

  async renderSection(url) {
    const container = this.querySelector('#CollectionFiltersForm');
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';

    // Append section_id for the Shopify Rendering API
    const ajaxUrl = new URL(url, window.location.origin);
    ajaxUrl.searchParams.set('section_id', this.sectionId);

    try {
      const response = await fetch(ajaxUrl.toString());
      const text = await response.text();
      const html = new DOMParser().parseFromString(text, 'text/html');

      // Update specific parts of the page
      const elementsToUpdate = ['#type-pills-container', '#ProductGridContainer', '#product-count'];

      elementsToUpdate.forEach((selector) => {
        const currentEl = this.querySelector(selector);
        const newEl = html.querySelector(selector);
        if (currentEl && newEl) currentEl.innerHTML = newEl.innerHTML;
      });

      // Update URL (Optional: remove this if you want the URL to never change)
      // history.pushState({ url }, '', url);
    } catch (e) {
      console.error('Filter Error:', e);
      window.location.href = url; // Fallback to full load if JS fails
    } finally {
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
    }
  }
}

customElements.define('collection-filters', CollectionFilters);
