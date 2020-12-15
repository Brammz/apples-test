const { app, BrowserWindow, Menu, globalShortcut, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let window;

function createWindow () {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: true
    }
  });
  window.on('close', (e) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      buttons: ['Ok', 'Cancel'],
      title: 'Confirm',
      message: 'Are you sure you want to close? Don\'t forget to download the results',
    });
    if (choice === 1) {
      e.preventDefault();
    }
  });
  window.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`);
}

const template = [{
  label: app.name,
  submenu: [
    { role: 'about' },
    { type: 'separator' },
    { role: 'hide' },
    { role: 'hideothers' },
    { role: 'unhide' },
    { type: 'separator' },
    { role: 'quit' },
  ]
}];

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate(template) : null);
  globalShortcut.register('F5', () => window.reload());
  createWindow();
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
