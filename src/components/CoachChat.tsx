"use client";

import { useEffect, useRef, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };

export default function CoachChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setError(null);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "coach reageert niet");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: json.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "onbekende fout");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-6 max-w-md mx-auto flex flex-col">
      <h1 className="text-xl font-semibold mb-4">Coach</h1>

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto mb-4">
        {messages.length === 0 && (
          <p className="text-neutral-500 text-sm">
            Stel een vraag over voeding, training of herstel — de coach kent je profiel, doelen en logs.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl px-4 py-2 max-w-[85%] whitespace-pre-wrap ${
              m.role === "user" ? "bg-lime-400 text-neutral-950 self-end" : "bg-neutral-900 text-neutral-100 self-start"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <div className="text-neutral-500 text-sm self-start">Coach typt...</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      <div className="flex gap-2 sticky bottom-0 pb-2">
        <input
          className="flex-1 rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:border-neutral-600"
          placeholder="Stel je vraag..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={sending}
          className="rounded-md bg-lime-400 text-neutral-950 font-medium px-4 py-2 disabled:opacity-50"
        >
          Stuur
        </button>
      </div>
    </main>
  );
}
