'use strict';

const storageKey = 'myAppsDashboard';
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
    cardTemplate: document.getElementById('appCardTemplate')
};

let apps = [];
let editingAppId = null;
let currentFilters = {
    search: '',
    language: 'all',
    category: 'all'
};

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

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`האם למחוק את "${app.name}" מהלוח?`)) {
            deleteApp(app.id);
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

function handleFormSubmit(event) {
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

    if (editingAppId) {
        // Edit existing app
        const index = apps.findIndex(a => a.id === editingAppId);
        if (index !== -1) {
            apps[index] = {
                ...apps[index],
                ...appData,
                updatedAt: Date.now()
            };
        }
    } else {
        // Add new app
        const newApp = {
            id: createId(),
            ...appData,
            createdAt: Date.now()
        };
        apps.push(newApp);
    }

    saveToStorage();
    closeModal();
    dom.form.reset();
    editingAppId = null;
    render();
}

function parseTags(tagsString = '') {
    return tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
}

function deleteApp(id) {
    apps = apps.filter(app => app.id !== id);
    saveToStorage();
    render();
}

function openModal() {
    editingAppId = null;
    dom.modalTitle.textContent = 'הוספת אפליקציה';
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
    dom.modalTitle.textContent = 'עריכת אפליקציה';
    
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
            saveToStorage();
            render();
            alert('הנתונים יובאו בהצלחה!');
        } catch (error) {
            console.error('שגיאה בייבוא:', error);
            alert('שגיאה בקריאת הקובץ. ודא שזה קובץ JSON תקין.');
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
}

function init() {
    if (!('showModal' in HTMLDialogElement.prototype)) {
        console.warn('הדפדפן לא תומך ברכיב dialog באופן מלא.');
        dom.modal.classList.add('modal-fallback');
    }

    loadFromStorage();
    setupEventListeners();
    render();
}

document.addEventListener('DOMContentLoaded', init);
