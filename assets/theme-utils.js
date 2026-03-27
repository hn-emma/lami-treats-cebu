async function handleShopifyError(response) {
  const data = await response.json().catch(() => ({}));
  const message = data.description ?? data.message ?? 'An unexpected error occurred.';

  showErrorNotification(message, `Error ${response.status}`);

  return Promise.reject({
    status: response.status,
    message: message,
  });
}

document.querySelector('#newsletter-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'text/html' },
    });

    if (response.url.includes('/challenge')) {
      window.location.href = response.url;
      return;
    }

    if (response.ok) {
      form.innerHTML = `
        <div class="animate-fade-in py-2">
          <p class="text-sm text-bark font-medium">
            🎉 You're subscribed! Salamat!
          </p>
        </div>
      `;
    } else {
      throw new Error('Submission failed');
    }
  } catch (error) {
    console.error('Newsletter error:', error);
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;

    form.submit();
  }
});
