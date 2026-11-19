/* GURMAD 24 V45 cinematic brand introduction. */
(() => {
  const splash = document.getElementById('gurmadSplash');
  if (!splash) return;
  document.body.classList.add('gurmad-splash-active');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = () => {
    if (!splash.isConnected) return;
    splash.classList.add('is-leaving');
    document.body.classList.remove('gurmad-splash-active');
    window.setTimeout(() => splash.remove(), reducedMotion ? 0 : 680);
  };
  // Give the logo, wordmark and flowing waves time to complete their entrance.
  window.setTimeout(finish, reducedMotion ? 350 : 3600);
})();