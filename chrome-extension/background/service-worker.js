// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('Polymarket Assistant installed');
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_MARKETS') {
        fetchMarkets().then(sendResponse);
        return true; // Keep channel open for async
    }
});

// Fetch markets from API
async function fetchMarkets() {
    try {
        const response = await fetch('https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100');
        return await response.json();
    } catch (e) {
        console.error('Failed to fetch markets:', e);
        return [];
    }
}

// Alarm for periodic updates (optional)
chrome.alarms.create('updateFavorites', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateFavorites') {
        await updateFavoritePrices();
    }
});

async function updateFavoritePrices() {
    const { favorites = [] } = await chrome.storage.local.get(['favorites']);

    if (favorites.length === 0) return;

    try {
        const events = await fetchMarkets();

        for (const fav of favorites) {
            const event = events.find(e => e.slug === fav.slug);
            if (event && event.markets && event.markets[0]) {
                const market = event.markets[0];
                const prices = (market.outcomePrices || '').split(',').map(p => parseFloat(p) || 0);
                fav.yesPrice = (prices[0] * 100).toFixed(1);
                fav.noPrice = (prices[1] * 100).toFixed(1);
                fav.volume = parseFloat(market.volume) || fav.volume;
                fav.lastUpdated = Date.now();
            }
        }

        await chrome.storage.local.set({ favorites });
        console.log('Updated favorite prices');
    } catch (e) {
        console.error('Failed to update prices:', e);
    }
}

// Context menu (right-click)
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'pm-analyze',
        title: 'AI 分析此市场',
        contexts: ['page'],
        documentUrlPatterns: ['https://polymarket.com/*']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'pm-analyze') {
        chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_ANALYSIS' });
    }
});
