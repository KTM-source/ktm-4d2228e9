import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIReviewButtonProps {
  title: string;
  description: string;
  genre?: string;
  developer?: string;
  existingReview?: string | null;
  reviewStatus?: string | null;
  onReviewGenerated: (review: string) => void;
}

export const AIReviewButton = ({
  title,
  description,
  genre,
  developer,
  existingReview,
  reviewStatus,
  onReviewGenerated,
}: AIReviewButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(reviewStatus || null);

  const canRequestReview = title.trim() && description.trim() && 
    !existingReview && 
    localStatus !== 'rejected' && 
    localStatus !== 'completed';

  const handleGenerateReview = async () => {
    if (!canRequestReview) return;

    setIsGenerating(true);
    setLocalStatus('pending');

    try {
      const { data, error } = await supabase.functions.invoke("generate-game-review", {
        body: {
          title,
          description,
          genre,
          developer,
        },
      });

      if (error) {
        throw error;
      }

      if (data.rejected) {
        setLocalStatus('rejected');
        toast.error(data.reason || "لم نتمكن من إنشاء مراجعة لهذه اللعبة");
        return;
      }

      if (!data.success || !data.review) {
        throw new Error(data.error || "فشل في إنشاء المراجعة");
      }

      setLocalStatus('completed');
      onReviewGenerated(data.review);
      toast.success("تم إنشاء المراجعة بنجاح! سيتم إدراجها عند حفظ اللعبة");

    } catch (error: any) {
      console.error("Review generation error:", error);
      toast.error(error.message || "حدث خطأ في إنشاء المراجعة");
      setLocalStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // If review already exists
  if (existingReview || localStatus === 'completed') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30">
        <CheckCircle className="w-6 h-6 text-green-500" />
        <div className="flex-1">
          <span className="font-medium text-green-400">تم إنشاء المراجعة بنجاح</span>
          <p className="text-xs text-muted-foreground mt-1">
            سيتم إدراج المراجعة مع حفظ اللعبة
          </p>
        </div>
      </div>
    );
  }

  // If review was rejected
  if (localStatus === 'rejected') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30">
        <XCircle className="w-6 h-6 text-red-500" />
        <div className="flex-1">
          <span className="font-medium text-red-400">لم نتمكن من إنشاء مراجعة</span>
          <p className="text-xs text-muted-foreground mt-1">
            لا تتوفر معلومات كافية عن هذه اللعبة
          </p>
        </div>
      </div>
    );
  }

  // Not enough data to request
  if (!title.trim() || !description.trim()) {
    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Bot className="w-5 h-5" />
          <div>
            <span className="font-medium">مراجعة AI</span>
            <p className="text-xs mt-1">
              أدخل اسم اللعبة والوصف أولاً لطلب مراجعة AI
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <span className="font-medium text-foreground">مراجعة الذكاء الاصطناعي</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                اطلب مراجعة شاملة للعبة من AI
              </p>
            </div>
          </div>
          
          <Button
            type="button"
            onClick={handleGenerateReview}
            disabled={isGenerating || !canRequestReview}
            className={cn(
              "gap-2 transition-all duration-300",
              isGenerating 
                ? "bg-primary/50" 
                : "bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" />
                طلب مراجعة
              </>
            )}
          </Button>
        </div>
      </div>
      
      {isGenerating && (
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          قد يستغرق إنشاء المراجعة دقيقة أو أكثر...
        </p>
      )}
    </div>
  );
};
