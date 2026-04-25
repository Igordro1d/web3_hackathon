import { useEffect, useRef, useState } from 'react';

type ChatItem =
  | { kind: 'user'; text: string }
  | { kind: 'step'; text: string }
  | { kind: 'agent'; text: string }
  | { kind: 'error'; text: string };

export default function App() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input.trim();
    setInput('');
    setLoading(true);
    setItems((prev) => [...prev, { kind: 'user', text: message }]);

    try {
      const res = await fetch('http://localhost:3002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line) as {
              type: string;
              text?: string;
              role?: string;
            };

            if (event.type === 'step' && event.text) {
              setItems((prev) => [...prev, { kind: 'step', text: event.text! }]);
            } else if (event.type === 'message' && event.text) {
              setItems((prev) => [...prev, { kind: 'agent', text: event.text! }]);
            } else if (event.type === 'error' && event.text) {
              setItems((prev) => [...prev, { kind: 'error', text: event.text! }]);
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch {
      setItems((prev) => [...prev, { kind: 'error', text: 'Could not reach agent backend.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">Agent Chat</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Powered by x402 — agent pays for API access automatically using USDC
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {items.length === 0 && (
          <p className="text-center text-gray-600 text-sm mt-20">
            Ask your agent to fetch data from a paid API endpoint.
          </p>
        )}

        {items.map((item, i) => {
          if (item.kind === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-sm text-sm">
                  {item.text}
                </div>
              </div>
            );
          }

          if (item.kind === 'step') {
            return (
              <div key={i} className="flex justify-center">
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 font-mono text-xs text-green-400 max-w-lg w-full">
                  {item.text}
                </div>
              </div>
            );
          }

          if (item.kind === 'agent') {
            return (
              <div key={i} className="flex justify-start">
                <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-2 max-w-sm text-sm">
                  {item.text}
                </div>
              </div>
            );
          }

          if (item.kind === 'error') {
            return (
              <div key={i} className="flex justify-center">
                <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-1.5 text-xs text-red-400 max-w-lg w-full">
                  {item.text}
                </div>
              </div>
            );
          }
        })}

        {loading && (
          <div className="flex justify-center">
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 font-mono text-xs text-yellow-400">
              agent working...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-800 px-4 py-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Get me the premium data from the business API..."
          disabled={loading}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
