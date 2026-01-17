export const logToDiv = (m) => {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  const db = document.getElementById('debug');
  if (!db) {
    return;
  }
  const dbc = document.getElementById('debug-content');
  if (!dbc) {
    return;
  }
  db.classList.add('visible');
  let c = dbc.innerHTML || '';
  c += `<p>${m || '&nbsp;'}</p>`;
  dbc.innerHTML = c;
};
