import { NextResponse } from 'next/server';
import { getStore } from '../../lib/store';

export async function GET() {
  const store = getStore();
  
  return NextResponse.json({
    success: true,
    agent: {
      status: process.env.ANTHROPIC_API_KEY ? 'active' : 'basic_mode',
      lastLearned: store.agentMemory.lastLearned,
      totalInsights: store.agentMemory.insights.length,
      recentInsights: store.agentMemory.insights.slice(-5),
      emergingNiches: store.agentMemory.emergingNiches,
      saturatedMarkets: store.agentMemory.saturatedMarkets,
      watchlist: store.agentMemory.watchlist,
      productsTracked: store.trendingProducts.length,
      totalSearches: store.searchHistory.length,
    },
  });
}
