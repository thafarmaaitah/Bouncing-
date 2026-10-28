/* Boot feedback runs independently of the game module, including import failures. */
(() => {
  const errorPanel = document.getElementById('bootError');
  const errorText = document.getElementById('bootErrorText');
  const start = document.getElementById('startRun');
  const status = document.getElementById('status');
  let ready = false;
  function fail(message) {
    errorText.textContent = message;
    errorPanel.hidden = false;
    start.disabled = true;
    window.dispatchEvent(new Event('sky-rush-fatal'));
  }
  const watchdog = setTimeout(() => {
    if (!ready) fail('The 3D engine has not finished loading. Check your connection, then tap Reload game.');
  }, 20000);
  window.skyRushBoot = Object.freeze({
    ready() {
      ready = true;
      clearTimeout(watchdog);
      errorPanel.hidden = true;
      start.disabled = false;
      start.textContent = 'Start playing';
      status.textContent = '3D ready. Load your approved V4.1 GLB privately from your device. No upload.';
    },
    fail
  });
  window.addEventListener('error', event => {
    // Extension errors and unrelated image errors must not interrupt a game.
    if (event.filename && !event.filename.startsWith(location.origin)) return;
    if (event.error || event.target instanceof HTMLScriptElement) {
      fail('The game could not start or continue. Tap Reload game to try again.');
    }
  }, true);
  window.addEventListener('unhandledrejection', () => {
    fail('The game could not finish loading. Check your connection and tap Reload game.');
  });
  document.getElementById('bootRetry').addEventListener('click', () => location.reload());
})();
