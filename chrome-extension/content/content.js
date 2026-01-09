// Content Script - Injected into Polymarket pages
(function () {
    'use strict';

    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Check if we're on a market page
        if (isMarketPage()) {
            setTimeout(injectToolbar, 1500); // Wait for React to render
            observePageChanges();
        }
    }

    function isMarketPage() {
        return window.location.pathname.includes('/event/') ||
            window.location.pathname.includes('/market/');
    }

    function observePageChanges() {
        // Re-inject on SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (isMarketPage()) {
                    setTimeout(injectToolbar, 1500);
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    function injectToolbar() {
        // Remove existing toolbar
        const existing = document.getElementById('pm-assistant-toolbar');
        if (existing) existing.remove();

        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'pm-assistant-toolbar';
        toolbar.innerHTML = `
      <button id="pm-favorite-btn" class="pm-btn pm-btn-favorite">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <span>收藏</span>
      </button>
      <button id="pm-analyze-btn" class="pm-btn pm-btn-analyze">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <span>AI 分析</span>
      </button>
    `;

        document.body.appendChild(toolbar);

        // Event listeners
        document.getElementById('pm-favorite-btn').addEventListener('click', handleFavorite);
        document.getElementById('pm-analyze-btn').addEventListener('click', handleAnalyze);

        // Check if already favorited
        checkFavoriteStatus();
    }

    async function checkFavoriteStatus() {
        const marketData = extractMarketData();
        const { favorites = [] } = await chrome.storage.local.get(['favorites']);

        const isFavorited = favorites.some(f => f.id === marketData.id);
        const btn = document.getElementById('pm-favorite-btn');

        if (isFavorited) {
            btn.classList.add('favorited');
            btn.querySelector('span').textContent = '已收藏';
        }
    }

    function extractMarketData() {
        const url = window.location.href;
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.indexOf('event') + 1] || '';

        // Extract title
        let title = document.querySelector('h1')?.textContent ||
            document.querySelector('[class*="title"]')?.textContent ||
            document.title.replace(' | Polymarket', '');

        // Extract prices
        let yesPrice = '--';
        let noPrice = '--';

        const priceElements = document.querySelectorAll('[class*="price"], [class*="Price"]');
        priceElements.forEach(el => {
            const text = el.textContent;
            if (text.includes('Yes') || text.includes('是')) {
                const match = text.match(/(\d+(?:\.\d+)?)/);
                if (match) yesPrice = match[1];
            }
            if (text.includes('No') || text.includes('否')) {
                const match = text.match(/(\d+(?:\.\d+)?)/);
                if (match) noPrice = match[1];
            }
        });

        // Try to get prices from buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            const text = btn.textContent;
            if (text.includes('Buy Yes') || text.includes('买入 Yes')) {
                const match = text.match(/(\d+(?:\.\d+)?)¢/);
                if (match) yesPrice = match[1];
            }
            if (text.includes('Buy No') || text.includes('买入 No')) {
                const match = text.match(/(\d+(?:\.\d+)?)¢/);
                if (match) noPrice = match[1];
            }
        });

        // Extract volume
        let volume = 0;
        const volumeMatch = document.body.textContent.match(/\$[\d,.]+[KMB]?\s*(?:Vol|Volume|交易量)/i);
        if (volumeMatch) {
            const numMatch = volumeMatch[0].match(/\$([\d,.]+)([KMB])?/);
            if (numMatch) {
                let num = parseFloat(numMatch[1].replace(/,/g, ''));
                const suffix = numMatch[2];
                if (suffix === 'K') num *= 1000;
                if (suffix === 'M') num *= 1000000;
                if (suffix === 'B') num *= 1000000000;
                volume = num;
            }
        }

        // Get icon
        const icon = document.querySelector('img[class*="event"], img[class*="market"]')?.src || '';

        return {
            id: slug || url,
            url,
            slug,
            title,
            yesPrice,
            noPrice,
            volume,
            icon,
            savedAt: Date.now()
        };
    }

    async function handleFavorite() {
        const btn = document.getElementById('pm-favorite-btn');
        const marketData = extractMarketData();

        const { favorites = [] } = await chrome.storage.local.get(['favorites']);

        // Check if already favorited
        const existingIndex = favorites.findIndex(f => f.id === marketData.id);

        if (existingIndex >= 0) {
            // Remove
            favorites.splice(existingIndex, 1);
            btn.classList.remove('favorited');
            btn.querySelector('span').textContent = '收藏';
            showToast('已取消收藏');
        } else {
            // Add
            favorites.unshift(marketData);
            btn.classList.add('favorited');
            btn.querySelector('span').textContent = '已收藏';
            showToast('已添加到收藏');
        }

        await chrome.storage.local.set({ favorites });

        // Notify popup
        chrome.runtime.sendMessage({ type: 'FAVORITE_ADDED' });
    }

    async function handleAnalyze() {
        const btn = document.getElementById('pm-analyze-btn');
        btn.disabled = true;
        btn.querySelector('span').textContent = '分析中...';

        const marketData = extractMarketData();

        // Generate AI analysis
        const analysis = generateAIAnalysis(marketData);

        // Store and show
        await chrome.storage.local.set({ currentAnalysis: analysis });

        // Send to popup
        chrome.runtime.sendMessage({ type: 'ANALYSIS_RESULT', data: analysis });

        btn.disabled = false;
        btn.querySelector('span').textContent = 'AI 分析';

        showToast('分析完成！点击扩展图标查看');
    }

    function generateAIAnalysis(data) {
        const yesPrice = parseFloat(data.yesPrice) || 50;
        const noPrice = parseFloat(data.noPrice) || 50;
        const volume = data.volume || 0;

        let lowPriceStrategy = '';
        let marketAnalysis = '';
        let riskLevel = 'risk-medium';
        let riskLabel = '中等风险';
        let riskDetail = '';

        // Low price strategy
        if (yesPrice < 5) {
            const multiplier = Math.round(100 / yesPrice);
            lowPriceStrategy = `🎯 发现低价机会！Yes 价格仅 ${yesPrice}¢，潜在回报 ${multiplier}x。\n\n` +
                `投入 $10 可购买约 ${Math.round(1000 / yesPrice)} 份额。\n` +
                `若预测正确，回报约 $${Math.round(1000 / yesPrice)}。\n\n` +
                `⚠️ 注意：低价通常意味着市场认为该结果发生概率很低。`;
        } else if (noPrice < 5) {
            const multiplier = Math.round(100 / noPrice);
            lowPriceStrategy = `🎯 发现低价机会！No 价格仅 ${noPrice}¢，潜在回报 ${multiplier}x。\n\n` +
                `投入 $10 可购买约 ${Math.round(1000 / noPrice)} 份额。\n` +
                `若预测正确，回报约 $${Math.round(1000 / noPrice)}。\n\n` +
                `⚠️ 注意：低价通常意味着市场认为该结果发生概率很低。`;
        } else if (yesPrice < 10 || noPrice < 10) {
            const lowPrice = Math.min(yesPrice, noPrice);
            const outcome = yesPrice < noPrice ? 'Yes' : 'No';
            const multiplier = Math.round(100 / lowPrice);
            lowPriceStrategy = `💡 发现潜在机会！${outcome} 价格 ${lowPrice}¢，潜在回报 ${multiplier}x。\n\n` +
                `这是一个相对低价的选项，适合小额博弈。`;
        } else {
            lowPriceStrategy = `当前市场没有明显的低价高赔率机会。\n\n` +
                `Yes: ${yesPrice}¢ / No: ${noPrice}¢\n\n` +
                `建议关注价格低于 10¢ 的选项以获得 10x+ 潜在回报。`;
        }

        // Market analysis
        const spread = Math.abs(yesPrice - noPrice);
        const sum = yesPrice + noPrice;

        if (sum < 95) {
            marketAnalysis = `⚠️ 发现套利机会！Yes + No = ${sum}¢，低于 100¢。\n\n` +
                `同时买入两边可能获得无风险收益。`;
        } else if (sum > 105) {
            marketAnalysis = `📊 市场存在溢价。Yes + No = ${sum}¢，高于 100¢。\n\n` +
                `可能暗示高需求或流动性不足。`;
        } else if (yesPrice > 80) {
            marketAnalysis = `📈 市场强烈看涨 Yes (${yesPrice}¢)。\n\n` +
                `大多数交易者认为 Yes 结果会发生。如果你有不同看法，No 可能是一个高赔率选择。`;
        } else if (noPrice > 80) {
            marketAnalysis = `📉 市场强烈看跌 (No: ${noPrice}¢)。\n\n` +
                `大多数交易者认为 No 结果会发生。如果你有信息优势，Yes 可能有价值。`;
        } else {
            marketAnalysis = `📊 市场相对均衡。\n\n` +
                `Yes: ${yesPrice}¢ / No: ${noPrice}¢\n` +
                `买卖价差: ${spread.toFixed(1)}¢\n\n` +
                `没有明显的方向性偏好，适合有信息优势的交易者。`;
        }

        // Risk assessment
        if (yesPrice < 5 || noPrice < 5) {
            riskLevel = 'risk-high';
            riskLabel = '高风险';
            riskDetail = '低价选项通常意味着极低的胜率。请仅使用可承受完全损失的资金，建议不超过总资金的 1-5%。';
        } else if (volume > 1000000) {
            riskLevel = 'risk-low';
            riskLabel = '相对低风险';
            riskDetail = '高成交量市场通常有更准确的定价和更好的流动性。但仍需注意基本的投资风险。';
        } else if (volume < 10000) {
            riskLevel = 'risk-high';
            riskLabel = '高风险';
            riskDetail = '低成交量可能导致价格操纵和流动性问题。进出仓可能有较大滑点。';
        } else {
            riskLevel = 'risk-medium';
            riskLabel = '中等风险';
            riskDetail = '预测市场具有天然的不确定性。建议分散投资，不要将大量资金押注在单一结果上。';
        }

        return {
            title: data.title,
            yesPrice,
            noPrice,
            volume,
            lowPriceStrategy,
            marketAnalysis,
            riskLevel,
            riskLabel,
            riskDetail,
            analyzedAt: Date.now()
        };
    }

    function showToast(message) {
        // Remove existing
        const existing = document.getElementById('pm-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'pm-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

})();
