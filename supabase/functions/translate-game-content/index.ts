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
    const descSystemPrompt = `You are a professional translator specializing in game content. Translate the following text to ${targetLanguage}.

CRITICAL RULES:
1. PRESERVE ALL MARKDOWN FORMATTING EXACTLY:
   - Keep **bold** as **bold**
   - Keep ## headers as ## headers
   - Keep bullet points (- or •) as bullet points
   - MOST IMPORTANT: Keep tables in EXACT Markdown format with | pipes
2. Do NOT add any new headers or labels
3. Do NOT translate game names, character names, or technical terms
4. Keep URLs, links, and code unchanged
5. Return ONLY the translated text with preserved formatting

Example table format to preserve:
| Column1 | Column2 | Column3 |
|---------|---------|---------|
| Value1 | Value2 | Value3 |`;

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
          { role: "user", content: `Translate this game description to ${targetLanguage}:\n\n${description}` },
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
      
      if (descResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "نفذ رصيد الترجمة، يرجى إضافة رصيد من إعدادات Lovable" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Translation API error: ${descResponse.status}`);
    }

    const descData = await descResponse.json();
    let translatedDescription = descData.choices?.[0]?.message?.content || "";
    
    // Clean up any unwanted headers the AI might have added
    translatedDescription = translatedDescription
      .replace(/^#+ ?(Description|الوصف|Descripción|Beschreibung|Descrição|Descrizione|説明|描述|Описание|Contenu à traduire):?\s*\n?/gim, '')
      .replace(/^#+ ?.*traduire.*\n*/gim, '')
      .replace(/^(Here'?s? (is )?the translation|Voici la traduction|Aquí está la traducción).*:\s*\n?/gim, '')
      .trim();

    console.log("Description translated, length:", translatedDescription.length);

    // Translate review if exists
    let translatedReview = null;
    if (review && review.trim().length > 0) {
      const reviewSystemPrompt = `You are a professional translator specializing in game reviews. Translate the following game review to ${targetLanguage}.

CRITICAL RULES - MUST FOLLOW:
1. PRESERVE ALL MARKDOWN FORMATTING EXACTLY AS IS:
   - Keep **bold text** format
   - Keep ## and ### headers format
   - Keep bullet points (- or • or *) format
   - Keep numbered lists (1. 2. 3.) format
   - TABLES ARE CRITICAL: Keep Markdown tables with | pipes EXACTLY like this:
     | Header1 | Header2 | Header3 |
     |---------|---------|---------|
     | Cell1 | Cell2 | Cell3 |
2. Do NOT add any labels like "Review:" or "Translation:"
3. Do NOT translate game names, character names
4. Keep emojis as they are
5. Return ONLY the translated text with ALL formatting preserved

The table format MUST be preserved with pipes | and dashes ---`;

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
            { role: "user", content: `Translate this game review to ${targetLanguage}, preserving ALL Markdown formatting including tables:\n\n${review}` },
          ],
          max_tokens: 8000,
        }),
      });

      if (reviewResponse.ok) {
        const reviewData = await reviewResponse.json();
        translatedReview = reviewData.choices?.[0]?.message?.content || null;
        
        // Clean up any unwanted headers
        if (translatedReview) {
          translatedReview = translatedReview
            .replace(/^#+ ?(Review|المراجعة|Critique|Reseña|Rezension|Revisão|Recensione|レビュー|评论|Обзор):?\s*\n?/gim, '')
            .replace(/^(Here'?s? (is )?the translation|Voici la traduction|Aquí está la traducción).*:\s*\n?/gim, '')
            .trim();
        }
        
        console.log("Review translated, length:", translatedReview?.length || 0);
      } else if (reviewResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "نفذ رصيد الترجمة، يرجى إضافة رصيد من إعدادات Lovable" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
