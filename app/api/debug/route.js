import { NextResponse } from 'next/server';

export async function GET() {
  const serpKey = process.env.SERPAPI_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const result = {
    timestamp: new Date().toISOString(),
    environment: {
      SERPAPI_KEY: serpKey ? `✅ Set (${serpKey.substring(0, 8)}...${serpKey.slice(-4)})` : '❌ NOT SET',
      ANTHROPIC_API_KEY: anthropicKey ? `✅ Set (${anthropicKey.substring(0, 8)}...${anthropicKey.slice(-4)})` : '❌ NOT SET',
    },
    nodeVersion: process.version,
  };

  // Test SerpAPI if key exists
  if (serpKey) {
    try {
      const params = new URLSearchParams({
        engine: 'google_shopping',
        q: 'test',
        api_key: serpKey,
        num: '3',
      });

      const res = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json();
      result.serpApiTest = {
        status: res.status,
        hasShoppingResults: (data.shopping_results || []).length,
        hasInlineResults: (data.inline_shopping_results || []).length,
        error: data.error || null,
        responseKeys: Object.keys(data),
      };
    } catch (error) {
      result.serpApiTest = {
        error: error.message,
      };
    }
  }

  return NextResponse.json(result);
}
