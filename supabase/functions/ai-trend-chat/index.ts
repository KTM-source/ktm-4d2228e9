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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    console.log("Calling Lovable AI Gateway for ai-trend-chat...");

    // Build messages for OpenAI-compatible API
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لـ Lovable AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI Gateway error");
    }

    return new Response(response.body, {
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
