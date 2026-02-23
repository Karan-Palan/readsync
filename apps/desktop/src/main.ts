import { app, BrowserWindow, shell } from "electron";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WindowState {
	x?: number;
	y?: number;
	width: number;
	height: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROD_URL = "https://readsync.in";
const DEV_URL = "http://localhost:3001";
const ALLOWED_ORIGINS = [PROD_URL, DEV_URL];

// ---------------------------------------------------------------------------
// Window state persistence
// ---------------------------------------------------------------------------

function stateFilePath(): string {
	return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState(): WindowState {
	try {
		const raw = fs.readFileSync(stateFilePath(), "utf-8");
		const parsed = JSON.parse(raw) as WindowState;
		if (parsed.width && parsed.height) return parsed;
	} catch {
		// File missing or corrupt — use defaults
	}
	return { width: 1200, height: 800 };
}

function saveWindowState(win: BrowserWindow): void {
	try {
		const bounds = win.getBounds();
		const state: WindowState = {
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
		};
		fs.writeFileSync(stateFilePath(), JSON.stringify(state));
	} catch {
		// Silently ignore write errors
	}
}

// ---------------------------------------------------------------------------
// Single instance lock
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
	app.quit();
}

app.on("second-instance", () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.focus();
	}
});

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
	const savedState = loadWindowState();

	mainWindow = new BrowserWindow({
		...(savedState.x !== undefined && savedState.y !== undefined
			? { x: savedState.x, y: savedState.y }
			: {}),
		width: savedState.width,
		height: savedState.height,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: "#1a1a18",
		title: "ReadSync",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
			webSecurity: true,
			allowRunningInsecureContent: false,
		},
	});

	// ------------------------------------------------------------------
	// URL loading
	// ------------------------------------------------------------------

	const targetURL = app.isPackaged ? PROD_URL : DEV_URL;
	mainWindow.loadURL(targetURL);

	// ------------------------------------------------------------------
	// Navigation security
	// ------------------------------------------------------------------

	mainWindow.webContents.on("will-navigate", (event: Electron.Event, url: string) => {
		const allowed = ALLOWED_ORIGINS.some((origin) => url.startsWith(origin));
		if (!allowed) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
		shell.openExternal(url);
		return { action: "deny" as const };
	});

	// ------------------------------------------------------------------
	// Error fallback
	// ------------------------------------------------------------------

	mainWindow.webContents.on("did-fail-load", () => {
		const mode = app.isPackaged ? "prod" : "dev";
		mainWindow?.loadFile(path.join(__dirname, "../src/error.html"), {
			query: { mode },
		});
	});

	// ------------------------------------------------------------------
	// DevTools (dev only)
	// ------------------------------------------------------------------

	if (!app.isPackaged) {
		mainWindow.webContents.openDevTools();
	}

	// ------------------------------------------------------------------
	// Persist window state on move / resize / close
	// ------------------------------------------------------------------

	mainWindow.on("resize", () => {
		if (mainWindow) saveWindowState(mainWindow);
	});

	mainWindow.on("move", () => {
		if (mainWindow) saveWindowState(mainWindow);
	});

	mainWindow.on("close", () => {
		if (mainWindow) saveWindowState(mainWindow);
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
