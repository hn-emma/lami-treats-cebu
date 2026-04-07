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

  thumbBtn.classList.replace('border-transparent', 'border-mango');
}

document.addEventListener('DOMContentLoaded', function () {
  const qtyDisplay = document.getElementById('qty-display');
  const qtyInput = document.getElementById('product-qty');
  const minusBtn = document.getElementById('qty-minus');
  const plusBtn = document.getElementById('qty-plus');
  const productThumbnails = document.querySelectorAll('.product-thumb');

  const url = new URL(window.location.href);
  const variantId = url.searchParams.get('variant');

  if (variantId) {
    const selectedThumbBtn = document.querySelector(`.product-thumb[data-variant-ids*="${variantId}"]`);

    if (selectedThumbBtn) {
      selectedThumbBtn.classList.add('border-mango');
      selectedThumbBtn.classList.remove('border-transparent');
    }
  }

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
    const variants = JSON.parse(variantComponent.dataset.productVariants || '[]');

    productThumbnails.forEach((thumbBtn) => {
      thumbBtn.addEventListener('click', function () {
        const variantId = this.dataset.variantIds?.split(' ').find((id) => variants.some((v) => v.id == id));

        if (variantId) {
          const matchedVariant = variants.find((v) => v.id == variantId);

          if (matchedVariant) {
            matchedVariant.options.forEach((optionValue, index) => {
              const position = index + 1;

              const selectedButton = document.querySelector(
                `.variant-btn[data-option-position="${position}"][data-option-value="${optionValue}"]`,
              );

              if (selectedButton) {
                selectedButton.click();
              }

              url.searchParams.set('variant', matchedVariant.id);
              history.replaceState({ variant: matchedVariant.id }, '', url.toString());
            });
          }
        }
      });
    });

    document.querySelectorAll('.variant-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        const position = parseInt(this.dataset.optionPosition);
        const value = this.dataset.optionValue;

        document.querySelectorAll(`.variant-btn[data-option-position="${position}"]`).forEach((b) => {
          b.classList.remove('border-custom-green', 'bg-custom-green/5', 'text-custom-green', 'font-medium');
          b.classList.add('border-bark/15', 'text-bark/70', 'bg-red');
        });

        this.classList.add('border-custom-green', 'bg-custom-green/5', 'text-custom-green', 'font-medium');
        this.classList.remove('border-bark/15', 'text-bark/70');

        const label = document.getElementById(`option-${position}-label`);
        if (label) label.textContent = value;

        const selectedOptions = [];
        document.querySelectorAll('.variant-btn').forEach((b) => {
          if (b.classList.contains('border-custom-green')) {
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
              availability.innerHTML = '<span class="text-custom-green">✓ In stock</span>';
              document.getElementById('add-to-cart-btn')?.removeAttribute('disabled');
              document.getElementById('atc-label').textContent = 'Add to Cart';
            } else {
              availability.innerHTML = '<span class="text-red-400">✕ Out of stock</span>';
              document.getElementById('add-to-cart-btn')?.setAttribute('disabled', true);
              document.getElementById('atc-label').textContent = 'Sold Out';
            }
          }

          if (matchedVariant.featured_image && matchedVariant.featured_image.src) {
            const newImageSrc = matchedVariant.featured_image.src;
            const mainImg = document.getElementById('main-product-image');

            if (mainImg) {
              mainImg.style.opacity = '0';

              setTimeout(() => {
                mainImg.removeAttribute('srcset');
                mainImg.src = newImageSrc;

                mainImg.style.opacity = '1';
              }, 150);
            }
          }

          document.querySelectorAll('.product-thumb').forEach((btn) => {
            btn.classList.replace('border-mango', 'border-transparent');
          });

          const selectedThumbBtn = document.querySelector(`.product-thumb[data-variant-ids*="${matchedVariant.id}"]`);
          if (selectedThumbBtn) {
            selectedThumbBtn.classList.replace('border-transparent', 'border-mango');
          }

          url.searchParams.set('variant', matchedVariant.id);
          history.replaceState({ variant: matchedVariant.id }, '', url.toString());
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

  const atcBtn = document.getElementById('add-to-cart-btn');

  atcBtn?.addEventListener('click', async function () {
    const variantId = document.getElementById('selected-variant-id')?.value;
    const quantity = parseInt(document.getElementById('product-qty')?.value || '1');

    if (!variantId) return;

    const label = document.getElementById('atc-label');
    const originalLabel = label.textContent;
    label.textContent = 'Adding...';
    atcBtn.disabled = true;

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId),
          quantity,
        }),
      });

      if (!response.ok) throw new Error('Add to cart failed');

      label.textContent = '✓ Added!';
      atcBtn.classList.add('bg-custom-green-dark');

      if (typeof showCartNotification === 'function') {
        setTimeout(() => showCartNotification(), 300);
      }

      fetch('/cart.js')
        .then((response) => response.json())
        .then((cart) => {
          const actualCount = cart.item_count;

          document.querySelectorAll('.cart-count-badge').forEach((badge) => {
            badge.textContent = actualCount;

            if (actualCount > 0) {
              badge.classList.remove('hidden');
            }
          });
        });

      setTimeout(() => {
        label.textContent = originalLabel;
        atcBtn.disabled = false;
        atcBtn.classList.remove('bg-custom-green-dark');
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

    const originalLabel = this.textContent;
    this.disabled = true;
    this.textContent = 'Redirecting...';
    this.classList.add('opacity-60', 'cursor-not-allowed');

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(variantId),
          quantity,
        }),
      });

      if (!response.ok) throw new Error('Failed to add to cart');

      window.location.href = '/checkout';
    } catch (error) {
      console.error('Buy now failed', error);

      this.disabled = false;
      this.textContent = originalLabel;
      this.classList.remove('opacity-60', 'cursor-not-allowed');
    }
  });
});
