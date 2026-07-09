import DefaultTheme from 'vitepress/theme';
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client';
import './styles/code-compare.css';

if (typeof window !== 'undefined') {
  const STORAGE_KEY = 'nest-kit-sidebar-collapsed';

  function restoreState() {
    if (localStorage.getItem(STORAGE_KEY) === 'true' && window.innerWidth >= 768) {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  }

  function createToggle() {
    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.setAttribute('aria-label', 'Toggle sidebar');
    btn.innerHTML = '<span>←</span>';
    btn.addEventListener('click', () => {
      const isCollapsed = document.documentElement.classList.toggle('sidebar-collapsed');
      btn.querySelector('span')!.textContent = isCollapsed ? '→' : '←';
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    });
    return btn;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      restoreState();
      document.body.appendChild(createToggle());
    });
  } else {
    restoreState();
    document.body.appendChild(createToggle());
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    enhanceAppWithTabs(app);
  },
};
