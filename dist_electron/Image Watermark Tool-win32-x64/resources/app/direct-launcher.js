const { app, BrowserWindow } = require('electron'); 
const path = require('path'); 
const fs = require('fs'); 
 
// Keep a global reference of the window object 
let mainWindow; 
 
function createWindow() { 
  mainWindow = new BrowserWindow({ 
    width: 1200, 
    height: 800, 
    webPreferences: { 
      nodeIntegration: true, 
      contextIsolation: false, 
      webSecurity: false 
    } 
  }); 
 
  const appPath = app.getAppPath(); 
  console.log('App path:', appPath); 
 
  const directAppPath = path.join(appPath, 'direct-app.html'); 
  console.log('Loading:', directAppPath); 
 
  mainWindow.loadFile(directAppPath); 
 
  mainWindow.on('closed', function () { 
    mainWindow = null; 
  }); 
} 
 
app.on('ready', createWindow); 
 
app.on('window-all-closed', function () { 
  if (process.platform !== 'darwin') { 
    app.quit(); 
  } 
}); 
 
app.on('activate', function () { 
  if (mainWindow === null) { 
    createWindow(); 
  } 
}); 
