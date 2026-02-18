import { NextResponse } from 'next/server';
import { scrapeGoogleShopping } from '../../lib/scraper';
import { analyzeProducts } from '../../lib/agent';
import { addProducts, addSearchHistory } from '../../lib/store';

export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const country = searchParams.get('country') || 'us';
  const device = searchParams.get('device') || 'desktop';

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // Step 1: Scrape via SerpAPI
    const scrapeResult = await scrapeGoogleShopping(query, country, device);

    // If scraping failed, return the REAL error (not a generic one)
    if (!scrapeResult.success) {
      return NextResponse.json({
        success: false,
        error: scrapeResult.error,
        query,
        products: [],
        debugInfo: scrapeResult.debugInfo || null,
      });
    }

    if (scrapeResult.products.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No products found for "${query}". Try a different search term.`,
        query,
        products: [],
        debugInfo: scrapeResult.debugInfo || null,
      });
    }

    // Step 2: Save for learning
    addProducts(scrapeResult.products);
    addSearchHistory(query, country, device, scrapeResult.products.length);

    // Step 3: AI analysis (non-blocking)
    let aiAnalysis = null;
    try {
      aiAnalysis = await analyzeProducts(scrapeResult.products, query, country);
    } catch (e) {
      console.error('AI analysis failed:', e.message);
    }

    return NextResponse.json({
      success: true,
      query,
      country,
      device,
      totalResults: scrapeResult.totalResults,
      adCount: scrapeResult.adCount,
      products: scrapeResult.products,
      aiAnalysis,
      scrapedAt: scrapeResult.scrapedAt,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`,
      query,
      products: [],
    }, { status: 500 });
  }
}
