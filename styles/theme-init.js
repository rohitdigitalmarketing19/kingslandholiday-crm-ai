// Run before the app renders, including on /ops. Storage may be unavailable.
(function () {
  var theme = 'light';
  try {
    var saved = localStorage.getItem('kingsland_theme');
    if (saved === 'dark' || saved === 'light') theme = saved;
  } catch (_) {}
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
})();
