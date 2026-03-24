// ─── Core fetch function ──────────────────────────────────────────────────────
async function filterFetch(url) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  // 1. OPTIMISTIC UI: Give immediate feedback
  grid.style.opacity = '0.5';
  grid.style.transition = 'opacity 0.1s ease';

  try {
    // 2. USE SECTION RENDERING API
    // We append the section_id so Shopify only renders the relevant liquid file.
    const sectionId = document
      .querySelector('.shopify-section[id^="shopify-section-main-collection"]')
      .id.replace('shopify-section-', '');
    const renderUrl = new URL(url, window.location.origin);
    renderUrl.searchParams.set('section_id', sectionId);

    const response = await fetch(renderUrl.toString());
    if (!response.ok) throw new Error('Network response was not ok');

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 3. SWAP ONLY THE NECESSARY PARTS
    // Note: Since we used section_id, 'doc' is just the section content
    const selectors = ['#product-grid', '#active-filters', '#product-count', '#type-pills-container'];

    selectors.forEach((selector) => {
      const oldEl = document.querySelector(selector);
      const newEl = doc.querySelector(selector);
      if (oldEl && newEl) oldEl.innerHTML = newEl.innerHTML;
    });

    // Sync sidebar checkboxes
    const newCheckboxes = doc.querySelectorAll('.filter-checkbox');
    const currentCheckboxes = document.querySelectorAll('.filter-checkbox');
    newCheckboxes.forEach((cb, i) => {
      if (currentCheckboxes[i]) {
        currentCheckboxes[i].checked = cb.checked;
        currentCheckboxes[i].disabled = cb.disabled;
      }
    });

    // Update browser URL
    history.pushState({ url }, '', url);
  } catch (error) {
    console.error('Filter Error:', error);
    window.location.href = url; // Fallback
  } finally {
    grid.style.opacity = '1';
  }
}

// ─── Update Pill Styles Instantly ─────────────────────────────────────────────
function handlePillClick(button) {
  const url = button.dataset.url;

  // Instant visual swap for the clicked pill
  const allPills = document.querySelectorAll('.type-pill');
  allPills.forEach((p) => {
    p.classList.remove('bg-cebu-green', 'text-white', 'border-cebu-green');
    p.classList.add('bg-white', 'text-bark/60', 'border-bark/15');
  });

  button.classList.remove('bg-white', 'text-bark/60');
  button.classList.add('bg-cebu-green', 'text-white', 'border-cebu-green');

  filterFetch(url);
}

// ─── Build filter URL from current checkbox state ─────────────────────────────
function buildFilterUrl() {
  const url = new URL(window.location.href);

  // Remove all existing filter params
  [...url.searchParams.keys()].forEach((key) => {
    if (key.startsWith('filter.')) url.searchParams.delete(key);
  });

  // Add all checked filter checkboxes
  document.querySelectorAll('.filter-checkbox:checked').forEach((checkbox) => {
    url.searchParams.append(checkbox.name, checkbox.value);
  });

  // Keep current sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect && sortSelect.value) {
    url.searchParams.set('sort_by', sortSelect.value);
  }

  // Reset to page 1 when filters change
  url.searchParams.delete('page');

  return url.toString();
}

// ─── Handle checkbox filter change ───────────────────────────────────────────
function handleFilterChange() {
  filterFetch(buildFilterUrl());
}

// ─── Mobile filter drawer ─────────────────────────────────────────────────────
function toggleMobileFilters() {
  const drawer = document.getElementById('mobile-filter-drawer');
  if (!drawer) return;
  drawer.classList.toggle('hidden');
  drawer.setAttribute('aria-hidden', drawer.classList.contains('hidden'));
  document.body.style.overflow = drawer.classList.contains('hidden') ? '' : 'hidden';
}

// ─── Event listeners (runs after DOM is ready) ────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Sort change
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', this.value);
      filterFetch(url.toString());
    });
  }

  // Pagination clicks (event delegation on grid)
  const grid = document.getElementById('product-grid');
  if (grid) {
    grid.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (href && href.includes(window.location.pathname)) {
        e.preventDefault();
        filterFetch(href);
      }
    });
  }

  // Browser back/forward
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.url) {
      filterFetch(e.state.url);
    } else {
      filterFetch(window.location.href);
    }
  });
});
