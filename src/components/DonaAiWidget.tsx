import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Loader2, Bot, User, HelpCircle, Mic, MicOff } from 'lucide-react';
import { OpenAIService } from '@/lib/openai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DonaAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Abaana bange! Welcome to DONALISA. 🇺🇬 I am DONA AI, your virtual guide. Ask me anything about our zero-data cinematic streaming or how BizLink Uganda can boost your trade!"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const presetQuestions = [
    { text: "How does offline download work?", icon: "🎬" },
    { text: "What is BizLink Uganda?", icon: "🛍️" },
    { text: "Can I view merchants on a map?", icon: "📍" },
    { text: "How do I register my shop?", icon: "✨" }
  ];

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(prev => {
            const space = prev.trim() ? ' ' : '';
            return prev + space + transcript;
          });
        }
      };
      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!isSpeechSupported || !recognitionRef.current) {
      alert("Speech Recognition is not supported or permission was denied in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    const updatedMessages = [...messages, { role: 'user', content: text } as Message];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const replyText = await OpenAIService.donaAI(updatedMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
    } catch (err) {
      console.error('Error talking to DONA AI:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oh dear, I had trouble connecting to my central operational gateway. Please double check that the admin has added the OPENAI_API_KEY in Settings."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans text-left">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 sm:w-96 h-[500px] bg-[#0c0c0e]/95 border border-[#22222b] rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md mb-4"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-red-950 via-zinc-900 to-cyan-950 border-b border-[#222] flex items-center justify-between relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-red-500/50 to-cyan-400/50" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10">
                  <Bot className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider text-white font-mono flex items-center gap-1.5">
                    DONA AI
                    <span className="text-[8px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded-full border border-cyan-500/20 uppercase font-black tracking-widest animate-pulse">
                      Live Help
                    </span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono">Kampala Premium Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[#1a1a1f] rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 max-w-[85%] ${
                    msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border text-[10px] ${
                    msg.role === 'user' 
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-500/20' 
                      : 'bg-red-950 text-red-400 border-red-500/20'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-950/40 border border-cyan-500/20 text-cyan-100 rounded-tr-none'
                      : 'bg-zinc-900 border border-[#222] text-zinc-300 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 max-w-[85%]">
                  <div className="w-6 h-6 rounded-md bg-red-950 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl text-xs bg-zinc-900 border border-[#222] text-zinc-500 rounded-tl-none flex items-center gap-2">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Presets Grid */}
            {messages.length < 3 && !isLoading && (
              <div className="px-4 pb-3">
                <div className="text-[10px] text-zinc-500 font-mono mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-red-500" /> Suggested topics:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {presetQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => handleSendMessage(q.text)}
                      className="p-2 text-[10px] bg-zinc-950 hover:bg-[#15151a] border border-[#222] hover:border-[#333] text-zinc-300 hover:text-white rounded-xl text-left transition-all flex items-center gap-1.5 cursor-pointer leading-tight truncate"
                    >
                      <span>{q.icon}</span>
                      <span className="truncate">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-3 border-t border-[#222] bg-[#0a0a0c] flex items-center gap-2">
              <input
                type="text"
                placeholder={isListening ? "Listening... Speak now 🎙️" : "Ask DONA AI anything..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-zinc-900 hover:bg-zinc-900/80 border border-[#222] focus:border-red-600 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all"
                disabled={isLoading}
              />
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 animate-pulse'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-[#222]'
                  }`}
                  title={isListening ? 'Click to stop listening' : 'Dictate with your voice'}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={() => handleSendMessage()}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-red-600/20 disabled:opacity-50"
                disabled={isLoading || !inputValue.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-600/30 cursor-pointer relative"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
      </motion.button>
    </div>
  );
}
