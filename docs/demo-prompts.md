# Demo Prompts

Prompts to use when demoing the agent chat. Each call to a paywalled endpoint costs 0.01 USDC and settles on-chain — more complex prompts trigger multiple paid calls, making the payment flow more visible.

---

## Binance — Spot Price (`/premium`)

Simple one-call prompts. Good for a quick first demo.

- "What is the current price of Bitcoin?"
- "What is ETH trading at right now?"
- "Give me the price of AVAX."
- "How much does one Solana cost?"

---

## Binance — 24hr Stats (`/premium/stats`)

Triggers one paid call per asset. Shows the richer 24hr stats endpoint.

- "How has Bitcoin performed today?"
- "What is the 24-hour price change for Ethereum?"
- "What was the high and low for SOL in the last 24 hours?"
- "How much AVAX has been traded today?"
- "Is BTC up or down compared to yesterday?"

---

## Binance — Candlestick / Trend Analysis (`/premium/klines`)

Triggers one paid call. Shows the klines endpoint and gives the agent something to reason about.

- "Is Bitcoin in an uptrend or downtrend over the last 6 hours?"
- "Show me the hourly BTC price movement over the last 24 hours."
- "What has been ETH's price range in the last 4 hours?"
- "Has Solana been gaining momentum today, looking at hourly candles?"
- "Give me the daily BTC candles for the last week."

---

## Multi-Asset Comparisons (multiple paid calls per prompt)

These are the best for demos — the agent calls the API two or three times, paying 0.01 USDC each time, and the dashboard accumulates transactions in real time.

- "Compare the price of BTC, ETH, and SOL right now."
- "Which performed better today — Bitcoin or Ethereum? Show me the numbers."
- "Which of BTC, ETH, or AVAX has had the highest trading volume in the last 24 hours?"
- "Is BTC or ETH more volatile today based on their 24hr price swings?"
- "Give me a market summary for BTC, ETH, SOL, and AVAX."
- "Which coin has recovered more from its daily low — BTC or ETH?"

---

## Analysis Prompts (combines stats + klines in one conversation)

These prompt the agent to call both endpoints for the same asset, generating two paid transactions.

- "Analyse Bitcoin's performance today and tell me if the trend is accelerating."
- "Is Ethereum bullish right now? Check both the 24hr stats and the last few hourly candles."
- "Give me a full rundown on SOL — price, daily performance, and recent trend."

---

## Additional Binance Endpoints Worth Adding

The following are straightforward to add following the same pattern (new route in `demo-business`, new tool in `agent-chat-backend`):

| Endpoint | Binance API | What it unlocks |
|---|---|---|
| `/premium/orderbook` | `GET /api/v3/depth?symbol=X&limit=5` | Best bid/ask, buy vs sell pressure. Prompt: *"What is the order book depth for BTC right now?"* |
| `/premium/trades` | `GET /api/v3/trades?symbol=X&limit=20` | Recent trade list, average fill size. Prompt: *"What have the last 20 BTC trades looked like?"* |
| `/premium/avgprice` | `GET /api/v3/avgPrice?symbol=X` | 5-minute weighted average price. Prompt: *"What is BTC's current average price over the last 5 minutes?"* |
| `/premium/tickers` | `GET /api/v3/ticker/24hr` (no symbol) | Full market scan across all pairs. Prompt: *"Which crypto has the highest 24hr percentage gain right now?"* |

---

## NZ Herald — Adding This Endpoint

**Ease: easy.** NZ Herald publishes a public RSS feed. No API key needed. The route would:
1. `fetch('https://www.nzherald.co.nz/arc/outboundfeeds/rss/')` to get the XML feed
2. Parse the XML (using a small library like `fast-xml-parser`)
3. Return the top N stories as JSON

The agent tool would be `get_nz_herald_headlines`. Example prompts:
- *"What are the top NZ Herald stories right now?"*
- *"Is there any news about the NZ economy today?"*

A category-specific feed (e.g. business, sport) can be used for more targeted queries.

---

## Weather — Adding This Endpoint

**Ease: easy, no API key required.** [Open-Meteo](https://open-meteo.com) is a free weather API that requires no registration. The route would accept a `lat`/`lon` or a city name (resolved via a geocoding call, also free from Open-Meteo), then return a forecast.

The agent tool would be `get_weather_forecast`. Example prompts:
- *"What's the weather looking like in Auckland tomorrow?"*
- *"Will it rain in Wellington this weekend?"*
- *"What temperature should I expect in Queenstown tomorrow morning?"*
