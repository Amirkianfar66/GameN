try {
  await import('./main.js');
} catch {
  // Do not expose SDK diagnostics, tokens or request bodies in the page or console.
  const message = document.createElement('p');
  message.textContent = 'The playtest could not connect. Check your connection and reload this page. Your match is not reset.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Reload';
  retry.addEventListener('click', () => location.reload());
  document.getElementById('lobby').replaceChildren(message, retry);
}
