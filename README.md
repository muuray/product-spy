# ⚡ ProductSpy — AI-Powered Product Research Agent

An intelligent product research tool that scrapes Google Shopping, analyzes market saturation, finds unbranded alternatives, and **learns continuously** using Claude AI.

## What Makes This Different

This is not a static tool — it's an **AI Agent** that:
- 🧠 **Learns** from every search you make
- 📈 **Tracks** products over time and detects trends
- 🔄 **Finds** unbranded alternatives using AI reasoning
- 📊 **Analyzes** saturation with multi-factor scoring
- 🕐 **Runs daily** to discover new opportunities (via cron)

## Features

| Feature | Description |
|---------|-------------|
| 🔍 Real-time Search | Scrapes Google Shopping live |
| 🖼️ Product Images | Real product images from Google |
| 🔗 Clickable Links | Direct links to every product |
| 📊 Saturation Score | 0-100 score based on sellers, reviews, ads, price variance |
| 🔄 Unbranded Alts | AI finds generic versions of branded products |
| 📱 Device Emulation | Desktop, iPhone, Android search results |
| 🌍 Geo-targeting | US, UK, Canada, Germany, Australia, France |
| 🧠 AI Agent | Claude-powered analysis and insights |
| 📈 Learning System | Accumulates knowledge over time |
| ⏰ Daily Cron | Auto-discovers new trends every day |

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR-USERNAME/product-spy.git
cd product-spy
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your **Anthropic API key**:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> Get a key at https://console.anthropic.com/

### 3. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy ✅

The daily learning cron job runs automatically on Vercel.

## How the AI Agent Works

```
User searches "portable neck fan"
        ↓
Scraper → Google Shopping → Real products with images, links, prices
        ↓
AI Agent → Claude analyzes: saturation, opportunities, trends
        ↓
Store → Products saved, patterns tracked
        ↓
Daily Cron → Agent reviews all data, generates insights
        ↓
Next search → Agent is smarter, knows market history
```

## API Endpoints

| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/api/search` | GET | `q`, `country`, `device` | Search products |
| `/api/alternatives` | GET | `product`, `country`, `device` | Find unbranded alts |
| `/api/agent` | GET | — | Agent status & insights |
| `/api/cron` | GET | — | Trigger daily learning |

## Saturation Score Algorithm

| Factor | Points | Logic |
|--------|--------|-------|
| Sellers | 0-30 | More sellers = higher saturation |
| Reviews | 0-25 | More reviews = established market |
| Ads | 0-25 | More ads = competitive market |
| Price Variance | 0-20 | Wide price range = price war |

| Score | Level | Meaning |
|-------|-------|---------|
| 0-34 | 🟢 LOW | Great opportunity |
| 35-64 | 🟡 MEDIUM | Moderate competition |
| 65-100 | 🔴 HIGH | Very competitive |

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS + Recharts
- **Scraping**: Cheerio (HTML parsing)
- **AI Brain**: Claude API (Anthropic)
- **Hosting**: Vercel (with cron jobs)
- **Data**: In-memory store (upgrade to Supabase for persistence)

## Roadmap

- [ ] Supabase/PlanetScale for persistent data storage
- [ ] SerpAPI integration for more reliable scraping
- [ ] Email alerts for new trending products
- [ ] User accounts & saved searches
- [ ] Chrome extension
- [ ] Export to CSV/Excel
- [ ] Price history charts

## License

MIT
