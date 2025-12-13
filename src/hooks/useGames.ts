import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Game {
  id: string;
  title: string;
  slug: string;
  image: string;
  background_image: string | null;
  version: string;
  category: string;
  release_date: string;
  size: string;
  description: string;
  features: string[] | null;
  system_requirements_minimum: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  } | null;
  system_requirements_recommended: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  } | null;
  download_link: string | null;
  trailer_url: string | null;
  screenshots: string[] | null;
  additional_files: { name: string; url: string; size: number }[] | null;
  developer: string | null;
  genre: string | null;
  rating: number | null;
  views: number;
  platforms: string[] | null;
  created_at: string;
  updated_at: string;
  ai_review: string | null;
  ai_review_status: string | null;
  translations: Record<string, { description: string; review?: string }> | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}

const VIEWED_GAMES_KEY = "ktm_viewed_games";

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setGames(data as unknown as Game[]);
    }
    setIsLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setCategories(data);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    fetchCategories();

    // Subscribe to real-time updates for views
    const channel = supabase
      .channel('games-views')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGames(prevGames => 
            prevGames.map(g => 
              g.id === updatedGame.id ? { ...g, views: updatedGame.views } : g
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGames, fetchCategories]);

  const incrementViews = useCallback(async (gameId: string) => {
    // Check if already viewed in localStorage
    const viewedGames: string[] = JSON.parse(localStorage.getItem(VIEWED_GAMES_KEY) || "[]");
    
    if (viewedGames.includes(gameId)) {
      return; // Already viewed, don't increment
    }

    // Mark as viewed in localStorage immediately
    viewedGames.push(gameId);
    localStorage.setItem(VIEWED_GAMES_KEY, JSON.stringify(viewedGames));

    // Use RPC function for atomic increment
    try {
      await supabase.rpc('increment_views', { game_id: gameId });
      
      // Update local state optimistically
      setGames(prevGames => 
        prevGames.map(g => 
          g.id === gameId ? { ...g, views: g.views + 1 } : g
        )
      );
    } catch (error) {
      console.error("Error incrementing views:", error);
      // Revert localStorage on error
      const revertedGames = viewedGames.filter(id => id !== gameId);
      localStorage.setItem(VIEWED_GAMES_KEY, JSON.stringify(revertedGames));
    }
  }, []);

  return { games, categories, isLoading, incrementViews, refetch: fetchGames };
}

export function useGame(slug: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [relatedGames, setRelatedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchGame();
    }
  }, [slug]);

  // Subscribe to real-time view updates for this specific game
  useEffect(() => {
    if (!game?.id) return;

    const channel = supabase
      .channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGame(prev => prev ? { ...prev, views: updatedGame.views } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  const fetchGame = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    
    if (!error && data) {
      setGame(data as unknown as Game);
      
      // Fetch AI-powered similar games
      fetchSimilarGames(data);
    }
    setIsLoading(false);
  };

  const fetchSimilarGames = async (gameData: any) => {
    try {
      console.log("Fetching AI-powered similar games for:", gameData.title);
      
      const response = await supabase.functions.invoke('find-similar-games', {
        body: {
          gameId: gameData.id,
          gameTitle: gameData.title,
          gameGenre: gameData.genre,
          gameCategory: gameData.category,
          gameDescription: gameData.description
        }
      });

      if (response.error) {
        console.error("Error fetching similar games:", response.error);
        fallbackSimilarGames(gameData);
        return;
      }

      const { similarGames } = response.data || {};
      
      if (similarGames && similarGames.length > 0) {
        console.log("AI found", similarGames.length, "similar games");
        setRelatedGames(similarGames as Game[]);
      } else {
        fallbackSimilarGames(gameData);
      }
    } catch (error) {
      console.error("Error in fetchSimilarGames:", error);
      fallbackSimilarGames(gameData);
    }
  };

  const fallbackSimilarGames = async (gameData: any) => {
    console.log("Using fallback genre matching");
    const gameGenres = gameData.genre?.toLowerCase().split(",").map((g: string) => g.trim()) || [gameData.category];
    
    const { data: related } = await supabase
      .from("games")
      .select("*")
      .neq("id", gameData.id)
      .limit(12);
    
    if (related) {
      const filteredRelated = related.filter((r: any) => {
        const relatedGenres = r.genre?.toLowerCase().split(",").map((g: string) => g.trim()) || [r.category];
        return relatedGenres.some((rg: string) => gameGenres.includes(rg));
      }).slice(0, 6);
      
      setRelatedGames(filteredRelated as unknown as Game[]);
    }
  };

  return { game, relatedGames, isLoading };
}
