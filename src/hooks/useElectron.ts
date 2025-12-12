import { useState, useEffect, useCallback } from 'react';

interface DownloadProgress {
  downloadId: string;
  gameId: string;
  gameTitle: string;
  gameImage?: string;
  progress: number;
  downloadedSize: number;
  totalSize: number;
  speed: number;
  status?: string;
}

interface InstalledGame {
  gameId: string;
  gameTitle: string;
  gameSlug: string;
  gameImage?: string;
  installPath: string;
  exePath: string | null;
  installedAt: string;
  size: number;
}

interface LaunchResult {
  success: boolean;
  error?: string;
  needsExeSelection?: boolean;
  installPath?: string;
}

interface WebsiteGame {
  id: string;
  title: string;
  slug: string;
  image?: string;
}

interface Settings {
  autoUpdate: boolean;
  notifications: boolean;
  autoLaunch: boolean;
  minimizeToTray: boolean;
  hardwareAcceleration: boolean;
  theme: string;
  language: string;
  downloadSpeed: number;
  autoExtract: boolean;
  deleteArchiveAfterExtract: boolean;
  verifyIntegrity: boolean;
  soundEffects: boolean;
}

interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getWindowState: () => Promise<{ isMaximized: boolean }>;
  getSettings: () => Promise<{ downloadPath: string; installedGames: InstalledGame[]; downloadHistory: InstalledGame[]; settings: Settings }>;
  saveSettings: (settings: Partial<Settings>) => Promise<{ success: boolean }>;
  setDownloadPath: () => Promise<string | null>;
  getSystemInfo: () => Promise<{ os: string; cpu: string; ram: string; freeMem: string; platform: string; arch: string }>;
  uninstallLauncher: () => Promise<{ success: boolean; error?: string }>;
  clearDownloadHistory: () => Promise<{ success: boolean }>;
  downloadGame: (data: { gameId: string; gameTitle: string; downloadUrl: string; gameSlug: string; gameImage?: string }) => Promise<{ success: boolean; installPath?: string; exePath?: string }>;
  cancelDownload: (downloadId: string) => Promise<{ success: boolean; deleted?: boolean }>;
  pauseDownload: (downloadId: string) => Promise<{ success: boolean }>;
  resumeDownload: (downloadId: string) => Promise<{ success: boolean }>;
  getActiveDownloads: () => Promise<DownloadProgress[]>;
  getDownloadHistory: () => Promise<InstalledGame[]>;
  getInstalledGames: () => Promise<InstalledGame[]>;
  isGameInstalled: (gameId: string) => Promise<{ installed: boolean } & Partial<InstalledGame>>;
  launchGame: (data: { gameId: string; exePath?: string }) => Promise<LaunchResult>;
  uninstallGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
  openFolder: (path: string) => Promise<boolean>;
  selectExe: (gameId: string) => Promise<{ success: boolean; exePath?: string; error?: string }>;
  scanGamesFolder: (websiteGames: WebsiteGame[]) => Promise<{ success: boolean; games?: InstalledGame[]; error?: string }>;
  getAppVersion: () => string;
  // Running games & playtime
  getRunningGames: () => Promise<{ gameId: string; gameTitle: string; startTime: number; sessionTime: number }[]>;
  getPlaytimeStats: () => Promise<{ gameId: string; gameTitle: string; totalPlaytime: number; lastPlayed: string; sessions: number }[]>;
  isGameRunning: (gameId: string) => Promise<boolean>;
  // Event listeners
  onDownloadProgress: (callback: (data: DownloadProgress) => void) => void;
  onDownloadStatus: (callback: (data: { downloadId: string; gameId: string; status: string; message?: string }) => void) => void;
  onDownloadComplete: (callback: (data: { downloadId: string; gameId: string; gameTitle: string; installPath: string; exePath: string | null }) => void) => void;
  onDownloadError: (callback: (data: { downloadId: string; gameId: string; error: string }) => void) => void;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => void;
  onThemeChanged: (callback: (theme: string) => void) => void;
  onGameStarted: (callback: (data: { gameId: string; gameTitle: string }) => void) => void;
  onGameStopped: (callback: (data: { gameId: string; playTime: number }) => void) => void;
  removeAllListeners: (channel: string) => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const useElectron = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [downloadPath, setDownloadPath] = useState<string>('');
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);
  const [installedGames, setInstalledGames] = useState<InstalledGame[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<InstalledGame[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const initElectron = () => {
      const electron = window.electronAPI?.isElectron;
      setIsElectron(!!electron);

      if (electron) {
        window.electronAPI?.getSettings().then((data) => {
          setDownloadPath(data.downloadPath);
          setInstalledGames(data.installedGames);
          setDownloadHistory(data.downloadHistory);
          setSettings(data.settings);
        }).catch(console.error);

        window.electronAPI?.getActiveDownloads().then((downloads) => {
          setActiveDownloads(downloads || []);
        }).catch(console.error);

        window.electronAPI?.onDownloadProgress((data) => {
          setActiveDownloads((prev) => {
            const index = prev.findIndex((d) => d.downloadId === data.downloadId);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = data;
              return updated;
            }
            return [...prev, data];
          });
        });

        window.electronAPI?.onDownloadComplete((data) => {
          setActiveDownloads((prev) => prev.filter((d) => d.downloadId !== data.downloadId));
          window.electronAPI?.getInstalledGames().then(setInstalledGames).catch(console.error);
          window.electronAPI?.getDownloadHistory().then(setDownloadHistory).catch(console.error);
        });

        window.electronAPI?.onDownloadError((data) => {
          setActiveDownloads((prev) => prev.filter((d) => d.downloadId !== data.downloadId));
        });
      }
    };

    initElectron();
    const timer = setTimeout(initElectron, 500);
    const pollTimer = setInterval(() => {
      if (window.electronAPI?.isElectron) {
        window.electronAPI.getActiveDownloads().then((downloads) => {
          if (downloads && downloads.length > 0) {
            setActiveDownloads(downloads);
          }
        }).catch(() => {});
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(pollTimer);
    };
  }, []);

  const changeDownloadPath = useCallback(async () => {
    if (!isElectron) return null;
    const newPath = await window.electronAPI?.setDownloadPath();
    if (newPath) setDownloadPath(newPath);
    return newPath;
  }, [isElectron]);

  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    if (!isElectron) return { success: false };
    const result = await window.electronAPI?.saveSettings(newSettings);
    if (result?.success) {
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    }
    return result;
  }, [isElectron]);

  const getSystemInfo = useCallback(async () => {
    if (!isElectron) return null;
    return window.electronAPI?.getSystemInfo();
  }, [isElectron]);

  const uninstallLauncher = useCallback(async () => {
    if (!isElectron) return { success: false };
    return window.electronAPI?.uninstallLauncher();
  }, [isElectron]);

  const clearDownloadHistory = useCallback(async () => {
    if (!isElectron) return { success: false };
    const result = await window.electronAPI?.clearDownloadHistory();
    if (result?.success) setDownloadHistory([]);
    return result;
  }, [isElectron]);

  const downloadGame = useCallback(async (gameId: string, gameTitle: string, downloadUrl: string, gameSlug: string, gameImage?: string) => {
    if (!isElectron) return null;
    return window.electronAPI?.downloadGame({ gameId, gameTitle, downloadUrl, gameSlug, gameImage });
  }, [isElectron]);

  const cancelDownload = useCallback(async (downloadId: string) => {
    if (!isElectron) return false;
    const result = await window.electronAPI?.cancelDownload(downloadId);
    if (result) setActiveDownloads((prev) => prev.filter((d) => d.downloadId !== downloadId));
    return result;
  }, [isElectron]);

  const pauseDownload = useCallback(async (downloadId: string) => {
    if (!isElectron) return { success: false };
    return window.electronAPI?.pauseDownload?.(downloadId) || { success: false };
  }, [isElectron]);

  const resumeDownload = useCallback(async (downloadId: string) => {
    if (!isElectron) return { success: false };
    return window.electronAPI?.resumeDownload?.(downloadId) || { success: false };
  }, [isElectron]);

  const launchGame = useCallback(async (gameId: string, exePath?: string): Promise<LaunchResult | undefined> => {
    if (!isElectron) return { success: false, error: 'Not in Electron' };
    return window.electronAPI?.launchGame({ gameId, exePath });
  }, [isElectron]);

  const selectExe = useCallback(async (gameId: string) => {
    if (!isElectron) return { success: false };
    const result = await window.electronAPI?.selectExe(gameId);
    if (result?.success) {
      setInstalledGames((prev) => prev.map((g) => g.gameId === gameId ? { ...g, exePath: result.exePath || null } : g));
    }
    return result;
  }, [isElectron]);

  const uninstallGame = useCallback(async (gameId: string) => {
    if (!isElectron) return { success: false };
    const result = await window.electronAPI?.uninstallGame(gameId);
    if (result?.success) setInstalledGames((prev) => prev.filter((g) => g.gameId !== gameId));
    return result;
  }, [isElectron]);

  const isGameInstalled = useCallback(async (gameId: string) => {
    if (!isElectron) return { installed: false };
    return window.electronAPI?.isGameInstalled(gameId);
  }, [isElectron]);

  const openFolder = useCallback(async (path: string) => {
    if (!isElectron) return false;
    return window.electronAPI?.openFolder(path);
  }, [isElectron]);

  const scanGamesFolder = useCallback(async (websiteGames: { id: string; title: string; slug: string; image?: string }[]) => {
    if (!isElectron) return { success: false };
    const result = await window.electronAPI?.scanGamesFolder(websiteGames);
    if (result?.success && result.games) setInstalledGames(result.games);
    return result;
  }, [isElectron]);

  return {
    isElectron,
    downloadPath,
    activeDownloads,
    installedGames,
    downloadHistory,
    settings,
    changeDownloadPath,
    saveSettings,
    getSystemInfo,
    uninstallLauncher,
    clearDownloadHistory,
    downloadGame,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    launchGame,
    selectExe,
    uninstallGame,
    isGameInstalled,
    openFolder,
    scanGamesFolder
  };
};

export type { DownloadProgress, InstalledGame, Settings };
