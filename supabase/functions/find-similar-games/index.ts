import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId, gameTitle, gameGenre, gameDescription, gameCategory } = await req.json();
    
    console.log(`Finding similar games for: ${gameTitle}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: allGames, error: gamesError } = await supabase
      .from("games")
      .select("id, title, slug, genre, category, description, image, rating")
      .neq("id", gameId)
      .limit(50);

    if (gamesError) {
      console.error("Error fetching games:", gamesError);
      throw gamesError;
    }

    if (!allGames || allGames.length === 0) {
      return new Response(JSON.stringify({ similarGames: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gamesForAnalysis = allGames.map((g, index) => ({
      index,
      title: g.title,
      genre: g.genre || g.category,
      description: g.description?.substring(0, 200) || ""
    }));

    const prompt = `أنت محلل ألعاب خبير. مهمتك هي إيجاد الألعاب الأكثر تشابهاً مع اللعبة المحددة.

اللعبة الأساسية:
- العنوان: ${gameTitle}
- التصنيف: ${gameGenre || gameCategory}
- الوصف: ${gameDescription?.substring(0, 300) || "غير متوفر"}

قائمة الألعاب للمقارنة:
${gamesForAnalysis.map(g => `[${g.index}] ${g.title} | التصنيف: ${g.genre} | ${g.description}`).join("\n")}

حلل الألعاب وأعطني أرقام (index) أفضل 6 ألعاب الأكثر تشابهاً.
أجب بـ JSON فقط بهذا الشكل: {"similar": [0, 1, 2, 3, 4, 5]}`;

    console.log("Calling Lovable AI Gateway for similar games analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت محلل ألعاب متخصص. أجب دائماً بـ JSON فقط." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("Lovable AI Gateway error:", aiResponse.status);
      // Fallback to basic genre matching
      const genreMatches = allGames
        .filter(g => {
          const gGenre = (g.genre || g.category || "").toLowerCase();
          const targetGenre = (gameGenre || gameCategory || "").toLowerCase();
          return gGenre.includes(targetGenre) || targetGenre.includes(gGenre);
        })
        .slice(0, 6);
      
      return new Response(JSON.stringify({ similarGames: genreMatches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI Response:", aiContent);

    let similarIndices: number[] = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*"similar"[\s\S]*\[[\s\S]*\][\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        similarIndices = parsed.similar || [];
      } else {
        const numbers = aiContent.match(/\d+/g);
        if (numbers) {
          similarIndices = numbers.map(Number).slice(0, 6);
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      similarIndices = [0, 1, 2, 3, 4, 5];
    }

    const similarGames = similarIndices
      .filter(idx => idx >= 0 && idx < allGames.length)
      .map(idx => allGames[idx])
      .slice(0, 6);

    return new Response(JSON.stringify({ similarGames }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in find-similar-games:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      similarGames: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
