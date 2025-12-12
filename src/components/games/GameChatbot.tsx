import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Bot, User, Loader2, Sparkles, Trash2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserStats } from "@/hooks/useUserStats";

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

interface GameContext {
  title: string;
  developer?: string | null;
  genre?: string | null;
  category?: string;
  size: string;
  version: string;
  description: string;
  slug?: string;
}

interface GameChatbotProps {
  gameContext: GameContext;
}

const CHAT_STORAGE_PREFIX = "ktm_chat_";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/game-chat`;

const getChatStorageKey = (gameTitle: string) => {
  return `${CHAT_STORAGE_PREFIX}${gameTitle.toLowerCase().replace(/\s+/g, '_')}`;
};

const loadMessages = (gameTitle: string): Message[] => {
  try {
    const stored = localStorage.getItem(getChatStorageKey(gameTitle));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveMessages = (gameTitle: string, messages: Message[]) => {
  try {
    localStorage.setItem(getChatStorageKey(gameTitle), JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
};

const clearMessages = (gameTitle: string) => {
  try {
    localStorage.removeItem(getChatStorageKey(gameTitle));
  } catch {
    // Ignore storage errors
  }
};

// Typing animation component
const TypingText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const speed = Math.random() * 20 + 10; // Variable speed for natural feel
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <span className="relative">
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5" />
      )}
    </span>
  );
};

export const GameChatbot = ({ gameContext }: GameChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(gameContext.title));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageIndex, setTypingMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { incrementStat } = useUserStats();

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(gameContext.title, messages);
    }
  }, [messages, gameContext.title]);

  // Load messages when game changes
  useEffect(() => {
    setMessages(loadMessages(gameContext.title));
  }, [gameContext.title]);

  const handleClearChat = useCallback(() => {
    clearMessages(gameContext.title);
    setMessages([]);
    setTypingMessageIndex(null);
  }, [gameContext.title]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Increment chat messages stat
    incrementStat('chat_messages_sent');

    let assistantContent = "";
    let isAborted = false;

    // Create abort controller
    abortControllerRef.current = new AbortController();
    abortControllerRef.current.signal.addEventListener('abort', () => {
      isAborted = true;
    });

    try {
      // Add empty assistant message with typing indicator
      setMessages(prev => [...prev, { role: "assistant", content: "", isTyping: true }]);
      const newMsgIndex = messages.length + 1;

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userMessage.content }],
          gameContext,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done || isAborted) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                  isTyping: false,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
      
      // Set typing animation for the final message
      setTypingMessageIndex(newMsgIndex);
    } catch (error: any) {
      console.error("Chat error:", error);
      if (!isAborted) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button - Adjusted for mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 p-4 rounded-full",
          "bg-gradient-to-r from-primary to-secondary",
          "shadow-lg shadow-primary/30",
          "hover:shadow-xl hover:shadow-primary/40 hover:scale-110",
          "transition-all duration-300",
          "animate-bounce-slow",
          // Position adjustments for mobile to avoid overlap with bottom nav
          "bottom-20 md:bottom-6 left-4 md:left-6",
          isOpen && "hidden"
        )}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
      </button>

      {/* Chat Window - Adjusted for mobile */}
      <div
        className={cn(
          "fixed z-50",
          // Mobile: full width with proper margins, Desktop: fixed width
          "left-2 right-2 md:left-6 md:right-auto md:w-[440px]",
          // Mobile: above bottom nav, Desktop: normal position
          "bottom-24 md:bottom-6",
          "bg-background/95 backdrop-blur-xl border border-border/50",
          "rounded-2xl shadow-2xl shadow-primary/20",
          "transition-all duration-500 ease-out",
          "flex flex-col",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 h-[60vh] md:h-[580px] max-h-[calc(100vh-120px)] md:max-h-none"
            : "opacity-0 translate-y-8 scale-95 h-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow">
                <img src="/favicon.png" alt="KTM AI" className="w-6 h-6 object-contain" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground flex items-center gap-1">
                كَتَم AI
                <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
              </h3>
              <p className="text-xs text-muted-foreground">مساعدك الذكي للألعاب</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="hover:bg-destructive/10 hover:text-destructive rounded-full transition-all duration-300 hover:rotate-12"
                title="مسح المحادثة"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-destructive/10 hover:text-destructive rounded-full transition-all duration-300 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-float">
                <img src="/favicon.png" alt="KTM AI" className="w-8 h-8 object-contain" />
              </div>
              <h4 className="font-bold text-foreground mb-2 animate-slide-up">مرحباً! 👋</h4>
              <p className="text-sm text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                أنا كَتَم AI، اسألني أي شيء عن لعبة "{gameContext.title}"
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["ملخص اللعبة", "طريقة التحميل", "هل آمنة؟"].map((q, i) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 rounded-full transition-all duration-300 hover:scale-105 animate-scale-in"
                    style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "",
                // Animation for new messages
                "animate-message-in"
              )}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  msg.role === "user"
                    ? "bg-secondary/20"
                    : "bg-gradient-to-br from-primary to-secondary animate-pulse-glow"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-secondary" />
                ) : (
                  <img src="/favicon.png" alt="KTM AI" className="w-4 h-4 object-contain" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] p-3 rounded-2xl text-sm transition-all duration-300",
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground rounded-br-sm animate-slide-in-right"
                    : "bg-muted rounded-bl-sm animate-slide-in-left"
                )}
              >
                {msg.isTyping ? (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : msg.content ? (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-muted rounded-xl border-0 focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground transition-all duration-300 focus:scale-[1.02]"
            />
            <Button
              onClick={isLoading ? stopGeneration : sendMessage}
              disabled={!input.trim() && !isLoading}
              className={cn(
                "rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg",
                isLoading 
                  ? "bg-destructive hover:bg-destructive/90 hover:shadow-destructive/30" 
                  : "bg-gradient-to-r from-primary to-secondary hover:opacity-90 hover:shadow-primary/30"
              )}
            >
              {isLoading ? (
                <Square className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes message-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-message-in {
          animation: message-in 0.4s ease-out forwards;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </>
  );
};
