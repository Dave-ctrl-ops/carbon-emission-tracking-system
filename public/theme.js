function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateToggleButton(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateToggleButton(newTheme);
}

function updateToggleButton(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
  }
}

// Add toggle button to the page if it doesn't exist
function addToggleButton() {
  if (document.getElementById('themeToggleBtn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'themeToggleBtn';
  btn.className = 'theme-toggle';
  btn.onclick = toggleTheme;
  document.body.appendChild(btn);
  
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateToggleButton(currentTheme);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  addToggleButton();
});
