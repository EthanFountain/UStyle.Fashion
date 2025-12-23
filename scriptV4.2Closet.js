// ============================================================================
// FASHIONDEX - FULLY REVISED AND CLEANED UP JAVASCRIPT
// ============================================================================

const SUPABASE_URL = 'https://qzunyhotqmrwwcgvurcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dW55aG90cW1yd3djZ3Z1cmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MzQ2NTIsImV4cCI6MjA3NjIxMDY1Mn0.3QM_TlyY3kbh3vvG8mYtsWhxlkhMia1P0tL6upRkmNQ';

// Initialize Supabase - use var to avoid conflicts
var supabaseClient = null;

if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Supabase initialization error:', error);
    }
} else {
    console.error('Supabase library not loaded from CDN');
}

// Create an alias for backwards compatibility
var supabase = supabaseClient;

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
    user: null,
    entries: [],
    draftEntries: [],
    filteredEntries: [],
    selectedEntry: null,
    editingEntry: null,
    currentCategory: 'all',
    searchQuery: '',
    activeTags: [],
    uploadedImages: [],
    uploadedImageFiles: [],
    currentImageIndex: 0,
    activityLog: [],
    currentTheme: 'default'
};

// ============================================================================
// DOM CACHE
// ============================================================================

const dom = {
    // Login Screen
    loginScreen: document.getElementById('loginScreen'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'),
    loginBtnText: document.getElementById('loginBtnText'),
    loginBtnLoader: document.getElementById('loginBtnLoader'),
    guestBtn: document.getElementById('guestBtn'),
    googleSignInBtn: document.getElementById('googleSignInBtn'),
    
    // App Wrapper
    appWrapper: document.getElementById('appWrapper'),
    
    // Top Bar
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    logoutBtn: document.getElementById('logoutBtn'),
    counterCurrent: document.getElementById('counterCurrent'),
    
    // Mobile Buttons
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileInfoBtn: document.getElementById('mobileInfoBtn'),
    mobileNavOverlay: document.getElementById('mobileNavOverlay'),
    
    // Left Panel
    categoryNav: document.getElementById('categoryNav'),
    tagList: document.getElementById('tagList'),
    draftsList: document.getElementById('draftsList'),
    draftsSection: document.getElementById('draftsSection'),
    addEntryBtn: document.getElementById('addEntryBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    adminActions: document.getElementById('adminActions'),
    
    // Center Panel
    statTotal: document.getElementById('statTotal'),
    statFiltered: document.getElementById('statFiltered'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    listView: document.getElementById('listView'),
    listScroll: document.getElementById('listScroll'),
    
    // Right Panel
    entryCardView: document.getElementById('entryCardView'),
    entryDetail: document.getElementById('entryDetail'),
    detailContent: document.getElementById('detailContent'),
    backBtn: document.getElementById('backBtn'),
    editBtn: document.getElementById('editBtn'),
    detailEditActions: document.getElementById('detailEditActions'),
    
    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    entryForm: document.getElementById('entryForm'),
    typeGrid: document.getElementById('typeGrid'),
    entryType: document.getElementById('entryType'),
    dynamicFields: document.getElementById('dynamicFields'),
    uploadBtn: document.getElementById('uploadBtn'),
    imageInput: document.getElementById('imageInput'),
    imagePreviewGrid: document.getElementById('imagePreviewGrid'),
    submitBtn: document.getElementById('submitBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    saveDraftBtn: document.getElementById('saveDraftBtn'),
    
    // Activity Panel
    activityPanel: document.getElementById('activityPanel'),
    activityClose: document.getElementById('activityClose'),
    activityScroll: document.getElementById('activityScroll'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatValue(value) {
    if (!value || value.toString().trim() === '') {
        return '—';
    }
    return value;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    dom.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function addToActivityLog(action, entryName, type = 'info') {
    const timestamp = new Date().toLocaleString();
    const logEntry = {
        action,
        entryName,
        type,
        timestamp,
        user: state.user.username
    };
    
    state.activityLog.unshift(logEntry);
    
    if (state.activityLog.length > 50) {
        state.activityLog = state.activityLog.slice(0, 50);
    }
    
    renderActivityLog();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    await checkAuth();
    setupLoginListeners();
    
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            handleAuthSuccess(session);
        } else if (event === 'SIGNED_OUT') {
            handleSignOut();
        }
    });
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        await handleAuthSuccess(session);
    } else {
        dom.loginScreen.classList.remove('hidden');
    }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function setupLoginListeners() {
    dom.loginBtn.addEventListener('click', handleLogin);
    dom.guestBtn.addEventListener('click', handleGuestLogin);
    dom.googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    
    dom.loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

async function handleGoogleSignIn() {
    try {
        showToast('Redirecting to Google...', 'info');
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        showToast('Google sign-in failed: ' + error.message, 'error');
    }
}

async function handleLogin() {
    const email = dom.loginUsername.value.trim();
    const password = dom.loginPassword.value.trim();
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    dom.loginBtnText.classList.add('hidden');
    dom.loginBtnLoader.classList.remove('hidden');
    dom.loginBtn.disabled = true;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });
                
                if (signUpError) throw signUpError;
                
                if (signUpData.user) {
                    if (signUpData.session) {
                        showToast('Account created! Signing you in...', 'success');
                        await handleAuthSuccess(signUpData.session);
                    } else {
                        showToast('Account created! Please check your email to confirm.', 'success');
                    }
                }
            } else {
                throw error;
            }
        } else {
            await handleAuthSuccess(data.session);
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        dom.loginBtnText.classList.remove('hidden');
        dom.loginBtnLoader.classList.add('hidden');
        dom.loginBtn.disabled = false;
    }
}

async function handleAuthSuccess(session) {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('username, role, theme')  // ✅ Use username and role, not name and user_status
            .eq('id', session.user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error);
        }
        
        state.user = {
            id: session.user.id,
            email: session.user.email,
            username: profile?.username || session.user.email.split('@')[0],  // ✅ Use username
            avatar: session.user.user_metadata?.avatar_url || 
                    session.user.user_metadata?.picture,
            role: profile?.role || 'unverified',  // ✅ Use role
            canEdit: profile?.role === 'admin' || 
                     profile?.role === 'verified' || 
                     profile?.role === 'member'
        };
        
        await showApp();
    } catch (error) {
        console.error('Auth success error:', error);
        showToast('Error during authentication', 'error');
    }
}

async function handleGuestLogin() {
    state.user = {
        username: 'Guest',
        role: 'guest',
        canEdit: false
    };
    await showApp();
}

async function handleLogout() {
    if (state.user.role !== 'guest') {
        await supabase.auth.signOut();
    }
    handleSignOut();
}

function handleSignOut() {
    state.user = null;
    state.entries = [];
    state.draftEntries = [];
    dom.appWrapper.classList.add('hidden');
    dom.loginScreen.classList.remove('hidden');
    dom.loginUsername.value = '';
    dom.loginPassword.value = '';
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

async function showApp() {
    dom.loginScreen.classList.add('hidden');
    dom.appWrapper.classList.remove('hidden');
    
    dom.userName.textContent = state.user.username;
    
    const roleDisplay = {
        'admin': 'Admin',
        'verified': 'Verified User',
        'member': 'Member',        // ADD THIS
        'unverified': 'Unverified User',
        'guest': 'Guest'
    };
    dom.userRole.textContent = roleDisplay[state.user.role] || state.user.role;
    
    // Show/hide admin actions
    if (!state.user.canEdit) {
        dom.adminActions.style.display = 'none';
        dom.detailEditActions.style.display = 'none';
    } else {
        dom.adminActions.style.display = 'block';
        dom.detailEditActions.style.display = 'flex';
    }
    
    // Show/hide drafts section
    if (state.user && state.user.id) {
        dom.draftsSection.style.display = 'block';
    } else {
        dom.draftsSection.style.display = 'none';
    }
    // Load saved theme
    await loadUserTheme();
    await loadData();
    setupAppListeners();
    updateAll();
    renderDraftsList();
}

async function loadData() {
    // Load published entries
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('status', 'published')
        .order('number', { ascending: true });
    
    if (error) {
        console.error('Error loading entries:', error);
        showToast('Error loading data: ' + error.message, 'error');
        state.entries = [];
    } else {
        state.entries = data || [];
    }
    
    // Load user's drafts if logged in
    if (state.user && state.user.id) {
        const { data: drafts, error: draftError } = await supabase
            .from('entries')
            .select('*')
            .eq('status', 'draft')
            .eq('user_id', state.user.id)
            .order('updated_at', { ascending: false });
        
        if (!draftError) {
            state.draftEntries = drafts || [];
        }
    }
    
    state.filteredEntries = [...state.entries];
    filterAndRender();
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

function setupAppListeners() {
    // Top Bar
    dom.logoutBtn.addEventListener('click', handleLogout);
    
    // Mobile Navigation
    setupMobileListeners();
    
    // Left Panel
    dom.categoryNav.addEventListener('click', handleCategoryClick);
    dom.tagList.addEventListener('click', handleTagClick);
    
    // Admin Actions
    if (state.user.canEdit) {
        dom.addEntryBtn.addEventListener('click', () => openModal('add'));
        dom.exportBtn.addEventListener('click', handleExport);
        dom.importBtn.addEventListener('click', () => dom.importFile.click());
        dom.importFile.addEventListener('change', handleImport);
    }
    // Style Selector - Dropdown
    const styleDropdown = document.getElementById('styleDropdown');
    const styleCurrent = document.getElementById('styleCurrent');
    const styleOptions = document.getElementById('styleOptions');

    if (styleDropdown && styleCurrent && styleOptions) {
        // Toggle dropdown
        styleCurrent.addEventListener('click', (e) => {
            e.stopPropagation();
            styleOptions.classList.toggle('active');
        });
        
        // Select option
        styleOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.style-option');
            if (!option) return;
            
            const style = option.dataset.style;
            
            // Update current preview
            const previewClass = `preview-${style}`;
            styleCurrent.innerHTML = `<div class="theme-preview ${previewClass}"></div>`;
            
            // Close dropdown
            styleOptions.classList.remove('active');
            
            // Call style change handler
            handleStyleChange({ target: { value: style } });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!styleDropdown.contains(e.target)) {
                styleOptions.classList.remove('active');
            }
        });
    }
    
    // Center Panel
    dom.searchInput.addEventListener('input', handleSearch);
    dom.searchClear.addEventListener('click', clearSearch);
    
    // Right Panel
    dom.backBtn.addEventListener('click', closeDetailView);
    dom.editBtn.addEventListener('click', () => {
        if (!canEditEntry(state.selectedEntry)) {
            showToast('You can only edit your own entries', 'error');
            return;
        }
        openModal('edit', state.selectedEntry);
    });
    
    // Modal
    dom.modalClose.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
        if (e.target === dom.modalOverlay) closeModal();
    });
    dom.cancelBtn.addEventListener('click', closeModal);
    dom.entryForm.addEventListener('submit', handleFormSubmit);
    dom.deleteBtn.addEventListener('click', handleDelete);
    dom.typeGrid.addEventListener('click', handleTypeSelect);
    dom.uploadBtn.addEventListener('click', () => dom.imageInput.click());
    dom.imageInput.addEventListener('change', handleImageUpload);
    
    if (dom.saveDraftBtn) {
        dom.saveDraftBtn.addEventListener('click', handleSaveDraft);
    }
    
    // Activity Panel
    if (dom.activityClose) {
        dom.activityClose.addEventListener('click', () => {
            dom.activityPanel.classList.remove('active');
            dom.mobileNavOverlay.classList.remove('active');
        });
    }
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

function setupMobileListeners() {
    // Only run on mobile
    if (window.innerWidth > 1024) return;

    const mobileMenuContainer = document.getElementById('mobileMenuContainer');
    const mobileMenuContent = document.getElementById('mobileMenuContent');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const mobileBackdrop = document.getElementById('mobileBackdrop');
    const mobileDetailOverlay = document.getElementById('mobileDetailOverlay');

    // Clone left panel content into mobile menu
    const leftPanelContent = document.querySelector('.left-panel .panel-inner');
    if (leftPanelContent && mobileMenuContent) {
        mobileMenuContent.innerHTML = leftPanelContent.innerHTML;
    }

    // Mobile Menu Button - Open Menu
    if (dom.mobileMenuBtn) {
        dom.mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Close activity panel if open
            if (dom.activityPanel) {
                dom.activityPanel.classList.remove('active');
            }
            
            // Open mobile menu
            mobileMenuContainer.classList.add('active');
            mobileBackdrop.classList.add('active');
            dom.mobileMenuBtn.textContent = '✕';
        });
    }

    // Mobile Menu Close Button
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', () => {
            mobileMenuContainer.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
        });
    }

    // Mobile Backdrop - Close Everything
    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', () => {
            mobileMenuContainer.classList.remove('active');
            if (dom.activityPanel) dom.activityPanel.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
        });
    }

    // Mobile Info Button - Activity Panel
    if (dom.mobileInfoBtn) {
        dom.mobileInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const isOpen = dom.activityPanel && dom.activityPanel.classList.contains('active');
            
            if (isOpen) {
                dom.activityPanel.classList.remove('active');
                mobileBackdrop.classList.remove('active');
            } else {
                // Close menu if open
                mobileMenuContainer.classList.remove('active');
                if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
                
                // Open activity panel
                if (dom.activityPanel) {
                    dom.activityPanel.classList.add('active');
                    mobileBackdrop.classList.add('active');
                }
            }
        });
    }

    // Activity Panel Close
    if (dom.activityClose) {
        dom.activityClose.addEventListener('click', () => {
            dom.activityPanel.classList.remove('active');
            mobileBackdrop.classList.remove('active');
        });
    }

    // Re-attach category click handlers in mobile menu
    const mobileCategoryNav = mobileMenuContent.querySelector('.category-nav');
    if (mobileCategoryNav) {
        mobileCategoryNav.addEventListener('click', (e) => {
            const item = e.target.closest('.category-item');
            if (!item) return;
            
            // Update active state
            document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            // Also update desktop left panel
            const desktopItem = document.querySelector(`.left-panel .category-item[data-category="${item.dataset.category}"]`);
            if (desktopItem) {
                document.querySelectorAll('.left-panel .category-item').forEach(el => el.classList.remove('active'));
                desktopItem.classList.add('active');
            }
            
            state.currentCategory = item.dataset.category;
            filterAndRender();
            
            // Close menu
            setTimeout(() => {
                mobileMenuContainer.classList.remove('active');
                mobileBackdrop.classList.remove('active');
                if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
            }, 150);
        });
    }

    // Re-attach tag click handlers in mobile menu
    const mobileTagList = mobileMenuContent.querySelector('.tag-list');
    if (mobileTagList) {
        mobileTagList.addEventListener('click', (e) => {
            const chip = e.target.closest('.tag-chip');
            if (!chip) return;
            
            const tag = chip.dataset.tag;
            
            if (state.activeTags.includes(tag)) {
                state.activeTags = state.activeTags.filter(t => t !== tag);
                chip.classList.remove('active');
            } else {
                state.activeTags.push(tag);
                chip.classList.add('active');
            }
            
            filterAndRender();
        });
    }

    // Re-attach admin button handlers in mobile menu
    const mobileAddBtn = mobileMenuContent.querySelector('#addEntryBtn');
    const mobileExportBtn = mobileMenuContent.querySelector('#exportBtn');
    const mobileImportBtn = mobileMenuContent.querySelector('#importBtn');
    
    if (mobileAddBtn) {
        mobileAddBtn.addEventListener('click', () => {
            openModal('add');
            mobileMenuContainer.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
        });
    }
    
    if (mobileExportBtn) {
        mobileExportBtn.addEventListener('click', () => {
            handleExport();
            mobileMenuContainer.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
        });
    }
    
    if (mobileImportBtn) {
        mobileImportBtn.addEventListener('click', () => {
            dom.importFile.click();
            mobileMenuContainer.classList.remove('active');
            mobileBackdrop.classList.remove('active');
            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
        });
    }

    // Re-attach draft click handlers
    const mobileDraftsList = mobileMenuContent.querySelector('#draftsList');
    if (mobileDraftsList) {
        mobileDraftsList.addEventListener('click', (e) => {
            const draftItem = e.target.closest('.draft-item');
            if (!draftItem) return;
            
            const draftId = parseInt(draftItem.dataset.draftId);
            const draft = state.draftEntries.find(d => d.id === draftId);
            if (draft) {
                openModal('edit', draft);
                mobileMenuContainer.classList.remove('active');
                mobileBackdrop.classList.remove('active');
                if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
            }
        });
    }
}

function handleKeyboard(e) {
    if (e.key === 'Escape') {
        if (!dom.modalOverlay.classList.contains('hidden')) {
            closeModal();
        } else if (!dom.entryDetail.classList.contains('hidden')) {
            closeDetailView();
        }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
    }
}

// ============================================================================
// CATEGORY & TAG FILTERING
// ============================================================================

function handleCategoryClick(e) {
    const item = e.target.closest('.category-item');
    if (!item) return;
    
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    
    state.currentCategory = item.dataset.category;
    filterAndRender();
}

function handleTagClick(e) {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    
    const tag = chip.dataset.tag;
    
    if (state.activeTags.includes(tag)) {
        state.activeTags = state.activeTags.filter(t => t !== tag);
        chip.classList.remove('active');
    } else {
        state.activeTags.push(tag);
        chip.classList.add('active');
    }
    
    filterAndRender();
}

function handleSearch() {
    state.searchQuery = dom.searchInput.value.toLowerCase().trim();
    filterAndRender();
}

function clearSearch() {
    dom.searchInput.value = '';
    state.searchQuery = '';
    filterAndRender();
}

// ============================================================================
// FILTERING & RENDERING
// ============================================================================

function filterAndRender() {
    state.filteredEntries = state.entries.filter(entry => {
        if (state.currentCategory !== 'all' && entry.type !== state.currentCategory) {
            return false;
        }
        
        if (state.activeTags.length > 0) {
            const hasTag = state.activeTags.some(tag => entry.tags && entry.tags.includes(tag));
            if (!hasTag) return false;
        }
        
        if (state.searchQuery) {
            const searchIn = [
                entry.name,
                entry.subtitle,
                entry.designer || '',
                entry.house || '',
                ...(entry.tags || [])
            ].join(' ').toLowerCase();
            
            if (!searchIn.includes(state.searchQuery)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderList();
    updateCounts();
}

function renderList() {
    if (state.filteredEntries.length === 0) {
        dom.listScroll.innerHTML = `
            <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                <div style="font-size: 1.1rem; margin-bottom: 0.5rem;">No entries found</div>
                <div style="font-size: 0.9rem;">Try adjusting your filters or add your first entry!</div>
            </div>
        `;
        return;
    }
    
    dom.listScroll.innerHTML = state.filteredEntries.map(entry => {
        const isActive = state.selectedEntry && state.selectedEntry.id === entry.id;
        const firstImage = entry.images && entry.images.length > 0 ? entry.images[0] : null;
        // Smart tag calculation - reserve space for "+N" if needed
        const allTags = entry.tags || [];
        let displayTags = [];
        let hasMoreTags = false;
        
        if (allTags.length <= 3) {
            displayTags = allTags;
        } else if (allTags.length === 4) {
            displayTags = allTags.slice(0, 2);
            hasMoreTags = true;
        } else {
            displayTags = allTags.slice(0, 2);
            hasMoreTags = true;
        }
        
        return `
        <div class="list-item ${isActive ? 'active' : ''}" onclick="openDetailView(${entry.id})">
            <div class="item-content">
                <div class="item-left">
                    <div class="item-header">
                        <div class="item-title">${formatValue(entry.name)}</div>
                    </div>
                    <div class="item-middle">
                        <div class="item-number">#${entry.number}</div>
                        <div class="item-info">
                            <div class="item-subtitle">${formatValue(entry.subtitle)}</div>
                        </div>
                    </div>
                ${displayTags.length > 0 || hasMoreTags ? `
                    <div class="item-tags">
                        ${displayTags.map(tag => `<span class="item-tag">${tag}</span>`).join('')}
                        ${hasMoreTags ? `<span class="item-tag-more">+${entry.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
                    <div class="item-right">
                        ${firstImage ? `
                            <div class="item-image-container">
                                <img src="${firstImage}" alt="${entry.name}" class="item-image">
                                <div class="item-type-overlay">${entry.type}</div>
                            </div>
                        ` : `
                            <div class="item-image-container item-no-image">
                                <div class="item-no-image-icon">📷</div>
                                <div class="item-type-overlay">${entry.type}</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderDraftsList() {
    if (!dom.draftsList) return;
    
    if (!state.draftEntries || state.draftEntries.length === 0) {
        dom.draftsList.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                <div style="margin-bottom: 0.5rem;">📝</div>
                <div>No drafts yet</div>
                <div style="font-size: 0.75rem; margin-top: 0.25rem; opacity: 0.7;">Save a draft to see it here</div>
            </div>
        `;
        return;
    }
    
    dom.draftsList.innerHTML = state.draftEntries.map(draft => `
        <div class="draft-item" data-draft-id="${draft.id}">
            <div class="draft-title">${draft.name || 'Untitled'}</div>
            <div class="draft-type">${draft.type || 'No type'}</div>
        </div>
    `).join('');
    
    // Add click listeners
    dom.draftsList.querySelectorAll('.draft-item').forEach(item => {
        item.addEventListener('click', () => {
            const draftId = parseInt(item.dataset.draftId);
            const draft = state.draftEntries.find(d => d.id === draftId);
            if (draft) openModal('edit', draft);
        });
    });
    // Also update mobile menu drafts if on mobile
    if (window.innerWidth <= 1024) {
        const mobileMenuContent = document.getElementById('mobileMenuContent');
        const mobileDraftsList = mobileMenuContent?.querySelector('#draftsList');
        
        if (mobileDraftsList) {
            if (!state.draftEntries || state.draftEntries.length === 0) {
                mobileDraftsList.innerHTML = `
                    <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                        <div style="margin-bottom: 0.5rem;">📝</div>
                        <div>No drafts yet</div>
                    </div>
                `;
            } else {
                mobileDraftsList.innerHTML = state.draftEntries.map(draft => `
                    <div class="draft-item" data-draft-id="${draft.id}">
                        <div class="draft-title">${draft.name || 'Untitled'}</div>
                        <div class="draft-type">${draft.type || 'No type'}</div>
                    </div>
                `).join('');
                
                // Re-attach click handlers
                mobileDraftsList.querySelectorAll('.draft-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const draftId = parseInt(item.dataset.draftId);
                        const draft = state.draftEntries.find(d => d.id === draftId);
                        if (draft) {
                            openModal('edit', draft);
                            const mobileMenuContainer = document.getElementById('mobileMenuContainer');
                            const mobileBackdrop = document.getElementById('mobileBackdrop');
                            if (mobileMenuContainer) mobileMenuContainer.classList.remove('active');
                            if (mobileBackdrop) mobileBackdrop.classList.remove('active');
                            if (dom.mobileMenuBtn) dom.mobileMenuBtn.textContent = '☰';
                        }
                    });
                });
            }
        }
    }
}

// ============================================================================
// DETAIL VIEW
// ============================================================================

function openDetailView(id) {
    state.selectedEntry = state.entries.find(e => e.id === id);
    if (!state.selectedEntry) return;
    
    state.currentImageIndex = 0;
    
// Show/hide edit actions based on permissions
    if (dom.detailEditActions) {
        if (canEditEntry(state.selectedEntry)) {
            dom.detailEditActions.style.display = 'flex';
        } else {
            dom.detailEditActions.style.display = 'none';
        }
    }
    
    const fields = getEntryFields(state.selectedEntry);
    const hasImages = state.selectedEntry.images && state.selectedEntry.images.length > 0;
    
    dom.detailContent.innerHTML = `
        ${hasImages ? `
            <div class="detail-images">
                <div class="image-gallery">
                    <div class="entry-badge-overlay">
                        <div class="entry-number-badge">#${state.selectedEntry.number}</div>
                        <div class="entry-type-badge-small">${state.selectedEntry.type}</div>
                    </div>
                    <img src="${state.selectedEntry.images[0]}" alt="${state.selectedEntry.name}" class="gallery-image" id="galleryImage">
                    ${state.selectedEntry.images.length > 1 ? `
                        <button class="gallery-nav prev" onclick="prevImage()">◄</button>
                        <button class="gallery-nav next" onclick="nextImage()">►</button>
                        <div class="gallery-counter">
                            <span id="imageCounter">1</span> / ${state.selectedEntry.images.length}
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : `
            <div class="detail-header-section">
                <div class="detail-number">#${state.selectedEntry.number}</div>
                <div class="detail-title">${formatValue(state.selectedEntry.name)}</div>
                <div class="detail-subtitle">${formatValue(state.selectedEntry.subtitle)}</div>
                <div class="detail-type-badge">${state.selectedEntry.type}</div>
            </div>
        `}
        
        ${fields.length > 0 ? `
            <div class="detail-info-grid">
                ${fields.map(field => `
                    <div class="info-card">
                        <div class="info-label">${field.label}</div>
                        <div class="info-value">${formatValue(field.value)}</div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${state.selectedEntry.description ? `
            <div class="detail-section">
                <div class="detail-section-title">Description</div>
                <div class="detail-text">${state.selectedEntry.description}</div>
            </div>
        ` : ''}
        
        ${state.selectedEntry.influence ? `
            <div class="detail-section">
                <div class="detail-section-title">Cultural Influence</div>
                <div class="detail-text">${state.selectedEntry.influence}</div>
            </div>
        ` : ''}
        
        ${state.selectedEntry.techniques ? `
            <div class="detail-section">
                <div class="detail-section-title">Techniques</div>
                <div class="detail-text">${state.selectedEntry.techniques}</div>
            </div>
        ` : ''}
        
        ${state.selectedEntry.tags && state.selectedEntry.tags.length > 0 ? `
            <div class="detail-tags">
                ${state.selectedEntry.tags.map(tag => `
                    <span class="detail-tag">${tag}</span>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    // Hide card view, show detail
    dom.entryCardView.classList.add('hidden');
    dom.entryDetail.classList.remove('hidden');
    
    // Scroll to top
    setTimeout(() => {
        const detailContentEl = document.getElementById('detailContent');
        if (detailContentEl) {
            detailContentEl.scrollTop = 0;
        }
    }, 0);
    
// Show detail on mobile in overlay
    if (window.innerWidth <= 1024) {
        const mobileDetailOverlay = document.getElementById('mobileDetailOverlay');
        const mobileBackdrop = document.getElementById('mobileBackdrop');
        
        if (mobileDetailOverlay) {
            const canEdit = canEditEntry(state.selectedEntry);
            
            mobileDetailOverlay.innerHTML = `
                <div class="mobile-detail-header">
                    <button class="mobile-detail-back" onclick="closeMobileDetail()">
                        <span>◄</span>
                        <span>Back</span>
                    </button>
                    ${canEdit ? `
                        <div class="mobile-detail-actions">
                            <button class="mobile-detail-btn" onclick="editFromMobile()">✎</button>
                        </div>
                    ` : ''}
                </div>
                <div class="mobile-detail-content">
                    ${dom.detailContent.innerHTML}
                </div>
            `;
            
            mobileDetailOverlay.classList.add('active');
        }
    }
    
    renderList();
}

function closeDetailView() {
    state.selectedEntry = null;
    dom.entryDetail.classList.add('hidden');
    dom.entryCardView.classList.remove('hidden');
    
    // Close mobile detail overlay
    if (window.innerWidth <= 1024) {
        const mobileDetailOverlay = document.getElementById('mobileDetailOverlay');
        if (mobileDetailOverlay) {
            mobileDetailOverlay.classList.remove('active');
        }
    }
    
    renderList();
}

function prevImage() {
    if (!state.selectedEntry || !state.selectedEntry.images) return;
    
    state.currentImageIndex--;
    if (state.currentImageIndex < 0) {
        state.currentImageIndex = state.selectedEntry.images.length - 1;
    }
    
    updateGalleryImage();
}

function nextImage() {
    if (!state.selectedEntry || !state.selectedEntry.images) return;
    
    state.currentImageIndex++;
    if (state.currentImageIndex >= state.selectedEntry.images.length) {
        state.currentImageIndex = 0;
    }
    
    updateGalleryImage();
}

function updateGalleryImage() {
    const img = document.getElementById('galleryImage');
    const counter = document.getElementById('imageCounter');
    
    if (img) {
        img.src = state.selectedEntry.images[state.currentImageIndex];
    }
    
    if (counter) {
        counter.textContent = state.currentImageIndex + 1;
    }
}

function getEntryFields(entry) {
    const fields = [];
    const fieldMap = {
        designer: 'Designer',
        house: 'House/Brand',
        year: 'Year',
        season: 'Season',
        location: 'Location',
        nationality: 'Nationality',
        born: 'Born',
        died: 'Died',
        founded: 'Founded',
        founder: 'Founder',
        worn_by: 'Worn By',
        venue: 'Venue',
        theme: 'Theme'
    };
    
    Object.entries(fieldMap).forEach(([key, label]) => {
        if (entry[key]) {
            fields.push({ label, value: entry[key] });
        }
    });
    
    return fields;
}

// ============================================================================
// MODAL & FORM
// ============================================================================

function canEditEntry(entry) {
    if (!state.user.canEdit) return false;
    if (state.user.role === 'admin') return true;
    return entry.user_id === state.user.id;
}

function openModal(mode, entry = null) {
    if (!state.user.canEdit) {
        showToast('You must be logged in to edit entries', 'error');
        return;
    }
    
    if (mode === 'edit' && !canEditEntry(entry)) {
        showToast('You can only edit your own entries', 'error');
        return;
    }
    
    state.editingEntry = entry;
    state.uploadedImages = entry?.images ? [...entry.images] : [];
    state.uploadedImageFiles = [];
    
    if (mode === 'edit') {
        dom.modalTitle.textContent = 'Edit Entry';
        dom.submitBtn.innerHTML = '<span class="btn-glow"></span><span>Update Entry</span>';
        
        if (canEditEntry(entry)) {
            dom.deleteBtn.classList.remove('hidden');
        } else {
            dom.deleteBtn.classList.add('hidden');
        }
        
        populateForm(entry);
    } else {
        dom.modalTitle.textContent = 'New Entry';
        dom.submitBtn.innerHTML = '<span class="btn-glow"></span><span>Add Entry</span>';
        dom.deleteBtn.classList.add('hidden');
        dom.entryForm.reset();
        dom.entryType.value = '';
        dom.dynamicFields.innerHTML = '';
        state.uploadedImages = [];
        state.uploadedImageFiles = [];
        document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
    }
    
    renderImageGrid();
    dom.modalOverlay.classList.remove('hidden');
}

function closeModal() {
    dom.modalOverlay.classList.add('hidden');
    dom.entryForm.reset();
    state.editingEntry = null;
    state.uploadedImages = [];
    state.uploadedImageFiles = [];
    document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
}

function populateForm(entry) {
    document.getElementById('entryName').value = entry.name || '';
    document.getElementById('entrySubtitle').value = entry.subtitle || '';
    document.getElementById('entryTags').value = entry.tags ? entry.tags.join(', ') : '';
    document.getElementById('entryDescription').value = entry.description || '';
    document.getElementById('entryInfluence').value = entry.influence || '';
    document.getElementById('entryTechniques').value = entry.techniques || '';
    
    const typeCard = document.querySelector(`.type-card[data-type="${entry.type}"]`);
    if (typeCard) {
        typeCard.classList.add('selected');
        dom.entryType.value = entry.type;
        renderDynamicFields(entry.type, entry);
    }
}

function handleTypeSelect(e) {
    const card = e.target.closest('.type-card');
    if (!card) return;
    
    document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'));
    card.classList.add('selected');
    
    const type = card.dataset.type;
    dom.entryType.value = type;
    renderDynamicFields(type);
}

function renderDynamicFields(type, existingData = {}) {
    const templates = {
        piece: `
            <div class="form-section">
                <label class="form-label">Designer</label>
                <input type="text" class="form-input" id="designer" value="${existingData.designer || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">House/Brand</label>
                <input type="text" class="form-input" id="house" value="${existingData.house || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Year</label>
                <input type="text" class="form-input" id="year" value="${existingData.year || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Season</label>
                <input type="text" class="form-input" id="season" value="${existingData.season || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="location" value="${existingData.location || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Worn By</label>
                <input type="text" class="form-input" id="worn_by" value="${existingData.worn_by || ''}">
            </div>
        `,
        collection: `
            <div class="form-section">
                <label class="form-label">Designer</label>
                <input type="text" class="form-input" id="designer" value="${existingData.designer || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">House</label>
                <input type="text" class="form-input" id="house" value="${existingData.house || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Year</label>
                <input type="text" class="form-input" id="year" value="${existingData.year || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Season</label>
                <input type="text" class="form-input" id="season" value="${existingData.season || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="location" value="${existingData.location || ''}">
            </div>
        `,
        designer: `
            <div class="form-section">
                <label class="form-label">House/Brand</label>
                <input type="text" class="form-input" id="house" value="${existingData.house || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Nationality</label>
                <input type="text" class="form-input" id="nationality" value="${existingData.nationality || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Born</label>
                <input type="text" class="form-input" id="born" value="${existingData.born || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Died</label>
                <input type="text" class="form-input" id="died" value="${existingData.died || ''}">
            </div>
        `,
        house: `
            <div class="form-section">
                <label class="form-label">Founded</label>
                <input type="text" class="form-input" id="founded" value="${existingData.founded || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Founder</label>
                <input type="text" class="form-input" id="founder" value="${existingData.founder || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="location" value="${existingData.location || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Current Designer</label>
                <input type="text" class="form-input" id="designer" value="${existingData.designer || ''}">
            </div>
        `,
        show: `
            <div class="form-section">
                <label class="form-label">Designer/House</label>
                <input type="text" class="form-input" id="designer" value="${existingData.designer || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Season</label>
                <input type="text" class="form-input" id="season" value="${existingData.season || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Year</label>
                <input type="text" class="form-input" id="year" value="${existingData.year || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Location</label>
                <input type="text" class="form-input" id="location" value="${existingData.location || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Venue</label>
                <input type="text" class="form-input" id="venue" value="${existingData.venue || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Theme</label>
                <input type="text" class="form-input" id="theme" value="${existingData.theme || ''}">
            </div>
        `,
        trend: `
            <div class="form-section">
                <label class="form-label">Year/Era</label>
                <input type="text" class="form-input" id="year" value="${existingData.year || ''}">
            </div>
            <div class="form-section">
                <label class="form-label">Origin</label>
                <input type="text" class="form-input" id="location" value="${existingData.location || ''}">
            </div>
        `
    };
    
    dom.dynamicFields.innerHTML = templates[type] || '';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    showToast('Saving entry...', 'info');
    
    let imageUrls = [];

    if (state.editingEntry && state.editingEntry.images) {
        imageUrls = [...state.editingEntry.images];
    }

    if (state.uploadedImageFiles.length > 0) {
        const uploadedUrls = await uploadImages(state.uploadedImageFiles);
        imageUrls = [...imageUrls, ...uploadedUrls];
    }
    
    const formData = {
        name: document.getElementById('entryName').value.trim() || null,
        subtitle: document.getElementById('entrySubtitle').value.trim() || null,
        type: dom.entryType.value,
        status: 'published', 
        tags: document.getElementById('entryTags').value
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t),
        description: document.getElementById('entryDescription').value.trim() || null,
        influence: document.getElementById('entryInfluence').value.trim() || null,
        techniques: document.getElementById('entryTechniques').value.trim() || null,
        images: imageUrls
    };
    
    const dynamicInputs = dom.dynamicFields.querySelectorAll('input');
    dynamicInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            formData[input.id] = value;
        } else {
            formData[input.id] = null;
        }
    });
    
    try {
        if (state.editingEntry && state.editingEntry.status === 'published') {
            // Updating existing published entry
            formData.updated_at = new Date().toISOString();
            formData.updated_by = state.user.username;
            
            const { error } = await supabase
                .from('entries')
                .update(formData)
                .eq('id', state.editingEntry.id);
            
            if (error) throw error;
            
            showToast(`${formData.name || 'Entry'} updated`, 'success');
            addToActivityLog('Entry updated', formData.name || 'Entry', 'updated');
        } else if (state.editingEntry && state.editingEntry.status === 'draft') {
            // Publishing a draft - assign new number
            const maxNumber = state.entries.length > 0 
                ? Math.max(...state.entries.map(e => parseInt(e.number))) 
                : 0;
            
            formData.number = String(maxNumber + 1).padStart(3, '0');
            formData.updated_at = new Date().toISOString();
            formData.updated_by = state.user.username;
            
            const { error } = await supabase
                .from('entries')
                .update(formData)
                .eq('id', state.editingEntry.id);
            
            if (error) throw error;
            
            showToast(`${formData.name || 'Entry'} updated`, 'success');
            addToActivityLog('Entry updated', formData.name || 'Entry', 'updated');
        } else {
            const maxNumber = state.entries.length > 0 
                ? Math.max(...state.entries.map(e => parseInt(e.number))) 
                : 0;
            
            formData.number = String(maxNumber + 1).padStart(3, '0');
            formData.created_by = state.user.username;
            formData.user_id = state.user.id;
            formData.status = 'published';
            
            const { error } = await supabase
                .from('entries')
                .insert([formData]);
            
            if (error) throw error;
            
            showToast(`${formData.name || 'Entry'} added`, 'success');
            addToActivityLog('Entry added', formData.name || 'Entry', 'added');
        }
        
        await loadData();
        updateAll();
        renderDraftsList();
        closeModal();

        if (state.selectedEntry && state.editingEntry) {
            openDetailView(state.editingEntry.id);
        }
    } catch (error) {
        console.error('Error saving entry:', error);
        showToast('Error saving entry: ' + error.message, 'error');
    }
}

async function handleSaveDraft() {
    if (!state.user || !state.user.id) {
        showToast('You must be logged in to save drafts', 'error');
        return;
    }
    
    showToast('Saving draft...', 'info');
    
    let imageUrls = [...state.uploadedImages];
    
    if (state.uploadedImageFiles.length > 0) {
        const uploadedUrls = await uploadImages(state.uploadedImageFiles);
        imageUrls = [...imageUrls, ...uploadedUrls];
    }
    
    const formData = {
        name: document.getElementById('entryName').value.trim() || 'Untitled Draft',
        subtitle: document.getElementById('entrySubtitle').value.trim() || null,
        type: dom.entryType.value || null,
        tags: document.getElementById('entryTags').value
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t),
        description: document.getElementById('entryDescription').value.trim() || null,
        influence: document.getElementById('entryInfluence').value.trim() || null,
        techniques: document.getElementById('entryTechniques').value.trim() || null,
        images: imageUrls,
        status: 'draft',
        user_id: state.user.id
    };
    
    const dynamicInputs = dom.dynamicFields.querySelectorAll('input');
    dynamicInputs.forEach(input => {
        const value = input.value.trim();
        formData[input.id] = value || null;
    });
    
    try {
        if (state.editingEntry && state.editingEntry.status === 'draft') {
            formData.updated_at = new Date().toISOString();
            formData.updated_by = state.user.username;
            
            const { error } = await supabase
                .from('entries')
                .update(formData)
                .eq('id', state.editingEntry.id);
            
            if (error) throw error;
            
            showToast('Draft updated', 'success');
            addToActivityLog('Draft updated', formData.name, 'draft_saved');
        } else {
            formData.number = '000';
            formData.created_by = state.user.username;
            formData.created_at = new Date().toISOString();
            
            const { error } = await supabase
                .from('entries')
                .insert([formData]);
            
            if (error) throw error;
            
            showToast('Draft saved', 'success');
            addToActivityLog('Draft saved', formData.name, 'draft_saved');
        }
        
        await loadData();
        renderDraftsList();
        closeModal();
    } catch (error) {
        console.error('Error saving draft:', error);
        showToast('Error saving draft: ' + error.message, 'error');
    }
}

async function handleDelete() {
    if (!state.editingEntry) return;
    
    if (!canEditEntry(state.editingEntry)) {
        showToast('You can only delete your own entries', 'error');
        return;
    }
    
    if (!confirm(`Delete "${state.editingEntry.name}"? This cannot be undone.`)) return;
    
    const name = state.editingEntry.name;
    
    if (state.editingEntry.images && state.editingEntry.images.length > 0) {
        for (const imageUrl of state.editingEntry.images) {
            try {
                const path = imageUrl.split('/').pop().split('?')[0];
                await supabase.storage.from('styledex-images').remove([path]);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    }
    
    const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', state.editingEntry.id);
    
    if (error) {
        console.error('Error deleting entry:', error);
        showToast('Error deleting entry: ' + error.message, 'error');
        return;
    }
    
    await loadData();
    await renumberEntries();
    await loadData();

    updateAll();
    renderDraftsList();
    closeModal();
    closeDetailView();
    showToast('Entry deleted', 'success');
    addToActivityLog('Entry deleted', name, 'deleted');
}

async function renumberEntries() {
    const sortedEntries = [...state.entries].sort((a, b) => 
        parseInt(a.number) - parseInt(b.number)
    );
    
    for (let i = 0; i < sortedEntries.length; i++) {
        const newNumber = String(i + 1).padStart(3, '0');
        
        if (sortedEntries[i].number !== newNumber) {
            await supabase
                .from('entries')
                .update({ number: newNumber })
                .eq('id', sortedEntries[i].id);
        }
    }
}

// ============================================================================
// IMAGE HANDLING
// ============================================================================

function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    
    let filesProcessed = 0;
    const totalFiles = files.length;
    
    files.forEach(file => {
        state.uploadedImageFiles.push(file);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            state.uploadedImages.push(event.target.result);
            filesProcessed++;
            
            if (filesProcessed === totalFiles) {
                renderImageGrid();
            }
        };
        reader.readAsDataURL(file);
    });
    
    e.target.value = '';
}

async function uploadImages(files) {
    const uploadedUrls = [];
    
    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;
        
        const { data, error } = await supabase.storage
            .from('styledex-images')
            .upload(filePath, file);
        
        if (error) {
            console.error('Error uploading image:', error);
            showToast('Error uploading image: ' + error.message, 'error');
            continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
            .from('styledex-images')
            .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
}

function renderImageGrid() {
    if (state.uploadedImages.length === 0) {
        dom.imagePreviewGrid.innerHTML = '';
        return;
    }
    
    dom.imagePreviewGrid.innerHTML = state.uploadedImages.map((img, index) => `
        <div class="image-preview-item">
            <img src="${img}" alt="Upload ${index + 1}">
            <button type="button" class="remove-image-btn" onclick="removeImage(${index})">×</button>
        </div>
    `).join('');
}

function removeImage(index) {
    state.uploadedImages.splice(index, 1);
    
    if (index < state.uploadedImageFiles.length) {
        state.uploadedImageFiles.splice(index, 1);
    }
    
    renderImageGrid();
}

// ============================================================================
// STATS & UI UPDATES
// ============================================================================

function updateAll() {
    updateCounts();
    updateTagCloud();
}

function updateCounts() {
    dom.counterCurrent.textContent = state.entries.length;
    dom.statTotal.textContent = state.entries.length;
    dom.statFiltered.textContent = state.filteredEntries.length;
    
    ['all', 'piece', 'collection', 'designer', 'house', 'show', 'trend'].forEach(cat => {
        const count = cat === 'all' ? state.entries.length : 
                      state.entries.filter(e => e.type === cat).length;
        const el = document.getElementById('count' + cat.charAt(0).toUpperCase() + cat.slice(1));
        if (el) el.textContent = count;
    });
}

function updateTagCloud() {
    const allTags = state.entries.flatMap(e => e.tags || []);
    const uniqueTags = [...new Set(allTags)].sort();
    
    dom.tagList.innerHTML = uniqueTags.slice(0, 20).map(tag => `
        <div class="tag-chip ${state.activeTags.includes(tag) ? 'active' : ''}" data-tag="${tag}">
            ${tag}
        </div>
    `).join('');
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

function renderActivityLog() {
    if (!dom.activityScroll) return;
    
    if (state.activityLog.length === 0) {
        dom.activityScroll.innerHTML = `
            <div class="activity-empty">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
                <div>No activity yet</div>
            </div>
        `;
        return;
    }
    
    dom.activityScroll.innerHTML = state.activityLog.map(log => {
        const iconMap = {
            'added': '➕',
            'updated': '✏️',
            'deleted': '🗑️',
            'draft_saved': '💾'
        };
        
        const colorMap = {
            'added': '#4CAF50',
            'updated': '#2196F3',
            'deleted': '#F44336',
            'draft_saved': '#FF9800'
        };
        
        return `
            <div class="activity-item" style="border-left-color: ${colorMap[log.type] || '#4A9FD8'}">
                <div class="activity-icon">${iconMap[log.type] || 'ℹ️'}</div>
                <div class="activity-details">
                    <div class="activity-action">${log.action}</div>
                    <div class="activity-entry">${log.entryName}</div>
                    <div class="activity-meta">
                        <span>${log.user}</span> • <span>${log.timestamp}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
// ============================================================================
// THEME MANAGEMENT
// ============================================================================

async function loadUserTheme() {
    if (!state.user || !state.user.id || state.user.role === 'guest') {
        // Guests use default theme
        state.currentTheme = 'default';
        applyTheme('default');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('user_profiles')  // ✅ CORRECT
            .select('theme')
            .eq('id', state.user.id)
            .single();
        
        if (!error && data && data.theme) {
            state.currentTheme = data.theme;
            applyTheme(data.theme);
        } else {
            state.currentTheme = 'default';
            applyTheme('default');
        }
    } catch (error) {
        console.error('Error loading theme:', error);
        state.currentTheme = 'default';
        applyTheme('default');
    }
}
// Add this NEW function
 
async function handleStyleChange(e) {
    const style = e.target.value;
    
    if (!state.user || !state.user.id) {
        applyTheme(style);
        state.currentTheme = style;
        showToast('Style changed (not saved - sign in to save)', 'info');
        return;
    }
    
    if (state.user.role === 'guest') {
        applyTheme(style);
        state.currentTheme = style;
        showToast('Style changed (not saved for guests)', 'info');
        return;
    }
    
    if (!state.user.canEdit) {
        showToast('Only verified users can save styles', 'error');
        e.target.value = state.currentTheme;
        return;
    }
    
    if (style === state.currentTheme) return;
    
    showToast('Changing style...', 'info');
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ theme: style })
            .eq('id', state.user.id);
        
        if (error) throw error;
        
        state.currentTheme = style;
        applyTheme(style);
        
        const styleNames = {
            'default': 'Vaporwave',
            'cyberpunk': 'Cyberpunk',
            'pokedex': 'Pokédex',
            'gameboy': 'Game Boy',
            'cozy': 'Cozy'
        };
        showToast(`Style changed to ${styleNames[style]}`, 'success');
    } catch (error) {
        console.error('Error saving theme:', error);
        showToast('Error saving style: ' + error.message, 'error');
        e.target.value = state.currentTheme;
    }
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    
    // Update dropdown preview
    const styleCurrent = document.getElementById('styleCurrent');
    if (styleCurrent) {
        const previewClass = `preview-${theme}`;
        styleCurrent.innerHTML = `<div class="theme-preview ${previewClass}"></div>`;
    }
}
// ============================================================================
// IMPORT/EXPORT
// ============================================================================

async function handleExport() {
    let entriesToExport = state.entries;
    
    if (state.user.role === 'verified') {
        entriesToExport = state.entries.filter(e => e.user_id === state.user.id);
    }
    
    const data = JSON.stringify(entriesToExport, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fashiondex-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data exported', 'success');
}

async function handleImport(e) {
    if (state.user.role !== 'admin') {
        showToast('Only admins can import data', 'error');
        return;
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) {
                throw new Error('Invalid format');
            }
            
            showToast('Importing data...', 'info');
            
            for (const entry of imported) {
                entry.user_id = state.user.id;
                
                const { error } = await supabase
                    .from('entries')
                    .insert([entry]);
                
                if (error) {
                    console.error('Error importing entry:', error);
                }
            }
            
            await loadData();
            updateAll();
            showToast('Data imported', 'success');
        } catch (error) {
            showToast('Import failed. Invalid file format.', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}
// Mobile-specific helper functions
function closeMobileDetail() {
    closeDetailView();
}

function editFromMobile() {
    if (!canEditEntry(state.selectedEntry)) {
        showToast('You can only edit your own entries', 'error');
        return;
    }
    openModal('edit', state.selectedEntry);
}
// ============================================================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ============================================================================

window.openDetailView = openDetailView;
window.removeImage = removeImage;
window.prevImage = prevImage;
window.nextImage = nextImage;
window.closeMobileDetail = closeMobileDetail;
window.editFromMobile = editFromMobile;

// ============================================================================
// START APPLICATION
// ============================================================================

document.addEventListener('DOMContentLoaded', init);
