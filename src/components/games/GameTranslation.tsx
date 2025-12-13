import { useState, useEffect } from "react";
import { Globe, ChevronDown, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Comprehensive list of world languages
const LANGUAGES = [
  { code: "ar", name: "العربية", native: "العربية" },
  { code: "en", name: "الإنجليزية", native: "English" },
  { code: "fr", name: "الفرنسية", native: "Français" },
  { code: "de", name: "الألمانية", native: "Deutsch" },
  { code: "es", name: "الإسبانية", native: "Español" },
  { code: "pt", name: "البرتغالية", native: "Português" },
  { code: "it", name: "الإيطالية", native: "Italiano" },
  { code: "ru", name: "الروسية", native: "Русский" },
  { code: "zh", name: "الصينية", native: "中文" },
  { code: "ja", name: "اليابانية", native: "日本語" },
  { code: "ko", name: "الكورية", native: "한국어" },
  { code: "tr", name: "التركية", native: "Türkçe" },
  { code: "hi", name: "الهندية", native: "हिन्दी" },
  { code: "bn", name: "البنغالية", native: "বাংলা" },
  { code: "ur", name: "الأردية", native: "اردو" },
  { code: "fa", name: "الفارسية", native: "فارسی" },
  { code: "nl", name: "الهولندية", native: "Nederlands" },
  { code: "pl", name: "البولندية", native: "Polski" },
  { code: "uk", name: "الأوكرانية", native: "Українська" },
  { code: "cs", name: "التشيكية", native: "Čeština" },
  { code: "ro", name: "الرومانية", native: "Română" },
  { code: "hu", name: "المجرية", native: "Magyar" },
  { code: "el", name: "اليونانية", native: "Ελληνικά" },
  { code: "sv", name: "السويدية", native: "Svenska" },
  { code: "da", name: "الدنماركية", native: "Dansk" },
  { code: "no", name: "النرويجية", native: "Norsk" },
  { code: "fi", name: "الفنلندية", native: "Suomi" },
  { code: "th", name: "التايلاندية", native: "ไทย" },
  { code: "vi", name: "الفيتنامية", native: "Tiếng Việt" },
  { code: "id", name: "الإندونيسية", native: "Bahasa Indonesia" },
  { code: "ms", name: "الماليزية", native: "Bahasa Melayu" },
  { code: "tl", name: "الفلبينية", native: "Filipino" },
  { code: "he", name: "العبرية", native: "עברית" },
  { code: "sw", name: "السواحيلية", native: "Kiswahili" },
  { code: "bg", name: "البلغارية", native: "Български" },
  { code: "hr", name: "الكرواتية", native: "Hrvatski" },
  { code: "sk", name: "السلوفاكية", native: "Slovenčina" },
  { code: "sl", name: "السلوفينية", native: "Slovenščina" },
  { code: "sr", name: "الصربية", native: "Српски" },
  { code: "lt", name: "الليتوانية", native: "Lietuvių" },
  { code: "lv", name: "اللاتفية", native: "Latviešu" },
  { code: "et", name: "الإستونية", native: "Eesti" },
  { code: "ca", name: "الكاتالونية", native: "Català" },
  { code: "gl", name: "الجاليكية", native: "Galego" },
  { code: "eu", name: "الباسكية", native: "Euskara" },
];

// Get stored language for a game from localStorage
const getStoredLanguage = (gameId: string): string | null => {
  try {
    const stored = localStorage.getItem(`game_lang_${gameId}`);
    return stored;
  } catch {
    return null;
  }
};

// Store language preference for a game
const storeLanguage = (gameId: string, langCode: string) => {
  try {
    localStorage.setItem(`game_lang_${gameId}`, langCode);
  } catch {
    // Ignore storage errors
  }
};

interface GameTranslationProps {
  gameId: string;
  description: string;
  review?: string | null;
  translations?: Record<string, { description: string; review?: string | null }>;
  onTranslated?: (translatedDescription: string, translatedReview?: string | null) => void;
}

export const GameTranslation = ({ 
  gameId, 
  description, 
  review, 
  translations = {},
  onTranslated 
}: GameTranslationProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [localTranslations, setLocalTranslations] = useState<Record<string, { description: string; review?: string | null }>>(translations);

  // Load stored language preference on mount
  useEffect(() => {
    const storedLang = getStoredLanguage(gameId);
    if (storedLang && storedLang !== selectedLanguage) {
      // Check if we have cached translation
      const cachedTranslation = localTranslations[storedLang];
      if (cachedTranslation) {
        setSelectedLanguage(storedLang);
        onTranslated?.(cachedTranslation.description, cachedTranslation.review);
      } else {
        // Auto-translate to stored language
        handleTranslate(storedLang);
      }
    }
  }, [gameId]);

  // Update local translations when prop changes
  useEffect(() => {
    setLocalTranslations(translations);
  }, [translations]);

  const handleTranslate = async (langCode: string) => {
    const language = LANGUAGES.find(l => l.code === langCode);
    if (!language) return;

    setSelectedLanguage(langCode);
    storeLanguage(gameId, langCode);

    // Check if already cached locally or in database
    if (localTranslations[langCode]) {
      onTranslated?.(
        localTranslations[langCode].description,
        localTranslations[langCode].review
      );
      toast.success(`تم تحميل الترجمة ${language.name} من الذاكرة`);
      return;
    }

    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke("translate-game-content", {
        body: {
          description,
          review: review || null,
          targetLanguage: language.native,
          languageCode: langCode,
        },
      });

      if (error) {
        // Check for specific error types
        if (error.message?.includes("402") || error.message?.includes("payment")) {
          toast.error("نفذ رصيد الترجمة، يرجى إضافة رصيد من إعدادات Lovable");
          setSelectedLanguage(null);
          return;
        }
        throw new Error("فشل في الترجمة");
      }
      
      if (!data?.success) {
        const errorMsg = data?.error || "فشل في الترجمة";
        if (errorMsg.includes("رصيد") || errorMsg.includes("402")) {
          toast.error(errorMsg);
          setSelectedLanguage(null);
          return;
        }
        throw new Error(errorMsg);
      }

      const newTranslation = {
        description: data.translatedDescription,
        review: data.translatedReview || null,
      };

      // Update local state
      const updatedTranslations = {
        ...localTranslations,
        [langCode]: newTranslation,
      };
      setLocalTranslations(updatedTranslations);

      // Save translation to database for future users
      try {
        await supabase
          .from("games")
          .update({ translations: updatedTranslations })
          .eq("id", gameId);
      } catch (dbError) {
        console.error("Failed to save translation to DB:", dbError);
        // Continue anyway - local state is updated
      }

      onTranslated?.(data.translatedDescription, data.translatedReview);
      toast.success(`تمت الترجمة إلى ${language.name} بنجاح`);

    } catch (error: any) {
      console.error("Translation error:", error);
      toast.error(error.message || "حدث خطأ في الترجمة");
      setSelectedLanguage(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const currentLanguage = selectedLanguage 
    ? LANGUAGES.find(l => l.code === selectedLanguage) 
    : null;

  return (
    <div className="mb-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "glass-card border-border/50 hover:border-primary/50 transition-all duration-300",
              "flex items-center gap-2 px-4 py-2",
              isTranslating && "pointer-events-none opacity-70"
            )}
            disabled={isTranslating}
          >
            {isTranslating ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Globe className="w-4 h-4 text-primary" />
            )}
            <span>
              {isTranslating 
                ? "جاري الترجمة..." 
                : currentLanguage 
                  ? currentLanguage.name 
                  : "ترجمة"
              }
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-64 max-h-[400px] overflow-y-auto glass-morphism border-border/50"
        >
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleTranslate(lang.code)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                "hover:bg-primary/10 transition-colors",
                selectedLanguage === lang.code && "bg-primary/10"
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{lang.name}</span>
                <span className="text-xs text-muted-foreground">{lang.native}</span>
              </div>
              {selectedLanguage === lang.code && (
                <Check className="w-4 h-4 text-primary" />
              )}
              {localTranslations[lang.code] && selectedLanguage !== lang.code && (
                <span className="text-xs text-muted-foreground">محفوظة</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
