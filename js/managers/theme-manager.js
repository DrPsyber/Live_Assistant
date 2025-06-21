// Theme Management
export class ThemeManager {
    constructor() {
        this.storageKey = 'theme_preference';
        this.themes = {
            LIGHT: 'light-mode',
            DARK: 'dark-mode'
        };
    }

    initialize() {
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.setTheme(this.themes.DARK);
        }
        this.updateToggleButton();
    }

    toggleTheme() {
        const currentTheme = document.body.classList.contains(this.themes.DARK)
            ? this.themes.DARK
            : this.themes.LIGHT;
        const newTheme = currentTheme === this.themes.DARK
            ? this.themes.LIGHT
            : this.themes.DARK;
        this.setTheme(newTheme);
        this.updateToggleButton();
        return newTheme;
    }

    setTheme(theme) {
        document.body.classList.remove(this.themes.LIGHT, this.themes.DARK);
        document.body.classList.add(theme);
        localStorage.setItem(this.storageKey, theme);
    }

    updateToggleButton() {
        const toggleIcon = document.querySelector('#theme-toggle-btn i');
        if (document.body.classList.contains(this.themes.DARK)) {
            toggleIcon.className = 'fas fa-sun';
        } else {
            toggleIcon.className = 'fas fa-moon';
        }
    }
}