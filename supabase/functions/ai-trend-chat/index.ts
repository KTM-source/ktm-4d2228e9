import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch all site data
    const { data: games } = await supabase
      .from("games")
      .select("title, category, genre, views, rating, size, developer, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: categories } = await supabase
      .from("categories")
      .select("name, slug, count");

    const { data: allGames } = await supabase.from("games").select("views, rating, title");
    const totalViews = allGames?.reduce((sum, g) => sum + (g.views || 0), 0) || 0;
    const avgRating = allGames?.length 
      ? (allGames.reduce((sum, g) => sum + (g.rating || 0), 0) / allGames.length).toFixed(1)
      : 0;

    const existingGameTitles = allGames?.map(g => g.title.toLowerCase()) || [];

    const systemPrompt = `أنت مساعد ذكاء اصطناعي متقدم اسمك "KTM AI Trend" تعمل داخل موقع "كَتَم" (KTM) المتخصص في تحميل الألعاب.

**تعليمات مهمة جداً للردود:**
- لا تكتب JSON مباشرة في ردودك للمستخدم أبداً
- اكتب بشكل طبيعي ومنسق ومرتب
- استخدم العناوين والقوائم والتنسيق العربي الواضح
- عند عرض الألعاب، اعرضها كقائمة مرتبة ومنسقة وليس كـ JSON

**تعليمات اللغة:**
- رد دائماً بنفس لغة المستخدم
- إذا كتب بالإنجليزية، رد بالإنجليزية
- إذا كتب بالعربية، رد بالعربية

معلومات المستخدم: ${userContext?.name || 'مستخدم'}

=== إحصائيات الموقع ===
- إجمالي الألعاب: ${allGames?.length || 0}
- إجمالي المشاهدات: ${totalViews.toLocaleString()}
- متوسط التقييم: ${avgRating}

=== التصنيفات ===
${categories?.map(c => `${c.name}: ${c.count} لعبة`).join(' | ') || 'لا توجد'}

=== أحدث 15 لعبة ===
${games?.slice(0, 15).map((g, i) => `${i + 1}. ${g.title} | ${g.genre || g.category} | ⭐${g.rating || 'N/A'}`).join('\n') || 'لا توجد ألعاب'}

=== الألعاب الموجودة (لاستبعادها من الترند) ===
${existingGameTitles.slice(0, 50).join(', ')}

=== عند طلب ألعاب الترند ===
عند طلب البحث عن ألعاب الترند، اتبع هذا التنسيق بالضبط:

1. اكتب مقدمة قصيرة ودودة
2. اعرض كل لعبة بهذا الشكل المنسق:

**🎮 اسم اللعبة**
![صورة](رابط الصورة من Steam CDN)
- **التصنيف:** Action, RPG
- **المنصات:** PC, PS5, Xbox

مثال لرابط الصورة: https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg

**قواعد البحث عن الترند:**
- ألعاب صدرت فعلاً ومتاحة للتحميل فقط
- لا تذكر ألعاب لم تصدر (مثل GTA 6)
- استبعد الألعاب الموجودة في الموقع

=== تنسيق الردود ===
- استخدم **نص عريض** للعناوين
- استخدم - للقوائم النقطية  
- استخدم 1. 2. 3. للقوائم المرقمة
- استخدم إيموجي بشكل معتدل 🎮
- اكتب بشكل مرتب ومنظم وسهل القراءة
- لا تستخدم JSON في ردودك نهائياً

=== أسلوب الرد ===
- كن ودوداً ومحترفاً
- قدم إجابات واضحة ومفيدة
- رتب المعلومات بشكل جميل`;

    console.log("Calling Gemini API for ai-trend-chat...");

    // Build contents for Gemini
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "مرحباً! أنا KTM AI Trend جاهز لمساعدتك." }] }
    ];
    
    for (const msg of messages) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Gemini API error");
    }

    // Transform Gemini SSE to OpenAI-compatible format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (content) {
                const openAIFormat = {
                  choices: [{ delta: { content } }]
                };
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      },
      flush(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-trend-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
