'use strict';

const SETTINGS_KEY = 'dashboardSettings';
const THEMES_KEY = 'dashboardThemes';

// Default themes
const defaultThemes = {
    default: {
        name: 'ברירת מחדל',
        colors: {
            primary: '#4f46e5',
            secondary: '#7c3aed',
            background: '#0f172a',
            surface: '#ffffff',
            text: '#0f172a',
            muted: '#64748b',
            border: '#e2e8f0',
            success: '#22c55e'
        }
    },
    dark: {
        name: 'כהה',
        colors: {
            primary: '#818cf8',
            secondary: '#a78bfa',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            muted: '#94a3b8',
            border: '#334155',
            success: '#22c55e'
        }
    },
    blue: {
        name: 'כחול',
        colors: {
            primary: '#0ea5e9',
            secondary: '#2563eb',
            background: '#0c4a6e',
            surface: '#ffffff',
            text: '#0f172a',
            muted: '#64748b',
            border: '#e0f2fe',
            success: '#22c55e'
        }
    },
    green: {
        name: 'ירוק',
        colors: {
            primary: '#10b981',
            secondary: '#059669',
            background: '#064e3b',
            surface: '#ffffff',
            text: '#0f172a',
            muted: '#64748b',
            border: '#d1fae5',
            success: '#22c55e'
        }
    }
};

// Default settings
const defaultSettings = {
    theme: 'default',
    colors: defaultThemes.default.colors,
    typography: {
        fontFamily: 'Assistant',
        baseFontSize: 16,
        h1Size: 2.4,
        h2Size: 1.8,
        bodySize: 1,
        smallSize: 0.875,
        lineHeight: 1.5,
        fontWeight: 400
    },
    spacing: {
        borderRadius: 12,
        cardRadius: 18,
        padding: 1,
        gap: 1,
        cardPadding: 1.5,
        shadowIntensity: 0.15
    },
    content: {
        mainTitle: 'לוח בקרה לאפליקציות שלי',
        mainSubtitle: 'מקום אחד בו ניתן לראות, לארגן ולהגיע לכל המערכות האישיות שאתה בונה.',
        addButtonText: '+ הוספת אפליקציה',
        exportButtonText: '📥 ייצוא',
        importButtonText: '📤 ייבוא',
        searchPlaceholder: 'חיפוש לפי שם או תיאור...',
        emptyStateTitle: 'עוד אין אפליקציות בלוח',
        emptyStateText: 'לחץ על "הוספת אפליקציה" כדי להוסיף את הפרויקט הראשון שלך.',
        modalAddTitle: 'הוספת אפליקציה',
        modalEditTitle: 'עריכת אפליקציה',
        stat1Label: 'סה"כ אפליקציות',
        stat2Label: 'שפות פעילות',
        stat3Label: 'קטגוריות פעילות'
    }
};

let currentSettings = JSON.parse(JSON.stringify(defaultSettings));

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            currentSettings = { ...defaultSettings, ...parsed };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
        alert('ההגדרות נשמרו בהצלחה! ✓');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('שגיאה בשמירת ההגדרות');
    }
}

// Apply theme
function applyTheme(themeKey) {
    const theme = defaultThemes[themeKey];
    if (!theme) return;

    currentSettings.theme = themeKey;
    currentSettings.colors = { ...theme.colors };
    
    // Update color inputs
    Object.keys(theme.colors).forEach(colorKey => {
        const input = document.getElementById(`${colorKey}Color`);
        const textInput = document.getElementById(`${colorKey}ColorText`);
        if (input) {
            input.value = theme.colors[colorKey];
            if (textInput) textInput.value = theme.colors[colorKey];
        }
    });

    updateThemeDisplay();
}

// Update theme display
function updateThemeDisplay() {
    document.getElementById('currentThemeName').textContent = 
        defaultThemes[currentSettings.theme]?.name || 'מותאם אישית';
    
    // Update active theme card
    document.querySelectorAll('.theme-card').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.theme === currentSettings.theme) {
            card.classList.add('active');
        }
    });
}

// Collect settings from form
function collectSettings() {
    // Colors
    currentSettings.colors = {
        primary: document.getElementById('primaryColor').value,
        secondary: document.getElementById('secondaryColor').value,
        background: document.getElementById('backgroundColor').value,
        surface: document.getElementById('surfaceColor').value,
        text: document.getElementById('textColor').value,
        muted: document.getElementById('mutedColor').value,
        border: document.getElementById('borderColor').value,
        success: document.getElementById('successColor').value
    };

    // Typography
    currentSettings.typography = {
        fontFamily: document.getElementById('fontFamily').value,
        baseFontSize: parseFloat(document.getElementById('baseFontSize').value),
        h1Size: parseFloat(document.getElementById('h1Size').value),
        h2Size: parseFloat(document.getElementById('h2Size').value),
        bodySize: parseFloat(document.getElementById('bodySize').value),
        smallSize: parseFloat(document.getElementById('smallSize').value),
        lineHeight: parseFloat(document.getElementById('lineHeight').value),
        fontWeight: parseInt(document.getElementById('fontWeight').value)
    };

    // Spacing
    currentSettings.spacing = {
        borderRadius: parseFloat(document.getElementById('borderRadius').value),
        cardRadius: parseFloat(document.getElementById('cardRadius').value),
        padding: parseFloat(document.getElementById('padding').value),
        gap: parseFloat(document.getElementById('gap').value),
        cardPadding: parseFloat(document.getElementById('cardPadding').value),
        shadowIntensity: parseFloat(document.getElementById('shadowIntensity').value)
    };

    // Content
    currentSettings.content = {
        mainTitle: document.getElementById('mainTitle').value,
        mainSubtitle: document.getElementById('mainSubtitle').value,
        addButtonText: document.getElementById('addButtonText').value,
        exportButtonText: document.getElementById('exportButtonText').value,
        importButtonText: document.getElementById('importButtonText').value,
        searchPlaceholder: document.getElementById('searchPlaceholder').value,
        emptyStateTitle: document.getElementById('emptyStateTitle').value,
        emptyStateText: document.getElementById('emptyStateText').value,
        modalAddTitle: document.getElementById('modalAddTitle').value,
        modalEditTitle: document.getElementById('modalEditTitle').value,
        stat1Label: document.getElementById('stat1Label').value,
        stat2Label: document.getElementById('stat2Label').value,
        stat3Label: document.getElementById('stat3Label').value
    };
}

// Populate form with current settings
function populateForm() {
    // Colors
    Object.keys(currentSettings.colors).forEach(colorKey => {
        const input = document.getElementById(`${colorKey}Color`);
        const textInput = document.getElementById(`${colorKey}ColorText`);
        if (input) {
            input.value = currentSettings.colors[colorKey];
            if (textInput) textInput.value = currentSettings.colors[colorKey];
        }
    });

    // Typography
    document.getElementById('fontFamily').value = currentSettings.typography.fontFamily;
    document.getElementById('baseFontSize').value = currentSettings.typography.baseFontSize;
    document.getElementById('h1Size').value = currentSettings.typography.h1Size;
    document.getElementById('h2Size').value = currentSettings.typography.h2Size;
    document.getElementById('bodySize').value = currentSettings.typography.bodySize;
    document.getElementById('smallSize').value = currentSettings.typography.smallSize;
    document.getElementById('lineHeight').value = currentSettings.typography.lineHeight;
    document.getElementById('fontWeight').value = currentSettings.typography.fontWeight;

    // Spacing
    document.getElementById('borderRadius').value = currentSettings.spacing.borderRadius;
    document.getElementById('cardRadius').value = currentSettings.spacing.cardRadius;
    document.getElementById('padding').value = currentSettings.spacing.padding;
    document.getElementById('gap').value = currentSettings.spacing.gap;
    document.getElementById('cardPadding').value = currentSettings.spacing.cardPadding;
    document.getElementById('shadowIntensity').value = currentSettings.spacing.shadowIntensity;

    // Content
    document.getElementById('mainTitle').value = currentSettings.content.mainTitle;
    document.getElementById('mainSubtitle').value = currentSettings.content.mainSubtitle;
    document.getElementById('addButtonText').value = currentSettings.content.addButtonText;
    document.getElementById('exportButtonText').value = currentSettings.content.exportButtonText;
    document.getElementById('importButtonText').value = currentSettings.content.importButtonText;
    document.getElementById('searchPlaceholder').value = currentSettings.content.searchPlaceholder;
    document.getElementById('emptyStateTitle').value = currentSettings.content.emptyStateTitle;
    document.getElementById('emptyStateText').value = currentSettings.content.emptyStateText;
    document.getElementById('modalAddTitle').value = currentSettings.content.modalAddTitle;
    document.getElementById('modalEditTitle').value = currentSettings.content.modalEditTitle;
    document.getElementById('stat1Label').value = currentSettings.content.stat1Label;
    document.getElementById('stat2Label').value = currentSettings.content.stat2Label;
    document.getElementById('stat3Label').value = currentSettings.content.stat3Label;

    updateThemeDisplay();
}

// Show preview
function showPreview() {
    collectSettings();
    
    const previewSection = document.getElementById('previewSection');
    const previewCard = previewSection.querySelector('.preview-card');
    
    previewCard.style.setProperty('--primary-color', currentSettings.colors.primary);
    previewCard.style.setProperty('--secondary-color', currentSettings.colors.secondary);
    previewCard.style.setProperty('--surface-color', currentSettings.colors.surface);
    previewCard.style.setProperty('--text-color', currentSettings.colors.text);
    previewCard.style.setProperty('--muted-color', currentSettings.colors.muted);
    previewCard.style.setProperty('--border-color', currentSettings.colors.border);
    previewCard.style.setProperty('--border-radius', currentSettings.spacing.borderRadius + 'px');
    previewCard.style.setProperty('--card-radius', currentSettings.spacing.cardRadius + 'px');
    previewCard.style.setProperty('--card-padding', currentSettings.spacing.cardPadding + 'rem');
    previewCard.style.setProperty('--h2-size', currentSettings.typography.h2Size + 'rem');
    previewCard.style.setProperty('--body-size', currentSettings.typography.bodySize + 'rem');
    previewCard.style.setProperty('--line-height', currentSettings.typography.lineHeight);
    previewCard.style.fontFamily = currentSettings.typography.fontFamily;
    
    previewSection.hidden = false;
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Export settings
function exportSettings() {
    collectSettings();
    const dataStr = JSON.stringify(currentSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Import settings
function importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            currentSettings = { ...defaultSettings, ...imported };
            populateForm();
            alert('ההגדרות יובאו בהצלחה! ✓');
        } catch (error) {
            console.error('Error importing settings:', error);
            alert('שגיאה בקריאת קובץ ההגדרות');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Reset to defaults
function resetToDefaults() {
    if (confirm('האם אתה בטוח שברצונך לאפס את כל ההגדרות?')) {
        currentSettings = JSON.parse(JSON.stringify(defaultSettings));
        populateForm();
        alert('ההגדרות אופסו בהצלחה! ✓');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Theme selection
    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const themeKey = card.dataset.theme;
            if (themeKey !== 'custom') {
                applyTheme(themeKey);
            }
        });
    });

    // Color inputs sync
    document.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const textInput = document.getElementById(e.target.id + 'Text');
            if (textInput) {
                textInput.value = e.target.value;
            }
        });
    });

    document.querySelectorAll('.color-text').forEach(input => {
        input.addEventListener('change', (e) => {
            const colorInput = document.getElementById(e.target.id.replace('Text', ''));
            if (colorInput && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                colorInput.value = e.target.value;
            }
        });
    });

    // Range slider display
    document.getElementById('shadowIntensity').addEventListener('input', (e) => {
        e.target.nextElementSibling.textContent = e.target.value;
    });

    // Action buttons
    document.getElementById('previewBtn').addEventListener('click', showPreview);
    document.getElementById('saveBtn').addEventListener('click', () => {
        collectSettings();
        saveSettings();
    });
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
    document.getElementById('exportSettingsBtn').addEventListener('click', exportSettings);
    document.getElementById('importSettingsBtn').addEventListener('click', () => {
        document.getElementById('importSettingsFile').click();
    });
    document.getElementById('importSettingsFile').addEventListener('change', importSettings);
}

// Initialize
function init() {
    loadSettings();
    populateForm();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
