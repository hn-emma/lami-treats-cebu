const initCartNoteSaver = () => {
  const checkoutLinks = document.querySelectorAll('a[href="/checkout"]');
  const cartNoteElement = document.getElementById('cart-note');

  if (!checkoutLinks.length || !cartNoteElement) return;

  checkoutLinks.forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();

      const note = cartNoteElement.value;

      try {
        await fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        });
      } catch (error) {
        console.error('Failed to save cart note:', error);
      }

      window.location.href = '/checkout';
    });
  });
};

initCartNoteSaver();
