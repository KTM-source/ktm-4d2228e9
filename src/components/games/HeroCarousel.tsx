import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Download, Star, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseRichText } from "@/components/admin/RichTextEditor";
import { Game } from "@/hooks/useGames";

interface HeroCarouselProps {
  games: Game[];
}

// Convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match[1]}`;
  }
  return null;
};

const isDirectVideo = (url: string): boolean => {
  return url?.endsWith('.mp4') || url?.endsWith('.webm') || url?.endsWith('.ogg');
};

export const HeroCarousel = ({ games }: HeroCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter games: rating >= 4.2 AND created in the last 30 days
  // If no games match, fallback to top rated games
  const heroGames = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // First try: games with rating >= 4.2 from last 30 days
    let filtered = games.filter(game => {
      const rating = game.rating || 0;
      const createdAt = new Date(game.created_at);
      return rating >= 4.2 && createdAt >= thirtyDaysAgo;
    });

    // Fallback: if no games match, get top rated games regardless of date
    if (filtered.length === 0) {
      filtered = games
        .filter(game => (game.rating || 0) >= 3.5)
        .slice(0, 5);
    }

    // Second fallback: just get the most recent games
    if (filtered.length === 0) {
      filtered = games.slice(0, 5);
    }

    return filtered.sort((a, b) => {
      const slugA = a.slug.toLowerCase();
      const slugB = b.slug.toLowerCase();
      
      if (slugA.includes('last-of-us-part-ii')) return -1;
      if (slugB.includes('last-of-us-part-ii')) return 1;
      if (slugA.includes('red-dead-redemption-2')) return -1;
      if (slugB.includes('red-dead-redemption-2')) return 1;
      
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [games]);

  const currentGame = heroGames[currentIndex];
  const trailerUrl = currentGame?.trailer_url;
  const hasTrailer = !!trailerUrl;
  const youtubeEmbedUrl = trailerUrl ? getYouTubeEmbedUrl(trailerUrl) : null;
  const isMP4 = trailerUrl ? isDirectVideo(trailerUrl) : false;

  // Handle image display then trailer
  useEffect(() => {
    if (!heroGames.length) return;
    
    setShowTrailer(false);
    
    // Clear existing timer
    if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    
    // Show image for 3 seconds, then show trailer if available
    imageTimerRef.current = setTimeout(() => {
      if (hasTrailer) {
        setShowTrailer(true);
      }
    }, 3000);

    return () => {
      if (imageTimerRef.current) clearTimeout(imageTimerRef.current);
    };
  }, [currentIndex, heroGames.length, hasTrailer]);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || heroGames.length <= 1) return;
    
    // If showing trailer, wait for it to finish (or 30 seconds max)
    const duration = showTrailer && hasTrailer ? 30000 : 6000;
    
    const interval = setInterval(() => {
      if (!showTrailer || !hasTrailer) {
        setCurrentIndex((prev) => (prev + 1) % heroGames.length);
      }
    }, duration);
    
    return () => clearInterval(interval);
  }, [heroGames.length, isAutoPlaying, showTrailer, hasTrailer]);

  // Handle video end
  const handleVideoEnd = () => {
    setCurrentIndex((prev) => (prev + 1) % heroGames.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    setShowTrailer(false);
    setTimeout(() => setIsAutoPlaying(true), 15000);
  };

  if (!heroGames.length) return null;
  
  const bgImage = currentGame.background_image || currentGame.image;

  return (
    <div className="relative w-full h-[85vh] min-h-[600px] max-h-[900px] overflow-hidden">
      {/* Background Images */}
      {heroGames.map((game, index) => (
        <div
          key={game.id}
          className={cn(
            "absolute inset-0 transition-all duration-1000 ease-out",
            index === currentIndex && !showTrailer ? "opacity-100 scale-100" : "opacity-0 scale-105"
          )}
        >
          <img
            src={game.background_image || game.image}
            alt={game.title}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      ))}

      {/* Trailer Video (MP4) */}
      {showTrailer && isMP4 && currentIndex === heroGames.findIndex(g => g.id === currentGame.id) && (
        <div className="absolute inset-0 transition-opacity duration-700 opacity-100">
          <video
            ref={videoRef}
            src={trailerUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            onEnded={handleVideoEnd}
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      )}

      {/* Trailer Video (YouTube Embed) */}
      {showTrailer && youtubeEmbedUrl && !isMP4 && (
        <div className="absolute inset-0 transition-opacity duration-700 opacity-100">
          <iframe
            src={youtubeEmbedUrl}
            className="w-full h-full object-cover scale-150"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ border: 'none', pointerEvents: 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      )}

      {/* Content */}
      <div className="relative h-full container mx-auto px-4 flex items-center z-10">
        <div className="max-w-2xl space-y-6" key={currentIndex}>
          <div 
            className="flex items-center gap-4 opacity-0"
            style={{ animation: 'heroFadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards' }}
          >
            <span className="px-4 py-1.5 bg-primary/90 text-primary-foreground text-sm font-bold rounded-full">
              {currentGame.genre || currentGame.category}
            </span>
            {currentGame.rating && (
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-white">{currentGame.rating}</span>
              </div>
            )}
            {showTrailer && hasTrailer && (
              <div className="flex items-center gap-1.5 bg-red-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full animate-pulse">
                <Play className="w-4 h-4 text-white fill-white" />
                <span className="font-bold text-white text-sm">TRAILER</span>
              </div>
            )}
          </div>

          <h1 
            className="font-display text-5xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl opacity-0"
            style={{ animation: 'heroFadeSlide 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards' }}
          >
            {currentGame.title}
          </h1>

          <div 
            className="text-lg md:text-xl text-gray-200 line-clamp-3 max-w-xl opacity-0"
            style={{ animation: 'heroFadeSlide 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards' }}
          >
            {parseRichText(currentGame.description)}
          </div>

          <div 
            className="flex items-center gap-4 opacity-0"
            style={{ animation: 'heroButtonReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards' }}
          >
            <Link 
              to={`/${currentGame.slug}`} 
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-cyan-500 text-primary-foreground font-bold text-lg rounded-xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(var(--primary),0.4)] hover:gap-4"
            >
              <Download className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
              <span>تحميل الآن</span>
            </Link>
            
            {showTrailer && isMP4 && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dots Navigation */}
      {heroGames.length > 1 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroGames.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                index === currentIndex 
                  ? "w-10 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}

      {/* Side Navigation Arrows */}
      {heroGames.length > 1 && (
        <>
          <button
            onClick={() => goToSlide(currentIndex === 0 ? heroGames.length - 1 : currentIndex - 1)}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 glass-card rounded-full items-center justify-center hover:bg-primary/20 transition-all duration-300 hover:scale-110 z-20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => goToSlide((currentIndex + 1) % heroGames.length)}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 glass-card rounded-full items-center justify-center hover:bg-primary/20 transition-all duration-300 hover:scale-110 z-20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
};