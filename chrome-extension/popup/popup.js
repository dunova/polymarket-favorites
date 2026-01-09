// Popup Logic
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Load favorites
    loadFavorites();

    // Scan button
    document.getElementById('scanBtn').addEventListener('click', scanOpportunities);

    // Check if we have analysis data from content script
    chrome.storage.local.get(['currentAnalysis'], (data) => {
        if (data.currentAnalysis) {
            showAnalysisResult(data.currentAnalysis);
            switchTab('analysis');
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === tabName + 'Tab');
    });
}

// Favorites
async function loadFavorites() {
    const { favorites = [] } = await chrome.storage.local.get(['favorites']);

    document.getElementById('favCount').textContent = favorites.length;

    const list = document.getElementById('favoritesList');

    if (favorites.length === 0) {
        list.innerHTML = `
      <div class="empty-state">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <p>暂无收藏的市场</p>
        <span>在 Polymarket 页面点击收藏按钮添加</span>
      </div>
    `;
        return;
    }

    list.innerHTML = favorites.map(f => `
    <div class="favorite-card" data-url="${f.url}">
      <img class="favorite-icon" src="${f.icon || ''}" onerror="this.style.background='var(--bg-tertiary)'">
      <div class="favorite-info">
        <div class="favorite-title">${f.title}</div>
        <div class="favorite-meta">
          <span class="price-yes">Yes: ${f.yesPrice || '--'}¢</span>
          <span class="price-no">No: ${f.noPrice || '--'}¢</span>
          <span>Vol: ${formatMoney(f.volume || 0)}</span>
        </div>
      </div>
      <div class="favorite-actions">
        <button class="action-btn" onclick="openMarket('${f.url}')" title="打开">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </button>
        <button class="action-btn delete" onclick="removeFavorite('${f.id}')" title="删除">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

    // Click to open
    list.querySelectorAll('.favorite-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                openMarket(card.dataset.url);
            }
        });
    });
}

function openMarket(url) {
    chrome.tabs.create({ url });
}

async function removeFavorite(id) {
    const { favorites = [] } = await chrome.storage.local.get(['favorites']);
    const updated = favorites.filter(f => f.id !== id);
    await chrome.storage.local.set({ favorites: updated });
    loadFavorites();
}

// Opportunities Scanner
async function scanOpportunities() {
    const list = document.getElementById('opportunitiesList');
    list.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>正在扫描低价机会...</p>
    </div>
  `;

    const priceThreshold = parseFloat(document.getElementById('priceFilter').value);
    const category = document.getElementById('categoryFilter').value;

    try {
        // Fetch markets from API
        const response = await fetch('https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100');
        const events = await response.json();

        const opportunities = [];

        for (const event of events) {
            if (!event.markets) continue;

            for (const market of event.markets) {
                // Check for low-price outcomes
                const outcomes = market.outcomes || ['Yes', 'No'];
                const prices = (market.outcomePrices || '').split(',').map(p => parseFloat(p) || 0);

                for (let i = 0; i < outcomes.length; i++) {
                    const price = prices[i];
                    if (price > 0 && price <= priceThreshold) {
                        const multiplier = Math.round(1 / price);
                        opportunities.push({
                            title: market.question || event.title,
                            outcome: outcomes[i],
                            price: price,
                            multiplier: multiplier,
                            volume: parseFloat(market.volume) || 0,
                            url: `https://polymarket.com/event/${event.slug}`,
                            endDate: market.endDate
                        });
                    }
                }
            }
        }

        // Sort by multiplier
        opportunities.sort((a, b) => b.multiplier - a.multiplier);

        if (opportunities.length === 0) {
            list.innerHTML = `
        <div class="empty-state">
          <p>未找到符合条件的机会</p>
          <span>尝试调整筛选条件</span>
        </div>
      `;
            return;
        }

        list.innerHTML = opportunities.slice(0, 20).map(o => `
      <div class="opportunity-card" onclick="window.open('${o.url}', '_blank')">
        <div class="opportunity-title">${o.title.slice(0, 60)}${o.title.length > 60 ? '...' : ''}</div>
        <div class="opportunity-stats">
          <span class="multiplier">${o.multiplier}x</span>
          <span class="stat-item">
            <span class="price-tag">${(o.price * 100).toFixed(1)}¢</span>
            ${o.outcome}
          </span>
          <span class="stat-item">Vol: ${formatMoney(o.volume)}</span>
        </div>
      </div>
    `).join('');

    } catch (e) {
        list.innerHTML = `
      <div class="empty-state">
        <p>扫描失败</p>
        <span>${e.message}</span>
      </div>
    `;
    }
}

// AI Analysis
function showAnalysisResult(data) {
    document.getElementById('analysisResult').style.display = 'block';
    document.querySelector('.analysis-intro').style.display = 'none';

    document.getElementById('analysisResult').innerHTML = `
    <div class="analysis-header">
      <span class="analysis-badge">AI 分析</span>
      <span style="font-size:12px;color:var(--text-muted);">${data.title?.slice(0, 40) || '市场分析'}...</span>
    </div>
    
    <div class="strategy-card">
      <div class="strategy-title">💰 低价高赔率策略</div>
      <div class="strategy-detail">
        ${data.lowPriceStrategy || '当前市场没有明显的低价高赔率机会。关注价格低于 5¢ 的选项可获得 20x+ 潜在回报。'}
      </div>
    </div>

    <div class="strategy-card">
      <div class="strategy-title">📊 市场分析</div>
      <div class="strategy-detail">
        ${data.marketAnalysis || '当前市场价格波动正常，无明显套利机会。'}
      </div>
    </div>

    <div class="strategy-card">
      <div class="strategy-title">⚠️ 风险评估</div>
      <div class="strategy-detail">
        风险等级: <span class="risk-badge ${data.riskLevel || 'risk-medium'}">${data.riskLabel || '中等风险'}</span>
        <br><br>
        ${data.riskDetail || '请注意：预测市场具有高度不确定性，请仅使用可承受损失的资金进行交易。'}
      </div>
    </div>
  `;
}

// Utils
function formatMoney(n) {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYSIS_RESULT') {
        showAnalysisResult(message.data);
        switchTab('analysis');
    }
    if (message.type === 'FAVORITE_ADDED') {
        loadFavorites();
    }
});
