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
    const { title, description, genre, developer } = await req.json();
    
    if (!title || !description) {
      return new Response(
        JSON.stringify({ success: false, error: "يجب توفير اسم اللعبة والوصف" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating AI review for game: ${title}`);

    const systemPrompt = `أنت ناقد ألعاب فيديو محترف ومتخصص. مهمتك هي كتابة مراجعة شاملة واحترافية للعبة باللغة العربية.

المراجعة يجب أن تكون:
- شاملة ومفصلة (1500-2500 كلمة تقريباً)
- منظمة بأقسام واضحة
- تستخدم الجداول للمقارنات والتقييمات
- محايدة وموضوعية
- تذكر الإيجابيات والسلبيات بشكل صريح

استخدم التنسيق التالي بالضبط:

## 🎮 نظرة عامة على اللعبة
[فقرة تعريفية شاملة عن اللعبة]

## 📖 تحليل القصة
[تحليل عميق للقصة بدون حرق الأحداث الرئيسية]

## 👥 الشخصيات الرئيسية
| الشخصية | الوصف | التقييم |
|---------|-------|---------|
[جدول بأهم الشخصيات]

## 🎯 أسلوب اللعب
[تحليل مفصل لميكانيكيات اللعب]

## 🎨 الرسومات والأداء
| العنصر | التقييم | ملاحظات |
|--------|---------|---------|
[جدول تقييم الرسومات والأداء]

## ✅ الإيجابيات
- [إيجابية 1]
- [إيجابية 2]
...

## ❌ السلبيات
- [سلبية 1]
- [سلبية 2]
...

## 📊 التقييم النهائي
| المعيار | النقاط |
|---------|--------|
| القصة | X/10 |
| الجرافيكس | X/10 |
| أسلوب اللعب | X/10 |
| الصوتيات | X/10 |
| المحتوى | X/10 |
| **الإجمالي** | **X/10** |

## 💡 الخلاصة
[فقرة ختامية مع التوصية]

---
*تم إنشاء هذه المراجعة بواسطة الذكاء الاصطناعي - KTM AI Review*

إذا لم تكن لديك معلومات كافية عن اللعبة أو كانت اللعبة غير معروفة جداً، رد فقط بـ:
{ "rejected": true, "reason": "لا تتوفر معلومات كافية" }`;

    const userPrompt = `اكتب مراجعة شاملة للعبة التالية:

**اسم اللعبة:** ${title}
**المطور:** ${developer || "غير محدد"}
**النوع:** ${genre || "غير محدد"}

**وصف اللعبة:**
${description}

ابحث في معلوماتك عن هذه اللعبة وقدم مراجعة احترافية وشاملة.`;

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "تم تجاوز حد الطلبات، حاول لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const reviewContent = data.choices?.[0]?.message?.content || "";

    console.log("Generated review length:", reviewContent.length);

    // Check if AI rejected the review
    if (reviewContent.includes('"rejected": true') || reviewContent.includes('"rejected":true')) {
      try {
        const rejectedData = JSON.parse(reviewContent);
        if (rejectedData.rejected) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              rejected: true, 
              reason: rejectedData.reason || "لا تتوفر معلومات كافية عن هذه اللعبة" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch {
        // Not a JSON rejection, continue
      }
    }

    // Check if review is too short (likely failed)
    if (reviewContent.length < 500) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          rejected: true, 
          reason: "لم نتمكن من إنشاء مراجعة كافية لهذه اللعبة" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, review: reviewContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error generating game review:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
