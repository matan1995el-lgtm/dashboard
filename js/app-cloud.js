'use strict';

const storageKey = 'myAppsDashboard';
const backupReminderKey = 'lastBackupReminder';
const SETTINGS_KEY = 'dashboardSettings';
const BACKUP_REMINDER_HOURS = 12; // Remind every 12 hours (twice a day)
const USE_CLOUD = true; // Set to false to use localStorage only

// Load and apply settings
function loadAndApplySettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (!saved) return;
        
        const settings = JSON.parse(saved);
        
        // Apply colors
        if (settings.colors) {
            document.documentElement.style.setProperty('--primary', settings.colors.primary);
            document.documentElement.style.setProperty('--secondary', settings.colors.secondary);
            document.documentElement.style.setProperty('--bg', settings.colors.background);
            document.documentElement.style.setProperty('--surface-solid', settings.colors.surface);
            document.documentElement.style.setProperty('--text', settings.colors.text);
            document.documentElement.style.setProperty('--muted', settings.colors.muted);
            document.documentElement.style.setProperty('--border', settings.colors.border);
            document.documentElement.style.setProperty('--success', settings.colors.success);
        }
        
        // Apply typography
        if (settings.typography) {
            document.documentElement.style.fontSize = settings.typography.baseFontSize + 'px';
            document.body.style.fontFamily = settings.typography.fontFamily + ', system-ui, sans-serif';
            document.body.style.lineHeight = settings.typography.lineHeight;
            document.body.style.fontWeight = settings.typography.fontWeight;
        }
        
        // Apply spacing
        if (settings.spacing) {
            document.documentElement.style.setProperty('--border-radius', settings.spacing.borderRadius + 'px');
            document.documentElement.style.setProperty('--card-radius', settings.spacing.cardRadius + 'px');
            document.documentElement.style.setProperty('--padding', settings.spacing.padding + 'rem');
            document.documentElement.style.setProperty('--gap', settings.spacing.gap + 'rem');
            document.documentElement.style.setProperty('--card-padding', settings.spacing.cardPadding + 'rem');
        }
        
        // Apply content
        if (settings.content) {
            const mainTitle = document.getElementById('mainTitle');
            const mainSubtitle = document.getElementById('mainSubtitle');
            const addBtnText = document.getElementById('addBtnText');
            const exportBtnText = document.getElementById('exportBtnText');
            const importBtnText = document.getElementById('importBtnText');
            const searchInput = document.getElementById('searchInput');
            const emptyStateTitle = document.getElementById('emptyStateTitle');
            const emptyStateText = document.getElementById('emptyStateText');
            const stat1Label = document.getElementById('stat1Label');
            const stat2Label = document.getElementById('stat2Label');
            const stat3Label = document.getElementById('stat3Label');
            
            if (mainTitle) mainTitle.textContent = settings.content.mainTitle;
            if (mainSubtitle) mainSubtitle.textContent = settings.content.mainSubtitle;
            if (addBtnText) addBtnText.textContent = settings.content.addButtonText;
            if (exportBtnText) exportBtnText.textContent = settings.content.exportButtonText;
            if (importBtnText) importBtnText.textContent = settings.content.importButtonText;
            if (searchInput) searchInput.placeholder = settings.content.searchPlaceholder;
            if (emptyStateTitle) emptyStateTitle.textContent = settings.content.emptyStateTitle;
            if (emptyStateText) emptyStateText.textContent = settings.content.emptyStateText;
            if (stat1Label) stat1Label.textContent = settings.content.stat1Label;
            if (stat2Label) stat2Label.textContent = settings.content.stat2Label;
            if (stat3Label) stat3Label.textContent = settings.content.stat3Label;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
const createId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `app-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);

const dom = {
    openModalBtn: document.getElementById('openModalBtn'),
    emptyStateBtn: document.getElementById('emptyStateBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    modal: document.getElementById('appModal'),
    form: document.getElementById('appForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    appsGrid: document.getElementById('appsGrid'),
    emptyState: document.getElementById('emptyState'),
    modalTitle: document.getElementById('modalTitle'),
    searchInput: document.getElementById('searchInput'),
    languageFilter: document.getElementById('languageFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    totalApps: document.getElementById('totalApps'),
    activeLanguages: document.getElementById('activeLanguages'),
    activeCategories: document.getElementById('activeCategories'),
    cardTemplate: document.getElementById('appCardTemplate'),
    syncStatus: document.getElementById('syncStatus')
};

let apps = [];
let editingAppId = null;
let currentFilters = {
    search: '',
    language: 'all',
    category: 'all'
};
let isSyncing = false;

// API Functions
async function loadFromCloud() {
    try {
        updateSyncStatus('טוען...', 'syncing');
        const response = await fetch('tables/apps?limit=1000');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const result = await response.json();
        console.log('Loaded from cloud:', result.data.length, 'apps');
        
        apps = result.data.map(item => ({
            id: item.id,
            name: item.name || '',
            description: item.description || '',
            url: item.url || '',
            language: item.language || '',
            category: item.category || '',
            tags: item.tags || [],
            color: item.color || '#4f46e5',
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || null
        }));
        
        if (apps.length === 0) {
            updateSyncStatus('מוכן לשימוש ✓', 'success');
        } else {
            updateSyncStatus(`מסונכרן (${apps.length}) ✓`, 'success');
        }
        // Don't clear the status
        return true;
    } catch (error) {
        console.error('שגיאה בטעינה מהענן:', error);
        updateSyncStatus('לא מחובר לענן', 'error');
        // Don't clear error status
        return false;
    }
}

async function saveToCloud(appData) {
    try {
        updateSyncStatus('שומר...', 'syncing');
        const response = await fetch('tables/apps', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(appData)
        });
        
        if (!response.ok) throw new Error('Failed to save');
        const saved = await response.json();
        updateSyncStatus('נשמר ✓', 'success');
        // Don't clear the status
        return saved;
    } catch (error) {
        console.error('שגיאה בשמירה לענן:', error);
        updateSyncStatus('שגיאה בשמירה', 'error');
        // Don't clear error status
        throw error;
    }
}

async function updateInCloud(recordId, appData) {
    try {
        updateSyncStatus('מעדכן...', 'syncing');
        const response = await fetch(`tables/apps/${recordId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(appData)
        });
        
        if (!response.ok) throw new Error('Failed to update');
        const updated = await response.json();
        updateSyncStatus('עודכן ✓', 'success');
        // Don't clear the status
        return updated;
    } catch (error) {
        console.error('שגיאה בעדכון בענן:', error);
        updateSyncStatus('שגיאה בעדכון', 'error');
        // Don't clear error status
        throw error;
    }
}

async function deleteFromCloud(recordId) {
    try {
        updateSyncStatus('מוחק...', 'syncing');
        const response = await fetch(`tables/apps/${recordId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete');
        updateSyncStatus('נמחק ✓', 'success');
        // Don't clear the status
        return true;
    } catch (error) {
        console.error('שגיאה במחיקה מהענן:', error);
        updateSyncStatus('שגיאה במחיקה', 'error');
        // Don't clear error status
        throw error;
    }
}

function updateSyncStatus(message, status = '') {
    if (dom.syncStatus) {
        dom.syncStatus.textContent = message;
        dom.syncStatus.className = 'sync-status';
        if (status) {
            dom.syncStatus.classList.add(`sync-${status}`);
        }
    }
}

// Fallback to localStorage
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            apps = getDefaultApps();
            saveToStorage();
        } else {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                apps = parsed;
            } else {
                apps = getDefaultApps();
            }
        }
    } catch (error) {
        console.error('שגיאה בקריאת הנתונים מהדפדפן', error);
        apps = getDefaultApps();
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(apps));
    } catch (error) {
        console.error('שגיאה בשמירת הנתונים בדפדפן', error);
    }
}

function getDefaultApps() {
    return [
        {
            id: createId(),
            name: 'מנהל משימות יומי',
            description: 'אפליקציה לניהול משימות יומיות עם חלוקה לפי קטגוריות ואחוז התקדמות.',
            url: 'https://example.com/daily-planner',
            language: 'JavaScript',
            category: 'פרודוקטיביות',
            tags: ['ToDo', 'Frontend'],
            color: '#4f46e5',
            createdAt: Date.now() - 10000000
        },
        {
            id: createId(),
            name: 'מחשבון פיננסי',
            description: 'כלי קטן לחישוב ריבית דריבית והשוואת החזרי הלוואות.',
            url: 'https://example.com/finance-tools',
            language: 'TypeScript',
            category: 'פיננסים',
            tags: ['Calculators', 'Personal'],
            color: '#0ea5e9',
            createdAt: Date.now() - 5000000
        }
    ];
}

function render() {
    updateStats();
    updateFiltersOptions();
    const filtered = applyFilters();

    if (apps.length === 0) {
        dom.emptyState.hidden = false;
        dom.appsGrid.hidden = true;
        dom.appsGrid.innerHTML = '';
        return;
    }

    dom.emptyState.hidden = true;
    dom.appsGrid.hidden = false;
    dom.appsGrid.innerHTML = '';

    if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'empty-state';
        noResults.innerHTML = '<h3>לא נמצאו אפליקציות תואמות</h3><p>נסה לשנות את החיפוש או הסינונים.</p>';
        dom.appsGrid.appendChild(noResults);
        return;
    }

    filtered
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach(app => {
            const card = createCard(app);
            dom.appsGrid.appendChild(card);
        });
}

function applyFilters() {
    return apps.filter(app => {
        const matchesSearch = !currentFilters.search ||
            [app.name, app.description, app.language, app.category, (app.tags || []).join(' ')].some(field =>
                field && field.toString().toLowerCase().includes(currentFilters.search)
            );

        const matchesLanguage = currentFilters.language === 'all' || app.language === currentFilters.language;
        const matchesCategory = currentFilters.category === 'all' || app.category === currentFilters.category;

        return matchesSearch && matchesLanguage && matchesCategory;
    });
}

function updateStats() {
    dom.totalApps.textContent = apps.length.toString();

    const languages = new Set(apps.filter(app => app.language).map(app => app.language));
    dom.activeLanguages.textContent = languages.size.toString();

    const categories = new Set(apps.filter(app => app.category).map(app => app.category));
    dom.activeCategories.textContent = categories.size.toString();
}

function updateFiltersOptions() {
    const languageValues = Array.from(new Set(apps.map(app => app.language).filter(Boolean))).sort();
    const categoryValues = Array.from(new Set(apps.map(app => app.category).filter(Boolean))).sort();

    refreshSelectOptions(dom.languageFilter, languageValues, currentFilters.language);
    refreshSelectOptions(dom.categoryFilter, categoryValues, currentFilters.category);
}

function refreshSelectOptions(selectEl, values, selectedValue) {
    const previous = selectEl.value;
    selectEl.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'הכל';
    selectEl.appendChild(allOption);

    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectEl.appendChild(option);
    });

    selectEl.value = values.includes(previous) ? previous : 'all';

    if (selectedValue && selectedValue !== selectEl.value) {
        selectEl.value = selectedValue;
    }
}

function createCard(app) {
    const fragment = dom.cardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.app-card');
    const color = fragment.querySelector('.card-color');
    const name = fragment.querySelector('.app-name');
    const description = fragment.querySelector('.app-description');
    const language = fragment.querySelector('.language');
    const category = fragment.querySelector('.category');
    const tagsContainer = fragment.querySelector('.tags');
    const link = fragment.querySelector('.app-link');
    const editBtn = fragment.querySelector('.edit-btn');
    const deleteBtn = fragment.querySelector('.delete-btn');

    card.dataset.id = app.id;
    color.style.background = app.color || '#4f46e5';
    name.textContent = app.name;
    description.textContent = app.description || 'ללא תיאור';

    if (app.language) {
        language.innerHTML = `💻 ${app.language}`;
        language.hidden = false;
    } else {
        language.hidden = true;
    }

    if (app.category) {
        category.innerHTML = `📁 ${app.category}`;
        category.hidden = false;
    } else {
        category.hidden = true;
    }

    tagsContainer.textContent = '';
    if (Array.isArray(app.tags) && app.tags.length) {
        app.tags.forEach(tag => {
            const span = document.createElement('span');
            span.textContent = tag;
            tagsContainer.appendChild(span);
        });
    }

    link.href = app.url;

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(app.id);
    });

    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`האם למחוק את "${app.name}" מהלוח?`)) {
            await deleteApp(app.id);
        }
    });

    return card;
}

function ensureProtocol(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    return `https://${url}`;
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(dom.form);

    const appData = {
        name: formData.get('name')?.toString().trim(),
        description: formData.get('description')?.toString().trim(),
        url: ensureProtocol(formData.get('url')?.toString().trim()),
        language: formData.get('language')?.toString().trim(),
        category: formData.get('category')?.toString().trim(),
        tags: parseTags(formData.get('tags')?.toString()),
        color: formData.get('color')?.toString() || '#4f46e5'
    };

    if (!appData.name) {
        alert('יש להזין שם לאפליקציה.');
        return;
    }

    if (!appData.url) {
        alert('יש להזין קישור תקין לאפליקציה.');
        return;
    }

    try {
        if (USE_CLOUD) {
            if (editingAppId) {
                // Update existing
                appData.updatedAt = Date.now();
                const updated = await updateInCloud(editingAppId, appData);
                const index = apps.findIndex(a => a.id === editingAppId);
                if (index !== -1) {
                    apps[index] = {
                        id: updated.id,
                        name: updated.name,
                        description: updated.description,
                        url: updated.url,
                        language: updated.language,
                        category: updated.category,
                        tags: updated.tags,
                        color: updated.color,
                        createdAt: updated.createdAt,
                        updatedAt: updated.updatedAt
                    };
                }
            } else {
                // Create new
                appData.createdAt = Date.now();
                const saved = await saveToCloud(appData);
                apps.push({
                    id: saved.id,
                    name: saved.name,
                    description: saved.description,
                    url: saved.url,
                    language: saved.language,
                    category: saved.category,
                    tags: saved.tags,
                    color: saved.color,
                    createdAt: saved.createdAt,
                    updatedAt: saved.updatedAt
                });
            }
        } else {
            // LocalStorage fallback
            if (editingAppId) {
                const index = apps.findIndex(a => a.id === editingAppId);
                if (index !== -1) {
                    apps[index] = {
                        ...apps[index],
                        ...appData,
                        updatedAt: Date.now()
                    };
                }
            } else {
                const newApp = {
                    id: createId(),
                    ...appData,
                    createdAt: Date.now()
                };
                apps.push(newApp);
            }
            saveToStorage();
        }

        closeModal();
        dom.form.reset();
        editingAppId = null;
        render();
    } catch (error) {
        alert('שגיאה בשמירת האפליקציה. נסה שוב.');
    }
}

function parseTags(tagsString = '') {
    return tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
}

async function deleteApp(id) {
    try {
        if (USE_CLOUD) {
            await deleteFromCloud(id);
        }
        apps = apps.filter(app => app.id !== id);
        if (!USE_CLOUD) {
            saveToStorage();
        }
        render();
    } catch (error) {
        alert('שגיאה במחיקת האפליקציה. נסה שוב.');
    }
}

function openModal() {
    editingAppId = null;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    dom.modalTitle.textContent = settings.content?.modalAddTitle || 'הוספת אפליקציה';
    dom.form.reset();
    if (!dom.modal.open) {
        dom.modal.showModal();
    }
    setTimeout(() => {
        dom.form.querySelector('#appName')?.focus();
    }, 50);
}

function openEditModal(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    editingAppId = appId;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    dom.modalTitle.textContent = settings.content?.modalEditTitle || 'עריכת אפליקציה';
    
    document.getElementById('appName').value = app.name || '';
    document.getElementById('appDescription').value = app.description || '';
    document.getElementById('appUrl').value = app.url || '';
    document.getElementById('appLanguage').value = app.language || '';
    document.getElementById('appCategory').value = app.category || '';
    document.getElementById('appTags').value = Array.isArray(app.tags) ? app.tags.join(', ') : '';
    document.getElementById('appColor').value = app.color || '#4f46e5';

    if (!dom.modal.open) {
        dom.modal.showModal();
    }
}

function closeModal() {
    if (dom.modal.open) {
        dom.modal.close();
    }
}

function exportData() {
    if (apps.length === 0) {
        alert('אין נתונים לייצוא');
        return;
    }

    const dataStr = JSON.stringify(apps, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apps-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Update last backup time
    localStorage.setItem(backupReminderKey, Date.now().toString());
    hideBackupReminder();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) {
                alert('קובץ לא תקין - צריך להיות מערך של אפליקציות');
                return;
            }

            const confirmed = confirm(`האם לייבא ${imported.length} אפליקציות? הנתונים הקיימים יוחלפו.`);
            if (!confirmed) return;

            apps = imported;
            if (USE_CLOUD) {
                alert('ייבוא הושלם. השינויים יסונכרנו לענן כאשר תערוך או תוסיף אפליקציות.');
            } else {
                saveToStorage();
            }
            render();
            alert('הנתונים יובאו בהצלחה!');
        } catch (error) {
            console.error('שגיאה בייבוא:', error);
            alert('שגיאה בקריאת הקובץ. וודא שזה קובץ JSON תקין.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function setupEventListeners() {
    dom.openModalBtn.addEventListener('click', openModal);
    dom.emptyStateBtn.addEventListener('click', openModal);
    dom.exportBtn.addEventListener('click', exportData);
    dom.importBtn.addEventListener('click', () => dom.importFile.click());
    dom.importFile.addEventListener('change', importData);
    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.cancelModalBtn.addEventListener('click', closeModal);
    dom.form.addEventListener('submit', handleFormSubmit);

    dom.searchInput.addEventListener('input', event => {
        currentFilters.search = event.target.value.trim().toLowerCase();
        render();
    });

    dom.languageFilter.addEventListener('change', event => {
        currentFilters.language = event.target.value;
        render();
    });

    dom.categoryFilter.addEventListener('change', event => {
        currentFilters.category = event.target.value;
        render();
    });

    dom.modal.addEventListener('cancel', event => {
        event.preventDefault();
        closeModal();
    });
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }
    
    // Backup reminder buttons
    const backupNowBtn = document.getElementById('backupNowBtn');
    const snoozeBackupBtn = document.getElementById('snoozeBackupBtn');
    if (backupNowBtn) {
        backupNowBtn.addEventListener('click', exportData);
    }
    if (snoozeBackupBtn) {
        snoozeBackupBtn.addEventListener('click', snoozeBackupReminder);
    }
}

function checkBackupReminder() {
    const lastBackup = localStorage.getItem(backupReminderKey);
    const now = Date.now();
    
    if (!lastBackup) {
        // First time - show reminder immediately
        showBackupReminder();
        return;
    }
    
    const hoursSinceBackup = (now - parseInt(lastBackup)) / (1000 * 60 * 60);
    
    if (hoursSinceBackup >= BACKUP_REMINDER_HOURS) {
        showBackupReminder();
    }
}

function showBackupReminder() {
    const reminderEl = document.getElementById('backupReminder');
    if (reminderEl) {
        reminderEl.hidden = false;
    }
}

function hideBackupReminder() {
    const reminderEl = document.getElementById('backupReminder');
    if (reminderEl) {
        reminderEl.hidden = true;
    }
}

function snoozeBackupReminder() {
    // Snooze for 6 hours
    const snoozeTime = Date.now() - (6 * 60 * 60 * 1000); // Show again in 6 hours
    localStorage.setItem(backupReminderKey, snoozeTime.toString());
    hideBackupReminder();
}

async function init() {
    // Load and apply settings first
    loadAndApplySettings();
    
    if (!('showModal' in HTMLDialogElement.prototype)) {
        console.warn('הדפדפן לא תומך ברכיב dialog באופן מלא.');
        dom.modal.classList.add('modal-fallback');
    }

    if (USE_CLOUD) {
        const loaded = await loadFromCloud();
        if (!loaded) {
            // Fallback to localStorage if cloud fails
            loadFromStorage();
        }
    } else {
        loadFromStorage();
    }
    
    setupEventListeners();
    render();
    checkBackupReminder();
}

document.addEventListener('DOMContentLoaded', init);
