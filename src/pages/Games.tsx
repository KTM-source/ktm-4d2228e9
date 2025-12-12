import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { GameCard } from "@/components/games/GameCard";
import { LauncherGameCard } from "@/components/games/LauncherGameCard";
import { useGames } from "@/hooks/useGames";
import { useElectron } from "@/hooks/useElectron";
import { Search, Filter, Grid3X3, LayoutGrid, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LauncherSection from "@/components/launcher/LauncherSection";

const sizeRanges = [
  { value: "all", label: "كل الأحجام" },
  { value: "small", label: "أقل من 10 GB" },
  { value: "medium", label: "10 - 50 GB" },
  { value: "large", label: "أكثر من 50 GB" },
];

const Games = () => {
  const { games, categories, isLoading } = useGames();
  const { isElectron } = useElectron();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "large">("grid");

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || game.category === selectedCategory;
      
      // Size filter
      let matchesSize = true;
      if (selectedSize !== "all") {
        const sizeNum = parseFloat(game.size.replace(/[^0-9.]/g, ""));
        if (selectedSize === "small") matchesSize = sizeNum < 10;
        else if (selectedSize === "medium") matchesSize = sizeNum >= 10 && sizeNum <= 50;
        else if (selectedSize === "large") matchesSize = sizeNum > 50;
      }
      
      return matchesSearch && matchesCategory && matchesSize;
    });
  }, [games, searchQuery, selectedCategory, selectedSize]);

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
        {/* Header & Filters - Always visible */}
        <LauncherSection alwaysVisible>
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              كل الألعاب
            </h1>
            <p className="text-muted-foreground">
              اكتشف مكتبتنا الضخمة من الألعاب
            </p>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن لعبة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 text-right"
                dir="rtl"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Category Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.slug}>
                        {category.name} ({category.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size Filter */}
              <div className="w-full sm:w-auto">
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="الحجم" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 mr-auto">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded transition-all duration-300",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("large")}
                  className={cn(
                    "p-2 rounded transition-all duration-300",
                    viewMode === "large"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6 text-muted-foreground">
            تم العثور على <span className="text-primary font-bold">{filteredGames.length}</span> لعبة
          </div>
        </LauncherSection>

        {/* Games Grid - Lazy loaded */}
        <LauncherSection minHeight="800px">
          <div
            className={cn(
              "grid gap-4 md:gap-6",
              viewMode === "grid"
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {filteredGames.map((game, index) => (
              isElectron ? (
                <LauncherGameCard key={game.id} game={game} />
              ) : (
                <GameCard key={game.id} game={game} index={index} />
              )
            ))}
          </div>

          {/* Empty State */}
          {filteredGames.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                لم يتم العثور على ألعاب
              </h3>
              <p className="text-muted-foreground">
                جرب البحث بكلمات أخرى أو اختر تصنيف مختلف
              </p>
            </div>
          )}
        </LauncherSection>
      </div>
    </Layout>
  );
};

export default Games;
