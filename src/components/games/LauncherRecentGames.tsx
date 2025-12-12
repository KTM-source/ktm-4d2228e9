import { LauncherGameCard } from "./LauncherGameCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";

interface LauncherRecentGamesProps {
  games: Array<{
    id: string;
    title: string;
    slug: string;
    image: string;
    version: string;
    category: string;
    genre?: string | null;
    size: string;
    rating?: number | null;
    platforms?: string[] | null;
    created_at?: string;
    updated_at?: string;
  }>;
  hasMore: boolean;
  onLoadMore: () => void;
}

// Simplified Recent Games for Launcher - NO animations
export const LauncherRecentGames = ({ games, hasMore, onLoadMore }: LauncherRecentGamesProps) => {
  return (
    <section className="container mx-auto px-4 py-16">
      <SectionHeader
        title="أحدث الألعاب"
        subtitle="آخر الألعاب المضافة للمكتبة"
        href="/recent"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
        {games.map((game) => (
          <LauncherGameCard key={game.id} game={game} />
        ))}
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-10">
          <Button
            onClick={onLoadMore}
            variant="outline"
            size="lg"
            className="px-12 py-6 text-lg border-primary/50"
          >
            Load More
          </Button>
        </div>
      )}
    </section>
  );
};
