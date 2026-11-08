// Classic-script startup guard: this runs before the ES module graph is fetched.
(function () {
  var panel = document.getElementById('startup-fallback');
  var message = document.getElementById('startup-message');
  var detail = document.getElementById('startup-detail');
  var retry = document.getElementById('startup-retry');
  var finished = false;

  function fail(error) {
    if (finished) return;
    finished = true;
    message.textContent = 'GURMAD 24 could not start. / App-ku ma furmin.';
    detail.textContent = (error && error.message) ? error.message : 'JavaScript module loading failed. Check your connection, then retry.';
    retry.hidden = false;
    panel.classList.add('failed');
  }

  retry.addEventListener('click', function () { window.location.reload(); });

  import('/js/app.js').then(function () {
    finished = true;
    panel.remove();
  }).catch(fail);

  // Catch a module request that stalls instead of returning an error.
  window.setTimeout(function () {
    if (!finished) {
      message.textContent = 'App startup is taking too long. / Furitaanka app-ku wuu dheeraaday.';
      detail.textContent = 'The app code did not finish loading. Check the connection and retry.';
      retry.hidden = false;
      panel.classList.add('failed');
    }
  }, 12000);
})();
