import { appState } from '../state.js';
import { debounce } from '../utils/format.js';

export class UIManager {
  constructor() {
    this.toastContainer = null;
    this.suggestionsContainer = null;
    this.init();
  }

  init() {
    this.createToastContainer();
    this.createSuggestionsContainer();
  }

  createToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
      this.toastContainer = container;
    } else {
      this.toastContainer = document.getElementById('toastContainer');
    }
  }

  createSuggestionsContainer() {
    if (!document.getElementById('suggestionsContainer')) {
      const container = document.createElement('div');
      container.id = 'suggestionsContainer';
      container.className = 'suggestions-container';
      container.setAttribute('role', 'listbox');
      container.setAttribute('aria-label', 'Location suggestions');
      container.style.display = 'none';
      document.body.appendChild(container);
      this.suggestionsContainer = container;
    } else {
      this.suggestionsContainer = document.getElementById('suggestionsContainer');
    }
  }

  showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    toast.innerHTML = `
      <span class="material-symbols-outlined">${icons[type] || icons.info}</span>
      <span>${message}</span>
      <button class="toast-close" aria-label="Close notification">
        <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
      </button>
    `;

    this.toastContainer.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.removeToast(toast);
    });

    setTimeout(() => this.removeToast(toast), duration);
  }

  removeToast(toast) {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }

  showSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      this.suggestionsContainer.style.display = 'none';
      return;
    }

    this.suggestionsContainer.innerHTML = '';
    this.suggestionsContainer.style.display = 'block';

    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.setAttribute('tabindex', '0');
      
      item.innerHTML = `
        <span class="material-symbols-outlined text-primary-fixed-dim">place</span>
        <span>${suggestion.name || suggestion.displayName}</span>
      `;

      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectSuggestion(suggestion);
        }
      });

      this.suggestionsContainer.appendChild(item);
    });
  }

  selectSuggestion(suggestion) {
    this.suggestionsContainer.style.display = 'none';
    window.dispatchEvent(new CustomEvent('locationSelected', { detail: suggestion }));
  }

  hideSuggestions() {
    this.suggestionsContainer.style.display = 'none';
  }

  showLoading(element) {
    if (element) {
      element.classList.add('loading');
    }
  }

  hideLoading(element) {
    if (element) {
      element.classList.remove('loading');
    }
  }

  updateThemeButton(button) {
    const state = appState.getState();
    const icon = button.querySelector('i');
    if (state.theme === 'dark') {
      icon.className = 'fas fa-sun';
      button.setAttribute('aria-label', 'Switch to light mode');
    } else {
      icon.className = 'fas fa-moon';
      button.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showWarning(message) {
    this.showToast(message, 'warning');
  }

  showInfo(message) {
    this.showToast(message, 'info');
  }
}

export const uiManager = new UIManager();