/* Gurmad splash: show once per page load, then reveal the app. */
(() => {
  const splash = document.getElementById('gurmadSplash');
  if (!splash) return;
  document.body.classList.add('gurmad-splash-active');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = () => {
    splash.classList.add('is-leaving');
    document.body.classList.remove('gurmad-splash-active');
    window.setTimeout(() => splash.remove(), reducedMotion ? 0 : 420);
  };
  window.setTimeout(finish, reducedMotion ? 250 : 1650);
})();