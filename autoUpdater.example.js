// In your electron/main file
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: require('path').join(__dirname, 'preload.js')
    }
  });

  // Load your frontend (replace with your URL or local file)
  // mainWindow.loadURL('http://localhost:5173') or loadFile(...)
}

app.whenReady().then(() => {
  createWindow();

  // Auto-update
  autoUpdater.checkForUpdatesAndNotify();
});
