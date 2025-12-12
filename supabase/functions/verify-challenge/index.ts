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
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, challengeId, action, actionData } = await req.json();

    console.log("Verifying challenge:", { userId, challengeId, action });

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (challengeId === 'auto') {
      const now = new Date().toISOString();
      
      const { data: challenges } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("is_completed", false)
        .gt("expires_at", now);

      if (!challenges || challenges.length === 0) {
        return new Response(JSON.stringify({ verified: false, message: "لا توجد تحديات نشطة" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let anyVerified = false;
      let verifiedMessage = "";
      for (const challenge of challenges) {
        const result = await verifySingleChallenge(supabase, LOVABLE_API_KEY, userId, challenge, action, actionData);
        if (result.verified) {
          anyVerified = true;
          verifiedMessage = result.message;
        }
      }

      return new Response(JSON.stringify({ 
        verified: anyVerified, 
        message: anyVerified ? verifiedMessage : "لم يتم التحقق بعد" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("user_challenges")
      .select("*")
      .eq("id", challengeId)
      .eq("user_id", userId)
      .single();

    if (challengeError || !challenge) {
      return new Response(JSON.stringify({ error: "Challenge not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await verifySingleChallenge(supabase, LOVABLE_API_KEY, userId, challenge, action, actionData);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error verifying challenge:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function verifySingleChallenge(
  supabase: any,
  LOVABLE_API_KEY: string | undefined,
  userId: string,
  challenge: any,
  action: string,
  actionData?: Record<string, any>
): Promise<{ verified: boolean; message: string }> {
  if (challenge.is_completed) {
    return { verified: true, message: "التحدي مكتمل مسبقاً" };
  }

  let verificationData: any = {};
  try {
    const desc = JSON.parse(challenge.challenge_description || "{}");
    verificationData = desc.verification_data || {};
  } catch (e) {
    console.log("No structured verification data");
  }

  let verified = false;
  let message = "";
  
  const challengeType = challenge.challenge_type?.toLowerCase() || "";
  const challengeText = challenge.challenge_text?.toLowerCase() || "";

  const isCommentChallenge = challengeType === "comment" || challengeText.includes("تعليق");
  const isRatingChallenge = challengeType === "rate_games" || challengeText.includes("قيّم");
  const isFavoritesChallenge = challengeType === "add_favorites" || challengeText.includes("مفضل");
  const isAvatarChallenge = challengeType === "avatar_change" || challengeText.includes("صورة");
  const isNameChallenge = challengeType === "change_name" || challengeText.includes("اسمك الأول");

  // Comment challenge verification
  if (action === "comment" && isCommentChallenge && actionData?.content) {
    const requiredText = verificationData.required_text?.toLowerCase() || "";
    const commentText = actionData.content.toLowerCase();
    
    if (requiredText && commentText.includes(requiredText)) {
      verified = true;
      message = "تم التحقق من التعليق بنجاح! 🎉";
    }
  }

  // Rating challenge verification
  if (action === "rate_games" && isRatingChallenge) {
    const requiredRatings = verificationData.required_count || 1;
    const { count: ratingCount } = await supabase
      .from("game_ratings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((ratingCount || 0) >= requiredRatings) {
      verified = true;
      message = `تم تقييم ${ratingCount} ألعاب!`;
    }
  }

  // Favorites challenge verification
  if (action === "add_favorites" && isFavoritesChallenge) {
    const requiredFavorites = verificationData.required_count || 1;
    const { count: favCount } = await supabase
      .from("user_favorites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((favCount || 0) >= requiredFavorites) {
      verified = true;
      message = `تم إضافة ${favCount} ألعاب للمفضلة!`;
    }
  }

  // Avatar change verification using AI
  if (action === "avatar_change" && isAvatarChallenge && actionData?.avatarUrl && LOVABLE_API_KEY) {
    const avatarDescription = verificationData.avatar_description || "";
    
    if (avatarDescription) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "user", 
                content: `هل الصورة في هذا الرابط تطابق الوصف: "${avatarDescription}"؟
                
رابط الصورة: ${actionData.avatarUrl}

أجب بـ "نعم" أو "لا" فقط.`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const response = aiData.choices?.[0]?.message?.content?.toLowerCase() || "";
          
          if (response.includes("نعم") || response.includes("yes")) {
            verified = true;
            message = "تم التحقق من صورة الأفتار! 🎉";
          }
        }
      } catch (e) {
        console.error("AI verification error:", e);
      }
    }
  }

  // Name change verification
  if (action === "change_name" && isNameChallenge && actionData) {
    const requiredFirstName = verificationData.required_first_name?.toLowerCase() || "";
    const requiredLastName = verificationData.required_last_name?.toLowerCase() || "";
    const userFirstName = actionData.firstName?.toLowerCase() || "";
    const userLastName = actionData.lastName?.toLowerCase() || "";
    
    if ((requiredFirstName && userFirstName.includes(requiredFirstName)) &&
        (requiredLastName && userLastName.includes(requiredLastName))) {
      verified = true;
      message = "تم التحقق من تغيير الاسم! 🎉";
    }
  }

  if (verified) {
    await supabase
      .from("user_challenges")
      .update({ 
        is_completed: true, 
        completed_at: new Date().toISOString() 
      })
      .eq("id", challenge.id);

    await supabase
      .from("challenge_completions")
      .insert({
        user_id: userId,
        challenge_id: challenge.id
      });

    await checkAndUpdateVerification(supabase, userId);
  }

  return { 
    verified, 
    message: message || (verified ? "تم إنجاز التحدي!" : "لم يتم التحقق بعد") 
  };
}

async function checkAndUpdateVerification(supabase: any, userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count } = await supabase
    .from("challenge_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("completed_at", thirtyDaysAgo.toISOString());

  const isVerified = (count || 0) >= 30;
  
  if (isVerified) {
    const verifiedUntil = new Date();
    verifiedUntil.setDate(verifiedUntil.getDate() + 30);
    
    await supabase
      .from("profiles")
      .update({ 
        is_verified: true,
        verified_until: verifiedUntil.toISOString()
      })
      .eq("user_id", userId);
  }
}
