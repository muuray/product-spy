/**
 * In-Memory Data Store
 * 
 * Stores trending data, agent learnings, and search history.
 * On Vercel this resets on cold starts — for production use
 * Supabase, PlanetScale, or Vercel KV.
 * 
 * Structure:
 * - trendingProducts: products the agent has discovered
 * - agentMemory: insights the AI agent has learned
 * - searchHistory: past searches for pattern recognition
 */

const store = {
  // Products the agent has found and analyzed
  trendingProducts: [],
  
  // AI agent's accumulated knowledge
  agentMemory: {
    lastLearned: null,
    insights: [],
    watchlist: [],
    saturatedMarkets: [],
    emergingNiches: [],
  },
  
  // Search history for the agent to learn from
  searchHistory: [],
  
  // Cached results to avoid re-scraping
  cache: new Map(),
};

export function getStore() {
  return store;
}

export function addProducts(products) {
  const now = new Date().toISOString();
  const newProducts = products.map(p => ({
    ...p,
    discoveredAt: now,
    lastChecked: now,
  }));
  
  // Deduplicate by name
  for (const np of newProducts) {
    const existingIdx = store.trendingProducts.findIndex(
      ep => ep.name.toLowerCase() === np.name.toLowerCase()
    );
    if (existingIdx >= 0) {
      // Update existing
      store.trendingProducts[existingIdx] = {
        ...store.trendingProducts[existingIdx],
        ...np,
        lastChecked: now,
        priceHistory: [
          ...(store.trendingProducts[existingIdx].priceHistory || []),
          { date: now, price: np.price }
        ],
      };
    } else {
      store.trendingProducts.push({
        ...np,
        priceHistory: [{ date: now, price: np.price }],
      });
    }
  }
  
  // Keep max 500 products
  if (store.trendingProducts.length > 500) {
    store.trendingProducts = store.trendingProducts.slice(-500);
  }
}

export function addAgentInsight(insight) {
  store.agentMemory.insights.push({
    ...insight,
    timestamp: new Date().toISOString(),
  });
  store.agentMemory.lastLearned = new Date().toISOString();
  
  // Keep last 100 insights
  if (store.agentMemory.insights.length > 100) {
    store.agentMemory.insights = store.agentMemory.insights.slice(-100);
  }
}

export function addSearchHistory(query, country, device, resultCount) {
  store.searchHistory.push({
    query, country, device, resultCount,
    timestamp: new Date().toISOString(),
  });
  if (store.searchHistory.length > 200) {
    store.searchHistory = store.searchHistory.slice(-200);
  }
}

export function getCached(key) {
  const cached = store.cache.get(key);
  if (!cached) return null;
  // Cache expires after 30 minutes
  if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
    store.cache.delete(key);
    return null;
  }
  return cached.data;
}

export function setCache(key, data) {
  store.cache.set(key, { data, timestamp: Date.now() });
  // Clean old cache entries
  if (store.cache.size > 100) {
    const oldest = store.cache.keys().next().value;
    store.cache.delete(oldest);
  }
}
