import { NextResponse } from 'next/server';
import { scrapeGoogleShopping } from '../../lib/scraper';
import { generateAlternativeQueries } from '../../lib/agent';

export const maxDuration = 30;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product')?.trim();
  const country = searchParams.get('country') || 'us';
  const device = searchParams.get('device') || 'desktop';

  if (!product) {
    return NextResponse.json({ error: 'Parameter "product" is required' }, { status: 400 });
  }

  try {
    // AI generates smart alternative search queries
    const queries = await generateAlternativeQueries(product);
    
    // Search for alternatives using the first query
    const result = await scrapeGoogleShopping(queries[0], country, device);

    return NextResponse.json({
      success: true,
      originalProduct: product,
      searchQueries: queries,
      alternatives: result.products || [],
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      alternatives: [],
    }, { status: 500 });
  }
}
