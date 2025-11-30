"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function AiChatPage() {
  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/api/chat`,
    }),
  });
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  useEffect(() => {
    if (status === 'ready' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl border rounded-xl shadow-lg bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">Ask me anything...</div>
        )}

        {messages.map((message, i) => (
          <div key={message.id ?? i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
                }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.parts.map((part, index) =>
                  part.type === 'text' ? <span key={index}>{part.text}</span> : null
                )}
              </p>
            </div>
          </div>
        ))}

        {(status === 'submitted' || status === 'streaming') && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 text-gray-400 text-sm">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
          disabled={status !== 'ready'}
        />
        <button
          type="submit"
          disabled={status !== 'ready' || !input.trim()}
          className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-gray-800 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
