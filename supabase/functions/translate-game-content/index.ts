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

    const systemPrompt = `أنت مترجم محترف متخصص في ترجمة محتوى الألعاب. قم بترجمة المحتوى التالي إلى ${targetLanguage} بشكل دقيق واحترافي.

قواعد الترجمة:
- حافظ على التنسيق الأصلي (العناوين، الجداول، القوائم، الرموز التعبيرية)
- لا تترجم أسماء الألعاب أو الشخصيات المشهورة
- حافظ على أي كود أو روابط كما هي
- اجعل الترجمة طبيعية وسلسة في اللغة المستهدفة
- حافظ على بنية Markdown كاملة

قم بإرجاع النص المترجم فقط بدون أي تعليقات إضافية.`;

    const contentToTranslate = `# المحتوى للترجمة:

## الوصف:
${description}

${review ? `## المراجعة:
${review}` : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentToTranslate },
        ],
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Translation API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "تم تجاوز حد الطلبات، حاول لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content || "";

    console.log("Translation completed, length:", translatedContent.length);

    // Parse the translated content to separate description and review
    let translatedDescription = translatedContent;
    let translatedReview = "";

    const reviewMatch = translatedContent.match(/## (?:المراجعة|Review|Critique|Reseña|Rezension|Revisão|Recensione|レビュー|评论|Обзор):\s*([\s\S]*)/i);
    const descMatch = translatedContent.match(/## (?:الوصف|Description|Descripción|Beschreibung|Descrição|Descrizione|説明|描述|Описание):\s*([\s\S]*?)(?=## |$)/i);

    if (descMatch && descMatch[1]) {
      translatedDescription = descMatch[1].trim();
    }
    
    if (reviewMatch && reviewMatch[1]) {
      translatedReview = reviewMatch[1].trim();
    }

    // If parsing didn't work well, use the full content as description
    if (translatedDescription.length < 50 && translatedContent.length > 100) {
      translatedDescription = translatedContent;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        translatedDescription,
        translatedReview: translatedReview || null
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
