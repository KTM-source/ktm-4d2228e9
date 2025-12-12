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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, batchMode } = await req.json();

    console.log("Generating challenges for user:", userId);

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setUTCHours(3, 0, 0, 0);
    if (expiresAt <= now) {
      expiresAt.setDate(expiresAt.getDate() + 1);
    }

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

    await supabase
      .from("user_challenges")
      .delete()
      .lt("expires_at", now.toISOString());

    const results: any[] = [];

    for (const currentUserId of usersToProcess) {
      console.log("Processing user:", currentUserId);
      
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
      
      const { data: allUserChallenges } = await supabase
        .from("user_challenges")
        .select("challenge_hash")
        .eq("user_id", currentUserId);

      const existingHashes = new Set(allUserChallenges?.map(c => c.challenge_hash) || []);

      const prompt = `أنت مولد تحديات لموقع ألعاب. أنشئ ${neededChallenges} تحدي قابل للتحقق التلقائي.

أنواع التحديات المتاحة:
1. "comment" - كتابة تعليق بمحتوى غريب ومضحك
2. "rate_games" - تقييم عدد من الألعاب
3. "add_favorites" - إضافة ألعاب للمفضلة  
4. "avatar_change" - تغيير صورة الملف الشخصي لوصف محدد
5. "change_name" - تغيير الاسم الأول والأخير لشيء غريب

أرجع JSON array فقط بهذا الشكل:
[
  {
    "text": "نص التحدي كامل مع الإيموجي",
    "description": "وصف قصير",
    "type": "comment",
    "verification_data": {
      "required_text": "النص المطلوب",
      "required_count": 3,
      "avatar_description": "وصف الصورة",
      "required_first_name": "الاسم الأول",
      "required_last_name": "الاسم الأخير"
    }
  }
]`;

      console.log("Calling Lovable AI Gateway for challenges...");
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "أنت مساعد يكتب تحديات ألعاب إبداعية وغريبة باللغة العربية. أرجع JSON فقط." },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("Lovable AI Gateway error:", aiResponse.status);
        continue;
      }

      const aiData = await aiResponse.json();
      let challengesText = aiData.choices?.[0]?.message?.content || "[]";
      
      console.log("AI response:", challengesText);

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

      if (userChallenges.length > 0) {
        const { error } = await supabase
          .from("user_challenges")
          .insert(userChallenges);

        if (error) {
          console.error("Error inserting challenges:", error);
        } else {
          results.push({ userId: currentUserId, challengesCreated: userChallenges.length });
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
