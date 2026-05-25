import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config/api';
import { 
  Send, 
  Trash2, 
  Loader2, 
  Bot, 
  ArrowRight
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export const Assistant: React.FC = () => {
  const { token } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts
  const suggestedPrompts = [
    "How much did I spend on food this month?",
    "Where can I reduce expenses?",
    "Show my biggest expenses.",
    "Predict next month's spending."
  ];

  // Fetch persistent chat logs from backend
  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load chat logs:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Scroll to bottom upon list changes
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Send message
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setInputValue('');
    setLoading(true);

    // Optimistically add user message in front-end
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to communicate with AI');
      }

      // Add response message in front-end
      const tempAiMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: resData.reply,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempAiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'I had trouble understanding that. Please ensure the backend server is running and try again.'}`,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Wipe chat history
  const handleClearHistory = async () => {
    if (confirm('Wipe your AI chat history logs? This is irreversible.')) {
      try {
        await fetch(`${API_BASE}/api/chat/history`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages([]);
      } catch (err) {
        console.error('Failed to wipe logs:', err);
      }
    }
  };

  // Quick markdown parser
  const renderMessageContent = (content: string) => {
    // Escape standard code ticks and line breaks
    return (
      <div className="space-y-1.5 whitespace-pre-wrap leading-relaxed font-medium">
        {content.split('\n').map((line, idx) => {
          // Detect bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start pl-2">
                <span className="text-brand-500 mr-2 flex-shrink-0">•</span>
                <span className="text-xs">{line.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }
          
          // Basic bold parsing (**text**)
          let parsedLine: React.ReactNode = line;
          if (line.includes('**')) {
            const parts = line.split('**');
            parsedLine = parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-slate-900 dark:text-white">{part}</strong> : part);
          }

          return <p key={idx} className="text-xs">{parsedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[800px] space-y-4">
      
      {/* 1. Chat Header */}
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Financial Assistant</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Query your transaction logs and obtain automated budget strategies
          </p>
        </div>

        {messages.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl text-xs font-bold transition-all"
            title="Clear Chat Logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Wipe Logs</span>
          </button>
        )}
      </div>

      {/* 2. Primary Conversation Arena */}
      <div className="flex-1 glass-card border border-slate-200/40 dark:border-slate-800/40 rounded-3xl p-6 flex flex-col min-h-0 relative shadow-sm">
        
        {fetchingHistory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
            <span className="text-xs font-semibold">Retrieving dialogue history...</span>
          </div>
        ) : messages.length === 0 ? (
          
          /* Empty Chat Splash screen */
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center max-w-lg mx-auto">
            <div className="bg-brand-500/10 dark:bg-brand-500/5 text-brand-600 p-4 rounded-3xl pulse-glow mb-4">
              <Bot className="h-10 w-10" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-250">Live Financial Intelligence Bot</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              I have direct API-level read access to your transaction log ledger. You can ask me to calculate totals, predict forecast balances, identify overspending areas, or plan investments.
            </p>

            {/* suggested Prompts container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3 bg-slate-50 dark:bg-darkBg-850 hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-600 dark:text-slate-350 hover:text-brand-700 dark:hover:text-brand-300 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-[10px] font-bold text-left flex justify-between items-center smooth-hover"
                >
                  <span>{prompt}</span>
                  <ArrowRight className="h-3 w-3 opacity-60 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

        ) : (
          
          /* Live Bubbles Container */
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth">
            {messages.map((msg) => {
              const isAi = msg.role === 'assistant';
              return (
                <div key={msg.id} className={`flex items-start space-x-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}>
                  
                  {isAi && (
                    <div className="h-7 w-7 rounded-lg bg-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                  )}

                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                    isAi 
                      ? 'bg-slate-100 dark:bg-darkBg-750 text-slate-850 dark:text-slate-100 rounded-tl-sm border border-slate-200/30 dark:border-slate-800' 
                      : 'bg-brand-600 text-white rounded-tr-sm shadow-brand-500/10'
                  }`}>
                    {renderMessageContent(msg.content)}
                  </div>

                  {!isAi && (
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 text-xs font-bold font-mono">
                      U
                    </div>
                  )}

                </div>
              );
            })}

            {loading && (
              <div className="flex items-start space-x-2.5 justify-start">
                <div className="h-7 w-7 rounded-lg bg-brand-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="max-w-[70%] bg-slate-100 dark:bg-darkBg-750 text-slate-400 rounded-2xl rounded-tl-sm px-4 py-3.5 border border-slate-250/20 dark:border-slate-800 flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  <span className="text-[10px] font-bold tracking-wider animate-pulse uppercase">Assistant is analyzing...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}

      </div>

      {/* 3. Input Message Submit Bar */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={loading || fetchingHistory}
          placeholder="Ask a question... (e.g. Where can I reduce food expenses?)"
          className="flex-1 px-4 py-3 bg-white dark:bg-darkBg-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || loading}
          className="px-5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-2xl transition-all shadow-md shadow-brand-500/10 flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );
};
