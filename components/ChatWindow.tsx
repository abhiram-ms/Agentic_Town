
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, NPCData } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  selectedNPC: NPCData | null;
  onSendMessage: (msg: string) => void;
  isThinking?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, selectedNPC, onSendMessage, isThinking }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && selectedNPC && !isThinking) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
            <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p>Waiting for the town to awaken...</p>
          </div>
        )}
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.type === 'player' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${msg.type === 'player' ? 'text-sky-400' : 'text-slate-500'}`}>
                {msg.npcName}
              </span>
              <span className="text-[9px] text-slate-600">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className={`
              max-w-[85%] rounded-2xl px-3 py-2 text-sm
              ${msg.type === 'player' 
                ? 'bg-sky-600 text-white rounded-tr-none' 
                : msg.type === 'interaction' 
                  ? 'bg-slate-700 text-sky-200 border border-sky-500/30 rounded-tl-none' 
                  : 'bg-slate-800 text-slate-300 italic border border-slate-700 rounded-tl-none'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-slate-500 text-xs italic animate-pulse">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {selectedNPC?.name} is thinking...
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-800/50 border-t border-slate-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()} // Stop keyboard events from bubbling to Phaser
            disabled={!selectedNPC || isThinking}
            placeholder={isThinking ? "Waiting for response..." : selectedNPC ? `Message ${selectedNPC.name}...` : "Select an NPC to chat"}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            type="submit"
            disabled={!selectedNPC || !input.trim() || isThinking}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors shadow-lg shadow-sky-900/20"
          >
            {isThinking ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        {!selectedNPC && (
          <p className="text-[10px] text-slate-500 mt-2 text-center">Click an NPC in the town to influence their mood.</p>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
