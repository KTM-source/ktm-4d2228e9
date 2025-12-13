import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Lock, Plus, Trash2, Edit, LogOut, Gamepad2, Search, 
  ChevronLeft, ChevronRight, Eye, BarChart3,
  Star, X, Mail, Bug, MessageSquare, Image, FolderOpen, Bot, Video
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultiImageUpload } from "@/components/admin/MultiImageUpload";
import { FileUpload, AdditionalFile } from "@/components/admin/FileUpload";
import { RichTextEditor, parseRichText } from "@/components/admin/RichTextEditor";
import VideoUpload from "@/components/admin/VideoUpload";
import { AIReviewButton } from "@/components/admin/AIReviewButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GameForm {
  title: string;
  image: string;
  background_image: string;
  version: string;
  category: string;
  size: string;
  description: string;
  features: string;
  developer: string;
  genre: string;
  rating: string;
  download_link: string;
  trailer_url: string;
  screenshots: string[];
  additional_files: AdditionalFile[];
  ai_review: string;
  system_requirements_minimum: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
  system_requirements_recommended: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
}

const initialForm: GameForm = {
  title: "",
  image: "",
  background_image: "",
  version: "1.0",
  category: "action",
  size: "",
  description: "",
  features: "",
  developer: "",
  genre: "",
  rating: "4.5",
  download_link: "",
  trailer_url: "",
  screenshots: [],
  additional_files: [],
  ai_review: "",
  system_requirements_minimum: {
    os: "Windows 10",
    processor: "",
    memory: "",
    graphics: "",
    storage: "",
  },
  system_requirements_recommended: {
    os: "Windows 10/11",
    processor: "",
    memory: "",
    graphics: "",
    storage: "",
  },
};

const GAMES_PER_PAGE = 20;
const ITEMS_PER_PAGE = 10;

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [form, setForm] = useState<GameForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("games");
  
  // Data for other tabs
  const [reports, setReports] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [gameRequests, setGameRequests] = useState<any[]>([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedAuth = sessionStorage.getItem("ktm_admin_auth");
    if (storedAuth) {
      setIsAuthenticated(true);
      setAdminPassword(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGames();
      fetchReports();
      fetchContactMessages();
      fetchGameRequests();
    }
  }, [isAuthenticated]);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("فشل في جلب الألعاب");
      return;
    }
    setGames(data || []);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error) setReports(data || []);
  };

  const fetchContactMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error) setContactMessages(data || []);
  };

  const fetchGameRequests = async () => {
    const { data, error } = await supabase
      .from("game_requests")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error) setGameRequests(data || []);
  };

  // Filter and paginate games
  const filteredGames = useMemo(() => {
    return games.filter(game => 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.developer?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [games, searchQuery]);

  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  );

  // Paginate other data
  const paginatedReports = reports.slice((reportsPage - 1) * ITEMS_PER_PAGE, reportsPage * ITEMS_PER_PAGE);
  const paginatedContactMessages = contactMessages.slice((contactPage - 1) * ITEMS_PER_PAGE, contactPage * ITEMS_PER_PAGE);
  const paginatedGameRequests = gameRequests.slice((requestsPage - 1) * ITEMS_PER_PAGE, requestsPage * ITEMS_PER_PAGE);

  // Statistics
  const stats = useMemo(() => ({
    totalGames: games.length,
    totalViews: games.reduce((sum, g) => sum + (g.views || 0), 0),
    avgRating: games.length > 0 
      ? (games.reduce((sum, g) => sum + (g.rating || 0), 0) / games.length).toFixed(1)
      : 0,
    categoryCounts: games.reduce((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalReports: reports.length,
    totalMessages: contactMessages.length,
    totalRequests: gameRequests.length,
  }), [games, reports, contactMessages, gameRequests]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-admin", {
        body: { password },
      });

      if (error || !data.success) {
        toast.error("كلمة السر غير صحيحة");
        return;
      }

      setIsAuthenticated(true);
      setAdminPassword(password);
      sessionStorage.setItem("ktm_admin_auth", password);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (error) {
      toast.error("حدث خطأ في تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPassword("");
    sessionStorage.removeItem("ktm_admin_auth");
    setPassword("");
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() + "-free-download";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const genres = form.genre.split(",").map(g => g.trim().toLowerCase()).filter(g => g);
      const primaryCategory = genres[0] || "action";
      
      const gameData = {
        title: form.title,
        slug: generateSlug(form.title),
        image: form.image,
        background_image: form.background_image || null,
        version: form.version,
        category: primaryCategory,
        size: form.size,
        description: form.description,
        features: form.features.split("\n").filter(f => f.trim()),
        developer: form.developer || null,
        genre: form.genre || null,
        rating: parseFloat(form.rating) || 4.5,
        download_link: form.download_link || null,
        trailer_url: form.trailer_url || null,
        screenshots: form.screenshots.length > 0 ? form.screenshots : null,
        additional_files: form.additional_files.length > 0 ? form.additional_files : null,
        ai_review: form.ai_review || null,
        ai_review_status: form.ai_review ? 'completed' : null,
        system_requirements_minimum: form.system_requirements_minimum,
        system_requirements_recommended: form.system_requirements_recommended,
      };

      const { data, error } = await supabase.functions.invoke("admin-games", {
        body: {
          action: editingId ? "update" : "create",
          password: adminPassword,
          gameData,
          gameId: editingId,
        },
      });

      if (error || !data.success) {
        toast.error(data?.error || "حدث خطأ");
        return;
      }

      toast.success(editingId ? "تم تحديث اللعبة" : "تم إضافة اللعبة");
      setForm(initialForm);
      setEditingId(null);
      setShowPreview(false);
      fetchGames();
    } catch (error) {
      toast.error("حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (game: any) => {
    setEditingId(game.id);
    setForm({
      title: game.title,
      image: game.image,
      background_image: game.background_image || "",
      version: game.version,
      category: game.category,
      size: game.size,
      description: game.description,
      features: (game.features || []).join("\n"),
      developer: game.developer || "",
      genre: game.genre || game.category || "",
      rating: String(game.rating || 4.5),
      download_link: game.download_link || "",
      trailer_url: game.trailer_url || "",
      screenshots: game.screenshots || [],
      additional_files: game.additional_files || [],
      ai_review: game.ai_review || "",
      system_requirements_minimum: game.system_requirements_minimum || initialForm.system_requirements_minimum,
      system_requirements_recommended: game.system_requirements_recommended || initialForm.system_requirements_recommended,
    });
    setActiveTab("games");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (gameId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه اللعبة؟")) return;

    try {
      const { data, error } = await supabase.functions.invoke("admin-games", {
        body: {
          action: "delete",
          password: adminPassword,
          gameId,
        },
      });

      if (error || !data.success) {
        toast.error("فشل في حذف اللعبة");
        return;
      }

      toast.success("تم حذف اللعبة");
      fetchGames();
    } catch (error) {
      toast.error("حدث خطأ");
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا البلاغ؟")) return;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) {
      toast.success("تم حذف البلاغ");
      fetchReports();
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (!error) {
      toast.success("تم حذف الرسالة");
      fetchContactMessages();
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    const { error } = await supabase.from("game_requests").delete().eq("id", id);
    if (!error) {
      toast.success("تم حذف الطلب");
      fetchGameRequests();
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>
        
        <Card className="w-full max-w-md glass-morphism animate-scale-in relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 glass-card rounded-2xl flex items-center justify-center mb-4 animate-float">
              <Lock className="w-10 h-10 text-primary animate-glow-pulse" />
            </div>
            <CardTitle className="text-3xl font-display gradient-text">لوحة التحكم</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <Label htmlFor="password">كلمة السر</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة السر"
                  className="mt-1 glass-card border-border/50 focus:border-primary/50"
                />
              </div>
              <Button type="submit" className="w-full btn-primary animate-slide-up" style={{ animationDelay: '0.2s' }} disabled={isLoading}>
                {isLoading ? "جاري التحقق..." : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 glass-morphism z-50 animate-slide-up">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-primary animate-glow-pulse" />
            </div>
            <h1 className="text-2xl font-display font-bold gradient-text">لوحة تحكم KTM</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/ktm/ai/trend")} 
              className="glass-card border-primary/50 hover:border-primary hover:bg-primary/10 transition-all duration-300 gap-2"
            >
              <Bot className="w-4 h-4 text-primary animate-glow-pulse" />
              AI Trend
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="glass-card border-border/50 hover:border-primary/50 transition-all duration-300">
              العودة للموقع
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="transition-all duration-300 hover:scale-105">
              <LogOut className="w-4 h-4 mr-2" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {[
            { icon: Gamepad2, label: "الألعاب", value: stats.totalGames, color: "primary" },
            { icon: Eye, label: "المشاهدات", value: stats.totalViews.toLocaleString(), color: "secondary" },
            { icon: Star, label: "متوسط التقييم", value: stats.avgRating, color: "neon-green" },
            { icon: BarChart3, label: "التصنيفات", value: Object.keys(stats.categoryCounts).length, color: "neon-purple" },
            { icon: Bug, label: "البلاغات", value: stats.totalReports, color: "destructive" },
            { icon: Mail, label: "الرسائل", value: stats.totalMessages, color: "neon-cyan" },
            { icon: MessageSquare, label: "طلبات الألعاب", value: stats.totalRequests, color: "primary" },
          ].map((stat, index) => (
            <div 
              key={stat.label}
              className="stat-card animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <stat.icon className={`w-6 h-6 mx-auto mb-2 text-${stat.color} animate-glow-pulse`} />
              <div className="text-xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card p-1 w-full justify-start overflow-x-auto">
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              إدارة الألعاب
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Bug className="w-4 h-4" />
              البلاغات ({stats.totalReports})
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              التواصل ({stats.totalMessages})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              طلبات الألعاب ({stats.totalRequests})
            </TabsTrigger>
          </TabsList>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Add/Edit Game Form */}
              <div className="space-y-6">
                <Card className="glass-morphism animate-slide-up">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                      {editingId ? "تعديل لعبة" : "إضافة لعبة جديدة"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          معلومات أساسية
                        </h3>
                        
                        <div>
                          <Label htmlFor="title">اسم اللعبة *</Label>
                          <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="glass-card border-border/50"
                            required
                          />
                          {form.title && (
                            <p className="text-xs text-muted-foreground mt-1">
                              الرابط: /{generateSlug(form.title)}
                            </p>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="developer">المطور</Label>
                            <Input
                              id="developer"
                              value={form.developer}
                              onChange={(e) => setForm({ ...form, developer: e.target.value })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label htmlFor="genre">التصنيف / النوع (Genre) *</Label>
                            <Input
                              id="genre"
                              value={form.genre}
                              onChange={(e) => setForm({ ...form, genre: e.target.value })}
                              placeholder="action, adventure, rpg (مفصولة بفاصلة)"
                              className="glass-card border-border/50"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="size">الحجم *</Label>
                            <Input
                              id="size"
                              value={form.size}
                              onChange={(e) => setForm({ ...form, size: e.target.value })}
                              placeholder="50 GB"
                              className="glass-card border-border/50"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="version">الإصدار</Label>
                            <Input
                              id="version"
                              value={form.version}
                              onChange={(e) => setForm({ ...form, version: e.target.value })}
                              className="glass-card border-border/50"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="rating">التقييم (0-5)</Label>
                          <Input
                            id="rating"
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={form.rating}
                            onChange={(e) => setForm({ ...form, rating: e.target.value })}
                            className="glass-card border-border/50"
                          />
                        </div>
                      </div>

                      {/* Images */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                          الصور
                        </h3>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <ImageUpload
                            value={form.image}
                            onChange={(url) => setForm(prev => ({ ...prev, image: url }))}
                            label="الصورة الصغيرة (Portrait) *"
                            aspectRatio="portrait"
                          />
                          <ImageUpload
                            value={form.background_image}
                            onChange={(url) => setForm(prev => ({ ...prev, background_image: url }))}
                            label="الخلفية الكبيرة (Landscape)"
                            aspectRatio="landscape"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                          الوصف والميزات
                        </h3>
                        
                        <div>
                          <Label>الوصف الكامل *</Label>
                          <RichTextEditor
                            value={form.description}
                            onChange={(val) => setForm({ ...form, description: val })}
                            rows={8}
                          />
                        </div>

                        {/* Screenshots */}
                        <div className="pt-2">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Image className="w-4 h-4 text-primary" />
                            صور من داخل اللعبة (اختياري - حد أقصى 10)
                          </h4>
                          <MultiImageUpload
                            values={form.screenshots}
                            onChange={(urls) => setForm({ ...form, screenshots: urls })}
                            label=""
                            maxImages={10}
                          />
                        </div>

                        <div>
                          <Label htmlFor="features">الميزات (كل ميزة في سطر)</Label>
                          <Textarea
                            id="features"
                            value={form.features}
                            onChange={(e) => setForm({ ...form, features: e.target.value })}
                            rows={4}
                            placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"
                            className="glass-card border-border/50"
                          />
                        </div>

                        {/* AI Review Button */}
                        <AIReviewButton
                          title={form.title}
                          description={form.description}
                          genre={form.genre}
                          developer={form.developer}
                          existingReview={form.ai_review || null}
                          reviewStatus={editingId ? (games.find(g => g.id === editingId)?.ai_review_status || null) : null}
                          onReviewGenerated={(review) => setForm({ ...form, ai_review: review })}
                        />
                      </div>

                      {/* System Requirements */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-neon-purple rounded-full animate-pulse" />
                          متطلبات النظام الدنيا
                        </h3>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label>نظام التشغيل</Label>
                            <Input
                              value={form.system_requirements_minimum.os}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_minimum: { ...form.system_requirements_minimum, os: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>المعالج</Label>
                            <Input
                              value={form.system_requirements_minimum.processor}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_minimum: { ...form.system_requirements_minimum, processor: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>الذاكرة</Label>
                            <Input
                              value={form.system_requirements_minimum.memory}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_minimum: { ...form.system_requirements_minimum, memory: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>كرت الشاشة</Label>
                            <Input
                              value={form.system_requirements_minimum.graphics}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_minimum: { ...form.system_requirements_minimum, graphics: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>التخزين</Label>
                            <Input
                              value={form.system_requirements_minimum.storage}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_minimum: { ...form.system_requirements_minimum, storage: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" />
                          متطلبات النظام الموصى بها
                        </h3>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label>نظام التشغيل</Label>
                            <Input
                              value={form.system_requirements_recommended.os}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_recommended: { ...form.system_requirements_recommended, os: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>المعالج</Label>
                            <Input
                              value={form.system_requirements_recommended.processor}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_recommended: { ...form.system_requirements_recommended, processor: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>الذاكرة</Label>
                            <Input
                              value={form.system_requirements_recommended.memory}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_recommended: { ...form.system_requirements_recommended, memory: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>كرت الشاشة</Label>
                            <Input
                              value={form.system_requirements_recommended.graphics}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_recommended: { ...form.system_requirements_recommended, graphics: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                          <div>
                            <Label>التخزين</Label>
                            <Input
                              value={form.system_requirements_recommended.storage}
                              onChange={(e) => setForm({
                                ...form,
                                system_requirements_recommended: { ...form.system_requirements_recommended, storage: e.target.value }
                              })}
                              className="glass-card border-border/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Additional Files */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                          <FolderOpen className="w-4 h-4" />
                          الملفات الإضافية (اختياري)
                        </h3>
                        <FileUpload
                          values={form.additional_files}
                          onChange={(files) => setForm({ ...form, additional_files: files })}
                          label="ملفات مهمة للعبة (حد أقصى 10)"
                          maxFiles={10}
                        />
                      </div>

                      {/* Download Link & Trailer */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b border-border/50 pb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          رابط التحميل والتريلر
                        </h3>
                        <div>
                          <Label htmlFor="download_link">رابط التحميل</Label>
                          <Input
                            id="download_link"
                            value={form.download_link}
                            onChange={(e) => setForm({ ...form, download_link: e.target.value })}
                            dir="ltr"
                            placeholder="https://gofile.io/..."
                            className="glass-card border-border/50"
                          />
                        </div>
                        
                        {/* Trailer Section */}
                        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 text-purple-400 mb-4">
                            <Video className="w-5 h-5" />
                            <span className="font-semibold">تريلر اللعبة</span>
                          </div>
                          
                          <VideoUpload
                            value={form.trailer_url}
                            onChange={(url) => setForm({ ...form, trailer_url: url })}
                            gameSlug={form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="glass-card border-border/50"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {showPreview ? "إخفاء المعاينة" : "معاينة"}
                        </Button>
                        <Button type="submit" className="flex-1 btn-primary" disabled={isLoading}>
                          {isLoading ? "جاري الحفظ..." : editingId ? "تحديث اللعبة" : "إضافة اللعبة"}
                        </Button>
                        {editingId && (
                          <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(initialForm); setShowPreview(false); }} className="glass-card">
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Preview & Games List */}
              <div className="space-y-6">
                {/* Preview */}
                {showPreview && form.title && (
                  <Dialog open={showPreview} onOpenChange={setShowPreview}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-morphism">
                      <DialogTitle className="sr-only">معاينة اللعبة</DialogTitle>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 left-0 z-10"
                          onClick={() => setShowPreview(false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        
                        {/* Preview Content */}
                        <div className="space-y-6 pt-8">
                          {form.background_image && (
                            <div className="relative h-48 rounded-xl overflow-hidden">
                              <img src={form.background_image} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                            </div>
                          )}
                          
                          <div className="flex gap-6">
                            {form.image && (
                              <img src={form.image} alt="" className="w-32 h-44 object-cover rounded-xl" />
                            )}
                            <div className="flex-1">
                              <h2 className="text-2xl font-bold">{form.title}</h2>
                              <p className="text-muted-foreground">{form.developer}</p>
                              <div className="flex gap-2 mt-2">
                                <span className="px-2 py-1 rounded bg-primary/20 text-primary text-sm">{form.genre}</span>
                                <span className="px-2 py-1 rounded bg-muted text-sm">{form.size}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-2">الوصف</h3>
                            <div className="text-muted-foreground leading-relaxed">
                              {parseRichText(form.description)}
                            </div>
                          </div>

                          {form.features && (
                            <div>
                              <h3 className="font-semibold mb-2">الميزات</h3>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {form.features.split("\n").filter(f => f.trim()).map((f, i) => (
                                  <li key={i}>{f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Games List */}
                <Card className="glass-morphism">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>الألعاب المضافة ({filteredGames.length})</span>
                    </CardTitle>
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="pl-10 glass-card border-border/50"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {paginatedGames.map((game) => (
                        <div key={game.id} className="flex items-center gap-3 p-3 rounded-xl glass-card hover:border-primary/30 transition-all group">
                          <img src={game.image} alt={game.title} className="w-12 h-16 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{game.title}</h4>
                            <p className="text-xs text-muted-foreground">{game.genre || game.category} • {game.size}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(game)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(game.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">{currentPage} / {totalPages}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-destructive" />
                  البلاغات الواردة ({reports.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد بلاغات حالياً</p>
                ) : (
                  <div className="space-y-4">
                    {paginatedReports.map((report) => (
                      <div key={report.id} className="p-4 rounded-xl glass-card space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{report.game_name}</h4>
                            <p className="text-sm text-muted-foreground">{report.full_name} • {report.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-destructive/20 text-destructive text-xs">
                              {report.issue_type}
                            </span>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteReport(report.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                      </div>
                    ))}
                    
                    {Math.ceil(reports.length / ITEMS_PER_PAGE) > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button variant="outline" size="icon" onClick={() => setReportsPage(p => Math.max(1, p - 1))} disabled={reportsPage === 1}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">{reportsPage} / {Math.ceil(reports.length / ITEMS_PER_PAGE)}</span>
                        <Button variant="outline" size="icon" onClick={() => setReportsPage(p => Math.min(Math.ceil(reports.length / ITEMS_PER_PAGE), p + 1))} disabled={reportsPage === Math.ceil(reports.length / ITEMS_PER_PAGE)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Messages Tab */}
          <TabsContent value="contact">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  رسائل التواصل ({contactMessages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contactMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد رسائل حالياً</p>
                ) : (
                  <div className="space-y-4">
                    {paginatedContactMessages.map((msg) => (
                      <div key={msg.id} className="p-4 rounded-xl glass-card space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{msg.full_name}</h4>
                            <p className="text-sm text-muted-foreground">{msg.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs">
                              {msg.category}
                            </span>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteContact(msg.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</p>
                      </div>
                    ))}
                    
                    {Math.ceil(contactMessages.length / ITEMS_PER_PAGE) > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button variant="outline" size="icon" onClick={() => setContactPage(p => Math.max(1, p - 1))} disabled={contactPage === 1}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">{contactPage} / {Math.ceil(contactMessages.length / ITEMS_PER_PAGE)}</span>
                        <Button variant="outline" size="icon" onClick={() => setContactPage(p => Math.min(Math.ceil(contactMessages.length / ITEMS_PER_PAGE), p + 1))} disabled={contactPage === Math.ceil(contactMessages.length / ITEMS_PER_PAGE)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Game Requests Tab */}
          <TabsContent value="requests">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  طلبات إضافة الألعاب ({gameRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gameRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات حالياً</p>
                ) : (
                  <div className="space-y-4">
                    {paginatedGameRequests.map((req) => (
                      <div key={req.id} className="p-4 rounded-xl glass-card space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              <Gamepad2 className="w-4 h-4 text-primary" />
                              {req.game_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">{req.full_name} • {req.email}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteRequest(req.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {req.notes && <p className="text-sm text-muted-foreground">{req.notes}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(req.created_at)}</p>
                      </div>
                    ))}
                    
                    {Math.ceil(gameRequests.length / ITEMS_PER_PAGE) > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button variant="outline" size="icon" onClick={() => setRequestsPage(p => Math.max(1, p - 1))} disabled={requestsPage === 1}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">{requestsPage} / {Math.ceil(gameRequests.length / ITEMS_PER_PAGE)}</span>
                        <Button variant="outline" size="icon" onClick={() => setRequestsPage(p => Math.min(Math.ceil(gameRequests.length / ITEMS_PER_PAGE), p + 1))} disabled={requestsPage === Math.ceil(gameRequests.length / ITEMS_PER_PAGE)}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}