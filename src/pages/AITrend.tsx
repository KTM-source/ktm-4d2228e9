import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-markup";
import {
  Send,
  Bot,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  LogOut,
  Menu,
  X,
  Lock,
  TrendingUp,
  Search,
  Clock,
  Gamepad2,
  Home,
  History,
  Flame,
  Star,
  Calendar,
  ChevronRight,
  Zap,
  Bold,
  List,
  Code,
  ExternalLink,
  Image as ImageIcon,
  ZoomIn,
  AlertTriangle,
  Table,
  Copy,
  Check,
  Code2,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  isAnimating?: boolean;
  displayedContent?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface TrendingGame {
  name: string;
  image?: string;
  genres?: string[];
  platform?: string;
  fetchedAt?: string;
}

interface TrendHistory {
  games: TrendingGame[];
  fetchedAt: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trend-chat`;

// Language mapping for Prism
const languageMap: { [key: string]: string } = {
  js: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  html: "markup",
  xml: "markup",
  css: "css",
  python: "python",
  py: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  cs: "csharp",
  "c#": "csharp",
  csharp: "csharp",
  php: "php",
  ruby: "ruby",
  rb: "ruby",
  go: "go",
  rust: "rust",
  rs: "rust",
  sql: "sql",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  markdown: "markdown",
  javascript: "javascript",
  typescript: "typescript",
};

// Escape HTML entities for safe display
const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
};

// Code Block Component with syntax highlighting
const CodeBlock = ({ 
  code, 
  language 
}: { 
  code: string; 
  language: string;
}) => {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  
  const normalizedLang = languageMap[language?.toLowerCase()] || "javascript";
  
  useEffect(() => {
    if (!code) {
      setHighlightedCode("");
      return;
    }
    
    try {
      // Check if language is supported
      const grammar = Prism.languages[normalizedLang];
      if (grammar) {
        // Prism.highlight handles escaping internally
        const highlighted = Prism.highlight(code, grammar, normalizedLang);
        setHighlightedCode(highlighted);
      } else {
        // Fallback: escape HTML and show as plain text
        setHighlightedCode(escapeHtml(code));
      }
    } catch (error) {
      console.error("Prism highlighting error:", error);
      // Fallback: escape HTML and show as plain text
      setHighlightedCode(escapeHtml(code));
    }
  }, [code, normalizedLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  if (!code) return null;

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1d1f21] animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-gray-400">{language || "code"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="mr-1.5 text-xs">{copied ? "تم النسخ" : "نسخ"}</span>
        </Button>
      </div>
      <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <pre className="p-4 m-0 text-sm leading-relaxed text-gray-300">
          <code 
            className={`language-${normalizedLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
};

// Image Lightbox Component
const ImageLightbox = ({ 
  src, 
  alt, 
  isOpen, 
  onClose 
}: { 
  src: string; 
  alt: string; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300"
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <img 
        src={src} 
        alt={alt} 
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

// Rich content parser with tables, images, links, code blocks
const RichContent = ({ 
  content, 
  isAnimating,
  displayedLength 
}: { 
  content: string; 
  isAnimating?: boolean;
  displayedLength?: number;
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Safety check for content
  if (!content || typeof content !== 'string') {
    return <div className="text-gray-400">...</div>;
  }
  
  const textToRender = isAnimating && displayedLength !== undefined 
    ? content.slice(0, displayedLength) 
    : content;

  const parseContent = (text: string) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;
    let tableBuffer: string[] = [];
    let inTable = false;

    while (i < lines.length) {
      const line = lines[i];
      
      // Detect table
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableBuffer = [];
        }
        tableBuffer.push(line);
        i++;
        continue;
      } else if (inTable) {
        elements.push(renderTable(tableBuffer, elements.length));
        tableBuffer = [];
        inTable = false;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={`empty-${i}`} className="h-3" />);
        i++;
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***') {
        elements.push(
          <hr key={`hr-${i}`} className="border-white/10 my-6" />
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-bold text-emerald-400 mt-4 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {parseInlineFormatting(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-bold text-white mt-5 mb-3">
            {parseInlineFormatting(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold text-white mt-5 mb-3">
            {parseInlineFormatting(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Code blocks with syntax highlighting
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim() || "javascript";
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <CodeBlock 
            key={`code-${i}`} 
            code={codeLines.join('\n')} 
            language={lang} 
          />
        );
        i++;
        continue;
      }

      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
        const bulletContent = line.replace(/^[\s]*[-•*]\s*/, '');
        elements.push(
          <div key={`bullet-${i}`} className="flex gap-3 my-1.5 mr-2">
            <span className="text-emerald-400 mt-0.5">•</span>
            <span className="flex-1">{parseInlineFormatting(bulletContent)}</span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex gap-3 my-1.5 mr-2">
            <span className="text-emerald-400 font-semibold min-w-[1.5rem]">{numberedMatch[1]}.</span>
            <span className="flex-1">{parseInlineFormatting(numberedMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="my-2 leading-relaxed">
          {parseInlineFormatting(line)}
        </p>
      );
      i++;
    }

    if (inTable && tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, elements.length));
    }

    return elements;
  };

  const renderTable = (tableLines: string[], key: number) => {
    if (tableLines.length < 2) return null;
    
    const parseRow = (line: string) => {
      return line.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());
    };
    
    const headers = parseRow(tableLines[0]);
    const dataRows = tableLines.slice(2).map(parseRow);
    
    return (
      <div key={`table-${key}`} className="my-6 overflow-x-auto animate-fade-in">
        <table className="w-full border-collapse rounded-xl overflow-hidden bg-[#0d1117]/80 backdrop-blur-xl">
          <thead>
            <tr className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20">
              {headers.map((header, i) => (
                <th 
                  key={i} 
                  className="px-4 py-3 text-right text-sm font-bold text-emerald-400 border-b border-white/10"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex} 
                    className="px-4 py-3 text-sm text-gray-300"
                  >
                    {parseInlineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const parseInlineFormatting = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    // Image URLs
    const imageRegex = /\[?(https?:\/\/[^\s\]]+\.(jpg|jpeg|png|gif|webp)(\?[^\s\]]*)?)\]?(\([^\)]*\))?/gi;
    
    let result = remaining;
    const imageMatches: { match: string; url: string; index: number }[] = [];
    
    let imgMatch;
    while ((imgMatch = imageRegex.exec(result)) !== null) {
      imageMatches.push({
        match: imgMatch[0],
        url: imgMatch[1],
        index: imgMatch.index
      });
    }

    if (imageMatches.length > 0) {
      let lastIndex = 0;
      imageMatches.forEach((img, idx) => {
        if (img.index > lastIndex) {
          const beforeText = result.slice(lastIndex, img.index);
          elements.push(...parseTextFormatting(beforeText, keyCounter++));
        }
        
        elements.push(
          <div key={`img-${keyCounter++}`} className="my-4">
            <div 
              className="relative group cursor-pointer inline-block"
              onClick={() => setLightboxImage(img.url)}
            >
              <img 
                src={img.url} 
                alt="صورة" 
                className="max-w-full h-auto rounded-xl border border-white/10 shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-[1.02]"
                style={{ maxHeight: '300px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>
        );
        
        lastIndex = img.index + img.match.length;
      });
      
      if (lastIndex < result.length) {
        elements.push(...parseTextFormatting(result.slice(lastIndex), keyCounter++));
      }
    } else {
      elements.push(...parseTextFormatting(result, keyCounter));
    }

    return elements;
  };

  const parseTextFormatting = (text: string, startKey: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let remaining = text;
    let key = startKey;

    const parts = remaining.split(/(\[[^\]]+\]\([^\)]+\))/g);
    
    parts.forEach((part, i) => {
      const linkMatch = part.match(/\[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a 
            key={`link-${key++}`}
            href={linkMatch[2]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
          >
            {linkMatch[1]}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      } else if (part) {
        const formattedParts = part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        formattedParts.forEach((fp, j) => {
          if (fp.startsWith('**') && fp.endsWith('**')) {
            elements.push(
              <strong key={`bold-${key++}`} className="font-bold text-white">
                {fp.slice(2, -2)}
              </strong>
            );
          } else if (fp.startsWith('`') && fp.endsWith('`')) {
            elements.push(
              <code key={`code-${key++}`} className="bg-white/10 px-2 py-0.5 rounded-lg text-emerald-300 font-mono text-sm">
                {fp.slice(1, -1)}
              </code>
            );
          } else if (fp) {
            const urlParts = fp.split(/(https?:\/\/[^\s]+)/g);
            urlParts.forEach((up, k) => {
              if (up.match(/^https?:\/\//)) {
                elements.push(
                  <a 
                    key={`url-${key++}`}
                    href={up} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 inline-flex items-center gap-1 transition-colors break-all"
                  >
                    {up.length > 50 ? up.slice(0, 50) + '...' : up}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                );
              } else if (up) {
                elements.push(<span key={`text-${key++}`}>{up}</span>);
              }
            });
          }
        });
      }
    });

    return elements;
  };

  // Wrap parseContent in try-catch to prevent crashes
  const safeParseContent = () => {
    try {
      return parseContent(textToRender);
    } catch (error) {
      console.error("Error parsing content:", error);
      return <p className="whitespace-pre-wrap">{textToRender}</p>;
    }
  };

  return (
    <>
      <div className="leading-relaxed text-lg">
        {safeParseContent()}
      </div>
      <ImageLightbox 
        src={lightboxImage || ''} 
        alt="صورة مكبرة" 
        isOpen={!!lightboxImage} 
        onClose={() => setLightboxImage(null)} 
      />
    </>
  );
};

// Streaming text with character animation
const StreamingText = ({ 
  content, 
  onComplete 
}: { 
  content: string; 
  onComplete?: () => void;
}) => {
  const [displayedChars, setDisplayedChars] = useState(0);
  const prevContentRef = useRef(content);
  
  // Safety check
  if (!content || typeof content !== 'string') {
    return <div className="text-gray-400">...</div>;
  }
  
  useEffect(() => {
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;
    }
    
    const interval = setInterval(() => {
      setDisplayedChars(prev => {
        if (prev < content.length) {
          return prev + 1;
        } else {
          clearInterval(interval);
          if (onComplete) onComplete();
          return prev;
        }
      });
    }, 12);
    
    return () => clearInterval(interval);
  }, [content, onComplete]);

  return (
    <RichContent 
      content={content} 
      isAnimating={displayedChars < content.length}
      displayedLength={displayedChars}
    />
  );
};

// Delete confirmation dialog
const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111118]/95 backdrop-blur-3xl border-white/10 rounded-[2rem] max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <DialogTitle className="text-xl text-center text-white">حذف المحادثة</DialogTitle>
          <DialogDescription className="text-center text-gray-400 mt-2">
            هل أنت متأكد من حذف "{title}"؟
            <br />
            <span className="text-red-400 text-sm">لا يمكن التراجع عن هذا الإجراء</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5"
          >
            إلغاء
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white"
          >
            <Trash2 className="w-4 h-4 ml-2" />
            حذف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Check if mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};

export default function AITrend() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Closed by default on mobile
  const [activeTab, setActiveTab] = useState("chat");
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>([]);
  const [trendHistory, setTrendHistory] = useState<TrendHistory[]>([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [trendSearchQuery, setTrendSearchQuery] = useState("");
  const [lastTrendUpdate, setLastTrendUpdate] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingConversation, setPendingConversation] = useState(false);
  const [showCodingRedirect, setShowCodingRedirect] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; convId: string; title: string }>({
    isOpen: false,
    convId: '',
    title: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update sidebar state when mobile changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Check admin authentication
  useEffect(() => {
    const storedAuth = sessionStorage.getItem("ktm_admin_auth");
    if (storedAuth) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Load cached trending games and history
  useEffect(() => {
    const cached = localStorage.getItem("ktm_trending_games");
    const lastUpdate = localStorage.getItem("ktm_trending_update");
    const history = localStorage.getItem("ktm_trend_history");
    
    if (history) {
      setTrendHistory(JSON.parse(history));
    }
    
    if (cached && lastUpdate) {
      const updateTime = new Date(lastUpdate);
      const now = new Date();
      const hoursDiff = (now.getTime() - updateTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        setTrendingGames(JSON.parse(cached));
        setLastTrendUpdate(lastUpdate);
      } else {
        fetchTrendingGames();
      }
    } else if (isAuthenticated) {
      fetchTrendingGames();
    }
  }, [isAuthenticated]);

  // Generate smart suggestions based on context
  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
      if (lastAssistantMsg && lastAssistantMsg.content) {
        generateSmartSuggestions(lastAssistantMsg.content, messages);
      }
    } else {
      setSuggestions([
        "ابحث لي عن أحدث ألعاب 2025 الترند",
        "أعطني إحصائيات موقع كَتَم",
        "قارن بين لعبتين من اختيارك",
        "اقترح لي ألعاب أكشن جديدة",
        "أخبرني عن أفضل ألعاب RPG",
      ]);
    }
  }, [messages]);

  // Load conversations
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConversations();
    }
  }, [isAuthenticated, user]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setCurrentConversation(conversationId);
      fetchMessages(conversationId);
      setPendingConversation(false);
    } else {
      setCurrentConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  const generateSmartSuggestions = async (lastMessage: string, allMessages: Message[]) => {
    // Use simple static suggestions instead of AI call
    setSuggestions([
      "أعطني المزيد من التفاصيل",
      "ابحث عن ألعاب مشابهة",
      "ما هي متطلبات التشغيل؟",
      "قارن مع ألعاب أخرى",
      "أخبرني عن القصة",
    ]);
  };

  const generateConversationTitle = async (messages: Message[], convId: string) => {
    try {
      // Use the first user message as title
      const firstUserMsg = messages.find(m => m.role === "user");
      const title = firstUserMsg?.content.slice(0, 50) || "محادثة جديدة";
      
      await supabase
        .from("ai_conversations")
        .update({ title })
        .eq("id", convId);
      
      fetchConversations();
    } catch (error) {
      console.error("Error generating title:", error);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data);
    }
  };

  const fetchMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data.map(m => ({
        ...m,
        role: m.role as "user" | "assistant",
        isAnimating: false
      })));
    }
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin", {
        body: { password },
      });

      if (error || !data.success) {
        toast.error("كلمة السر غير صحيحة");
        return;
      }

      setIsAuthenticated(true);
      sessionStorage.setItem("ktm_admin_auth", password);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (error) {
      toast.error("حدث خطأ في تسجيل الدخول");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("ktm_admin_auth");
    navigate("/ktm-admin-panel");
  };

  const startNewConversation = () => {
    setPendingConversation(true);
    setCurrentConversation(null);
    setMessages([]);
    navigate("/ktm/ai/trend");
  };

  const openDeleteDialog = (convId: string, title: string) => {
    setDeleteDialog({ isOpen: true, convId, title });
  };

  const confirmDelete = async () => {
    const { convId } = deleteDialog;
    
    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", convId);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConversation === convId) {
        navigate("/ktm/ai/trend");
      }
      toast.success("تم حذف المحادثة");
    }
    
    setDeleteDialog({ isOpen: false, convId: '', title: '' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchTrendingGames = async () => {
    setIsLoadingTrends(true);
    
    try {
      // Use static trending games for now to avoid API calls
      const staticTrends: TrendingGame[] = [
        { name: "Indiana Jones and the Great Circle", image: "https://cdn.akamai.steamstatic.com/steam/apps/2677660/header.jpg", genres: ["Adventure", "Action"], platform: "PC" },
        { name: "S.T.A.L.K.E.R. 2", image: "https://cdn.akamai.steamstatic.com/steam/apps/1643320/header.jpg", genres: ["FPS", "Survival"], platform: "PC" },
        { name: "Black Myth: Wukong", image: "https://cdn.akamai.steamstatic.com/steam/apps/2358720/header.jpg", genres: ["Action", "RPG"], platform: "PC" },
        { name: "Dragon Age: The Veilguard", image: "https://cdn.akamai.steamstatic.com/steam/apps/1845910/header.jpg", genres: ["RPG", "Action"], platform: "PC" },
        { name: "Silent Hill 2 Remake", image: "https://cdn.akamai.steamstatic.com/steam/apps/2124490/header.jpg", genres: ["Horror", "Adventure"], platform: "PC" },
      ].map(g => ({ ...g, fetchedAt: new Date().toISOString() }));
      
      setTrendingGames(staticTrends);
      localStorage.setItem("ktm_trending_games", JSON.stringify(staticTrends));
      localStorage.setItem("ktm_trending_update", new Date().toISOString());
      setLastTrendUpdate(new Date().toISOString());
      toast.success("تم تحديث ألعاب الترند!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("خطأ في جلب الألعاب");
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    // Check if user is asking for code - redirect to coding page
    const codeKeywords = [
      'اكتب كود', 'اكتب لي كود', 'سوي كود', 'اعمل كود', 'برمج', 'برمجة',
      'html', 'css', 'javascript', 'js', 'صفحة ويب', 'موقع', 'سكربت',
      'write code', 'make code', 'create code', 'build website', 'webpage',
      'اكتب صفحة', 'سوي صفحة', 'اعمل صفحة', 'صمم صفحة', 'صمم موقع',
      'كود html', 'كود css', 'كود جافاسكربت', 'اكواد', 'أكواد'
    ];
    
    const isCodeRequest = codeKeywords.some(keyword => 
      textToSend.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (isCodeRequest) {
      setShowCodingRedirect(true);
      setInput("");
      return;
    }

    setInput("");
    setIsLoading(true);

    // Create user message with unique ID
    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempUserMsg: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };
    
    // Add user message immediately
    setMessages(prev => [...prev, tempUserMsg]);

    let convId = currentConversation;

    // Only create conversation after first message
    if (!convId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id, title: "محادثة جديدة" })
        .select()
        .single();

      if (error || !data) {
        toast.error("حدث خطأ");
        setIsLoading(false);
        return;
      }

      convId = data.id;
      setCurrentConversation(convId);
      setConversations(prev => [data, ...prev]);
      navigate(`/ktm/ai/trend/${convId}`, { replace: true });
      setPendingConversation(false);
    }

    // Save user message to DB
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "user",
      content: textToSend,
    });

    // Create loading message for AI
    const loadingMsgId = `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const loadingMsg: Message = {
      id: loadingMsgId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      isAnimating: true,
    };
    
    setMessages(prev => [...prev, loadingMsg]);

    let assistantContent = "";
    let isAborted = false;

    // Create abort handler
    abortControllerRef.current = new AbortController();
    abortControllerRef.current.signal.addEventListener('abort', () => {
      isAborted = true;
    });

    try {
      // Get previous messages excluding the loading one
      const previousMessages = messages
        .filter(m => !m.id.startsWith('loading-'))
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...previousMessages, { role: "user", content: textToSend }],
          userContext: { name: profile?.first_name || 'مستخدم' },
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
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === loadingMsgId 
                    ? { ...msg, content: assistantContent }
                    : msg
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save AI message to DB
      if (assistantContent.trim()) {
        await supabase.from("ai_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantContent,
        });
      }

      // Generate title after first exchange
      const allMessages = [...messages, tempUserMsg, { ...loadingMsg, content: assistantContent }];
      if (allMessages.filter(m => m.role === "user").length <= 2) {
        generateConversationTitle(allMessages, convId);
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMsgId ? { ...msg, isAnimating: false } : msg
        )
      );

    } catch (error: any) {
      console.error("Error:", error);
      if (!isAborted) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingMsgId 
              ? { ...msg, content: "عذراً، حدث خطأ. حاول مرة أخرى.", isAnimating: false }
              : msg
          )
        );
      } else {
        // User stopped the generation - keep what we have
        setMessages(prev => 
          prev.map(msg => 
            msg.id === loadingMsgId 
              ? { ...msg, isAnimating: false }
              : msg
          )
        );
        // Save partial response to DB if we have content
        if (assistantContent.trim()) {
          await supabase.from("ai_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: assistantContent,
          });
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const filteredTrendingGames = trendingGames.filter(game =>
    game.name.toLowerCase().includes(trendSearchQuery.toLowerCase())
  );

  const allHistoryGames = trendHistory.flatMap(h => h.games);
  const uniqueHistoryGames = allHistoryGames.filter((game, index, self) =>
    index === self.findIndex(g => g.name.toLowerCase() === game.name.toLowerCase())
  );

  // Show loading while checking auth or loading user
  if (isCheckingAuth || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <Sparkles className="w-10 h-10 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[200px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-[#111118]/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-10 shadow-2xl shadow-emerald-500/10">
            <div className="text-center mb-10">
              <div className="mx-auto w-28 h-28 rounded-[2rem] flex items-center justify-center mb-8 bg-gradient-to-br from-emerald-500 via-cyan-500 to-emerald-400 shadow-2xl shadow-emerald-500/40 animate-float">
                <img src="/favicon.png" alt="KTM" className="w-16 h-16" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                KTM AI Trend
              </h1>
              <p className="text-gray-400 text-lg">مساعدك الذكي</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
              <div className="relative group">
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-emerald-400 transition-all" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="كلمة السر"
                  className="bg-white/5 border-white/10 focus:border-emerald-500/50 h-14 pr-12 text-lg rounded-[1rem]"
                />
              </div>
              <Button type="submit" className="w-full h-14 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-bold text-lg rounded-[1rem] shadow-xl shadow-emerald-500/30">
                <Sparkles className="w-5 h-5 ml-2" />
                دخول
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center bg-[#111118]/60 backdrop-blur-3xl border border-white/10 p-12 rounded-[2rem] shadow-2xl">
          <div className="w-24 h-24 mx-auto mb-8 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <img src="/favicon.png" alt="KTM" className="w-14 h-14" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">يجب تسجيل الدخول</h1>
          <p className="text-gray-400 mb-8 text-lg">سجل دخولك للوصول</p>
          <Button onClick={() => navigate("/auth")} className="bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-lg rounded-[1rem]">
            تسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f] flex" dir="ltr">
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, convId: '', title: '' })}
        onConfirm={confirmDelete}
        title={deleteDialog.title}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[200px]" />
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed md:relative z-50 h-screen bg-[#111118]/90 backdrop-blur-3xl border-r border-white/5 transition-all duration-500 flex flex-col overflow-hidden",
        isSidebarOpen ? "w-80" : "w-0 md:w-0"
      )}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between min-h-[76px]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={toggleSidebar}>
            <div className="w-11 h-11 rounded-[0.875rem] bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <img src="/favicon.png" alt="KTM" className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
              AI Trend
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hover:bg-white/5 text-gray-400 hover:text-white rounded-xl flex-shrink-0 h-9 w-9"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 border-b border-white/5">
          <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                activeTab === "chat"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              المحادثات
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2",
                activeTab === "trends"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              الترند
            </button>
          </div>
        </div>

        <div className="p-3">
          <Button onClick={startNewConversation}
            className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl h-12 font-medium shadow-xl shadow-emerald-500/20">
            <Plus className="w-5 h-5" />
            محادثة جديدة
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {conversations.map((conv, index) => (
            <div key={conv.id}
              className={cn("group flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all duration-300",
                currentConversation === conv.id ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/30" : "hover:bg-white/5")}
              onClick={() => navigate(`/ktm/ai/trend/${conv.id}`)}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                currentConversation === conv.id ? "bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-lg" : "bg-white/5")}>
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 truncate text-sm text-gray-300">{conv.title}</span>
              <Button variant="ghost" size="icon"
                className="opacity-0 group-hover:opacity-100 h-8 w-8 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                onClick={(e) => { e.stopPropagation(); openDeleteDialog(conv.id, conv.title); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-white/5 space-y-1.5">
          <Button variant="ghost" onClick={() => navigate("/ktm-admin-panel")}
            className="w-full gap-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl h-10">
            <Home className="w-4 h-4" />
            لوحة التحكم
          </Button>
          <Button variant="ghost" onClick={handleLogout}
            className="w-full gap-2 text-red-400 hover:bg-red-500/10 rounded-xl h-10">
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {activeTab === "trends" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="animate-fade-in">
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                      <Flame className="w-6 h-6" />
                    </div>
                    ألعاب الترند 2025
                  </h1>
                  {lastTrendUpdate && (
                    <p className="text-gray-400 mt-2 flex items-center gap-2 mr-[3.75rem] text-sm">
                      <Clock className="w-4 h-4" />
                      آخر تحديث: {new Date(lastTrendUpdate).toLocaleString('ar-SA')}
                      <span className="text-emerald-400 text-xs">(تلقائي كل 24 ساعة)</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input value={trendSearchQuery} onChange={(e) => setTrendSearchQuery(e.target.value)}
                      placeholder="ابحث..." className="bg-white/5 border-white/10 h-12 pr-10 w-60 rounded-xl" />
                  </div>
                  <Button onClick={() => setShowHistory(!showHistory)} variant="outline"
                    className={cn("h-12 gap-2 rounded-xl border-white/10", showHistory && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400")}>
                    <History className="w-4 h-4" />
                    {showHistory ? "إخفاء" : "السجل"}
                  </Button>
                </div>
              </div>

              {showHistory && (
                <div className="mb-8 animate-fade-in">
                  <div className="bg-[#111118]/80 backdrop-blur-xl rounded-xl border border-white/5 p-5">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-400" />
                      سجل الألعاب ({uniqueHistoryGames.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {uniqueHistoryGames.slice(0, 20).map((game, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2.5 text-sm text-gray-300 hover:bg-white/10 transition-all">
                          {game.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isLoadingTrends ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">جاري جلب الألعاب...</p>
                </div>
              ) : filteredTrendingGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredTrendingGames.map((game, index) => (
                    <div key={index}
                      className="group bg-[#111118]/80 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-emerald-500/10 animate-fade-in"
                      style={{ animationDelay: `${index * 80}ms` }}>
                      <div className="aspect-video bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 relative overflow-hidden">
                        {game.image && (
                          <img src={game.image} alt={game.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Gamepad2 className="w-12 h-12 text-emerald-400/20" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] to-transparent opacity-60" />
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                          <Flame className="w-3 h-3" />
                          <span className="text-xs font-medium">Trending</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {game.name}
                        </h3>
                        {game.genres && game.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {game.genres.slice(0, 3).map((genre, i) => (
                              <span key={i} className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        {game.platform && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Gamepad2 className="w-3.5 h-3.5" />
                            {game.platform}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 mx-auto flex items-center justify-center mb-4">
                    <TrendingUp className="w-10 h-10 text-emerald-400/50" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">لا توجد ألعاب</h3>
                  <p className="text-gray-400 mb-4">جاري الجلب...</p>
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <>
            <header className="px-5 py-4 border-b border-white/5 bg-[#111118]/50 backdrop-blur-xl flex items-center gap-3">
              {/* Toggle button - shows logo when sidebar is closed */}
              <button 
                onClick={toggleSidebar}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
              >
                <img src="/favicon.png" alt="KTM AI" className="w-6 h-6" />
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-white">KTM AI Trend</h1>
                <p className="text-xs text-gray-400">مساعدك الذكي • جميع اللغات</p>
              </div>

              <div className="mr-auto">
                <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  متصل
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                  <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/40 animate-float">
                    <img src="/favicon.png" alt="KTM AI" className="w-20 h-20" />
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-4">
                    مرحباً بك في <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">KTM AI</span>
                  </h2>
                  <p className="text-gray-400 text-lg mb-10 max-w-lg">
                    أنا مساعدك الذكي. أتحدث جميع اللغات وأرد بلغتك!
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                    {[
                      { icon: TrendingUp, text: "ابحث لي عن ألعاب الترند 2025", color: "emerald" },
                      { icon: Search, text: "قارن بين Red Dead و GTA V", color: "cyan" },
                      { icon: Sparkles, text: "أعطني إحصائيات الموقع", color: "purple" },
                      { icon: Star, text: "اقترح لي ألعاب RPG جديدة", color: "amber" },
                    ].map((item, i) => (
                      <button key={i} onClick={() => handleSuggestionClick(item.text)}
                        className="group p-5 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 text-right hover:bg-white/10 animate-fade-in"
                        style={{ animationDelay: `${i * 80}ms` }}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            item.color === "emerald" && "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
                            item.color === "cyan" && "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20",
                            item.color === "purple" && "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
                            item.color === "amber" && "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20")}>
                            <item.icon className="w-6 h-6" />
                          </div>
                          <span className="text-gray-300 text-base group-hover:text-white transition-colors">{item.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((message, index) => (
                    <div key={message.id}
                      className={cn(
                        "flex gap-4 animate-fade-in",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}>
                      
                      {/* AI Avatar - only show for assistant */}
                      {message.role === "assistant" && (
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-emerald-500/20">
                          <img src="/favicon.png" alt="AI" className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className={cn(
                        "flex flex-col",
                        message.role === "user" ? "items-end" : "items-start",
                        message.role === "user" ? "max-w-[75%]" : "max-w-[85%]"
                      )}>
                        <div className={cn(
                          "rounded-2xl p-5",
                          message.role === "assistant"
                            ? "bg-[#111118]/80 border border-white/5 backdrop-blur-xl"
                            : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/20"
                        )}>
                          {message.role === "assistant" && message.isAnimating && !message.content ? (
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-gray-400 text-sm">جاري التفكير...</span>
                            </div>
                          ) : message.role === "assistant" ? (
                            <div className="text-gray-200">
                              {message.isAnimating ? (
                                <StreamingText content={message.content} />
                              ) : (
                                <RichContent content={message.content} />
                              )}
                            </div>
                          ) : (
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          )}
                        </div>
                        <div className={cn(
                          "text-xs text-gray-500 mt-2",
                          message.role === "user" ? "text-right" : "text-left"
                        )}>
                          {new Date(message.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      {/* User Avatar - only show for user */}
                      {message.role === "user" && (
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg bg-white/10">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="User" className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <span className="text-sm font-bold">{profile?.first_name?.[0] || "U"}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Coding Redirect Button */}
            {showCodingRedirect && (
              <div className="px-5 pb-4">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 animate-scale-in">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
                          <Code2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">لكتابة الأكواد البرمجية</h3>
                          <p className="text-gray-400 text-sm">انتقل لمحرر الأكواد الذكي KTM Coding</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setShowCodingRedirect(false);
                          navigate("/ktm/ai/coding");
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl shadow-xl shadow-purple-500/30 transition-all duration-300 hover:scale-105"
                      >
                        <Code2 className="w-5 h-5 ml-2" />
                        الانتقال للبرمجة
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {suggestions.length > 0 && messages.length > 0 && (
              <div className="px-5 pb-2">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((suggestion, i) => (
                      <button key={i} onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300 animate-fade-in flex items-center gap-2"
                        style={{ animationDelay: `${i * 40}ms` }}>
                        <Zap className="w-3 h-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 border-t border-white/5 bg-[#111118]/50 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالتك هنا..." disabled={isLoading}
                    className="bg-white/5 border-white/10 focus:border-emerald-500/50 h-14 pr-5 pl-16 text-base rounded-xl" dir="auto" />
                  {isLoading ? (
                    <Button onClick={stopGeneration}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-xl shadow-xl shadow-red-500/30">
                      <Square className="w-5 h-5" />
                    </Button>
                  ) : (
                    <Button onClick={() => sendMessage()} disabled={!input.trim()}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl shadow-xl shadow-emerald-500/30 disabled:opacity-50">
                      <Send className="w-5 h-5" />
                    </Button>
                  )}
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">
                  KTM AI • Gemini AI • خصوصيتك محفوظة
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
