async function handleShopifyError(response) {
  const data = await response.json().catch(() => ({}));
  const message = data.description ?? data.message ?? 'An unexpected error occurred.';

  showErrorNotification(message, `Error ${response.status}`);

  return Promise.reject({
    status: response.status,
    message: message,
  });
}
