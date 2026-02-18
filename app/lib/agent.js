import Anthropic from '@anthropic-ai/sdk';
import { getStore, addAgentInsight } from './store';

/**
 * AI Agent — The Brain of ProductSpy
 * 
 * Uses Claude API to:
 * 1. Analyze scraped product data and score saturation
 * 2. Identify emerging trends and dying markets
 * 3. Find unbranded alternatives intelligently
 * 4. Learn from search patterns and accumulate knowledge
 * 5. Generate actionable insights for users
 */

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

/**
 * Analyze products and generate insights
 */
export async function analyzeProducts(products, query, country) {
  const client = getClient();
  if (!client) {
    return fallbackAnalysis(products);
  }

  const store = getStore();
  const previousInsights = store.agentMemory.insights.slice(-10);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are ProductSpy AI Agent — an expert e-commerce product research analyst.
Your job is to analyze Google Shopping data and provide actionable insights.

You have memory of previous analyses:
${previousInsights.length > 0 ? JSON.stringify(previousInsights.slice(-5)) : 'No previous insights yet.'}

ALWAYS respond in valid JSON with this exact structure:
{
  "summary": "Brief market summary in 1-2 sentences",
  "topOpportunities": [{"name": "...", "reason": "...", "score": 1-10}],
  "avoidProducts": [{"name": "...", "reason": "..."}],
  "trendPrediction": "What you predict will happen in this market",
  "suggestedSearches": ["query1", "query2", "query3"],
  "saturationAdjustments": [{"productId": "...", "adjustedScore": 0-100, "reason": "..."}],
  "learnings": "What the agent learned from this search that it should remember"
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze these ${products.length} products found on Google Shopping for query "${query}" in ${country}:

${JSON.stringify(products.slice(0, 15).map(p => ({
  name: p.name,
  price: p.price,
  rating: p.rating,
  reviews: p.reviews,
  sellers: p.sellers,
  ads: p.ads,
  saturationScore: p.saturationScore,
  store: p.store,
})), null, 2)}

Total products found: ${products.length}
Average price: $${(products.reduce((a, b) => a + b.price, 0) / products.length).toFixed(2)}
Total ads: ${products[0]?.ads || 0}

Provide your analysis as JSON.`
        }
      ],
    });

    const text = message.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Save what the agent learned
      if (analysis.learnings) {
        addAgentInsight({
          type: 'search_analysis',
          query,
          country,
          learning: analysis.learnings,
          productCount: products.length,
        });
      }

      return { success: true, ...analysis };
    }

    return fallbackAnalysis(products);

  } catch (error) {
    console.error('AI Agent error:', error.message);
    return fallbackAnalysis(products);
  }
}

/**
 * AI generates smart alternative search queries
 */
export async function generateAlternativeQueries(productName) {
  const client = getClient();
  if (!client) {
    // Fallback: simple generic query
    const words = productName.split(' ').filter(w => w.length > 3);
    return [
      `${words.join(' ')} unbranded`,
      `generic ${words.join(' ')}`,
      `${words.join(' ')} no brand`,
    ];
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'You generate search queries to find unbranded/generic alternatives to branded products on Google Shopping. Return ONLY a JSON array of 3-5 search query strings. No other text.',
      messages: [
        {
          role: 'user',
          content: `Generate Google Shopping search queries to find unbranded/generic alternatives to: "${productName}". 
Remove any brand names and focus on the product type, features, and use-case.
Return JSON array only.`
        }
      ],
    });

    const text = message.content[0].text;
    const queries = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
    return queries.length > 0 ? queries : [`${productName} generic unbranded`];

  } catch {
    const words = productName.split(' ').filter(w => w.length > 3);
    return [`${words.join(' ')} unbranded`, `generic ${words.join(' ')}`];
  }
}

/**
 * Daily learning task — the agent reviews what it knows and generates insights
 */
export async function dailyLearning() {
  const client = getClient();
  if (!client) return { success: false, error: 'No API key' };

  const store = getStore();

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are ProductSpy AI Agent performing your daily learning review.
Review the accumulated data and generate updated market intelligence.
Respond in JSON: {
  "emergingNiches": ["niche1", "niche2"],
  "saturatedMarkets": ["market1", "market2"],
  "watchlist": ["product to watch 1", "product to watch 2"],
  "dailySummary": "What you learned today",
  "searchSuggestions": ["query1", "query2", "query3"]
}`,
      messages: [
        {
          role: 'user',
          content: `Review this accumulated data:

Trending Products (${store.trendingProducts.length}):
${JSON.stringify(store.trendingProducts.slice(-20).map(p => ({
  name: p.name, price: p.price, saturation: p.saturation,
  saturationScore: p.saturationScore, discoveredAt: p.discoveredAt,
})), null, 2)}

Previous Insights (${store.agentMemory.insights.length}):
${JSON.stringify(store.agentMemory.insights.slice(-10), null, 2)}

Recent Searches (${store.searchHistory.length}):
${JSON.stringify(store.searchHistory.slice(-15), null, 2)}

Generate your daily intelligence report.`
        }
      ],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const report = JSON.parse(jsonMatch[0]);
      
      // Update agent memory
      store.agentMemory.emergingNiches = report.emergingNiches || [];
      store.agentMemory.saturatedMarkets = report.saturatedMarkets || [];
      store.agentMemory.watchlist = report.watchlist || [];
      store.agentMemory.lastLearned = new Date().toISOString();
      
      addAgentInsight({
        type: 'daily_learning',
        summary: report.dailySummary,
        data: report,
      });

      return { success: true, report };
    }

    return { success: false, error: 'Failed to parse response' };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fallback analysis when no API key is available
 */
function fallbackAnalysis(products) {
  const low = products.filter(p => p.saturation === 'low');
  const high = products.filter(p => p.saturation === 'high');
  const avgPrice = products.reduce((a, b) => a + b.price, 0) / products.length;

  return {
    success: true,
    summary: `Found ${products.length} products. ${low.length} have low saturation (good opportunities), ${high.length} are highly saturated.`,
    topOpportunities: low.slice(0, 3).map(p => ({
      name: p.name,
      reason: `Low saturation score of ${p.saturationScore} with ${p.reviews} reviews`,
      score: Math.round(10 - (p.saturationScore / 10)),
    })),
    avoidProducts: high.slice(0, 3).map(p => ({
      name: p.name,
      reason: `High saturation: ${p.saturationScore}/100, ${p.sellers} sellers competing`,
    })),
    trendPrediction: 'Enable Claude API key for AI-powered trend predictions.',
    suggestedSearches: [],
    learnings: 'Basic analysis mode — add ANTHROPIC_API_KEY for full AI agent capabilities.',
    isBasicMode: true,
  };
}
