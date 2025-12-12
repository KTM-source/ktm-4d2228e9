const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const AdmZip = require('adm-zip');
const Store = require('electron-store');
const { exec, spawn } = require('child_process');

const store = new Store();

// App version - must match public/version.txt after updates
const APP_VERSION = 'v1.1.0';

let mainWindow;
let splashWindow;
let downloadPath = store.get('downloadPath') || path.join(app.getPath('downloads'), 'KTM Games');
let activeDownloads = new Map();
let currentDownloadRequest = null;
let installedGames = store.get('installedGames') || [];
let downloadHistory = store.get('downloadHistory') || [];

// Paused downloads - persisted for resume functionality
let pausedDownloads = store.get('pausedDownloads') || [];

// Running games tracking
let runningGames = new Map();
let playtimeStats = store.get('playtimeStats') || [];

// Settings with defaults
let settings = store.get('settings') || {
  autoUpdate: true,
  notifications: true,
  autoLaunch: false,
  minimizeToTray: true,
  hardwareAcceleration: true,
  theme: 'dark',
  language: 'ar',
  downloadSpeed: 0,
  autoExtract: true,
  deleteArchiveAfterExtract: true,
  verifyIntegrity: true,
  soundEffects: true
};

// Ensure download directory exists
if (!fs.existsSync(downloadPath)) {
  fs.mkdirSync(downloadPath, { recursive: true });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 850,
    height: 550,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      backgroundThrottling: false,
      spellcheck: false,
      v8CacheOptions: 'code',
      devTools: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: settings.theme === 'light' ? '#ffffff' : '#0a0a0f'
  });

  mainWindow.webContents.setBackgroundThrottling(false);
  
  // Prevent DevTools and zoom
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') event.preventDefault();
    if (input.control && input.shift && ['I', 'i', 'J', 'j', 'C', 'c'].includes(input.key)) event.preventDefault();
    if (input.control && ['U', 'u'].includes(input.key)) event.preventDefault();
    if (input.control && ['+', '-', '=', '_', 'NumpadAdd', 'NumpadSubtract', '0'].includes(input.key)) event.preventDefault();
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    applyTheme(settings.theme);
    mainWindow.webContents.insertCSS(`* { scroll-behavior: auto !important; }`);
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }, true);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) { e.preventDefault(); return false; }
        if (e.ctrlKey && ['U', 'u', '+', '-', '=', '_', '0'].includes(e.key)) { e.preventDefault(); return false; }
      }, true);
      document.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); return false; } }, { passive: false });
    `);
  });

  mainWindow.loadURL('https://ktm.lovable.app/');

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, 7000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });
}

function applyTheme(theme) {
  if (!mainWindow) return;
  const isDark = theme === 'dark';
  mainWindow.setBackgroundColor(isDark ? '#0a0a0f' : '#ffffff');
  mainWindow.webContents.executeJavaScript(`
    (function() {
      const root = document.documentElement;
      if ('${theme}' === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        localStorage.setItem('theme', 'light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    })();
  `);
}

// Performance optimizations
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Memory optimizations for large downloads
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

const savedSettings = store.get('settings') || {};
if (savedSettings.hardwareAcceleration === false) {
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();
});

// Save paused downloads before quitting
app.on('before-quit', () => {
  // Pause all active downloads and save their state
  for (const [downloadId, data] of activeDownloads) {
    if (data.status === 'downloading') {
      pausedDownloads.push({
        downloadId,
        gameId: data.gameId,
        gameTitle: data.gameTitle,
        gameSlug: data.gameSlug,
        gameImage: data.gameImage,
        downloadUrl: data.downloadUrl,
        totalSize: data.totalSize,
        downloadedSize: data.downloadedSize,
        archivePath: data.archivePath,
        isRar: data.isRar,
        pausedAt: new Date().toISOString()
      });
    }
  }
  store.set('pausedDownloads', pausedDownloads);
  
  // Cancel current download request
  if (currentDownloadRequest) {
    try { currentDownloadRequest.destroy(); } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('get-window-state', () => ({
  isMaximized: mainWindow?.isMaximized() || false
}));

// Get app version
ipcMain.handle('get-app-version', () => APP_VERSION);

// Settings
ipcMain.handle('get-settings', () => ({
  downloadPath,
  installedGames,
  downloadHistory,
  settings,
  pausedDownloads
}));

ipcMain.handle('save-settings', (event, newSettings) => {
  const oldTheme = settings.theme;
  settings = { ...settings, ...newSettings };
  store.set('settings', settings);
  
  if (newSettings.theme && newSettings.theme !== oldTheme) {
    applyTheme(newSettings.theme);
  }
  
  return { success: true };
});

ipcMain.handle('set-download-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'اختر مجلد التنزيلات'
  });
  
  if (!result.canceled && result.filePaths[0]) {
    downloadPath = result.filePaths[0];
    store.set('downloadPath', downloadPath);
    return downloadPath;
  }
  return null;
});

ipcMain.handle('get-system-info', async () => {
  const os = require('os');
  return {
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0]?.model || 'Unknown',
    ram: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
    freeMem: `${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`,
    platform: os.platform(),
    arch: os.arch()
  };
});

ipcMain.handle('uninstall-launcher', async () => {
  try {
    const uninstallerPath = path.join(path.dirname(app.getPath('exe')), 'Uninstall KTM Launcher.exe');
    if (fs.existsSync(uninstallerPath)) {
      spawn(uninstallerPath, [], { detached: true, stdio: 'ignore' });
      setTimeout(() => app.quit(), 500);
      return { success: true };
    }
    return { success: false, error: 'Uninstaller not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clear-download-history', () => {
  downloadHistory = [];
  store.set('downloadHistory', downloadHistory);
  return { success: true };
});

ipcMain.handle('select-exe', async (event, gameId) => {
  const game = installedGames.find(g => g.gameId === gameId);
  if (!game) return { success: false, error: 'اللعبة غير موجودة' };

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'اختر ملف تشغيل اللعبة (.exe)',
    defaultPath: game.installPath,
    filters: [{ name: 'Executable', extensions: ['exe'] }]
  });

  if (!result.canceled && result.filePaths[0]) {
    const gameIndex = installedGames.findIndex(g => g.gameId === gameId);
    if (gameIndex !== -1) {
      installedGames[gameIndex].exePath = result.filePaths[0];
      store.set('installedGames', installedGames);
      return { success: true, exePath: result.filePaths[0] };
    }
  }
  return { success: false, error: 'لم يتم اختيار ملف' };
});

// Gofile resolver
async function resolveGofileLink(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const match = url.match(/gofile\.io\/d\/([a-zA-Z0-9-]+)/);
      if (!match) {
        resolve({ directLink: url, fileName: null, token: null });
        return;
      }
      
      const contentId = match[1];
      const tokenResponse = await fetchJson('https://api.gofile.io/accounts', 'POST');
      
      if (tokenResponse.status !== 'ok') {
        reject(new Error('Failed to create Gofile guest account'));
        return;
      }
      
      const token = tokenResponse.data.token;
      const websiteToken = '4fd6sg89d7s6';
      const contentUrl = `https://api.gofile.io/contents/${contentId}?wt=${websiteToken}`;
      
      const contentResponse = await fetchJson(contentUrl, 'GET', {
        'Authorization': `Bearer ${token}`,
        'Cookie': `accountToken=${token}`
      });
      
      if (contentResponse.status !== 'ok') {
        const altContentUrl = `https://api.gofile.io/getContent?contentId=${contentId}&token=${token}&wt=${websiteToken}`;
        const altResponse = await fetchJson(altContentUrl, 'GET');
        
        if (altResponse.status !== 'ok') {
          reject(new Error('Failed to get Gofile content'));
          return;
        }
        
        return processGofileContent(altResponse.data, token, resolve, reject);
      }
      
      return processGofileContent(contentResponse.data, token, resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

function processGofileContent(data, token, resolve, reject) {
  const contents = data.children || data.contents || data.childs;
  
  if (!contents || (typeof contents === 'object' && Object.keys(contents).length === 0)) {
    reject(new Error('No files found in Gofile folder'));
    return;
  }
  
  const files = Array.isArray(contents) ? contents : Object.values(contents);
  
  if (files.length === 0) {
    reject(new Error('Empty Gofile folder'));
    return;
  }
  
  let mainFile = files[0];
  for (const file of files) {
    if (file.type === 'file' && (!mainFile || (file.size && file.size > (mainFile.size || 0)))) {
      mainFile = file;
    }
  }
  
  const directLink = mainFile.link || mainFile.directLink || mainFile.downloadUrl;
  const fileName = mainFile.name;
  
  if (!directLink) {
    reject(new Error('No direct download link available'));
    return;
  }
  
  resolve({ directLink, fileName, token });
}

function fetchJson(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Download game with pause/resume support
async function startDownload({ gameId, gameTitle, downloadUrl, gameSlug, gameImage, resumeFrom }) {
  // Cancel any existing download
  if (currentDownloadRequest) {
    try { currentDownloadRequest.destroy(); } catch (e) {}
    currentDownloadRequest = null;
  }

  // Pause active downloads (don't clear them)
  for (const [id, data] of activeDownloads) {
    if (data.status === 'downloading') {
      data.status = 'paused';
      mainWindow?.webContents.send('download-status', {
        downloadId: id,
        gameId: data.gameId,
        status: 'paused'
      });
    }
  }

  return new Promise(async (resolve, reject) => {
    const gameFolder = path.join(downloadPath, gameSlug);

    if (!fs.existsSync(gameFolder)) {
      fs.mkdirSync(gameFolder, { recursive: true });
    }

    const downloadId = resumeFrom?.downloadId || `${gameId}-${Date.now()}`;
    let finalUrl = downloadUrl;
    let fileName = `${gameSlug}.zip`;
    let gofileToken = null;

    // Check if it's a Gofile link (legacy support)
    if (downloadUrl.includes('gofile.io/d/')) {
      try {
        mainWindow?.webContents.send('download-status', {
          downloadId,
          gameId,
          status: 'resolving',
          message: 'جاري استخراج رابط التحميل المباشر...'
        });

        const resolved = await resolveGofileLink(downloadUrl);
        finalUrl = resolved.directLink;
        fileName = resolved.fileName || fileName;
        gofileToken = resolved.token;
      } catch (err) {
        mainWindow?.webContents.send('download-error', {
          downloadId,
          gameId,
          error: 'فشل في استخراج رابط Gofile: ' + err.message
        });
        reject(err);
        return;
      }
    }

    const isRar = fileName.toLowerCase().endsWith('.rar') || finalUrl.toLowerCase().includes('.rar');
    const extension = isRar ? '.rar' : '.zip';
    const archivePath = path.join(gameFolder, `${gameSlug}${extension}`);

    // Check for existing partial download
    let startByte = 0;
    if (resumeFrom && resumeFrom.downloadedSize > 0 && fs.existsSync(archivePath)) {
      const stats = fs.statSync(archivePath);
      startByte = stats.size;
    }

    const protocol = finalUrl.startsWith('https') ? https : http;

    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity', // Disable compression for resume support
      'Connection': 'keep-alive'
    };

    // Add range header for resume
    if (startByte > 0) {
      requestHeaders['Range'] = `bytes=${startByte}-`;
    }

    if (gofileToken) {
      requestHeaders['Cookie'] = `accountToken=${gofileToken}`;
    }

    const request = protocol.get(finalUrl, {
      timeout: 120000, // Increased timeout for large files
      headers: requestHeaders
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
        handleDownload(response.headers.location);
        return;
      }

      // Handle 416 Range Not Satisfiable - start fresh
      if (response.statusCode === 416) {
        startByte = 0;
        handleDownloadFresh();
        return;
      }

      if (response.statusCode !== 200 && response.statusCode !== 206) {
        handleError(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      handleResponse(response, response.statusCode === 206);
    });

    currentDownloadRequest = request;

    function handleDownloadFresh() {
      // Delete existing partial file and start fresh
      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }
      startByte = 0;

      const freshRequest = protocol.get(finalUrl, {
        timeout: 120000,
        headers: {
          ...requestHeaders,
          'Range': undefined
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          handleError(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        handleResponse(res, false);
      });
      freshRequest.on('error', handleError);
      currentDownloadRequest = freshRequest;
    }

    function handleDownload(url) {
      const proto = url.startsWith('https') ? https : http;
      const redirectRequest = proto.get(url, {
        timeout: 120000,
        headers: requestHeaders
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307) {
          handleDownload(res.headers.location);
          return;
        }
        handleResponse(res, res.statusCode === 206);
      });
      redirectRequest.on('error', handleError);
      currentDownloadRequest = redirectRequest;
    }

    function handleResponse(response, isResume) {
      // Parse content length properly for large files
      let contentLength = response.headers['content-length'];
      let totalSize = 0;

      if (isResume && response.headers['content-range']) {
        // Format: bytes start-end/total
        const match = response.headers['content-range'].match(/bytes \d+-\d+\/(\d+)/);
        if (match) {
          totalSize = parseInt(match[1], 10);
        }
      } else {
        totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        if (isResume) {
          totalSize += startByte;
        }
      }

      let downloadedSize = startByte;
      let lastProgressTime = Date.now();
      let lastDownloadedSize = startByte;
      let currentSpeed = 0;

      // Use append mode for resume, write mode for fresh
      const fileStream = fs.createWriteStream(archivePath, {
        flags: isResume ? 'a' : 'w',
        highWaterMark: 64 * 1024 * 1024 // 64MB buffer for large files
      });

      const downloadData = {
        gameId,
        gameTitle,
        gameSlug,
        gameImage,
        downloadUrl,
        totalSize,
        downloadedSize,
        progress: totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0,
        status: 'downloading',
        startTime: Date.now(),
        archivePath,
        isRar
      };

      activeDownloads.set(downloadId, downloadData);

      // Remove from paused downloads if resuming
      pausedDownloads = pausedDownloads.filter(d => d.downloadId !== downloadId);
      store.set('pausedDownloads', pausedDownloads);

      mainWindow?.webContents.send('download-progress', {
        downloadId,
        gameId,
        gameTitle,
        gameImage,
        progress: downloadData.progress,
        downloadedSize,
        totalSize,
        speed: 0,
        status: 'downloading'
      });

      // Speed calculation with smoothing
      const speedInterval = setInterval(() => {
        const now = Date.now();
        const timeDiff = (now - lastProgressTime) / 1000;
        if (timeDiff > 0) {
          const byteDiff = downloadedSize - lastDownloadedSize;
          currentSpeed = byteDiff / timeDiff;
          lastProgressTime = now;
          lastDownloadedSize = downloadedSize;
        }
      }, 1000);

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;

        const data = activeDownloads.get(downloadId);
        if (data) {
          data.downloadedSize = downloadedSize;
          data.progress = progress;
        }

        // Throttle progress updates to reduce UI strain
        if (Date.now() - lastProgressTime > 500) {
          mainWindow?.webContents.send('download-progress', {
            downloadId,
            gameId,
            gameTitle,
            gameImage,
            progress,
            downloadedSize,
            totalSize,
            speed: currentSpeed,
            status: 'downloading'
          });
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', async () => {
        clearInterval(speedInterval);
        fileStream.close();
        currentDownloadRequest = null;

        if (settings.autoExtract) {
          mainWindow?.webContents.send('download-status', {
            downloadId,
            gameId,
            status: 'extracting',
            message: 'جاري فك الضغط...'
          });

          try {
            await extractArchive(archivePath, gameFolder, isRar);

            if (settings.deleteArchiveAfterExtract && fs.existsSync(archivePath)) {
              fs.unlinkSync(archivePath);
            }

            completeDownload();
          } catch (extractError) {
            mainWindow?.webContents.send('download-error', {
              downloadId,
              gameId,
              error: 'فشل في فك الضغط: ' + extractError.message
            });
            activeDownloads.delete(downloadId);
            reject(extractError);
          }
        } else {
          completeDownload();
        }
      });

      function completeDownload() {
        const exePath = findExecutable(gameFolder);
        createInstructionsFile(gameFolder, gameTitle);

        const installedGame = {
          gameId,
          gameTitle,
          gameSlug,
          gameImage,
          installPath: gameFolder,
          exePath,
          installedAt: new Date().toISOString(),
          size: getFolderSize(gameFolder)
        };

        const existingIndex = installedGames.findIndex(g => g.gameId === gameId);
        if (existingIndex !== -1) {
          installedGames[existingIndex] = installedGame;
        } else {
          installedGames.push(installedGame);
        }
        store.set('installedGames', installedGames);

        downloadHistory.unshift({
          ...installedGame,
          downloadedAt: new Date().toISOString()
        });
        downloadHistory = downloadHistory.slice(0, 50);
        store.set('downloadHistory', downloadHistory);

        activeDownloads.delete(downloadId);

        if (settings.notifications && Notification.isSupported()) {
          new Notification({
            title: 'اكتمل التنزيل',
            body: `تم تحميل ${gameTitle} بنجاح!`,
            icon: path.join(__dirname, 'assets', 'icon.png')
          }).show();
        }

        mainWindow?.webContents.send('download-complete', {
          downloadId,
          gameId,
          gameTitle,
          installPath: gameFolder,
          exePath
        });

        resolve({ success: true, installPath: gameFolder, exePath });
      }

      fileStream.on('error', (err) => {
        clearInterval(speedInterval);
        currentDownloadRequest = null;
        activeDownloads.delete(downloadId);
        mainWindow?.webContents.send('download-error', {
          downloadId,
          gameId,
          error: err.message
        });
        reject(err);
      });
    }

    function handleError(err) {
      currentDownloadRequest = null;
      activeDownloads.delete(downloadId);
      mainWindow?.webContents.send('download-error', {
        downloadId,
        gameId,
        error: err.message
      });
      reject(err);
    }

    request.on('error', handleError);
    request.on('timeout', () => {
      request.destroy();
      handleError(new Error('Connection timeout'));
    });
  });
}

ipcMain.handle('download-game', async (event, args) => {
  return startDownload(args);
});

// Pause download
ipcMain.handle('pause-download', async (event, downloadId) => {
  if (currentDownloadRequest) {
    try { currentDownloadRequest.destroy(); } catch (e) {}
    currentDownloadRequest = null;
  }
  
  if (activeDownloads.has(downloadId)) {
    const downloadData = activeDownloads.get(downloadId);
    downloadData.status = 'paused';
    
    // Save to paused downloads
    const pausedData = {
      downloadId,
      gameId: downloadData.gameId,
      gameTitle: downloadData.gameTitle,
      gameSlug: downloadData.gameSlug,
      gameImage: downloadData.gameImage,
      downloadUrl: downloadData.downloadUrl,
      totalSize: downloadData.totalSize,
      downloadedSize: downloadData.downloadedSize,
      archivePath: downloadData.archivePath,
      isRar: downloadData.isRar,
      pausedAt: new Date().toISOString()
    };
    
    // Remove if already exists and add fresh
    pausedDownloads = pausedDownloads.filter(d => d.downloadId !== downloadId);
    pausedDownloads.push(pausedData);
    store.set('pausedDownloads', pausedDownloads);
    
    mainWindow?.webContents.send('download-status', {
      downloadId,
      gameId: downloadData.gameId,
      status: 'paused'
    });
    
    return { success: true };
  }
  return { success: false };
});

// Resume download
ipcMain.handle('resume-download', async (event, downloadId) => {
  // Find in paused downloads
  const pausedDownload = pausedDownloads.find(d => d.downloadId === downloadId);
  if (!pausedDownload) {
    return { success: false, error: 'التنزيل غير موجود' };
  }

  try {
    await startDownload({
      gameId: pausedDownload.gameId,
      gameTitle: pausedDownload.gameTitle,
      downloadUrl: pausedDownload.downloadUrl,
      gameSlug: pausedDownload.gameSlug,
      gameImage: pausedDownload.gameImage,
      resumeFrom: pausedDownload
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Get paused downloads
ipcMain.handle('get-paused-downloads', () => {
  return pausedDownloads;
});

// Cancel download and delete partial files
ipcMain.handle('cancel-download', (event, downloadId) => {
  if (currentDownloadRequest) {
    try { currentDownloadRequest.destroy(); } catch (e) {}
    currentDownloadRequest = null;
  }
  
  let downloadData = activeDownloads.get(downloadId);
  if (!downloadData) {
    downloadData = pausedDownloads.find(d => d.downloadId === downloadId);
  }
  
  if (downloadData) {
    // Delete partial download files
    if (downloadData.archivePath) {
      try {
        if (fs.existsSync(downloadData.archivePath)) {
          fs.unlinkSync(downloadData.archivePath);
        }
        const gameFolder = path.dirname(downloadData.archivePath);
        if (fs.existsSync(gameFolder)) {
          const files = fs.readdirSync(gameFolder);
          if (files.length === 0) {
            fs.rmdirSync(gameFolder);
          }
        }
      } catch (err) {
        console.error('Error deleting partial download:', err);
      }
    }
    
    activeDownloads.delete(downloadId);
    pausedDownloads = pausedDownloads.filter(d => d.downloadId !== downloadId);
    store.set('pausedDownloads', pausedDownloads);
    
    return { success: true, deleted: true };
  }
  return { success: false };
});

// Extract archive (ZIP or RAR)
async function extractArchive(archivePath, destFolder, isRar) {
  return new Promise((resolve, reject) => {
    if (isRar) {
      const unrarPaths = [
        'unrar',
        'C:\\Program Files\\WinRAR\\UnRAR.exe',
        'C:\\Program Files (x86)\\WinRAR\\UnRAR.exe',
        '7z',
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe'
      ];
      
      const tryExtract = (index) => {
        if (index >= unrarPaths.length) {
          reject(new Error('لم يتم العثور على برنامج لفك ضغط RAR. يرجى تثبيت WinRAR أو 7-Zip'));
          return;
        }
        
        const extractorPath = unrarPaths[index];
        const isSevenZip = extractorPath.includes('7z');
        
        const args = isSevenZip 
          ? ['x', '-y', `-o${destFolder}`, archivePath]
          : ['x', '-y', archivePath, destFolder];
        
        const process = spawn(extractorPath, args, { windowsHide: true });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            tryExtract(index + 1);
          }
        });
        
        process.on('error', () => {
          tryExtract(index + 1);
        });
      };
      
      tryExtract(0);
    } else {
      try {
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(destFolder, true);
        resolve();
      } catch (err) {
        reject(err);
      }
    }
  });
}

function createInstructionsFile(gameFolder, gameTitle) {
  const instructionsPath = path.join(gameFolder, 'KTM_تعليمات.txt');
  if (!fs.existsSync(instructionsPath)) {
    const instructions = `=== تعليمات تشغيل اللعبة ===

اسم اللعبة: ${gameTitle}

إذا لم يتم العثور على ملف التشغيل (.exe) تلقائياً:

1. افتح مجلد اللعبة من المكتبة
2. ابحث عن ملف .exe الرئيسي للعبة
3. عند الضغط على "تشغيل" لأول مرة، سيُطلب منك تحديد ملف .exe
4. بعد التحديد، سيتم حفظ المسار

تم تحميل هذه اللعبة من KTM Games
`;
    fs.writeFileSync(instructionsPath, instructions, 'utf8');
  }
}

// Get active downloads
ipcMain.handle('get-active-downloads', () => {
  const active = Array.from(activeDownloads.entries()).map(([id, data]) => ({
    downloadId: id,
    gameId: data.gameId,
    gameTitle: data.gameTitle,
    gameImage: data.gameImage,
    progress: data.progress || 0,
    downloadedSize: data.downloadedSize || 0,
    totalSize: data.totalSize || 0,
    speed: data.status === 'paused' ? 0 : calculateSpeed(data.downloadedSize || 0, data.startTime || Date.now()),
    status: data.status || 'downloading'
  }));

  const activeIds = new Set(active.map(d => d.downloadId));

  // Include paused downloads that are not already in active map
  const paused = pausedDownloads
    .filter(d => !activeIds.has(d.downloadId))
    .map(d => ({
      downloadId: d.downloadId,
      gameId: d.gameId,
      gameTitle: d.gameTitle,
      gameImage: d.gameImage,
      progress: d.totalSize > 0 ? (d.downloadedSize / d.totalSize) * 100 : 0,
      downloadedSize: d.downloadedSize || 0,
      totalSize: d.totalSize || 0,
      speed: 0,
      status: 'paused'
    }));

  return [...active, ...paused];
});

ipcMain.handle('get-installed-games', () => installedGames);
ipcMain.handle('get-download-history', () => downloadHistory);

// Scan games folder
ipcMain.handle('scan-games-folder', async (event, websiteGames) => {
  try {
    if (!fs.existsSync(downloadPath)) {
      return { success: true, games: [] };
    }

    const folders = fs.readdirSync(downloadPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const detectedGames = [];

    for (const folderName of folders) {
      const folderPath = path.join(downloadPath, folderName);
      const matchedGame = websiteGames.find(g => g.slug === folderName);
      
      if (!matchedGame) continue;

      const exePath = findExecutable(folderPath);
      createInstructionsFile(folderPath, matchedGame.title);

      const existingGame = installedGames.find(g => g.gameId === matchedGame.id);
      
      if (!existingGame) {
        const gameInfo = {
          gameId: matchedGame.id,
          gameTitle: matchedGame.title,
          gameSlug: matchedGame.slug,
          gameImage: matchedGame.image,
          installPath: folderPath,
          exePath,
          installedAt: new Date().toISOString(),
          size: getFolderSize(folderPath)
        };
        detectedGames.push(gameInfo);
        installedGames.push(gameInfo);
      } else {
        existingGame.installPath = folderPath;
        existingGame.gameImage = matchedGame.image;
        if (!existingGame.exePath || !fs.existsSync(existingGame.exePath)) {
          existingGame.exePath = exePath;
        }
        existingGame.size = getFolderSize(folderPath);
        detectedGames.push(existingGame);
      }
    }

    installedGames = installedGames.filter(game => fs.existsSync(game.installPath));
    store.set('installedGames', installedGames);

    return { success: true, games: installedGames };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Launch game
ipcMain.handle('launch-game', async (event, { gameId, exePath }) => {
  const game = installedGames.find(g => g.gameId === gameId);
  
  const launchPath = exePath && fs.existsSync(exePath) ? exePath : 
                     (game?.exePath && fs.existsSync(game.exePath) ? game.exePath : null);
  
  if (launchPath) {
    shell.openPath(launchPath);
    
    const exeName = path.basename(launchPath).toLowerCase();
    runningGames.set(gameId, {
      gameTitle: game?.gameTitle || 'Unknown',
      exeName,
      startTime: Date.now()
    });
    
    mainWindow?.webContents.send('game-started', {
      gameId,
      gameTitle: game?.gameTitle || 'Unknown'
    });
    
    startGameMonitoring(gameId, exeName, game?.gameTitle);
    
    return { success: true };
  }
  
  return { success: false, needsExeSelection: true, installPath: game?.installPath };
});

function startGameMonitoring(gameId, exeName, gameTitle) {
  const checkInterval = setInterval(() => {
    exec('tasklist /fo csv /nh', (error, stdout) => {
      if (error) {
        clearInterval(checkInterval);
        return;
      }
      
      const isRunning = stdout.toLowerCase().includes(exeName);
      
      if (!isRunning && runningGames.has(gameId)) {
        const gameData = runningGames.get(gameId);
        const playTime = Math.floor((Date.now() - gameData.startTime) / 1000);
        
        updatePlaytimeStats(gameId, gameTitle, playTime);
        
        runningGames.delete(gameId);
        clearInterval(checkInterval);
        
        mainWindow?.webContents.send('game-stopped', { gameId, playTime });
      }
    });
  }, 5000);
}

function updatePlaytimeStats(gameId, gameTitle, playTime) {
  const existingIndex = playtimeStats.findIndex(s => s.gameId === gameId);
  
  if (existingIndex !== -1) {
    playtimeStats[existingIndex].totalPlaytime += playTime;
    playtimeStats[existingIndex].lastPlayed = new Date().toISOString();
    playtimeStats[existingIndex].sessions += 1;
  } else {
    playtimeStats.push({
      gameId,
      gameTitle,
      totalPlaytime: playTime,
      lastPlayed: new Date().toISOString(),
      sessions: 1
    });
  }
  
  store.set('playtimeStats', playtimeStats);
}

ipcMain.handle('get-running-games', () => {
  return Array.from(runningGames.entries()).map(([gameId, data]) => ({
    gameId,
    gameTitle: data.gameTitle,
    startTime: data.startTime,
    sessionTime: Math.floor((Date.now() - data.startTime) / 1000)
  }));
});

ipcMain.handle('get-playtime-stats', () => playtimeStats);

ipcMain.handle('is-game-running', (event, gameId) => runningGames.has(gameId));

ipcMain.handle('uninstall-game', async (event, gameId) => {
  const gameIndex = installedGames.findIndex(g => g.gameId === gameId);
  if (gameIndex === -1) return { success: false };
  
  const game = installedGames[gameIndex];
  
  try {
    if (fs.existsSync(game.installPath)) {
      fs.rmSync(game.installPath, { recursive: true, force: true });
    }
    
    installedGames.splice(gameIndex, 1);
    store.set('installedGames', installedGames);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-folder', (event, folderPath) => {
  if (fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
    return true;
  }
  return false;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
  return true;
});

ipcMain.handle('is-game-installed', (event, gameId) => {
  const game = installedGames.find(g => g.gameId === gameId);
  if (game && fs.existsSync(game.installPath)) {
    return { installed: true, ...game };
  }
  return { installed: false };
});

// Helper functions
function findExecutable(folderPath) {
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isFile() && file.name.toLowerCase().endsWith('.exe')) {
        const skipNames = ['unins', 'setup', 'install', 'update', 'redist', 'vcredist', 'dxsetup', 'directx', 'dotnet'];
        const isSkipped = skipNames.some(skip => file.name.toLowerCase().includes(skip));
        if (!isSkipped) {
          return path.join(folderPath, file.name);
        }
      }
    }
    
    for (const file of files) {
      if (file.isDirectory()) {
        const subExe = findExecutableShallow(path.join(folderPath, file.name), 1);
        if (subExe) return subExe;
      }
    }
  } catch (e) {}
  
  return null;
}

function findExecutableShallow(folderPath, depth) {
  if (depth > 2) return null;
  
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isFile() && file.name.toLowerCase().endsWith('.exe')) {
        const skipNames = ['unins', 'setup', 'install', 'update', 'redist', 'vcredist', 'dxsetup', 'directx', 'dotnet'];
        const isSkipped = skipNames.some(skip => file.name.toLowerCase().includes(skip));
        if (!isSkipped) {
          return path.join(folderPath, file.name);
        }
      }
    }
    
    for (const file of files) {
      if (file.isDirectory()) {
        const subExe = findExecutableShallow(path.join(folderPath, file.name), depth + 1);
        if (subExe) return subExe;
      }
    }
  } catch (e) {}
  
  return null;
}

function getFolderSize(folderPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(folderPath, file.name);
      if (file.isDirectory()) {
        size += getFolderSize(filePath);
      } else {
        size += fs.statSync(filePath).size;
      }
    }
  } catch (e) {}
  
  return size;
}

function calculateSpeed(downloadedSize, startTime) {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  if (elapsedSeconds === 0) return 0;
  return downloadedSize / elapsedSeconds;
}
