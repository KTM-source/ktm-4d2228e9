import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Challenge types that can be auto-verified
const CHALLENGE_TYPES = [
  "comment",
  "rate_games", 
  "add_favorites",
  "view_games",
  "avatar_change",
  "send_message",
  "change_name",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, batchMode } = await req.json();

    console.log("Generating challenges for user:", userId);

    // Calculate expiry time (next 3 AM UTC)
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setUTCHours(3, 0, 0, 0);
    if (expiresAt <= now) {
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

    // Get users to process
    let usersToProcess: string[] = [];
    
    if (batchMode) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id");
      
      if (profiles) {
        usersToProcess = profiles.map(p => p.user_id);
      }
    } else if (userId) {
      usersToProcess = [userId];
    }

    if (usersToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "No users to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete old expired challenges first
    await supabase
      .from("user_challenges")
      .delete()
      .lt("expires_at", now.toISOString());

    // Get games for reference
    const { data: games } = await supabase
      .from("games")
      .select("id, title, slug")
      .limit(50);

    const results: any[] = [];

    for (const currentUserId of usersToProcess) {
      console.log("Processing user:", currentUserId);
      
      // Check if user already has valid challenges
      const { data: existingChallenges } = await supabase
        .from("user_challenges")
        .select("id")
        .eq("user_id", currentUserId)
        .gt("expires_at", now.toISOString());

      if (existingChallenges && existingChallenges.length >= 3) {
        console.log("User already has 3 challenges, skipping");
        continue;
      }

      const neededChallenges = 3 - (existingChallenges?.length || 0);
      
      // Get existing challenge hashes to avoid duplicates
      const { data: allUserChallenges } = await supabase
        .from("user_challenges")
        .select("challenge_hash")
        .eq("user_id", currentUserId);

      const existingHashes = new Set(allUserChallenges?.map(c => c.challenge_hash) || []);

      // Generate challenges using AI
      const prompt = `أنت مولد تحديات لموقع ألعاب. أنشئ ${neededChallenges} تحدي قابل للتحقق التلقائي.

أنواع التحديات المتاحة:

1. "comment" - كتابة تعليق بمحتوى غريب ومضحك
   - مثال: اكتب تعليقًا يحتوي على: "أنا بطاطس محشية 🥔"
   - مثال: اكتب تعليق فيه: "الدجاج المقلي يحكم العالم 🍗👑"

2. "rate_games" - تقييم عدد من الألعاب
   - مثال: قيّم 3 ألعاب مختلفة ⭐
   - مثال: قيّم لعبتين بـ 5 نجوم

3. "add_favorites" - إضافة ألعاب للمفضلة  
   - مثال: أضف 3 ألعاب للمفضلة ❤️
   - مثال: أضف لعبة جديدة لقائمة المفضلة

4. "avatar_change" - تغيير صورة الملف الشخصي لوصف محدد
   - مثال: غيّر صورتك لصورة قطة ترتدي نظارة 🐱🕶️
   - مثال: غيّر الأفتار لصورة بطريق يأكل بيتزا 🐧🍕

5. "change_name" - تغيير الاسم الأول والأخير لشيء غريب
   - مثال: غيّر اسمك الأول إلى 'كنغر' واسمك الأخير إلى 'متمركش' 🦘🕺
   - مثال: غيّر اسمك الأول إلى 'موزة' واسمك الأخير إلى 'طائرة' 🍌✈️

قواعد مهمة:
- كل تحدي يجب أن يكون فريد ومختلف
- استخدم إيموجي في النص
- نوّع بين أنواع التحديات المختلفة
- للتعليقات: النص المطلوب يجب أن يكون غريب ومضحك
- للأفتار: الوصف يجب أن يكون واضح ومحدد
- لتغيير الاسم: اختر أسماء مضحكة وغريبة جداً

أرجع JSON array فقط بهذا الشكل بالضبط:
[
  {
    "text": "نص التحدي كامل مع الإيموجي",
    "description": "وصف قصير",
    "type": "comment أو rate_games أو add_favorites أو avatar_change أو change_name",
    "verification_data": {
      "required_text": "النص المطلوب (فقط لـ comment)",
      "required_count": 3,
      "avatar_description": "وصف الصورة (فقط لـ avatar_change)",
      "required_first_name": "الاسم الأول (فقط لـ change_name)",
      "required_last_name": "الاسم الأخير (فقط لـ change_name)"
    }
  }
]`;

      console.log("Calling Gemini API for challenges...");
      
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: "أنت مساعد يكتب تحديات ألعاب إبداعية وغريبة باللغة العربية. أرجع JSON فقط بدون أي نص إضافي." }] },
            { role: "model", parts: [{ text: "فهمت، سأرد بـ JSON فقط." }] },
            { role: "user", parts: [{ text: prompt }] }
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Gemini API error:", errorText);
        continue;
      }

      const aiData = await aiResponse.json();
      let challengesText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      
      console.log("AI response:", challengesText);

      // Extract JSON from response
      const jsonMatch = challengesText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("No JSON found in AI response");
        continue;
      }

      let challenges: any[];
      try {
        challenges = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse challenges:", e);
        continue;
      }

      console.log("Parsed challenges:", challenges);

      // Create challenge records
      const userChallenges: any[] = [];
      
      for (const challenge of challenges) {
        if (userChallenges.length >= neededChallenges) break;
        
        const hash = btoa(encodeURIComponent(challenge.text + Date.now() + Math.random())).slice(0, 32);
        
        if (!existingHashes.has(hash)) {
          userChallenges.push({
            user_id: currentUserId,
            challenge_text: challenge.text,
            challenge_description: JSON.stringify({
              description: challenge.description,
              type: challenge.type,
              verification_data: challenge.verification_data
            }),
            challenge_type: challenge.type || "comment",
            challenge_hash: hash,
            expires_at: expiresAt.toISOString(),
          });
          existingHashes.add(hash);
        }
      }

      // Insert challenges
      if (userChallenges.length > 0) {
        console.log("Inserting challenges:", userChallenges.length);
        
        const { error } = await supabase
          .from("user_challenges")
          .insert(userChallenges);

        if (error) {
          console.error("Error inserting challenges:", error);
        } else {
          results.push({ userId: currentUserId, challengesCreated: userChallenges.length });
          console.log("Successfully created challenges for user:", currentUserId);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating challenges:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
