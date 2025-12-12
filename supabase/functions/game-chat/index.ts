import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAQ_CONTEXT = `
أسئلة شائعة عن موقع كَتَم (KTM):

1. طريقة التحميل:
- اضغط على زر "تحميل اللعبة" في صفحة اللعبة
- سيتم توجيهك لرابط التحميل المباشر
- قم بتحميل الملف وفك الضغط
- شغل اللعبة مباشرة (Pre-Installed)

2. هل الموقع آمن؟
- نعم، موقع كَتَم آمن 100%
- جميع الألعاب مفحوصة من الفيروسات
- الروابط مباشرة وموثوقة

3. هل الألعاب تعمل بدون تثبيت؟
- نعم، جميع الألعاب Pre-Installed
- فقط فك الضغط وشغل اللعبة

4. ماذا أفعل إذا لم تعمل اللعبة؟
- تأكد من توفر متطلبات النظام
- شغل اللعبة كمسؤول (Run as Administrator)
- أوقف برنامج الحماية مؤقتاً
- تأكد من فك الضغط بالكامل

5. هل يمكنني طلب لعبة معينة؟
- نعم، يمكنك طلب أي لعبة من صفحة "تواصل معنا"
- اختر "طلب لعبة" من القائمة

6. ما هي أنواع الملفات المضغوطة؟
- نستخدم RAR أو ZIP
- تحتاج WinRAR أو 7-Zip لفك الضغط
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, gameContext } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const systemPrompt = `أنت مساعد ذكاء اصطناعي ودود اسمك "كَتَم AI" تعمل داخل موقع "كَتَم" (KTM) المتخصص في تحميل الألعاب.

معلومات اللعبة الحالية التي يشاهدها المستخدم:
- اسم اللعبة: ${gameContext.title}
- المطور: ${gameContext.developer || 'غير محدد'}
- النوع/التصنيف: ${gameContext.genre || gameContext.category || 'غير محدد'}
- الحجم: ${gameContext.size}
- الإصدار: ${gameContext.version}
- الوصف: ${gameContext.description}

${FAQ_CONTEXT}

تعليمات مهمة:
1. أجب فقط عن أسئلة متعلقة باللعبة الحالية أو الموقع
2. كن ودوداً ومختصراً في إجاباتك
3. استخدم اللغة العربية
4. إذا سُئلت عن معلومات غير متوفرة عن اللعبة، اعتذر بلطف
5. يمكنك تلخيص قصة اللعبة أو ترجمتها إذا طُلب منك
6. ساعد المستخدم في أي استفسار عن التحميل أو التشغيل
7. لا تجب عن أسئلة خارج نطاق الألعاب أو الموقع
8. إذا سألك أحد "من أنت" أخبره أنك كَتَم AI مساعد ذكي في موقع كَتَم للألعاب`;

    console.log("Calling OpenRouter API for game-chat...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ktm.lovable.app",
        "X-Title": "KTM Games",
      },
      body: JSON.stringify({
        model: "nousresearch/hermes-3-llama-3.1-405b:free",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يتطلب إضافة رصيد" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "حدث خطأ في الخدمة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("game-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
