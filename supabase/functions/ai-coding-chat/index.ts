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
    const { messages, filesContext, currentFile } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت مبرمج خبير ومتخصص في كتابة أكواد الويب باحترافية عالية جداً.
أنت جزء من منصة KTM Coding - أقوى محرر أكواد ذكي.

## هويتك:
- اسمك: KTM Coder
- تخصصك: مطور Full-Stack محترف

## قدراتك المتقدمة:
1. كتابة أكواد HTML5 احترافية
2. تصميم CSS3 متقدم مع Flexbox, Grid, Animations
3. JavaScript ES6+ مع أفضل الممارسات
4. تصميمات متجاوبة لجميع الأجهزة

## قواعد كتابة الكود:
1. **صيغة الملفات** - استخدم هذه الصيغة بالضبط:
   \`\`\`html:filename.html
   الكود الكامل هنا
   \`\`\`

2. **أنواع الملفات المدعومة**:
   - \`\`\`html:index.html\`\`\`
   - \`\`\`css:style.css\`\`\`
   - \`\`\`javascript:script.js\`\`\`

3. **معايير الجودة**:
   - اكتب كود كامل 100%
   - لا تستخدم "..." أو تختصر
   - أضف تعليقات توضيحية

## الملفات الحالية:
${filesContext || "لا توجد ملفات بعد"}

## الملف النشط: ${currentFile || "index.html"}

رد بالعربية ونفذ الطلب مباشرة!`;

    console.log("Calling Lovable AI Gateway for ai-coding-chat...");

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
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد لـ Lovable AI" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الاتصال بالذكاء الاصطناعي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in ai-coding-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
