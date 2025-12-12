import { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { GameCard } from "@/components/games/GameCard";
import { LauncherGameCard } from "@/components/games/LauncherGameCard";
import { useGames } from "@/hooks/useGames";
import { useElectron } from "@/hooks/useElectron";
import { Trophy, Star, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const TopGames = () => {
  const { games, isLoading } = useGames();
  const { isElectron } = useElectron();
  
  const topGames = useMemo(() => {
    return [...games].sort((a, b) => {
      // Sort by rating first, then by views
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.views || 0) - (a.views || 0);
    });
  }, [games]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              الألعاب الأكثر شعبية
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            أفضل الألعاب حسب تقييمات المستخدمين والمشاهدات
          </p>
        </div>

        {/* Empty State */}
        {games.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-display text-xl font-bold mb-2">لا توجد ألعاب حالياً</h2>
            <p className="text-muted-foreground">سيتم إضافة الألعاب قريباً</p>
          </div>
        )}

        {/* Top 3 Showcase */}
        {topGames.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {topGames.slice(0, 3).map((game, index) => (
              <Link
                key={game.id}
                to={`/${game.slug}`}
                className={`${isElectron ? 'bg-card border border-border/30' : 'glass-card animate-slide-up group hover:border-primary/50'} p-6 text-center relative overflow-hidden transition-all duration-300 rounded-xl`}
                style={!isElectron ? { animationDelay: `${index * 0.1}s` } : undefined}
              >
                {/* Rank Badge */}
                <div
                  className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-lg ${
                    index === 0
                      ? "bg-yellow-500 text-background"
                      : index === 1
                      ? "bg-gray-400 text-background"
                      : "bg-amber-700 text-foreground"
                  }`}
                >
                  {index + 1}
                </div>

                <img
                  src={game.image}
                  alt={game.title}
                  className={`w-32 h-32 object-cover rounded-xl mx-auto mb-4 ${!isElectron ? 'transition-transform duration-300 group-hover:scale-105' : ''}`}
                />
                <h3 className={`font-display text-xl font-bold text-foreground mb-2 ${!isElectron ? 'group-hover:text-primary transition-colors' : ''}`}>
                  {game.title}
                </h3>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= (game.rating || 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                  <span className="mr-2 text-sm font-bold">{game.rating}</span>
                </div>
                <span className="category-badge">{game.category}</span>
                <div className="text-xs text-muted-foreground mt-2">
                  {game.views} مشاهدة
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Trending Icon */}
        {topGames.length > 3 && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">
                باقي التصنيف
              </h2>
            </div>

            {/* All Top Games */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
              {topGames.slice(3).map((game, index) => (
                isElectron ? (
                  <LauncherGameCard key={game.id} game={game} />
                ) : (
                  <GameCard key={game.id} game={game} index={index} />
                )
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TopGames;