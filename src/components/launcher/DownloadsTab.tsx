import { Download, X, FolderOpen, Clock, CheckCircle2, Loader2, Zap, HardDrive, Gauge, Archive, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useElectron } from '@/hooks/useElectron';
import type { DownloadProgress, InstalledGame } from '@/hooks/useElectron';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatSpeed = (bytesPerSecond: number) => formatSize(bytesPerSecond) + '/s';

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'منذ أقل من ساعة';
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return `منذ ${Math.floor(diffHours / 24)} يوم`;
};

const formatETA = (downloaded: number, total: number, speed: number) => {
  if (speed === 0 || total === 0) return '--:--';
  const remaining = total - downloaded;
  const seconds = remaining / speed;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const DownloadsTab = () => {
  const { activeDownloads, downloadHistory, cancelDownload, openFolder } = useElectron();

  const completedDownloads = downloadHistory.filter((item) => {
    const downloadDate = new Date(item.installedAt);
    const now = new Date();
    return (now.getTime() - downloadDate.getTime()) / (1000 * 60 * 60) <= 24;
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-primary/30">
            <Download className="w-7 h-7 text-primary" />
          </div>
          {activeDownloads.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xs font-bold text-white">{activeDownloads.length}</span>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">التنزيلات</h2>
          <p className="text-sm text-muted-foreground">إدارة التنزيلات النشطة والمكتملة</p>
        </div>
      </div>

      {activeDownloads.filter(d => d.status === 'downloading').length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<Gauge className="w-5 h-5" />} label="السرعة الحالية" value={formatSpeed(activeDownloads.filter(d => d.status === 'downloading').reduce((acc, d) => acc + d.speed, 0))} color="text-green-400" />
          <StatCard icon={<HardDrive className="w-5 h-5" />} label="تم التنزيل" value={formatSize(activeDownloads.reduce((acc, d) => acc + d.downloadedSize, 0))} color="text-blue-400" />
          <StatCard icon={<Archive className="w-5 h-5" />} label="الحجم الكلي" value={formatSize(activeDownloads.reduce((acc, d) => acc + d.totalSize, 0))} color="text-purple-400" />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className={cn("w-5 h-5 text-primary", activeDownloads.some(d => d.status === 'downloading') && "animate-spin")} />
          <h3 className="text-lg font-bold text-foreground">التنزيلات النشطة</h3>
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-medium">{activeDownloads.length}</span>
        </div>
        
        {activeDownloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Download className="w-16 h-16 opacity-20 mb-6" />
            <p className="text-xl font-medium mb-2">لا توجد تنزيلات نشطة</p>
            <p className="text-sm opacity-70">ابدأ بتحميل لعبة من المتجر</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeDownloads.map((download) => (
              <ActiveDownloadCard
                key={download.downloadId}
                download={download}
                onCancel={() => cancelDownload(download.downloadId)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-bold text-foreground">التنزيلات المكتملة</h3>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">آخر 24 ساعة • {completedDownloads.length}</span>
        </div>
        
        {completedDownloads.length === 0 ? (
          <div className="bg-muted/20 rounded-xl p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد تنزيلات مكتملة في آخر 24 ساعة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedDownloads.map((item, index) => (
              <CompletedDownloadCard key={`${item.gameId}-${index}`} item={item} onOpenFolder={() => openFolder(item.installPath)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="bg-muted/20 backdrop-blur-sm border border-border/30 rounded-xl p-4 flex items-center gap-4">
    <div className={cn("p-2 rounded-lg bg-muted/50", color)}>{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", color)}>{value}</p>
    </div>
  </div>
);

const ActiveDownloadCard = ({ download, onCancel }: { download: DownloadProgress; onCancel: () => void }) => {
  const isExtracting = download.status === 'extracting';
  const isResolving = download.status === 'resolving';
  const progressPercent = download.progress || 0;
  
  return (
    <div className="bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm border border-border/30 rounded-2xl p-5 overflow-hidden relative group">
      <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3) ${progressPercent}%, transparent ${progressPercent}%)` }} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-20 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 overflow-hidden border border-primary/20">
              {download.gameImage ? <img src={download.gameImage} alt="" className="w-full h-full object-cover" /> : <Download className="w-6 h-6 text-primary/50 m-auto mt-6" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground mb-1">{download.gameTitle}</h3>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{formatSize(download.downloadedSize)} / {formatSize(download.totalSize)}</span>
                <span className="text-primary/60">•</span>
                <span className={cn("font-semibold", isExtracting ? "text-yellow-400" : isResolving ? "text-blue-400" : "text-green-400")}>
                  {isExtracting ? 'جاري فك الضغط...' : isResolving ? 'جاري استخراج الرابط...' : formatSpeed(download.speed)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <p className="text-xs text-muted-foreground">الوقت المتبقي</p>
              <p className="text-sm font-mono font-bold text-foreground">{isExtracting || isResolving ? '--:--' : formatETA(download.downloadedSize, download.totalSize, download.speed)}</p>
            </div>
            
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-destructive hover:bg-destructive/20 rounded-xl h-10 w-10">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-300", isExtracting ? "bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse" : isResolving ? "bg-gradient-to-r from-blue-500 to-cyan-500 animate-pulse" : "bg-gradient-to-r from-primary via-purple-500 to-primary")} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              {isExtracting ? <Archive className="w-4 h-4 text-yellow-400 animate-pulse" /> : isResolving ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
              <span className="text-xs text-muted-foreground">{isExtracting ? 'جاري فك الضغط...' : isResolving ? 'جاري استخراج الرابط المباشر...' : 'جاري التنزيل...'}</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">{progressPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompletedDownloadCard = ({ item, onOpenFolder }: { item: InstalledGame; onOpenFolder: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-sm border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-18 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 overflow-hidden border border-green-500/20">
          {item.gameImage ? <img src={item.gameImage} alt="" className="w-full h-full object-cover" /> : <CheckCircle2 className="w-6 h-6 text-green-500/50 m-auto mt-5" />}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground">{item.gameTitle}</h3>
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">مكتمل</span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-3">
            <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" />{formatSize(item.size)}</span>
            <span className="opacity-50">•</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTimeAgo(item.installedAt)}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/${item.gameSlug}`)} className="text-primary hover:text-primary/80 gap-2"><Play className="w-4 h-4" />تشغيل</Button>
        <Button variant="ghost" size="sm" onClick={onOpenFolder} className="text-muted-foreground hover:text-foreground gap-2"><FolderOpen className="w-4 h-4" />فتح المجلد</Button>
      </div>
    </div>
  );
};

export default DownloadsTab;
