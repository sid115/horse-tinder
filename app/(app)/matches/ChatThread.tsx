"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { sendMessage } from "./actions";

type Message = { id: string; senderUserId: string; body: string; createdAt: string };

export default function ChatThread({ matchId, meId, initial }: { matchId: string; meId: string; initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/matches/${matchId}/messages`);
      if (res.ok) setMessages((await res.json()).messages);
    }, 3000);
    return () => clearInterval(t);
  }, [matchId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    await sendMessage(matchId, body);
    const res = await fetch(`/api/matches/${matchId}/messages`);
    if (res.ok) setMessages((await res.json()).messages);
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 space-y-2 overflow-y-auto rounded border border-neutral-800 p-3">
        {messages.map((m) => (
          <div key={m.id} className={m.senderUserId === meId ? "text-right" : "text-left"}>
            <span className="inline-block rounded bg-neutral-800 px-3 py-1">{m.body}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          className="flex-1 rounded bg-neutral-800 px-3 py-2" />
        <button className="rounded bg-emerald-600 px-4 py-2">Send</button>
      </form>
    </div>
  );
}
