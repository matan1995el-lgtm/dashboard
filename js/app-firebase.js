'use strict';

// הגדרות בסיסיות
const storageKey = 'myAppsDashboard';
const backupReminderKey = 'lastBackupReminder';
const SETTINGS_KEY = 'dashboardSettings';
const BACKUP_REMINDER_HOURS = 12;
const USE_FIREBASE = true;

// Firebase configuration - UPDATED
const firebaseConfig = {
    apiKey: "AIzaSyC6607PUguFH13mn90YLWYQyAmbNEEJjKE",
    authDomain: "panda-dasheboard.firebaseapp.com",
    databaseURL: "https://panda-dasheboard-default-rtdb.firebaseio.com",
    projectId: "panda-dasheboard",
    storageBucket: "panda-dasheboard.firebasestorage.app",
    messagingSenderId: "133168692638",
    appId: "1:133168692638:web:c5020edb872d8214a02a8f"
};

// משתנים גלובליים
let apps = [];
let editingAppId = null;
let currentFilters = {
    search: '',
    language: 'all',
    category: 'all',
    favorite: 'all',
    sort: 'newest'
};
let draggedCard = null;

// Firebase variables
let app;
let database;
let isFirebaseInitialized = false;

// DOM elements - יאותחלו בהמשך
let dom = {};

// ==================== פונקציות אתחול ====================

function initializeDOM() {
    console.log('🔄 מאתחל DOM elements...');
    dom = {
        openModalBtn: document.getElementById('openModalBtn'),
        emptyStateBtn: document.getElementById('emptyStateBtn'),
        exportBtn: document.getElementById('exportBtn'),
        importBtn: document.getElementById('importBtn'),
        importFile: document.getElementById('importFile'),
        modal: document.getElementById('appModal'),
        form: document.getElementById('appForm'), // ✅ תוקן מ-'form' ל-'appForm'
        closeModalBtn: document.getElementById('closeModalBtn'),
        cancelModalBtn: document.getElementById('cancelModalBtn'),
        appsGrid: document.getElementById('appsGrid'),
        emptyState: document.getElementById('emptyState'),
        modalTitle: document.getElementById('modalTitle'),
        searchInput: document.getElementById('searchInput'),
        favoriteFilter: document.getElementById('favoriteFilter'),
        languageFilter: document.getElementById('languageFilter'),
        categoryFilter: document.getElementById('categoryFilter'),
        sortSelect: document.getElementById('sortSelect'),
        totalApps: document.getElementById('totalApps'),
        activeLanguages: document.getElementById('activeLanguages'),
        activeCategories: document.getElementById('activeCategories'),
        cardTemplate: document.getElementById('appCardTemplate'),
        syncStatus: document.getElementById('syncStatus'),
        settingsBtn: document.getElementById('settingsBtn'),
        backupNowBtn: document.getElementById('backupNowBtn'),
        snoozeBackupBtn: document.getElementById('snoozeBackupBtn')
    };
    console.log('✅ DOM initialization completed');
}

function updateSyncStatus(message, status = '') {
    // המתן עד ש-DOM מאותחל לחלוטין
    if (!dom || !dom.syncStatus) {
        console.log('⏳ Sync status update delayed - DOM not ready:', message);
        setTimeout(() => updateSyncStatus(message, status), 100);
        return;
    }
    
    dom.syncStatus.textContent = message;
    dom.syncStatus.className = 'sync-status';
    if (status) {
        dom.syncStatus.classList.add(`sync-${status}`);
    }
    console.log('🔔 Sync status:', message);
}

function initializeFirebase() {
    try {
        if (USE_FIREBASE && typeof firebase !== 'undefined') {
            console.log('🔥 מאתחל Firebase...');
            
            // בדיקה אם Firebase כבר מאותחל
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
                console.log('✅ Firebase app initialized successfully');
            } else {
                app = firebase.app();
                console.log('ℹ️ Using existing Firebase app');
            }
            
            database = firebase.database();
            isFirebaseInitialized = true;
            
            // בדיקת חיבור
            const connectedRef = database.ref('.info/connected');
            connectedRef.on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    console.log('🌐 Connected to Firebase!');
                    updateSyncStatus('מחובר ל-Firebase ✓', 'success');
                } else {
                    console.log('🔌 Disconnected from Firebase');
                    updateSyncStatus('מנותק מ-Firebase', 'offline');
                }
            });
            
            return true;
        } else {
            console.log('❌ Firebase not available');
            return false;
        }
    } catch (error) {
        console.error('💥 Firebase initialization failed:', error);
        isFirebaseInitialized = false;
        updateSyncStatus('שגיאת Firebase', 'error');
        return false;
    }
}

// ==================== Firebase Functions ====================

async function loadFromFirebase() {
    try {
        if (!USE_FIREBASE || !isFirebaseInitialized || !database) {
            throw new Error('Firebase not available');
        }

        updateSyncStatus('טוען מ-Firebase...', 'syncing');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Firebase timeout'));
            }, 10000);

            database.ref('apps').once('value')
                .then((snapshot) => {
                    clearTimeout(timeout);
                    const data = snapshot.val();
                    if (data) {
                        apps = Object.keys(data).map(key => ({
                            id: key,
                            ...data[key]
                        }));
                        console.log(`✅ Loaded ${apps.length} apps from Firebase`);
                        updateSyncStatus(`מסונכרן (${apps.length}) ✓`, 'success');
                    } else {
                        apps = [];
                        console.log('ℹ️ No apps found in Firebase, starting fresh');
                        updateSyncStatus('מוכן לשימוש ✓', 'success');
                    }
                    
                    // Setup real-time listener for updates
                    setupRealtimeListener();
                    resolve(true);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    console.error('❌ Error loading from Firebase:', error);
                    updateSyncStatus('שגיאה בטעינה', 'error');
                    reject(error);
                });
        });
    } catch (error) {
        console.error('💥 Error loading from Firebase:', error);
        loadFromStorage();
        updateSyncStatus('מצב לא מקוון', 'offline');
        return false;
    }
}

function setupRealtimeListener() {
    if (!USE_FIREBASE || !database) return;
    
    console.log('👂 Setting up real-time listener...');
    
    database.ref('apps').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const newApps = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            
            if (JSON.stringify(newApps) !== JSON.stringify(apps)) {
                console.log('🔄 Real-time update received');
                apps = newApps;
                render();
                updateSyncStatus(`מסונכרן בזמן אמת (${apps.length}) ✓`, 'success');
            }
        } else {
            apps = [];
            render();
        }
    });
}

async function saveToFirebase(appData) {
    try {
        if (!USE_FIREBASE || !database) {
            throw new Error('Firebase not available');
        }

        updateSyncStatus('שומר...', 'syncing');
        
        const newAppRef = database.ref('apps').push();
        const appId = newAppRef.key;
        
        const completeAppData = {
            ...appData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await newAppRef.set(completeAppData);
        console.log('✅ App saved to Firebase:', appData.name);
        updateSyncStatus('נשמר ✓', 'success');
        
        return { id: appId, ...completeAppData };
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
        updateSyncStatus('שגיאה בשמירה', 'error');
        throw error;
    }
}

async function updateInFirebase(appId, appData) {
    try {
        if (!USE_FIREBASE || !database) {
            throw new Error('Firebase not available');
        }

        updateSyncStatus('מעדכן...', 'syncing');
        
        const updatedData = {
            ...appData,
            updatedAt: Date.now()
        };
        
        await database.ref(`apps/${appId}`).update(updatedData);
        console.log('✅ App updated in Firebase:', appId);
        updateSyncStatus('עודכן ✓', 'success');
        
        return { id: appId, ...updatedData };
    } catch (error) {
        console.error('❌ Error updating in Firebase:', error);
        updateSyncStatus('שגיאה בעדכון', 'error');
        throw error;
    }
}

async function deleteFromFirebase(appId) {
    try {
        if (!USE_FIREBASE || !database) {
            throw new Error('Firebase not available');
        }

        updateSyncStatus('מוחק...', 'syncing');
        
        await database.ref(`apps/${appId}`).remove();
        console.log('✅ App deleted from Firebase:', appId);
        updateSyncStatus('נמחק ✓', 'success');
        
        return true;
    } catch (error) {
        console.error('❌ Error deleting from Firebase:', error);
        updateSyncStatus('שגיאה במחיקה', 'error');
        throw error;
    }
}

// ==================== Local Storage Fallback ====================

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            apps = getDefaultApps();
            saveToStorage();
            updateSyncStatus('מוכן לשימוש ✓', 'success');
        } else {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                apps = parsed;
                updateSyncStatus(`נטען (${apps.length}) ✓`, 'success');
            } else {
                apps = getDefaultApps();
                saveToStorage();
                updateSyncStatus('מוכן לשימוש ✓', 'success');
            }
        }
    } catch (error) {
        console.error('❌ Error loading from storage:', error);
        apps = getDefaultApps();
        saveToStorage();
        updateSyncStatus('מוכן לשימוש ✓', 'success');
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(apps));
    } catch (error) {
        console.error('❌ Error saving to storage:', error);
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
            icon: '📱',
            isFavorite: false,
            order: 0,
            createdAt: Date.now() - 10000000,
            updatedAt: Date.now() - 10000000
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
            icon: '💻',
            isFavorite: true,
            order: 1,
            createdAt: Date.now() - 5000000,
            updatedAt: Date.now() - 5000000
        }
    ];
}

const createId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `app-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);

// ==================== UI Functions ====================

function render() {
    updateStats();
    updateFiltersOptions();
    const filtered = applyFilters();
    const sorted = sortApps(filtered);

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

    sorted.forEach(app => {
        const card = createCard(app);
        card.draggable = true;
        dom.appsGrid.appendChild(card);
    });

    setTimeout(() => {
        setupDragAndDrop();
    }, 100);
}

function applyFilters() {
    return apps.filter(app => {
        const matchesSearch = !currentFilters.search ||
            [app.name, app.description, app.language, app.category, (app.tags || []).join(' ')].some(field =>
                field && field.toString().toLowerCase().includes(currentFilters.search)
            );

        const matchesLanguage = currentFilters.language === 'all' || app.language === currentFilters.language;
        const matchesCategory = currentFilters.category === 'all' || app.category === currentFilters.category;
        const matchesFavorite = currentFilters.favorite === 'all' || 
                               (currentFilters.favorite === 'favorites' && app.isFavorite);

        return matchesSearch && matchesLanguage && matchesCategory && matchesFavorite;
    });
}

function sortApps(appsList) {
    const sorted = [...appsList];
    
    switch (currentFilters.sort) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'name':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'favorite':
            return sorted.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
        case 'custom':
            return sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
        default:
            return sorted;
    }
}

function updateStats() {
    if (dom.totalApps) dom.totalApps.textContent = apps.length.toString();

    const languages = new Set(apps.filter(app => app.language).map(app => app.language));
    if (dom.activeLanguages) dom.activeLanguages.textContent = languages.size.toString();

    const categories = new Set(apps.filter(app => app.category).map(app => app.category));
    if (dom.activeCategories) dom.activeCategories.textContent = categories.size.toString();
}

function updateFiltersOptions() {
    const languageValues = Array.from(new Set(apps.map(app => app.language).filter(Boolean))).sort();
    const categoryValues = Array.from(new Set(apps.map(app => app.category).filter(Boolean))).sort();

    if (dom.languageFilter) refreshSelectOptions(dom.languageFilter, languageValues, currentFilters.language);
    if (dom.categoryFilter) refreshSelectOptions(dom.categoryFilter, categoryValues, currentFilters.category);
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
    const icon = fragment.querySelector('.card-icon');
    const name = fragment.querySelector('.app-name');
    const description = fragment.querySelector('.app-description');
    const language = fragment.querySelector('.language');
    const category = fragment.querySelector('.category');
    const favoriteBadge = fragment.querySelector('.favorite-badge');
    const tagsContainer = fragment.querySelector('.tags');
    const link = fragment.querySelector('.app-link');
    const favoriteBtn = fragment.querySelector('.favorite-btn');
    const editBtn = fragment.querySelector('.edit-btn');
    const deleteBtn = fragment.querySelector('.delete-btn');

    card.dataset.id = app.id;
    icon.textContent = app.icon || '📱';
    icon.style.color = app.color || '#4f46e5';
    name.textContent = app.name;
    description.textContent = app.description || 'ללא תיאור';

    // Update favorite state
    favoriteBtn.textContent = app.isFavorite ? '★' : '☆';
    favoriteBtn.style.color = app.isFavorite ? '#ffc107' : '';
    favoriteBadge.hidden = !app.isFavorite;

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

    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(app.id);
    });

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
        color: formData.get('color')?.toString() || '#4f46e5',
        icon: formData.get('icon')?.toString() || '📱',
        isFavorite: false,
        order: apps.length
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
        if (USE_FIREBASE && database) {
            if (editingAppId) {
                const updated = await updateInFirebase(editingAppId, appData);
                const index = apps.findIndex(a => a.id === editingAppId);
                if (index !== -1) {
                    apps[index] = {
                        ...apps[index],
                        ...updated
                    };
                }
            } else {
                const saved = await saveToFirebase(appData);
                apps.push(saved);
            }
        } else {
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
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                apps.push(newApp);
            }
            saveToStorage();
            render();
        }

        closeModal();
        dom.form.reset();
        editingAppId = null;
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

async function deleteApp(appId) {
    try {
        if (USE_FIREBASE && database) {
            await deleteFromFirebase(appId);
        } else {
            apps = apps.filter(app => app.id !== appId);
            saveToStorage();
            render();
        }
    } catch (error) {
        alert('שגיאה במחיקת האפליקציה. נסה שוב.');
    }
}

async function toggleFavorite(appId) {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    const newFavoriteState = !app.isFavorite;

    try {
        if (USE_FIREBASE && database) {
            await updateInFirebase(appId, { 
                isFavorite: newFavoriteState
            });
        } else {
            app.isFavorite = newFavoriteState;
            app.updatedAt = Date.now();
            saveToStorage();
            render();
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        alert('שגיאה בעדכון מועדפים. נסה שוב.');
    }
}

function openModal() {
    editingAppId = null;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    dom.modalTitle.textContent = settings.content?.modalAddTitle || 'הוספת אפליקציה';
    dom.form.reset();
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.icon-option[data-icon="📱"]').classList.add('selected');
    
    if (!dom.modal.open) {
        dom.modal.showModal();
    }
    setTimeout(() => {
        dom.form.querySelector('#appName')?.focus();
        setupIconSelector();
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
    document.getElementById('appIcon').value = app.icon || '📱';
    
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    const selectedIcon = app.icon || '📱';
    const iconElement = document.querySelector(`.icon-option[data-icon="${selectedIcon}"]`);
    if (iconElement) {
        iconElement.classList.add('selected');
    }
    
    if (!dom.modal.open) {
        dom.modal.showModal();
    }
    setTimeout(() => {
        setupIconSelector();
    }, 50);
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

            if (USE_FIREBASE && database) {
                alert('מבצע ייבוא ל-Firebase... זה עשוי לקחת כמה רגעים.');
                importToFirebase(imported);
            } else {
                apps = imported;
                saveToStorage();
                render();
                alert('הנתונים יובאו בהצלחה!');
            }
        } catch (error) {
            console.error('שגיאה בייבוא:', error);
            alert('שגיאה בקריאת הקובץ. וודא שזה קובץ JSON תקין.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function importToFirebase(appsToImport) {
    try {
        updateSyncStatus('מייבא...', 'syncing');
        
        if (database) {
            await database.ref('apps').remove();
        }
        
        for (const app of appsToImport) {
            const { id, ...appData } = app;
            await saveToFirebase(appData);
        }
        
        updateSyncStatus('ייבוא הושלם ✓', 'success');
        alert('ייבוא ל-Firebase הושלם!');
    } catch (error) {
        console.error('Error importing to Firebase:', error);
        updateSyncStatus('שגיאה בייבוא', 'error');
        alert('שגיאה בייבוא ל-Firebase.');
    }
}

// Drag and Drop functionality
function setupDragAndDrop() {
    const cardsGrid = document.getElementById('appsGrid');
    if (!cardsGrid) return;
    
    cardsGrid.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('app-card')) {
            draggedCard = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.outerHTML);
        }
    });
    
    cardsGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = getDragAfterElement(cardsGrid, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (draggable) {
            if (afterElement == null) {
                cardsGrid.appendChild(draggable);
            } else {
                cardsGrid.insertBefore(draggable, afterElement);
            }
        }
    });
    
    cardsGrid.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('app-card')) {
            e.target.classList.remove('dragging');
            saveNewOrder();
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.app-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function saveNewOrder() {
    const cardsGrid = document.getElementById('appsGrid');
    if (!cardsGrid) return;
    
    const cardElements = cardsGrid.querySelectorAll('.app-card');
    
    const updates = [];
    cardElements.forEach((cardElement, index) => {
        const appId = cardElement.dataset.id;
        const app = apps.find(a => a.id === appId);
        if (app) {
            app.order = index;
            updates.push(app);
        }
    });
    
    try {
        if (USE_FIREBASE && database) {
            for (const app of updates) {
                await updateInFirebase(app.id, { 
                    order: app.order
                });
            }
        } else {
            saveToStorage();
            render();
        }
        updateSyncStatus('סדר נשמר ✓', 'success');
    } catch (error) {
        console.error('Error saving order:', error);
        updateSyncStatus('שגיאה בשמירת סדר', 'error');
    }
}

// Icon selector functionality
function setupIconSelector() {
    const iconOptions = document.querySelectorAll('.icon-option');
    const iconInput = document.getElementById('appIcon');
    if (!iconInput) return;
    
    iconOptions.forEach(option => {
        option.addEventListener('click', () => {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            iconInput.value = option.dataset.icon;
        });
    });
}

function showUpdateNotification(count) {
    if (Notification.permission === 'granted') {
        new Notification('עדכונים חדשים!', {
            body: `יש ${count} אפליקציות שעודכנו`,
            icon: '/icon.png'
        });
    } else {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span>🔄</span>
                <span>יש ${count} אפליקציות שעודכנו</span>
                <button class="notification-close">✕</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            });
        }
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Backup reminder functions
function checkBackupReminder() {
    const lastBackup = localStorage.getItem(backupReminderKey);
    const now = Date.now();
    
    if (!lastBackup) {
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
    const snoozeTime = Date.now() - (6 * 60 * 60 * 1000);
    localStorage.setItem(backupReminderKey, snoozeTime.toString());
    hideBackupReminder();
}

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
            const elements = {
                'mainTitle': 'mainTitle',
                'mainSubtitle': 'mainSubtitle', 
                'addBtnText': 'addButtonText',
                'exportBtnText': 'exportButtonText',
                'importBtnText': 'importButtonText',
                'emptyStateTitle': 'emptyStateTitle',
                'emptyStateText': 'emptyStateText',
                'stat1Label': 'stat1Label',
                'stat2Label': 'stat2Label',
                'stat3Label': 'stat3Label'
            };
            
            Object.entries(elements).forEach(([elementId, settingKey]) => {
                const element = document.getElementById(elementId);
                if (element && settings.content[settingKey]) {
                    element.textContent = settings.content[settingKey];
                }
            });

            const searchInput = document.getElementById('searchInput');
            if (searchInput && settings.content.searchPlaceholder) {
                searchInput.placeholder = settings.content.searchPlaceholder;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function setupEventListeners() {
    console.log('🔄 מאתחל event listeners...');
    
    // Check if all required elements exist
    const requiredElements = [
        'openModalBtn', 'emptyStateBtn', 'exportBtn', 'importBtn', 
        'settingsBtn', 'backupNowBtn', 'snoozeBackupBtn', 'importFile',
        'closeModalBtn', 'cancelModalBtn', 'appForm', 'searchInput', // ✅ תוקן מ-'form' ל-'appForm'
        'favoriteFilter', 'languageFilter', 'categoryFilter', 'sortSelect'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn('Element not found:', id);
        }
    });

    // Add event listeners
    if (dom.openModalBtn) {
        dom.openModalBtn.addEventListener('click', openModal);
    }
    
    if (dom.emptyStateBtn) {
        dom.emptyStateBtn.addEventListener('click', openModal);
    }
    
    if (dom.exportBtn) {
        dom.exportBtn.addEventListener('click', exportData);
    }
    
    if (dom.importBtn) {
        dom.importBtn.addEventListener('click', () => dom.importFile?.click());
    }
    
    if (dom.importFile) {
        dom.importFile.addEventListener('change', importData);
    }
    
    if (dom.closeModalBtn) {
        dom.closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (dom.cancelModalBtn) {
        dom.cancelModalBtn.addEventListener('click', closeModal);
    }
    
    if (dom.form) {
        dom.form.addEventListener('submit', handleFormSubmit);
    }

    if (dom.searchInput) {
        dom.searchInput.addEventListener('input', event => {
            currentFilters.search = event.target.value.trim().toLowerCase();
            render();
        });
    }

    if (dom.favoriteFilter) {
        dom.favoriteFilter.addEventListener('change', event => {
            currentFilters.favorite = event.target.value;
            render();
        });
    }

    if (dom.languageFilter) {
        dom.languageFilter.addEventListener('change', event => {
            currentFilters.language = event.target.value;
            render();
        });
    }

    if (dom.categoryFilter) {
        dom.categoryFilter.addEventListener('change', event => {
            currentFilters.category = event.target.value;
            render();
        });
    }

    if (dom.sortSelect) {
        dom.sortSelect.addEventListener('change', event => {
            currentFilters.sort = event.target.value;
            render();
        });
    }

    if (dom.modal) {
        dom.modal.addEventListener('cancel', event => {
            event.preventDefault();
            closeModal();
        });
    }
    
    if (dom.settingsBtn) {
        dom.settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }
    
    if (dom.backupNowBtn) {
        dom.backupNowBtn.addEventListener('click', exportData);
    }
    
    if (dom.snoozeBackupBtn) {
        dom.snoozeBackupBtn.addEventListener('click', snoozeBackupReminder);
    }

    console.log('✅ Event listeners setup completed');
}

async function init() {
    console.log('🚀 Starting app initialization...');
    
    // שלב 1: אתחול DOM
    initializeDOM();
    
    // שלב 2: אתחול Firebase
    initializeFirebase();
    
    // שלב 3: טעינת הגדרות
    loadAndApplySettings();
    
    // שלב 4: טעינת נתונים
    if (USE_FIREBASE && isFirebaseInitialized) {
        try {
            console.log('📡 Attempting to load from Firebase...');
            await loadFromFirebase();
        } catch (error) {
            console.error('❌ Failed to load from Firebase, falling back to localStorage:', error);
            loadFromStorage();
        }
    } else {
        console.log('💾 Loading from localStorage...');
        loadFromStorage();
    }
    
    // שלב 5: אתחול event listeners
    setupEventListeners();
    
    // שלב 6: רינדור ראשוני
    render();
    
    // שלב 7: פיצ'רים נוספים
    checkBackupReminder();
    requestNotificationPermission();
    
    setTimeout(() => {
        if (document.querySelector('.icon-option')) {
            setupIconSelector();
        }
    }, 100);

    console.log('🎉 App initialization completed successfully!');
}

// התחל את האפליקציה כאשר הדף נטען
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}