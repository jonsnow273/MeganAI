/**
 * Megan AI Desktop Application - Electron Main Process.
 * Provides native desktop window, background Python backend orchestration,
 * system tray, global hotkeys, and audio/media permissions.
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, shell, session } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const API_URL = "http://127.0.0.1:8000";
const DEV_URL = "http://127.0.0.1:5173";
const PRODUCTION_FILE = path.join(PROJECT_ROOT, "api/static/index.html");

let mainWindow = null;
let tray = null;
let pythonProcess = null;
let isQuitting = false;

/**
 * Check if the FastAPI backend server is responsive.
 */
function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if the Vite development server is running.
 */
function checkDevServer() {
  return new Promise((resolve) => {
    const req = http.get(DEV_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Automatically launch the Python FastAPI backend process if not already running.
 */
async function ensureBackendRunning() {
  const isAlive = await checkBackendHealth();
  if (isAlive) {
    console.log("[Electron] Backend already running at", API_URL);
    return;
  }

  console.log("[Electron] Starting Python backend server...");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  pythonProcess = spawn(
    pythonCmd,
    ["-m", "uvicorn", "api.server:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      shell: true,
    }
  );

  pythonProcess.stdout.on("data", (data) => {
    console.log(`[Backend stdout] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on("data", (data) => {
    console.log(`[Backend stderr] ${data.toString().trim()}`);
  });

  pythonProcess.on("exit", (code) => {
    console.log(`[Backend] Process exited with code ${code}`);
    pythonProcess = null;
  });

  // Wait for health check with retries
  let retries = 35;
  while (retries > 0) {
    await new Promise((r) => setTimeout(r, 600));
    const ready = await checkBackendHealth();
    if (ready) {
      console.log("[Electron] Backend server is ready!");
      return;
    }
    retries--;
  }
  console.warn("[Electron] Backend server health check timed out. Proceeding anyway.");
}

/**
 * Create the primary desktop window.
 */
async function createMainWindow() {
  const iconPath = path.join(__dirname, "../public/megan-logo.png");

  mainWindow = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Megan AI - Intelligent Desktop Assistant",
    backgroundColor: "#09090b",
    icon: iconPath,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      webSecurity: false, // Allows local file audio streaming if needed
    },
  });

  // Auto-grant microphone and media permissions for Voice Mode
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media" || permission === "notifications") {
      return callback(true);
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === "media" || permission === "notifications") {
      return true;
    }
    return false;
  });

  // Decide whether to load dev server or static build
  const isDev = process.argv.includes("--dev") || (await checkDevServer());

  if (isDev) {
    console.log("[Electron] Loading frontend from Vite dev server:", DEV_URL);
    await mainWindow.loadURL(DEV_URL);
  } else {
    console.log("[Electron] Loading frontend from local distribution:", PRODUCTION_FILE);
    try {
      await mainWindow.loadFile(PRODUCTION_FILE);
    } catch (err) {
      console.warn("[Electron] Could not load local HTML file, fallback to backend proxy URL:", err);
      await mainWindow.loadURL(`${API_URL}/dashboard`);
    }
  }

  // Graceful show on ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Intercept external links to open in the OS default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Handle minimize to tray instead of quitting if preferred
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      // In normal desktop use, closing window quits app cleanly
      // Can also be configured to minimize to tray
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Create the Windows System Tray icon.
 */
function createSystemTray() {
  const iconPath = path.join(__dirname, "../public/megan-logo.png");

  try {
    tray = new Tray(iconPath);
    tray.setToolTip("Megan AI - Intelligent Desktop Assistant");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Megan AI",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      {
        label: "Open Web Dashboard",
        click: () => {
          shell.openExternal(`${API_URL}/dashboard`);
        },
      },
      { type: "separator" },
      {
        label: "Quit Megan AI",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on("double-click", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.warn("[Electron] System Tray creation skipped:", err.message);
  }
}

/**
 * Register global keyboard shortcuts for fast access.
 */
function registerShortcuts() {
  try {
    // Alt+Space to toggle Megan from anywhere on the PC
    const registered = globalShortcut.register("Alt+Space", () => {
      if (!mainWindow) {
        createMainWindow();
        return;
      }
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    if (registered) {
      console.log("[Electron] Global hotkey 'Alt+Space' registered successfully.");
    }
  } catch (err) {
    console.warn("[Electron] Global shortcut registration error:", err.message);
  }
}

// IPC Handlers for custom titlebar / window management
ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window-close", () => {
  mainWindow?.close();
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.on("open-external", (_, url) => {
  if (url) shell.openExternal(url);
});

// App lifecycle
app.whenReady().then(async () => {
  await ensureBackendRunning();
  await createMainWindow();
  createSystemTray();
  registerShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    console.log("[Electron] Terminating spawned Python backend...");
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", pythonProcess.pid, "/f", "/t"]);
      } else {
        pythonProcess.kill("SIGTERM");
      }
    } catch {
      // Ignore kill errors
    }
    pythonProcess = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    app.quit();
  }
});
