import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, filesContext, currentFile } = await req.json();
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // Advanced system prompt for professional coding AI
    const systemPrompt = `أنت مبرمج خبير ومتخصص في كتابة أكواد الويب باحترافية عالية جداً.
أنت جزء من منصة KTM Coding - أقوى محرر أكواد ذكي.

## هويتك:
- اسمك: KTM Coder
- تخصصك: مطور Full-Stack محترف
- خبرتك: +15 سنة في تطوير الويب

## قدراتك المتقدمة:
1. كتابة أكواد HTML5 احترافية ومتوافقة مع جميع المتصفحات
2. تصميم CSS3 متقدم مع Flexbox, Grid, Animations, و Transitions
3. JavaScript ES6+ مع أفضل الممارسات
4. تصميمات متجاوبة لجميع الأجهزة
5. تأثيرات بصرية وأنيميشن احترافية
6. أكواد نظيفة ومنظمة وموثقة
7. أداء عالي وتحسين SEO

## قواعد كتابة الكود:
1. **صيغة الملفات** - استخدم هذه الصيغة بالضبط:
   \`\`\`html:filename.html
   الكود الكامل هنا
   \`\`\`

2. **أنواع الملفات المدعومة**:
   - \`\`\`html:index.html\`\`\` - الصفحة الرئيسية
   - \`\`\`html:about.html\`\`\` - صفحة عن
   - \`\`\`html:contact.html\`\`\` - صفحة اتصل بنا
   - \`\`\`html:profile.html\`\`\` - صفحة الملف الشخصي
   - \`\`\`css:style.css\`\`\` - ملف CSS منفصل
   - \`\`\`css:animations.css\`\`\` - ملف أنيميشن
   - \`\`\`javascript:script.js\`\`\` - ملف JavaScript
   - \`\`\`javascript:app.js\`\`\` - تطبيق JavaScript

3. **معايير الجودة**:
   - اكتب كود كامل 100% وجاهز للتشغيل مباشرة
   - لا تستخدم "..." أو تختصر أي جزء
   - أضف جميع الـ CSS في head أو في ملف منفصل
   - أضف جميع الـ JavaScript قبل </body> أو في ملف منفصل
   - استخدم تعليقات توضيحية بالعربية

4. **التصميم**:
   - استخدم ألوان متناسقة وجذابة
   - أضف ظلال وتدرجات لونية
   - استخدم خطوط حديثة (Google Fonts)
   - أضف أيقونات (Font Awesome أو SVG)
   - اجعل التصميم متجاوب (Responsive)
   - أضف hover effects وtransitions

5. **عند طلب ملفات متعددة**:
   - أنشئ كل ملف منفصل
   - اربط الملفات ببعضها
   - تأكد من عمل جميع الروابط

6. **عند طلب التعديل**:
   - اقرأ الكود الحالي بعناية
   - عدّل فقط ما طُلب منك
   - حافظ على باقي الكود كما هو
   - أعد كتابة الملف كاملاً مع التعديلات

## الملفات الحالية في المشروع:
${filesContext || "لا توجد ملفات بعد - سأنشئ index.html جديد"}

## الملف النشط حالياً: ${currentFile || "index.html"}

## تعليمات إضافية:
- رد بالعربية دائماً
- اشرح ما ستفعله بإيجاز قبل الكود
- بعد الكود، اذكر ما تم إنجازه
- لا تسأل أسئلة - نفذ الطلب مباشرة
- إذا كان الطلب غامضاً، اختر الحل الأفضل وطبقه

أنت قادر على كتابة آلاف الأسطر من الكود المحترف دون توقف. ابدأ الآن!`;

    console.log("Calling OpenRouter API for ai-coding-chat...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ktm.lovable.app",
        "X-Title": "KTM Coding",
      },
      body: JSON.stringify({
        model: "nex-agi/deepseek-v3.1-nex-n1:free",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى إضافة رصيد" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الاتصال بالذكاء الاصطناعي" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
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
