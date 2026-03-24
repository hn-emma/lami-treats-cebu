function switchImage(src, thumbBtn) {
  const mainImg = document.getElementById('main-product-image');
  if (!mainImg) return;

  mainImg.style.opacity = '0';

  setTimeout(() => {
    mainImg.removeAttribute('srcset');

    mainImg.src = src;

    mainImg.style.opacity = '1';
  }, 150);

  document.querySelectorAll('.product-thumb').forEach((btn) => {
    btn.classList.replace('border-mango', 'border-transparent');
  });

  thumbBtn.classList.add('border-mango');
  thumbBtn.classList.remove('border-transparent');
}

document.addEventListener('DOMContentLoaded', function () {
  const qtyDisplay = document.getElementById('qty-display');
  const qtyInput = document.getElementById('product-qty');
  const minusBtn = document.getElementById('qty-minus');
  const plusBtn = document.getElementById('qty-plus');

  if (!qtyDisplay || !qtyInput) return;

  let qty = 1;

  function updateQty(newQty) {
    qty = Math.max(1, newQty);
    qtyDisplay.textContent = qty;
    qtyInput.value = qty;

    if (minusBtn) {
      minusBtn.disabled = qty <= 1;
      minusBtn.classList.toggle('opacity-40', qty <= 1);
    }
  }

  minusBtn?.addEventListener('click', () => updateQty(qty - 1));
  plusBtn?.addEventListener('click', () => updateQty(qty + 1));

  const variantComponent = document.querySelector('product-variants');
  if (variantComponent) {
    const variants = JSON.parse(variantComponent.dataset.product || '[]');

    document.querySelectorAll('.variant-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        const position = parseInt(this.dataset.optionPosition);
        const value = this.dataset.optionValue;

        document.querySelectorAll(`.variant-btn[data-option-position="${position}"]`).forEach((b) => {
          b.classList.remove('border-cebu-green', 'bg-cebu-green/5', 'text-cebu-green', 'font-medium');
          b.classList.add('border-bark/15', 'text-bark/70');
        });

        this.classList.add('border-cebu-green', 'bg-cebu-green/5', 'text-cebu-green', 'font-medium');
        this.classList.remove('border-bark/15', 'text-bark/70');

        const label = document.getElementById(`option-${position}-label`);
        if (label) label.textContent = value;

        const selectedOptions = [];
        document.querySelectorAll('.variant-btn').forEach((b) => {
          if (b.classList.contains('border-cebu-green')) {
            selectedOptions[parseInt(b.dataset.optionPosition) - 1] = b.dataset.optionValue;
          }
        });

        const matchedVariant = variants.find((v) =>
          v.options.every((opt, i) => selectedOptions[i] === undefined || opt === selectedOptions[i]),
        );

        if (matchedVariant) {
          const variantInput = document.getElementById('selected-variant-id');
          if (variantInput) variantInput.value = matchedVariant.id;

          const priceDisplay = document.getElementById('price-display');
          if (priceDisplay) {
            priceDisplay.textContent = (matchedVariant.price / 100).toLocaleString('en-PH', {
              style: 'currency',
              currency: 'PHP',
            });
          }

          const availability = document.getElementById('variant-availability');
          if (availability) {
            if (matchedVariant.available) {
              availability.innerHTML = '<span class="text-cebu-green">✓ In stock</span>';
              document.getElementById('add-to-cart-btn')?.removeAttribute('disabled');
              document.getElementById('atc-label').textContent = 'Add to Cart';
            } else {
              availability.innerHTML = '<span class="text-red-400">✕ Out of stock</span>';
              document.getElementById('add-to-cart-btn')?.setAttribute('disabled', true);
              document.getElementById('atc-label').textContent = 'Sold Out';
            }
          }
        }
      });
    });
  }

  const giftToggle = document.getElementById('gift-toggle');
  const giftMessageField = document.getElementById('gift-message-field');

  giftToggle?.addEventListener('change', function () {
    if (this.checked) {
      giftMessageField?.classList.remove('hidden');
    } else {
      giftMessageField?.classList.add('hidden');
    }
  });

  const estimateBtn = document.getElementById('estimate-btn');
  const zipInput = document.getElementById('zip-input');
  const shippingResult = document.getElementById('shipping-result');

  estimateBtn?.addEventListener('click', function () {
    if (!zipInput?.value.trim()) return;

    shippingResult?.classList.remove('hidden');
    shippingResult.innerHTML = '✓ Estimated delivery: 3–5 business days · ₱100 standard';
  });

  zipInput?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') estimateBtn?.click();
  });

  const atcBtn = document.getElementById('add-to-cart-btn');

  atcBtn?.addEventListener('click', async function () {
    const variantId = document.getElementById('selected-variant-id')?.value;
    const quantity = parseInt(document.getElementById('product-qty')?.value || '1');
    const giftMessage = document.getElementById('gift-message-input')?.value;
    const hasGift = document.getElementById('gift-toggle')?.checked;

    if (!variantId) return;

    const label = document.getElementById('atc-label');
    const originalLabel = label.textContent;
    label.textContent = 'Adding...';
    atcBtn.disabled = true;

    const itemProperties = {};
    if (hasGift) {
      itemProperties['Gift Wrapping'] = 'Yes (+₱35)';
      if (giftMessage) itemProperties['Gift Message'] = giftMessage;
    }

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId),
          quantity,
          properties: Object.keys(itemProperties).length > 0 ? itemProperties : undefined,
        }),
      });

      if (!response.ok) throw new Error('Add to cart failed');

      label.textContent = '✓ Added!';
      atcBtn.classList.add('bg-cebu-green-dark');

      if (typeof openCartDrawer === 'function') {
        setTimeout(() => openCartDrawer(), 300);
      }

      setTimeout(() => {
        label.textContent = originalLabel;
        atcBtn.disabled = false;
        atcBtn.classList.remove('bg-cebu-green-dark');
      }, 2000);
    } catch (error) {
      label.textContent = 'Error — try again';
      atcBtn.disabled = false;
      setTimeout(() => {
        label.textContent = originalLabel;
      }, 2000);
    }
  });

  const buyNowBtn = document.getElementById('buy-now-btn');

  buyNowBtn?.addEventListener('click', async function () {
    const variantId = document.getElementById('selected-variant-id')?.value;
    const quantity = parseInt(document.getElementById('product-qty')?.value || '1');
    if (!variantId) return;

    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(variantId), quantity }),
      });
      window.location.href = '/checkout';
    } catch {
      window.location.href = '/checkout';
    }
  });

  document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.add-to-cart-btn');
    if (!btn || !btn.dataset.variantId) return;

    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(btn.dataset.variantId),
          quantity: 1,
        }),
      });
      if (typeof openCartDrawer === 'function') openCartDrawer();
    } catch (error) {
      console.error('Add to cart failed', error);
    }
  });
});
