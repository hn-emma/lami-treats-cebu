document.addEventListener('DOMContentLoaded', function () {
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;

  const productId = grid.dataset.productId;
  if (!productId) return;

  fetch(`/recommendations/products.json?product_id=${productId}&limit=4`)
    .then((r) => r.json())
    .then((data) => {
      if (!data.products || data.products.length === 0) {
        grid.closest('.bg-sand')?.remove();
        return;
      }

      grid.innerHTML = data.products
        .map((p) => {
          const isSale = p.compare_at_price > p.price;
          const isNew = p.tags && p.tags.includes('new');

          const formatPrice = (num) =>
            (num / 100).toLocaleString('en-PH', {
              style: 'currency',
              currency: 'PHP',
            });

          const shortDesc = p.description ? p.description.replace(/<[^>]*>/g, '').substring(0, 70) + '...' : '';

          const firstVariantId = p.variants && p.variants?.length > 0 ? p.variants[0]?.id : null;

          const productUrlWithVariant = firstVariantId ? `${p.url}&variant=${firstVariantId}` : p.url;

          return `
          <div class="bg-white border border-bark/10 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer group flex flex-col">
            <a href="${productUrlWithVariant}">
              <div class="aspect-square bg-sand overflow-hidden">
                ${
                  p.featured_image
                    ? `<img src="${p.featured_image}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">`
                    : '<div class="w-full h-full flex items-center justify-center text-5xl">🥭</div>'
                }
              </div>
            </a>
            <div class="p-4 flex flex-col flex-grow">
              <div class="flex items-center justify-between mb-2">
                ${p.type ? `<span class="bg-custom-green/10 text-custom-green text-[10px] font-medium px-2.5 py-0.5 rounded-full">${p.type}</span>` : ''}
                <div class="flex gap-1 ml-auto">
                  ${isSale ? `<span class="bg-red-100 text-red-600 text-[10px] font-medium px-2 py-0.5 rounded-full">Sale</span>` : ''}
                  ${!isSale && isNew ? `<span class="bg-mango/15 text-mango-dark text-[10px] font-medium px-2 py-0.5 rounded-full">New</span>` : ''}
                </div>
              </div>

              <a href="${p.url}" class="block text-sm font-medium text-bark mb-1 hover:text-custom-green transition-colors">
                ${p.title}
              </a>

              <p class="text-xs text-bark/50 mb-3 leading-relaxed line-clamp-2">
                ${shortDesc}
              </p>

              <div class="flex items-center justify-between mt-auto">
                <div>
                  <span class="text-sm font-medium text-mango-dark">${formatPrice(p.price)}</span>
                  ${isSale ? `<span class="text-xs text-bark/40 line-through ml-1">${formatPrice(p.compare_at_price)}</span>` : ''}
                </div>
                
                <button
                  class="w-8 h-8 bg-custom-green rounded-full text-white flex items-center justify-center hover:bg-custom-green-dark transition-colors duration-200 add-to-cart-btn cursor-pointer"
                  data-variant-id="${p.variants[0].id}"
                  aria-label="Add ${p.title} to cart">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3 h-3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `;
        })
        .join('');
    })
    .catch(() => {
      grid.closest('.bg-sand')?.remove();
    });
});
