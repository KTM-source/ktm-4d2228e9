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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

    console.log("Calling Gemini API for game-chat...");

    // Build contents for Gemini
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "مرحباً! أنا كَتَم AI، كيف يمكنني مساعدتك؟" }] }
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
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "حدث خطأ في الخدمة" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    console.error("game-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
