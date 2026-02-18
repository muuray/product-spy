import { getCached, setCache } from './store';

/**
 * Google Shopping Scraper via SerpAPI
 * Handles all SerpAPI response formats robustly
 */

const COUNTRY_CONFIG = {
  us: { gl: 'us', hl: 'en', location: 'United States' },
  gb: { gl: 'uk', hl: 'en', location: 'United Kingdom' },
  ca: { gl: 'ca', hl: 'en', location: 'Canada' },
  de: { gl: 'de', hl: 'de', location: 'Germany' },
  au: { gl: 'au', hl: 'en', location: 'Australia' },
  fr: { gl: 'fr', hl: 'fr', location: 'France' },
};

const DEVICE_MAP = { desktop: 'desktop', iphone: 'mobile', android: 'mobile' };

function calculateSaturation(sellers, reviews, ads, priceRange, avgPrice) {
  let score = 0;
  if (sellers >= 40) score += 30; else if (sellers >= 20) score += 22; else if (sellers >= 10) score += 14; else if (sellers >= 5) score += 8; else score += 3;
  if (reviews >= 2000) score += 25; else if (reviews >= 500) score += 18; else if (reviews >= 100) score += 10; else if (reviews >= 20) score += 5; else score += 2;
  if (ads >= 8) score += 25; else if (ads >= 5) score += 18; else if (ads >= 3) score += 10; else score += 3;
  const variance = avgPrice > 0 ? priceRange / avgPrice : 0;
  if (variance > 0.8) score += 20; else if (variance > 0.5) score += 14; else if (variance > 0.3) score += 8; else score += 3;
  return { score: Math.min(score, 100), level: score >= 65 ? 'high' : score >= 35 ? 'medium' : 'low' };
}

function categorize(name) {
  const n = (name || '').toLowerCase();
  if (/phone|tablet|laptop|earbuds?|headphone|speaker|charger|cable|camera|smart|drone|projector|keyboard|mouse|usb|bluetooth|wireless|power bank/.test(n)) return 'Electronics';
  if (/lamp|light|led|diffuser|candle|pillow|blanket|curtain|rug|shelf|organizer|decor|furniture|storage|kitchen/.test(n)) return 'Home & Garden';
  if (/skin|face|hair|beauty|serum|cream|mask|roller|massager|brush|makeup|nail|perfume|lotion/.test(n)) return 'Health & Beauty';
  if (/shoe|sneaker|dress|shirt|jacket|pants|hat|bag|backpack|jewelry|sunglasses|hoodie|wallet/.test(n)) return 'Fashion';
  if (/gym|fitness|yoga|exercise|sport|ball|bike|weight|resistance|running/.test(n)) return 'Sports';
  if (/toy|game|puzzle|lego|doll|plush/.test(n)) return 'Toys & Games';
  if (/car |auto|vehicle|tire|dash|mount/.test(n)) return 'Automotive';
  if (/pet|dog|cat|leash|collar/.test(n)) return 'Pet Supplies';
  return 'General';
}

function extractPrice(item) {
  if (item.extracted_price && item.extracted_price > 0) return item.extracted_price;
  if (item.price) {
    const match = String(item.price).match(/[\d,.]+/);
    if (match) return parseFloat(match[0].replace(',', ''));
  }
  return 0;
}

export async function scrapeGoogleShopping(query, countryCode = 'us', device = 'desktop') {
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (!SERPAPI_KEY) {
    return {
      success: false,
      error: 'SERPAPI_KEY is not configured. Go to Vercel → Settings → Environment Variables and add your SerpAPI key.',
      products: [],
      debugInfo: { keyPresent: false },
    };
  }

  // Check cache
  const cacheKey = `serp-${query}-${countryCode}-${device}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.us;

  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query,
      api_key: SERPAPI_KEY,
      gl: config.gl,
      hl: config.hl,
      location: config.location,
      device: DEVICE_MAP[device] || 'desktop',
      num: '40',
    });

    const url = `https://serpapi.com/search.json?${params}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `SerpAPI returned HTTP ${res.status}. ${errBody.substring(0, 200)}`,
        products: [],
        debugInfo: { status: res.status, body: errBody.substring(0, 300) },
      };
    }

    const data = await res.json();

    // SerpAPI can return results in multiple fields — collect ALL of them
    const shopping = data.shopping_results || [];
    const inline = data.inline_shopping_results || [];
    const organic = data.organic_results || [];
    const allRaw = [...shopping, ...inline];

    // Debug info to help troubleshoot
    const debugInfo = {
      shoppingCount: shopping.length,
      inlineCount: inline.length,
      organicCount: organic.length,
      hasError: !!data.error,
      serpError: data.error || null,
      searchInfo: data.search_information || null,
      keys: Object.keys(data),
    };

    if (allRaw.length === 0) {
      return {
        success: false,
        error: data.error || `SerpAPI returned 0 shopping results for "${query}". Try a different search term.`,
        products: [],
        debugInfo,
      };
    }

    const adCount = (data.ads || []).length;
    const prices = allRaw.map(r => extractPrice(r)).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    const products = allRaw.map((item, idx) => {
      const price = extractPrice(item);
      const reviews = parseInt(item.reviews) || 0;
      const rating = parseFloat(item.rating) || 0;
      const sellers = item.comparisons_count || item.number_of_comparisons || Math.max(1, Math.floor(allRaw.length * 0.5));
      const { score, level } = calculateSaturation(sellers, reviews, adCount, maxPrice - minPrice, avgPrice);

      // Build the best available link
      let link = item.product_link || item.link || '';
      if (!link && item.serpapi_product_api) {
        link = item.serpapi_product_api;
      }

      // Build the best available image
      let imageUrl = item.thumbnail || item.image || '';

      return {
        id: `${Date.now()}-${idx}`,
        name: item.title || 'Unknown Product',
        price: Math.round(price * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        store: item.source || item.seller || '',
        rating,
        reviews,
        sellers,
        ads: adCount,
        imageUrl,
        link,
        shopLink: item.shopping_link || '',
        category: categorize(item.title),
        saturationScore: score,
        saturation: level,
        delivery: item.delivery || item.shipping || '',
        badge: item.tag || item.badge || '',
        oldPrice: item.extracted_old_price || null,
        extensions: item.extensions || [],
      };
    });

    const result = {
      success: true,
      query,
      country: countryCode,
      device,
      totalResults: data.search_information?.total_results || products.length,
      adCount,
      products,
      scrapedAt: new Date().toISOString(),
      debugInfo,
    };

    setCache(cacheKey, result);
    return result;

  } catch (error) {
    return {
      success: false,
      error: `SerpAPI fetch failed: ${error.message}`,
      products: [],
      debugInfo: { exception: error.message },
    };
  }
}

export async function findAlternatives(productName, countryCode = 'us', device = 'desktop') {
  const generic = productName
    .replace(/\b(Nike|Adidas|Apple|Samsung|Sony|Bose|JBL|Dyson|Philips|Anker|Xiaomi|Huawei|LG|Dell|HP|Lenovo|Logitech|North Face|Under Armour|Puma|Reebok|New Balance|Canon|Nikon|GoPro|Ring|Nest|Beats|Marshall)\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  return scrapeGoogleShopping(`${generic} unbranded generic`, countryCode, device);
}

export { calculateSaturation, categorize };
