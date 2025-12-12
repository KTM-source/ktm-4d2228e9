import { LauncherGameCard } from "./LauncherGameCard";
import { usePersonalizedRecommendations, clearViewedGames } from "@/hooks/usePersonalizedRecommendations";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Simplified RecommendedGames for Launcher - NO glow, NO animations, NO borders
export const LauncherRecommendedGames = () => {
  const { recommendations, isLoading, hasViewedGames, refresh } = usePersonalizedRecommendations();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = () => {
    setIsClearing(true);
    clearViewedGames();
    toast.success("تم مسح سجل المشاهدة");
    setTimeout(() => {
      refresh();
      setIsClearing(false);
    }, 500);
  };

  if (!hasViewedGames) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary" />
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-12">
      {/* Simple Header - NO glow, NO animations */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">
                مُقترح لك
              </h2>
              <p className="text-sm text-muted-foreground">
                بناءً على الألعاب التي شاهدتها ✨
              </p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/50 rounded-xl"
          >
            <RotateCcw className={`w-4 h-4 ${isClearing ? 'animate-spin' : ''}`} />
            <span>مسح السجل</span>
          </button>
        </div>
        
        <div className="mt-4 h-1 w-40 rounded-full bg-primary/50" />
      </div>

      {/* Simple Grid - NO glow border, NO glass effects */}
      <div className="bg-card/50 p-6 rounded-2xl border border-border/30">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
          {recommendations.map((game) => (
            <LauncherGameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </section>
  );
};
