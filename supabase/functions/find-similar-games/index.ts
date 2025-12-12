import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId, gameTitle, gameGenre, gameDescription, gameCategory } = await req.json();
    
    console.log(`Finding similar games for: ${gameTitle}`);
    console.log(`Genre: ${gameGenre}, Category: ${gameCategory}`);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all other games
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

    console.log(`Found ${allGames.length} other games to analyze`);

    // Prepare games list for AI analysis
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

حلل الألعاب وأعطني أرقام (index) أفضل 6 ألعاب الأكثر تشابهاً بناءً على:
1. نوع اللعب (قصة، أكشن، عالم مفتوح، إلخ)
2. الأجواء والثيمات المشتركة
3. تجربة اللاعب المشابهة

أجب بـ JSON فقط بهذا الشكل: {"similar": [0, 1, 2, 3, 4, 5]}
حيث الأرقام هي index الألعاب الأكثر تشابهاً مرتبة من الأكثر تشابهاً إلى الأقل.`;

    console.log("Calling Gemini API for similar games analysis...");

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "أنت محلل ألعاب متخصص. أجب دائماً بـ JSON فقط." }] },
          { role: "model", parts: [{ text: "فهمت، سأرد بـ JSON فقط." }] },
          { role: "user", parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errorText);
      
      // Fallback to basic genre matching
      console.log("Falling back to basic genre matching");
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
    const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    console.log("AI Response:", aiContent);

    // Parse AI response
    let similarIndices: number[] = [];
    try {
      // Extract JSON from response
      const jsonMatch = aiContent.match(/\{[\s\S]*"similar"[\s\S]*\[[\s\S]*\][\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        similarIndices = parsed.similar || [];
      } else {
        // Try to extract numbers directly
        const numbers = aiContent.match(/\d+/g);
        if (numbers) {
          similarIndices = numbers.map(Number).slice(0, 6);
        }
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback: return first 6 games
      similarIndices = [0, 1, 2, 3, 4, 5];
    }

    // Map indices to actual games
    const similarGames = similarIndices
      .filter(idx => idx >= 0 && idx < allGames.length)
      .map(idx => allGames[idx])
      .slice(0, 6);

    console.log(`Returning ${similarGames.length} similar games`);

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
