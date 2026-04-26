# apps/agent-chat + apps/agent-chat-backend

The interactive demo — a user types a request to their AI agent in a chat UI, the agent autonomously pays for a paywalled API, and every payment step streams live to the browser.

---

## Architecture

```
Browser (port 5174)
  └── POST /api/chat { message }
        │
        ▼
Express SSE backend (port 3002)
  ├── Runs GPT-4o agent loop
  ├── agent-sdk handles 402 payment flow
  └── Streams events via SSE:
        { type: 'step', text: '← 402 Payment Required — 0.01 USDC' }
        { type: 'step', text: '✍ Signing EIP-712...' }
        { type: 'step', text: '← 200 Access granted' }
        { type: 'message', role: 'agent', text: 'I fetched...' }
        { type: 'done' }
```

---

## apps/agent-chat-backend

**Port:** 3002
**Entry:** `apps/agent-chat-backend/src/server.ts`

### Endpoint: `POST /api/chat`

Accepts `{ message: string }`, responds with an SSE stream.

The agent loop is identical to `demo-agent` but instead of logging to the terminal, payment steps are forwarded as SSE `step` events by temporarily patching `console.log` to intercept `[agent-sdk]` lines.

### SSE Event Types

| Type | Payload | When |
|---|---|---|
| `step` | `{ text }` | Each agent-sdk payment step |
| `message` | `{ role: 'agent', text }` | GPT-4o final answer |
| `error` | `{ text }` | On any failure |
| `done` | — | Stream complete |

### Running

```bash
pnpm dev:agent-chat-backend
```

---

## apps/agent-chat

**Port:** 5174
**Entry:** `apps/agent-chat/src/App.tsx`

### UI Components

| Element | Style |
|---|---|
| User message | Right-aligned indigo bubble |
| Payment step | Centred green monospace card — streams live |
| Agent response | Left-aligned gray bubble |
| Error | Red card |

### SSE Reading Pattern

Since `EventSource` doesn't support `POST`, the frontend uses `fetch` with a `ReadableStream` reader:

```typescript
const res = await fetch('http://localhost:3002/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
});
const reader = res.body!.getReader();
// read chunks → split on \n\n → parse JSON → update state
```

### Running

```bash
pnpm dev:agent-chat   # → http://localhost:5174
```

---

## Demo Flow

1. Open `http://localhost:5174`
2. Type: *"Get me the premium data from the business API"*
3. Watch live in the chat:
   - `← 402 Payment Required — 0.01 USDC`
   - `✍ Signing EIP-712 TransferWithAuthorization...`
   - `← 200 — access granted`
4. Agent reply appears: *"I fetched the premium data..."*
5. Transaction logged to Supabase and visible on dashboard
