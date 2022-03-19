// Set a given theme/color-scheme
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
}
 
// Toggle between color themes
function toggleLightTheme() {
    if (localStorage.getItem('theme') !== 'theme-light'){
        setTheme('theme-light');
    }
}
function toggleDarkTheme() {
    if (localStorage.getItem('theme') !== 'theme-dark'){
        setTheme('theme-dark');
    }
}

// Immediately set the theme on initial load
(function () {
    if (localStorage.getItem('theme') === 'theme-light') {
        setTheme('theme-light');
    }
    if (localStorage.getItem('theme') === 'theme-dark') {
        setTheme('theme-dark');
    }
})();