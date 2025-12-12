import { useState, ReactNode, useEffect } from 'react';
import LauncherTitleBar from './LauncherTitleBar';
import LauncherNav from './LauncherNav';
import LauncherSettings from './LauncherSettings';
import DownloadsTab from './DownloadsTab';
import LibraryTab from './LibraryTab';
import StatsTab from './StatsTab';
import UpdateNotification from './UpdateNotification';
import { useElectron } from '@/hooks/useElectron';

interface LauncherWrapperProps {
  children: ReactNode;
}

const LauncherWrapper = ({ children }: LauncherWrapperProps) => {
  const { isElectron } = useElectron();
  const [activeTab, setActiveTab] = useState<'store' | 'downloads' | 'library' | 'stats' | 'admin'>('store');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminIframe, setAdminIframe] = useState<string | null>(null);

  // Handle admin tab navigation
  useEffect(() => {
    if (activeTab === 'admin') {
      setAdminIframe('/ktm-admin-panel');
    } else {
      setAdminIframe(null);
    }
  }, [activeTab]);

  // Always render the same structure to avoid React hooks issues
  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <LauncherTitleBar />
      <LauncherNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      
      {/* Update Notification - Shows on top of everything when update is available */}
      <UpdateNotification />
      
      <div className="min-h-[calc(100vh-80px)]">
        {activeTab === 'store' && children}
        {activeTab === 'downloads' && <div className="pt-20"><DownloadsTab /></div>}
        {activeTab === 'library' && <div className="pt-20"><LibraryTab /></div>}
        {activeTab === 'stats' && <div className="pt-20"><StatsTab /></div>}
        {activeTab === 'admin' && (
          <div className="pt-20 h-[calc(100vh-5rem)]">
            <iframe 
              src={adminIframe || '/ktm-admin-panel'} 
              className="w-full h-full border-0"
              title="Admin Panel"
            />
          </div>
        )}
      </div>

      <LauncherSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default LauncherWrapper;