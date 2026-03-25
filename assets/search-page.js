class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input[type="search"]');
    this.resultsContainer = this.querySelector('#predictive-search');
    this.abortController = null;

    if (!this.input || !this.resultsContainer) return;

    this.input.addEventListener(
      'input',
      this.debounce((event) => {
        this.onChange(event);
      }, 300).bind(this),
    );

    document.addEventListener('click', (e) => {
      if (!this.contains(e.target)) this.close();
    });

    this.input.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  onChange() {
    const searchTerm = this.input.value.trim();

    if (!searchTerm.length) {
      this.close();
      return;
    }

    this.getSearchResults(searchTerm);
  }

  getSearchResults(searchTerm) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    const predictiveSearchUrl = this.dataset.predictiveSearchUrl || '/search/suggest';

    fetch(
      `${predictiveSearchUrl}?q=${encodeURIComponent(searchTerm)}&section_id=predictive-search&resources[type]=product&resources[limit]=5`,
      { signal: this.abortController.signal },
    )
      .then((response) => {
        if (!response.ok) {
          this.close();
          throw new Error(response.status);
        }
        return response.text();
      })
      .then((text) => {
        const html = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector('#shopify-section-predictive-search');

        if (!html) {
          this.close();
          return;
        }

        this.resultsContainer.innerHTML = html.innerHTML;
        this.open();

        this.input.setAttribute('aria-expanded', 'true');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        this.close();
      });
  }

  open() {
    this.resultsContainer.style.display = 'block';
  }

  close() {
    this.resultsContainer.style.display = 'none';
    this.resultsContainer.innerHTML = '';
    this.input.setAttribute('aria-expanded', 'false');
  }

  handleKeydown(e) {
    const items = this.resultsContainer.querySelectorAll('.predictive-item');
    const activeItem = this.resultsContainer.querySelector('.predictive-item.is-active');
    let index = Array.from(items).indexOf(activeItem);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        index = Math.min(index + 1, items.length - 1);
        this.setActiveItem(items, index);
        break;

      case 'ArrowUp':
        e.preventDefault();
        index = Math.max(index - 1, 0);
        this.setActiveItem(items, index);
        break;

      case 'Enter':
        if (activeItem) {
          e.preventDefault();
          window.location.href = activeItem.getAttribute('href');
        }
        break;

      case 'Escape':
        this.close();
        this.input.blur();
        break;
    }
  }

  setActiveItem(items, index) {
    items.forEach((item) => {
      item.classList.remove('is-active', 'bg-sand');
      item.setAttribute('aria-selected', 'false');
    });

    if (items[index]) {
      items[index].classList.add('is-active', 'bg-sand');
      items[index].setAttribute('aria-selected', 'true');

      this.input.value = items[index].dataset.title || this.input.value;
    }
  }

  debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}

if (!customElements.get('predictive-search')) {
  customElements.define('predictive-search', PredictiveSearch);
}
