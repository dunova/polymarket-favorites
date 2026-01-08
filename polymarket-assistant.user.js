// ==UserScript==
// @name         Polymarket Favorites Assistant
// @namespace    https://polymarket.com/
// @version      1.0.0
// @description  收藏市场和交易者，支持备注、标签、筛选和排序 | Track markets and traders with notes, tags, filters and sorting
// @author       Polymarket Toolbox
// @match        https://polymarket.com/*
// @match        https://*.polymarket.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @icon         https://polymarket.com/favicon.ico
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==================== LANGUAGE SYSTEM ====================
    let currentLang = GM_getValue('pm_lang', 'zh'); // Default: 中文

    const i18n = {
        zh: {
            favorites: '收藏',
            markets: '市场',
            traders: '交易者',
            favorite: '收藏',
            favorited: '已收藏',
            all: '全部',
            latest: '最新',
            oldest: '最早',
            nameSort: '名称',
            noTags: '无标签',
            noMarkets: '暂无收藏的市场',
            noTraders: '暂无收藏的交易者',
            editDetails: '编辑详情',
            noteName: '备注名称',
            inputName: '输入自定义名称...',
            tags: '标签分类',
            tagsPlaceholder: '例如: 巨鲸, 关注, 高风险...',
            tagsHelper: '使用空格分隔多个标签',
            search: '搜索',
            searchPlaceholder: '搜索市场和交易者...',
            cancel: '取消',
            save: '保存',
            marketFavorited: '市场已收藏',
            marketUnfavorited: '已取消收藏市场',
            traderFavorited: '交易者已收藏',
            traderUnfavorited: '已取消收藏交易者',
            saved: '保存成功',
            trader: 'Trader',
            exportData: '导出数据',
            importData: '导入数据',
            exportSuccess: '数据已导出',
            importSuccess: '数据导入成功',
            importError: '导入失败：文件格式错误',
            confirmImport: '确定要导入数据吗？这将与现有数据合并。'
        },
        en: {
            favorites: 'Favorites',
            markets: 'Markets',
            traders: 'Traders',
            favorite: 'Favorite',
            favorited: 'Favorited',
            all: 'All',
            latest: 'Latest',
            oldest: 'Oldest',
            nameSort: 'A-Z',
            noTags: 'No Tags',
            noMarkets: 'No favorited markets yet',
            noTraders: 'No favorited traders yet',
            editDetails: 'Edit Details',
            noteName: 'Custom Name',
            inputName: 'Enter custom name...',
            tags: 'Tags',
            tagsPlaceholder: 'e.g: Whale, Watch, High Risk...',
            tagsHelper: 'Separate multiple tags with spaces',
            search: 'Search',
            searchPlaceholder: 'Search markets and traders...',
            cancel: 'Cancel',
            save: 'Save',
            marketFavorited: 'Market favorited',
            marketUnfavorited: 'Market unfavorited',
            traderFavorited: 'Trader favorited',
            traderUnfavorited: 'Trader unfavorited',
            saved: 'Saved successfully',
            trader: 'Trader',
            exportData: 'Export Data',
            importData: 'Import Data',
            exportSuccess: 'Data exported',
            importSuccess: 'Data imported successfully',
            importError: 'Import failed: invalid file format',
            confirmImport: 'Import data? This will merge with existing data.'
        }
    };

    function t(key) {
        return i18n[currentLang][key] || key;
    }

    function toggleLang() {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        GM_setValue('pm_lang', currentLang);
        updateLanguage();
    }

    function updateLanguage() {
        // Update panel if it exists
        const panelTitle = document.querySelector('.pm-panel-title span');
        if (panelTitle) panelTitle.textContent = t('favorites');

        // Update tabs
        const marketTab = document.querySelector('[data-tab="markets"]');
        if (marketTab) {
            const count = marketTab.querySelector('.pm-badge').textContent;
            marketTab.innerHTML = `${t('markets')} <span class="pm-badge">${count}</span>`;
        }
        const traderTab = document.querySelector('[data-tab="traders"]');
        if (traderTab) {
            const count = traderTab.querySelector('.pm-badge').textContent;
            traderTab.innerHTML = `${t('traders')} <span class="pm-badge">${count}</span>`;
        }

        // Update sort options
        const sortSelect = document.getElementById('pm-sort-select');
        if (sortSelect) {
            const currentValue = sortSelect.value;
            sortSelect.innerHTML = `
                <option value="newest">${t('latest')}</option>
                <option value="oldest">${t('oldest')}</option>
                <option value="name">${t('nameSort')}</option>
            `;
            sortSelect.value = currentValue;
        }

        // Update language switch button
        const langBtn = document.getElementById('pm-lang-switch');
        if (langBtn) langBtn.textContent = currentLang === 'zh' ? 'EN' : '中';

        // Update modal
        const modalTitle = document.querySelector('.pm-modal-title');
        if (modalTitle) modalTitle.textContent = t('editDetails');

        const labels = document.querySelectorAll('.pm-modal-label');
        if (labels[0]) labels[0].textContent = t('noteName');
        if (labels[1]) labels[1].textContent = t('tags');

        const nameInput = document.getElementById('pm-edit-name');
        if (nameInput) nameInput.placeholder = t('inputName');

        const tagsInput = document.getElementById('pm-edit-tags');
        if (tagsInput) tagsInput.placeholder = t('tagsPlaceholder');

        const helper = document.querySelector('.pm-modal-helper');
        if (helper) helper.textContent = t('tagsHelper');

        const cancelBtn = document.getElementById('pm-edit-cancel');
        if (cancelBtn) cancelBtn.textContent = t('cancel');

        const saveBtn = document.getElementById('pm-edit-save');
        if (saveBtn) saveBtn.textContent = t('save');

        // Re-render lists
        renderAll();
    }

    // ==================== PREMIUM STYLES ====================
    const styles = `
        :root {
            --pm-bg-glass: rgba(22, 27, 34, 0.95);
            --pm-border: #30363d;
            --pm-hover: #21262d;
            --pm-text-primary: #e6edf3;
            --pm-text-secondary: #8b949e;
            --pm-accent: #2e7afb;
            --pm-accent-hover: #1a62d8;
            --pm-success: #3fb950;
            --pm-danger: #f85149;
            --pm-warning: #d29922;
        }

        #pm-assistant-toolbar {
            position: fixed;
            bottom: 30px;
            right: 30px;
            display: flex;
            gap: 12px;
            z-index: 2147483647;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            pointer-events: none;
        }

        #pm-assistant-toolbar > * {
            pointer-events: auto;
        }

        .pm-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 44px;
            padding: 0 16px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 22px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
            backdrop-filter: blur(8px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
            color: white;
            position: relative;
            overflow: hidden;
        }

        .pm-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }
        
        .pm-btn:active { transform: scale(0.96); }

        .pm-btn-panel {
            background: var(--pm-bg-glass);
            border-color: var(--pm-border);
            width: 44px;
            padding: 0;
        }

        .pm-btn-panel:hover {
            border-color: var(--pm-text-secondary);
            background: #2d333b;
        }

        .pm-btn-action {
            background: var(--pm-bg-glass);
        }

        .pm-btn-action.favorited {
            background: var(--pm-accent);
            border-color: transparent;
        }

        .pm-btn svg { width: 20px; height: 20px; }

        /* Modern Toast */
        #pm-toast {
            position: fixed;
            bottom: 90px;
            right: 30px;
            padding: 12px 24px;
            background: rgba(22, 27, 34, 0.95);
            color: white;
            border: 1px solid var(--pm-border);
            border-left: 4px solid var(--pm-accent);
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 2147483647;
            opacity: 0;
            transform: translateX(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            font-family: 'Inter', sans-serif;
        }

        #pm-toast.show {
            opacity: 1;
            transform: translateX(0) scale(1);
        }

        /* Premium Panel */
        #pm-panel {
            position: fixed;
            top: 70px;
            right: 30px;
            width: 400px;
            height: calc(100vh - 120px);
            max-height: 800px;
            background: var(--pm-bg-glass);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            z-index: 2147483646;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
            font-family: 'Inter', -apple-system, sans-serif;
            backdrop-filter: blur(20px);
            opacity: 0;
            transform: translateX(20px);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #pm-panel.show { 
            opacity: 1; 
            transform: translateX(0);
            pointer-events: auto;
        }

        /* Panel Header */
        .pm-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--pm-border);
            background: rgba(13, 17, 23, 0.8);
        }

        .pm-panel-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--pm-text-primary);
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.01em;
        }
        
        .pm-logo-icon {
            width: 28px;
            height: 28px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .pm-logo-icon svg {
            width: 24px;
            height: 24px;
        }
        
        .pm-header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .pm-header-btn {
            background: transparent;
            border: 1px solid var(--pm-border);
            color: var(--pm-text-secondary);
            padding: 6px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .pm-header-btn:hover {
            border-color: var(--pm-accent);
            color: var(--pm-accent);
        }
        
        .pm-lang-switch {
            background: transparent;
            border: 1px solid var(--pm-border);
            color: var(--pm-text-secondary);
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
        }
        
        .pm-lang-switch:hover {
            border-color: var(--pm-accent);
            color: var(--pm-accent);
        }

        .pm-panel-close {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--pm-text-secondary);
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
        }

        .pm-panel-close:hover { background: rgba(255,255,255,0.1); color: white; }

        /* Tabs */
        .pm-panel-tabs {
            display: flex;
            background: rgba(13, 17, 23, 0.5);
            padding: 4px;
            margin: 16px 20px 0;
            border-radius: 8px;
            border: 1px solid var(--pm-border);
        }

        .pm-panel-tab {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            border: none;
            border-radius: 6px;
            color: var(--pm-text-secondary);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .pm-panel-tab:hover { color: var(--pm-text-primary); }
        .pm-panel-tab.active { 
            background: var(--pm-hover); 
            color: var(--pm-text-primary);
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        .pm-badge {
            background: rgba(48, 54, 61, 0.8);
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 11px;
            min-width: 18px;
            text-align: center;
        }
        
        .pm-panel-tab.active .pm-badge { background: #000; }
        
        /* Filters */
        .pm-panel-filters {
            padding: 12px 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .pm-sort-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .pm-sort-select {
            background: transparent;
            border: none;
            color: var(--pm-text-secondary);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            outline: none;
            text-align: right;
        }
        .pm-sort-select:hover { color: var(--pm-text-primary); }
        
        .pm-tag-filters {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            max-height: 54px;
            overflow-y: auto;
        }
        
        .pm-filter-tag {
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 12px;
            background: rgba(48, 54, 61, 0.5);
            color: var(--pm-text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        
        .pm-filter-tag:hover { background: var(--pm-hover); color: var(--pm-text-primary); }
        .pm-filter-tag.active { 
            background: rgba(46, 122, 251, 0.15); 
            color: var(--pm-accent); 
            border-color: rgba(46, 122, 25251, 0.3);
        }

        /* Content Area */
        .pm-panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 0 20px 20px;
        }

        .pm-tab-content { display: none; margin-top: 10px; animation: fadeIn 0.2s ease; }
        .pm-tab-content.active { display: block; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        /* Modern Cards */
        .pm-card {
            background: rgba(33, 38, 45, 0.6);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }

        .pm-card:hover { 
            border-color: var(--pm-accent); 
            background: rgba(33, 38, 45, 0.9);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .pm-card-inner {
            display: flex;
            gap: 12px;
        }

        .pm-card-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: #2d333b;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }

        .pm-card-icon img { width: 100%; height: 100%; object-fit: cover; }
        .pm-card-icon svg { width: 22px; height: 22px; stroke: #6e7681; }

        .pm-card-info { flex: 1; min-width: 0; }

        .pm-card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--pm-text-primary);
            margin-bottom: 4px;
            line-height: 1.4;
            padding-right: 60px;
        }
        
        .pm-card-note {
            font-size: 11px;
            color: var(--pm-text-secondary);
            margin-bottom: 6px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            padding-right: 60px;
        }

        .pm-card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
        }
        
        .pm-card-tag {
            font-size: 10px;
            padding: 2px 7px;
            border-radius: 6px;
            background: rgba(46, 122, 251, 0.1);
            color: var(--pm-accent);
            font-weight: 500;
        }

        .pm-card-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        
        .pm-prices {
            display: flex;
            gap: 12px;
            font-size: 12px;
            font-weight: 600;
            font-family: 'Roboto Mono', monospace;
        }

        .pm-price-yes { color: var(--pm-success); }
        .pm-price-no { color: var(--pm-danger); }

        .pm-card-actions {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .pm-card:hover .pm-card-actions { opacity: 1; }

        .pm-card-btn-small {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.4);
            border: none;
            color: var(--pm-text-primary);
            cursor: pointer;
            border-radius: 6px;
            backdrop-filter: blur(4px);
        }

        .pm-card-btn-small:hover { background: var(--pm-accent); }
        .pm-card-btn-small.delete:hover { background: var(--pm-danger); }

        /* Empty State */
        .pm-empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--pm-text-secondary);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .pm-empty-icon {
            width: 56px;
            height: 56px;
            opacity: 0.2;
            color: var(--pm-text-primary);
        }

        /* Edit Modal */
        #pm-edit-modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(8px);
            z-index: 2147483648;
            display: none;
            align-items: center;
            justify-content: center;
        }

        #pm-edit-modal.show { display: flex; animation: fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        
        @keyframes fadeInModal { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

        .pm-modal-content {
            background: #161b22;
            border: 1px solid var(--pm-border);
            border-radius: 16px;
            padding: 24px;
            width: 420px;
            max-width: 90%;
            box-shadow: 0 32px 64px rgba(0, 0, 0, 0.6);
        }

        .pm-modal-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--pm-text-primary);
            margin-bottom: 20px;
        }

        .pm-modal-input {
            width: 100%;
            padding: 12px 16px;
            background: #0d1117;
            border: 1px solid var(--pm-border);
            border-radius: 8px;
            color: var(--pm-text-primary);
            font-size: 14px;
            margin-bottom: 16px;
            transition: border 0.2s;
            font-family: inherit;
        }

        .pm-modal-input:focus { outline: none; border-color: var(--pm-accent); box-shadow: 0 0 0 3px rgba(46, 122, 251, 0.2); }
        
        .pm-modal-label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--pm-text-secondary);
        }
        
        .pm-modal-helper {
            font-size: 12px;
            color: #6e7681;
            margin-top: -10px;
            margin-bottom: 20px;
        }

        .pm-modal-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 8px;
        }

        .pm-modal-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .pm-modal-btn.cancel {
            background: transparent;
            color: var(--pm-text-secondary);
            border: 1px solid var(--pm-border);
        }
        
        .pm-modal-btn.cancel:hover { border-color: var(--pm-text-primary); color: var(--pm-text-primary); }

        .pm-modal-btn.primary {
            background: var(--pm-accent);
            color: white;
            box-shadow: 0 4px 12px rgba(46, 122, 251, 0.3);
        }

        .pm-modal-btn.primary:hover { background: var(--pm-accent-hover); transform: translateY(-1px); }
        
        /* Inline Edit Styles */
        .pm-card-editing {
            background: rgba(46, 122, 251, 0.05) !important;
            border-color: var(--pm-accent) !important;
        }
        .pm-inline-input {
            background: rgba(13, 17, 23, 0.8);
            border: 1px solid var(--pm-border);
            border-radius: 6px;
            padding: 8px 12px;
            color: var(--pm-text-primary);
            font-size: 13px;
            outline: none;
            font-family: inherit;
            transition: border 0.2s;
        }
        .pm-inline-input:focus {
            border-color: var(--pm-accent);
            box-shadow: 0 0 0 2px rgba(46, 122, 251, 0.15);
        }

        
        /* Custom Scrollbar */
        .pm-panel-content::-webkit-scrollbar { width: 5px; }
        .pm-panel-content::-webkit-scrollbar-track { background: transparent; }
        .pm-panel-content::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        .pm-panel-content::-webkit-scrollbar-thumb:hover { background: #58a6ff; }
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // ==================== DATA ====================
    let favoriteMarkets = JSON.parse(GM_getValue('pm_fav_markets', '[]'));
    let favoriteTraders = JSON.parse(GM_getValue('pm_fav_traders', '[]'));

    // Migration: Ensure all items have required fields
    favoriteMarkets.forEach(m => {
        if (!m.tags) m.tags = [];
        if (m.customName === undefined) m.customName = '';
    });
    favoriteTraders.forEach(t => {
        if (!t.tags) t.tags = [];
        if (t.customName === undefined) t.customName = '';
    });

    // Save after migration
    saveMarkets();
    saveTraders();

    // State
    let editingItem = null;
    let activeTab = 'markets';
    let activeFilterTag = null;
    let activeSort = 'newest';

    function saveMarkets() {
        GM_setValue('pm_fav_markets', JSON.stringify(favoriteMarkets));
    }

    function saveTraders() {
        GM_setValue('pm_fav_traders', JSON.stringify(favoriteTraders));
    }

    // ==================== EXPORT/IMPORT ====================
    function exportData() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            markets: favoriteMarkets,
            traders: favoriteTraders
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `polymarket-favorites-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(t('exportSuccess'));
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (!data.markets || !data.traders) {
                        showToast(t('importError'));
                        return;
                    }

                    if (!confirm(t('confirmImport'))) return;

                    // Merge data (avoid duplicates by id)
                    const existingMarketIds = new Set(favoriteMarkets.map(m => m.id));
                    const existingTraderIds = new Set(favoriteTraders.map(t => t.id || t.address));

                    data.markets.forEach(m => {
                        if (!existingMarketIds.has(m.id)) {
                            favoriteMarkets.push(m);
                        }
                    });

                    data.traders.forEach(t => {
                        const tid = t.id || t.address;
                        if (!existingTraderIds.has(tid)) {
                            favoriteTraders.push(t);
                        }
                    });

                    saveMarkets();
                    saveTraders();
                    renderAll();
                    showToast(t('importSuccess'));
                } catch (err) {
                    console.error('[PM] Import error:', err);
                    showToast(t('importError'));
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    window.pmExportData = exportData;
    window.pmImportData = importData;

    // ==================== INIT ====================
    function init() {

        // Global event delegation for edit/delete/save buttons
        document.addEventListener('click', function (e) {
            const editBtn = e.target.closest('.pm-edit-btn');
            if (editBtn) {
                e.stopPropagation();
                const type = editBtn.dataset.type;
                const index = parseInt(editBtn.dataset.index);
                console.log('[PM] Edit clicked:', type, index);
                window.pmOpenEdit(type, index);
                return;
            }

            const deleteBtn = e.target.closest('.pm-delete-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const type = deleteBtn.dataset.type;
                const index = parseInt(deleteBtn.dataset.index);
                console.log('[PM] Delete clicked:', type, index);
                if (type === 'market') {
                    window.pmRemoveMarket(index);
                } else {
                    window.pmRemoveTrader(index);
                }
                return;
            }

            // Save button - CSP compliant event delegation
            const saveBtn = e.target.closest('.pm-inline-save-btn');
            if (saveBtn) {
                e.stopPropagation();
                e.preventDefault();
                console.log('[PM] Save button clicked via delegation');
                window.saveInlineEdit();
                return;
            }
        }, true);

        // Global keydown handler for Enter key in inline inputs - CSP compliant
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                const input = e.target.closest('.pm-inline-input');
                if (input) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[PM] Enter pressed in inline input');
                    window.saveInlineEdit();
                }
            }
        }, true);

        injectPanel();
        // injectEditModal(); // Removed - using inline editing
        checkPageContext();
        observeNavigation();
    }

    function isMarketPage() {
        return location.pathname.includes('/event/') || location.pathname.includes('/market/');
    }

    function isProfilePage() {
        return location.pathname.includes('/@') || location.pathname.includes('/profile/');
    }

    function checkPageContext() {
        removeToolbar();
        if (isMarketPage()) {
            injectMarketToolbar();
        } else if (isProfilePage()) {
            injectProfileToolbar();
        } else {
            injectGlobalToolbar();
        }
    }

    function observeNavigation() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(checkPageContext, 1000);
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    function removeToolbar() {
        const toolbar = document.getElementById('pm-assistant-toolbar');
        if (toolbar) toolbar.remove();
    }

    // ==================== TOOLBARS ====================
    function injectMarketToolbar() {
        const toolbar = createBaseToolbar();
        const favBtn = document.createElement('button');
        favBtn.id = 'pm-fav-market-btn';
        favBtn.className = 'pm-btn pm-btn-action';
        favBtn.innerHTML = `
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span>${t('favorite')}</span>
        `;
        favBtn.onclick = handleFavoriteMarket;
        toolbar.appendChild(favBtn);
        document.body.appendChild(toolbar);
        updateMarketButton();
    }

    function injectProfileToolbar() {
        const toolbar = createBaseToolbar();
        const favBtn = document.createElement('button');
        favBtn.id = 'pm-fav-trader-btn';
        favBtn.className = 'pm-btn pm-btn-action';
        favBtn.innerHTML = `
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            <span>${t('favorite')}</span>
        `;
        favBtn.onclick = handleFavoriteCurrentTrader;
        toolbar.appendChild(favBtn);
        document.body.appendChild(toolbar);
        updateTraderButton();
    }

    function injectGlobalToolbar() {
        const toolbar = createBaseToolbar();
        document.body.appendChild(toolbar);
    }

    function createBaseToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'pm-assistant-toolbar';
        const panelBtn = document.createElement('button');
        panelBtn.id = 'pm-panel-btn';
        panelBtn.className = 'pm-btn pm-btn-panel';
        panelBtn.title = t('favorites');
        panelBtn.innerHTML = `
            <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
        `;
        panelBtn.onclick = togglePanel;
        toolbar.appendChild(panelBtn);
        return toolbar;
    }

    // ==================== PANEL ====================
    function injectPanel() {
        if (document.getElementById('pm-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'pm-panel';
        panel.innerHTML = `
            <div class="pm-panel-header">
                <div class="pm-panel-title">
                    <span>${t('favorites')}</span>
                </div>
                <div class="pm-header-actions">
                    <button class="pm-header-btn" id="pm-export-btn" title="${t('exportData')}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                    <button class="pm-header-btn" id="pm-import-btn" title="${t('importData')}">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </button>
                    <button class="pm-lang-switch" id="pm-lang-switch">${currentLang === 'zh' ? 'EN' : '中'}</button>
                    <button class="pm-panel-close" id="pm-panel-close">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="pm-panel-tabs">
                <button class="pm-panel-tab active" data-tab="markets">
                    ${t('markets')} <span class="pm-badge" id="pm-market-count">0</span>
                </button>
                <button class="pm-panel-tab" data-tab="traders">
                    ${t('traders')} <span class="pm-badge" id="pm-trader-count">0</span>
                </button>
            </div>
            
            <div class="pm-panel-filters">
                <div style="margin-bottom: 12px;">
                    <input type="text" id="pm-search-input" placeholder="${t('searchPlaceholder')}" style="width: 100%; padding: 8px 12px; background: rgba(13, 17, 23, 0.6); border: 1px solid var(--pm-border); border-radius: 6px; color: var(--pm-text-primary); font-size: 13px; outline: none;" />
                </div>
                <div class="pm-sort-row">
                    <div class="pm-tag-filters" id="pm-tag-filters"></div>
                    <select id="pm-sort-select" class="pm-sort-select">
                        <option value="newest">${t('latest')}</option>
                        <option value="oldest">${t('oldest')}</option>
                        <option value="name">${t('nameSort')}</option>
                    </select>
                </div>
            </div>
            
            <div class="pm-panel-content">
                <div class="pm-tab-content active" id="pm-tab-markets"></div>
                <div class="pm-tab-content" id="pm-tab-traders"></div>
            </div>
        `;
        document.body.appendChild(panel);

        // Event Listeners
        document.getElementById('pm-panel-close').onclick = () => panel.classList.remove('show');
        document.getElementById('pm-lang-switch').onclick = toggleLang;
        document.getElementById('pm-export-btn').onclick = exportData;
        document.getElementById('pm-import-btn').onclick = importData;

        // Search functionality
        let searchQuery = '';
        const searchInput = document.getElementById('pm-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                searchQuery = e.target.value.toLowerCase();
                renderAll();
            };
            // Make searchQuery accessible to getProcessedList
            window.pmSearchQuery = '';
            searchInput.oninput = (e) => {
                window.pmSearchQuery = e.target.value.toLowerCase();
                renderAll();
            };
        }
        document.getElementById('pm-sort-select').onchange = (e) => {
            activeSort = e.target.value;
            renderAll();
        };

        panel.querySelectorAll('.pm-panel-tab').forEach(tab => {
            tab.onclick = () => {
                panel.querySelectorAll('.pm-panel-tab').forEach(t => t.classList.remove('active'));
                panel.querySelectorAll('.pm-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('pm-tab-' + tab.dataset.tab).classList.add('active');
                activeTab = tab.dataset.tab;
                activeFilterTag = null;
                renderAll();
            };
        });

        renderAll();
    }

    function togglePanel() {
        const panel = document.getElementById('pm-panel');
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) {
            renderAll();
        }
    }

    // ==================== EDIT MODAL ====================
    function injectEditModal() {
        if (document.getElementById('pm-edit-modal')) return; // FIX: Prevent duplicate injection

        const modal = document.createElement('div');
        modal.id = 'pm-edit-modal';
        modal.innerHTML = `
            <div class="pm-modal-content">
                <div class="pm-modal-title">${t('editDetails')}</div>
                
                <label class="pm-modal-label">${t('noteName')}</label>
                <input type="text" class="pm-modal-input" id="pm-edit-name" placeholder="${t('inputName')}">
                
                <label class="pm-modal-label">${t('tags')}</label>
                <input type="text" class="pm-modal-input" id="pm-edit-tags" placeholder="${t('tagsPlaceholder')}">
                <div class="pm-modal-helper">${t('tagsHelper')}</div>

                <div class="pm-modal-actions">
                    <button class="pm-modal-btn cancel" id="pm-edit-cancel">${t('cancel')}</button>
                    <button class="pm-modal-btn primary" id="pm-edit-save">${t('save')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.onclick = (e) => { if (e.target === modal) hideEditModal(); };
        document.getElementById('pm-edit-cancel').onclick = hideEditModal;
        document.getElementById('pm-edit-save').onclick = saveEdit;
        document.getElementById('pm-edit-name').onkeydown = (e) => { if (e.key === 'Enter') saveEdit(); };
        document.getElementById('pm-edit-tags').onkeydown = (e) => { if (e.key === 'Enter') saveEdit(); };
    }

    // Tag color palette
    // Solid, muted tag colors - professional palette
    const tagColors = [
        '#FF6B6B',  // Coral red - 热情
        '#4ECDC4',  // Turquoise - 清新
        '#45B7D1',  // Sky blue - 专业
        '#FFA07A',  // Light salmon - 温暖
        '#98D8C8',  // Mint - 宁静
        '#F7DC6F',  // Yellow - 活力
        '#BB8FCE',  // Purple - 优雅
        '#85C1E2',  // Light blue - 清爽
        '#F8B88B',  // Peach - 柔和
        '#B8E994',  // Light green - 自然
        '#FAD7A0',  // Sand - 稳重
        '#D7BDE2'   // Lavender - 浪漫
    ];

    function getTagColor(tag) {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % tagColors.length;
        return tagColors[colorIndex]; // Returns hex color string
    }

    // Inline editing state
    let currentlyEditing = null;
    let saveTimeout = null;

    window.pmOpenEdit = function (type, idx) {
        // If already editing same item, do nothing
        if (currentlyEditing && currentlyEditing.type === type && currentlyEditing.idx === idx) {
            return;
        }
        // If editing different item, save first
        if (currentlyEditing) {
            doSaveInlineEdit();
        }
        currentlyEditing = { type, idx };
        renderAll();
        // Focus the name input after render
        setTimeout(() => {
            const input = document.getElementById(`pm-inline-name-${type}-${idx}`);
            if (input) input.focus();
        }, 50);
    };

    function doSaveInlineEdit() {
        if (!currentlyEditing) {
            return false;
        }

        const { type, idx } = currentlyEditing;
        console.log('[PM] Saving:', type, idx);

        const nameInput = document.getElementById(`pm-inline-name-${type}-${idx}`);
        const tagsInput = document.getElementById(`pm-inline-tags-${type}-${idx}`);

        if (!nameInput || !tagsInput) {
            console.error('[PM] Inputs not found');
            currentlyEditing = null;
            return false;
        }

        const list = type === 'market' ? favoriteMarkets : favoriteTraders;
        const item = list[idx];

        if (!item) {
            console.error('[PM] Item not found');
            currentlyEditing = null;
            return false;
        }

        item.customName = nameInput.value.trim();
        const tagsVal = tagsInput.value.trim();
        item.tags = tagsVal ? [...new Set(tagsVal.split(/[,，\s]+/).filter(t => t.length > 0))] : [];

        console.log('[PM] Saved:', item.customName, item.tags);

        // Save to GM storage
        if (type === 'market') {
            GM_setValue('pm_fav_markets', JSON.stringify(favoriteMarkets));
        } else {
            GM_setValue('pm_fav_traders', JSON.stringify(favoriteTraders));
        }

        return true;
    }

    function saveInlineEdit() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            if (doSaveInlineEdit()) {
                currentlyEditing = null;
                renderAll();
                showToast(t('saved'));
            }
        }, 100);
    }

    // Expose for inline event handlers
    window.saveInlineEdit = saveInlineEdit;
    window.doSaveInlineEdit = doSaveInlineEdit;

    // ==================== RENDERING ====================

    function renderAll() {
        renderFilters();
        if (activeTab === 'markets') renderMarkets();
        else renderTraders();
    }

    function renderFilters() {
        const container = document.getElementById('pm-tag-filters');
        if (!container) return;

        const list = activeTab === 'markets' ? favoriteMarkets : favoriteTraders;
        const allTags = new Set();
        list.forEach(item => {
            if (item.tags && Array.isArray(item.tags)) {
                item.tags.forEach(t => allTags.add(t));
            }
        });

        if (allTags.size === 0) {
            container.innerHTML = `<span style="font-size:11px;color:#8b949e">${t('noTags')}</span>`;
            activeFilterTag = null;
            return;
        }

        let html = `<div class="pm-filter-tag ${!activeFilterTag ? 'active' : ''}" data-tag="" >${t('all')}</div>`;
        Array.from(allTags).sort().forEach(tag => {
            html += `<div class="pm-filter-tag ${activeFilterTag === tag ? 'active' : ''}" data-tag="${tag}">${tag}</div>`;
        });
        container.innerHTML = html;

        // Add event listeners to the newly rendered tags
        container.querySelectorAll('.pm-filter-tag').forEach(tagEl => {
            tagEl.onclick = () => {
                const tag = tagEl.dataset.tag === '' ? null : tagEl.dataset.tag;
                window.pmFilter(tag);
            };
        });
    }

    window.pmFilter = function (tag) {
        activeFilterTag = tag;
        renderAll();
    };

    function getProcessedList(list) {
        let processed = list.map((item, index) => ({ ...item, originalIndex: index }));

        // Search filter
        const searchQuery = window.pmSearchQuery || '';
        if (searchQuery) {
            processed = processed.filter(item => {
                const name = (item.customName || item.title || item.username || '').toLowerCase();
                const tags = (item.tags || []).join(' ').toLowerCase();
                return name.includes(searchQuery) || tags.includes(searchQuery);
            });
        }

        // Tag filter
        if (activeFilterTag) {
            processed = processed.filter(item => item.tags && item.tags.includes(activeFilterTag));
        }

        // Sort
        processed.sort((a, b) => {
            if (activeSort === 'newest') return (b.savedAt || 0) - (a.savedAt || 0);
            if (activeSort === 'oldest') return (a.savedAt || 0) - (b.savedAt || 0);
            if (activeSort === 'name') {
                const nameA = a.customName || a.title || a.username || '';
                const nameB = b.customName || b.title || b.username || '';
                return nameA.localeCompare(nameB);
            }
            return 0;
        });
        return processed;
    }

    // ==================== MARKETS ====================
    function renderMarkets() {
        const container = document.getElementById('pm-tab-markets');
        const countEl = document.getElementById('pm-market-count');
        if (!container) return;

        countEl.textContent = favoriteMarkets.length;
        const displayList = getProcessedList(favoriteMarkets);

        if (displayList.length === 0) {
            container.innerHTML = `
                <div class="pm-empty">
                    <svg class="pm-empty-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                    </svg>
                    <p>${t('noMarkets')}</p>
                </div>`;
            return;
        }

        container.innerHTML = displayList.map(m => {
            const isEditing = currentlyEditing && currentlyEditing.type === 'market' && currentlyEditing.idx === m.originalIndex;

            if (isEditing) {
                // INLINE EDIT MODE
                return `
            <div class="pm-card pm-card-editing" onclick="event.stopPropagation()">
                <div class="pm-card-inner">
                    <div class="pm-card-icon">
                        ${m.icon ? `<img src="${m.icon}" alt="Market">` : `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                        </svg>`}
                    </div>
                    <div class="pm-card-info" style="flex: 1;">
                        <input type="text" 
                            id="pm-inline-name-market-${m.originalIndex}"
                            class="pm-inline-input"
                            value="${m.customName || m.title || ''}"
                            placeholder="${t('inputName')}"
                            style="width: 100%; margin-bottom: 8px;" />
                        <input type="text"
                            id="pm-inline-tags-market-${m.originalIndex}"
                            class="pm-inline-input"
                            value="${(m.tags || []).join(' ')}"
                            placeholder="${t('tagsPlaceholder')}"
                            style="width: 100%; margin-bottom: 4px;" />
                        <div style="font-size: 11px; color: #8b949e; margin-bottom: 8px;">${t('tagsHelper')}</div>
                        <button class="pm-inline-save-btn" style="background: #2e7afb; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            ${t('save')}
                        </button>
                    </div>
                </div>
            </div>`;
            }

            // NORMAL DISPLAY MODE

            const displayName = (m.customName && m.customName.trim()) ? m.customName : (m.title || '未知市场');
            const showOriginal = m.customName && m.customName.trim() && m.title;
            const tagsHtml = (m.tags || []).map(t => {
                const color = getTagColor(t);
                return `<span class="pm-card-tag" style="background: ${color}; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${t}</span>`;
            }).join('');

            return `
            <div class="pm-card" onclick="window.open('${m.url}', '_blank')">
                <div class="pm-card-inner">
                    <div class="pm-card-icon">
                        ${m.icon ? `<img src="${m.icon}" onerror="this.style.display='none'">` :
                    `<svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                        </svg>`}
                    </div>
                    <div class="pm-card-info">
                        <div class="pm-card-title">${displayName}</div>
                        ${showOriginal ? `<div class="pm-card-note">${m.title}</div>` : ''}
                        ${tagsHtml ? `<div class="pm-card-tags">${tagsHtml}</div>` : ''}
                        <div class="pm-card-meta">
                            <div class="pm-prices">
                                <span class="pm-price-yes">Yes: ${m.yesPrice}¢</span>
                                <span class="pm-price-no">No: ${m.noPrice}¢</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pm-card-actions">
                    <button class="pm-card-btn-small pm-edit-btn" data-type="market" data-index="${m.originalIndex}" title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                    </button>
                    <button class="pm-card-btn-small delete pm-delete-btn" data-type="market" data-index="${m.originalIndex}" title="Delete">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    function extractMarketData() {
        const url = location.href.split('?')[0];
        const pathParts = location.pathname.split('/');
        const slug = pathParts[pathParts.indexOf('event') + 1] || pathParts.pop();
        const title = document.querySelector('h1')?.textContent || document.title.replace(' | Polymarket', '');
        let yesPrice = '--', noPrice = '--';
        document.querySelectorAll('button').forEach(btn => {
            const text = btn.textContent;
            const match = text.match(/(\d+(?:\.\d+)?)¢/);
            if (match) {
                if (text.includes('Yes')) yesPrice = match[1];
                if (text.includes('No')) noPrice = match[1];
            }
        });
        const icon = document.querySelector('img[alt*="event"], img[class*="event"]')?.src || '';
        return { id: slug, url, slug, title, yesPrice, noPrice, icon, savedAt: Date.now(), tags: [], customName: '' };
    }

    function handleFavoriteMarket() {
        const data = extractMarketData();
        const idx = favoriteMarkets.findIndex(f => f.id === data.id);
        if (idx >= 0) {
            favoriteMarkets.splice(idx, 1);
            showToast(t('marketUnfavorited'));
        } else {
            favoriteMarkets.unshift(data);
            showToast(t('marketFavorited'));
        }
        saveMarkets();
        updateMarketButton();
        renderAll();
    }

    function updateMarketButton() {
        const btn = document.getElementById('pm-fav-market-btn');
        if (!btn) return;
        const data = extractMarketData();
        const isFav = favoriteMarkets.some(f => f.id === data.id);
        btn.classList.toggle('favorited', isFav);
        btn.querySelector('span').textContent = isFav ? t('favorited') : t('favorite');
    }

    window.pmRemoveMarket = function (idx) {
        favoriteMarkets.splice(idx, 1);
        saveMarkets();
        renderAll();
        updateMarketButton();
    };

    // ==================== TRADERS ====================
    function renderTraders() {
        const container = document.getElementById('pm-tab-traders');
        const countEl = document.getElementById('pm-trader-count');
        if (!container) return;

        countEl.textContent = favoriteTraders.length;
        const displayList = getProcessedList(favoriteTraders);

        if (displayList.length === 0) {
            container.innerHTML = `
                <div class="pm-empty">
                    <svg class="pm-empty-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <p>${t('noTraders')}</p>
                </div>`;
            return;
        }

        container.innerHTML = displayList.map(trader => {
            const isEditing = currentlyEditing && currentlyEditing.type === 'trader' && currentlyEditing.idx === trader.originalIndex;

            if (isEditing) {
                return `
            <div class="pm-card pm-card-editing" onclick="event.stopPropagation()">
                <div class="pm-card-inner">
                    <div class="pm-card-icon" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 18px; font-weight: 700;">
                        ${(trader.username || trader.id || '?')[0].toUpperCase()}
                    </div>
                    <div class="pm-card-info" style="flex: 1;">
                        <input type="text" 
                            id="pm-inline-name-trader-${trader.originalIndex}"
                            class="pm-inline-input"
                            value="${trader.customName || trader.username || trader.id || ''}"
                            placeholder="${t('inputName')}"
                            style="width: 100%; margin-bottom: 8px;" />
                        <input type="text"
                            id="pm-inline-tags-trader-${trader.originalIndex}"
                            class="pm-inline-input"
                            value="${(trader.tags || []).join(' ')}"
                            placeholder="${t('tagsPlaceholder')}"
                            style="width: 100%; margin-bottom: 4px;" />
                        <div style="font-size: 11px; color: #8b949e; margin-bottom: 8px;">${t('tagsHelper')}</div>
                        <button class="pm-inline-save-btn" style="background: #2e7afb; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            ${t('save')}
                        </button>
                    </div>
                </div>
            </div>`;
            }


            const profileUrl = trader.address
                ? `https://polymarket.com/profile/${trader.address}`
                : `https://polymarket.com/@${trader.username}`;

            const displayName = (trader.customName && trader.customName.trim()) ? trader.customName : (trader.username || trader.id);
            const showOriginal = trader.customName && trader.customName.trim() && (trader.username || trader.id);
            const tagsHtml = (trader.tags || []).map(tag => {
                const color = getTagColor(tag);
                return `<span class="pm-card-tag" style="background: ${color}; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${tag}</span>`;
            }).join('');

            return `
            <div class="pm-card" onclick="window.open('${profileUrl}', '_blank')">
                <div class="pm-card-inner">
                    <div class="pm-card-icon pm-trader-avatar">
                        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </div>
                    <div class="pm-card-info">
                        <div class="pm-card-title">${displayName}</div>
                        ${showOriginal ? `<div class="pm-card-note">${trader.username || trader.id}</div>` : ''}
                        ${tagsHtml ? `<div class="pm-card-tags">${tagsHtml}</div>` : ''}
                        <div class="pm-card-meta">
                            <span style="font-size:11px;color:#8b949e">
                                ${trader.address ? `${trader.address.slice(0, 6)}...${trader.address.slice(-4)}` : 'Trader'}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="pm-card-actions">
                    <button class="pm-card-btn-small pm-edit-btn" data-type="trader" data-index="${trader.originalIndex}" title="Edit">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                    </button>
                    <button class="pm-card-btn-small delete pm-delete-btn" data-type="trader" data-index="${trader.originalIndex}" title="Delete">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    function extractCurrentTrader() {
        const path = location.pathname;
        let id = '';
        let address = null;
        let username = '';
        if (path.includes('/@')) {
            username = path.split('/@')[1].split('/')[0];
            id = username;
        } else if (path.includes('/profile/')) {
            id = path.split('/profile/')[1].split('/')[0];
            address = id;
            username = id.slice(0, 6) + '...' + id.slice(-4);
        }
        return {
            id: id.toLowerCase(),
            address: address,
            username: username,
            savedAt: Date.now(),
            tags: [],
            customName: ''
        };
    }

    function handleFavoriteCurrentTrader() {
        const trader = extractCurrentTrader();
        if (!trader.id) return;
        const idx = favoriteTraders.findIndex(t => t.id === trader.id);
        if (idx >= 0) {
            favoriteTraders.splice(idx, 1);
            showToast(t('traderUnfavorited'));
        } else {
            favoriteTraders.unshift(trader);
            showToast(t('traderFavorited'));
        }
        saveTraders();
        updateTraderButton();
        renderAll();
    }

    function updateTraderButton() {
        const btn = document.getElementById('pm-fav-trader-btn');
        if (!btn) return;
        const trader = extractCurrentTrader();
        const isFav = favoriteTraders.some(t => t.id === trader.id);
        btn.classList.toggle('favorited', isFav);
        btn.querySelector('span').textContent = isFav ? t('favorited') : t('favorite');
    }

    window.pmRemoveTrader = function (idx) {
        favoriteTraders.splice(idx, 1);
        saveTraders();
        renderAll();
        updateTraderButton();
    };

    // ==================== UTILS ====================
    function showToast(msg) {
        let toast = document.getElementById('pm-toast');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.id = 'pm-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
