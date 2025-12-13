import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, review, targetLanguage, languageCode } = await req.json();
    
    if (!description || !targetLanguage) {
      return new Response(
        JSON.stringify({ success: false, error: "يجب توفير المحتوى واللغة المستهدفة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Translating content to: ${targetLanguage} (${languageCode})`);

    // Translate description
    const descSystemPrompt = `You are a professional translator. Translate the following game description to ${targetLanguage}. 
Rules:
- Keep all Markdown formatting intact (bold, headers, lists, tables)
- Do NOT add any headers or labels like "Description:" or "## Description"
- Do NOT translate game names or famous character names
- Keep URLs and links unchanged
- Return ONLY the translated text, nothing else`;

    const descResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: descSystemPrompt },
          { role: "user", content: description },
        ],
        max_tokens: 4000,
      }),
    });

    if (!descResponse.ok) {
      const errorText = await descResponse.text();
      console.error("Translation API error:", descResponse.status, errorText);
      
      if (descResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "تم تجاوز حد الطلبات، حاول لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Translation API error: ${descResponse.status}`);
    }

    const descData = await descResponse.json();
    let translatedDescription = descData.choices?.[0]?.message?.content || "";
    
    // Clean up any unwanted headers the AI might have added
    translatedDescription = translatedDescription
      .replace(/^#+ ?(Description|الوصف|Descripción|Beschreibung|Descrição|Descrizione|説明|描述|Описание|Contenu à traduire):?\s*/gim, '')
      .replace(/^#+ ?.*traduire.*\n*/gim, '')
      .trim();

    console.log("Description translated, length:", translatedDescription.length);

    // Translate review if exists
    let translatedReview = null;
    if (review && review.trim().length > 0) {
      const reviewSystemPrompt = `You are a professional translator. Translate the following game review to ${targetLanguage}.
Rules:
- Keep all Markdown formatting intact (bold, headers, lists, tables, emojis)
- Do NOT add any headers or labels like "Review:" or "## Review"
- Do NOT translate game names or famous character names
- Keep URLs and links unchanged
- Return ONLY the translated text, nothing else`;

      const reviewResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: reviewSystemPrompt },
            { role: "user", content: review },
          ],
          max_tokens: 6000,
        }),
      });

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        translatedReview = reviewData.choices?.[0]?.message?.content || null;
        
        // Clean up any unwanted headers
        if (translatedReview) {
          translatedReview = translatedReview
            .replace(/^#+ ?(Review|المراجعة|Critique|Reseña|Rezension|Revisão|Recensione|レビュー|评论|Обзор):?\s*/gim, '')
            .trim();
        }
        
        console.log("Review translated, length:", translatedReview?.length || 0);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        translatedDescription,
        translatedReview
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error translating content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
