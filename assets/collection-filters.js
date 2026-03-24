class CollectionFilters extends HTMLElement {
  constructor() {
    super();
    this.abortController = null;

    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  get sectionId() {
    return this.getAttribute('data-section-id');
  }

  connectedCallback() {
    document.addEventListener('change', this.handleChange);
    document.addEventListener('click', this.handleClick);
    window.addEventListener('popstate', this.handlePopState);
  }

  disconnectedCallback() {
    document.removeEventListener('change', this.handleChange);
    document.removeEventListener('click', this.handleClick);
    window.removeEventListener('popstate', this.handlePopState);
  }

  handleChange(e) {
    const input = e.target.closest('.filter-checkbox');
    if (input) {
      const url = input.checked ? input.dataset.addUrl : input.dataset.removeUrl;
      if (url) this.fetchSection(url);
    }
  }

  handleClick(e) {
    const target = e.target;

    const removeBtn = target.closest('.filter-remove-btn, .filter-clear-btn');
    if (removeBtn) {
      const url = removeBtn.dataset.url || removeBtn.dataset.removeUrl;
      if (url) {
        e.preventDefault();
        this.fetchSection(url);
      }
    }

    const typePill = target.closest('.type-pill');
    if (typePill && typePill.dataset.url) {
      e.preventDefault();
      this.fetchSection(typePill.dataset.url);
    }

    const paginationLink = target.closest('.pagination-link');
    if (paginationLink && paginationLink.href) {
      e.preventDefault();
      this.fetchSection(paginationLink.href);

      document.querySelector('.collection-inner').scrollIntoView({ behavior: 'smooth' });
    }
  }

  handlePopState(e) {
    if (e.state) {
      this.fetchSection(window.location.href, false);
    }
  }

  fetchSection(url, pushState = true) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const grid = document.querySelector('.collection-products');
    if (grid) {
      grid.style.opacity = '0.4';
      grid.style.pointerEvents = 'none';
    }

    const fetchUrl = new URL(url, window.location.origin);
    fetchUrl.searchParams.set('section_id', this.sectionId);

    fetch(fetchUrl.toString(), { signal: this.abortController.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Fetch failed');
        return response.text();
      })
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const areasToUpdate = ['.collection-filters', '.collection-grid'];

        areasToUpdate.forEach((selector) => {
          const currentArea = document.querySelector(selector);
          const newArea = doc.querySelector(selector);
          if (currentArea && newArea) {
            currentArea.innerHTML = newArea.innerHTML;
          }
        });

        if (pushState) {
          const cleanUrl = new URL(url, window.location.origin);
          cleanUrl.searchParams.delete('section_id');
          window.history.pushState({ url: cleanUrl.toString() }, '', cleanUrl.toString());
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;

        const fallbackUrl = new URL(url, window.location.origin);
        fallbackUrl.searchParams.delete('section_id');
        window.location.href = fallbackUrl.toString();
      })
      .finally(() => {
        const updatedGrid = document.querySelector('.collection-products');
        if (updatedGrid) {
          updatedGrid.style.opacity = '1';
          updatedGrid.style.pointerEvents = '';
        }
      });
  }
}

if (!customElements.get('collection-filters')) {
  customElements.define('collection-filters', CollectionFilters);
}
