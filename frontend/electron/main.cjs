const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;
let backendPort = 3000;
let frontendPort = 5173;
let isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Función para iniciar el backend en un proceso separado
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = isDev 
      ? path.join(__dirname, '..', '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    console.log('Starting backend from:', backendPath);
    
    // Verificar que existe el package.json del backend
    const backendPackage = path.join(backendPath, 'package.json');
    if (!fs.existsSync(backendPackage)) {
      console.error('Backend package.json not found at:', backendPackage);
      reject(new Error('Backend not found'));
      return;
    }

    // Configurar variables de entorno para el backend
    const env = {
      ...process.env,
      PORT: backendPort,
      DB_PATH: path.join(app.getPath('userData'), 'prominer.db'),
      NODE_ENV: isDev ? 'development' : 'production'
    };

    // Usar el node del sistema para el backend
    const nodeExec = 'C:\\Program Files\\nodejs\\node.exe';
    const serverPath = path.join(backendPath, 'server.js');
    
    console.log('Using node executable:', nodeExec);
    console.log('Backend path:', backendPath);
    console.log('Server.js exists:', fs.existsSync(serverPath));
    console.log('Server.js path:', serverPath);

    console.log('About to spawn backend process...');
    backendProcess = spawn(nodeExec, [serverPath], {
      cwd: backendPath,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    console.log('Backend process spawned, PID:', backendProcess.pid);
    console.log('Backend process killed immediately:', backendProcess.killed);
    console.log('Backend process connected:', backendProcess.connected);
    console.log('Backend process spawnargs:', backendProcess.spawnargs);
    console.log('Backend process spawnfile:', backendProcess.spawnfile);
    console.log('Backend process killed immediately after spawn:', backendProcess.killed);
    console.log('Backend process spawnargs:', backendProcess.spawnargs);
    console.log('Backend process spawnfile:', backendProcess.spawnfile);
    console.log('Backend process killed immediately after spawn:', backendProcess.killed);
    console.log('Backend process spawnargs:', backendProcess.spawnargs);
    console.log('Backend process spawnfile:', backendProcess.spawnfile);

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend process:', err);
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Check if process is alive
    setTimeout(() => {
      console.log('Backend process still alive:', !backendProcess.killed, 'PID:', backendProcess.pid);
    }, 2000);

    // Check if process is alive after 5 seconds
    setTimeout(() => {
      console.log('Backend process still alive after 5s:', !backendProcess.killed, 'PID:', backendProcess.pid);
    }, 5000);

    // Esperar a que el backend esté listo
    const checkBackend = () => {
      fetch(`http://localhost:${backendPort}/api/health`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'OK') {
            console.log('Backend is ready!');
            resolve();
          } else {
            setTimeout(checkBackend, 500);
          }
        })
        .catch(() => setTimeout(checkBackend, 500));
    };

    setTimeout(checkBackend, 1000);
  });
}

// Función para crear la ventana principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'PROMINER - Control de Envases',
    icon: path.join(__dirname, '..', 'public', 'prominer-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false
  });

  // Cargar la app
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${frontendPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Manejar enlaces externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Rutina de salida: la interfaz pide cerrar todo el programa
ipcMain.handle('quit-app', () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (err) { /* ignore */ }
  }
  app.quit();
  return true;
});

// Inicialización de la app
app.whenReady().then(async () => {
  try {
    console.log('Starting PROMINER...');
    await startBackend();
    createWindow();
    console.log('PROMINER started successfully!');
  } catch (error) {
    console.error('Failed to start PROMINER:', error);
    dialog.showErrorBox('Error al iniciar PROMINER', error.message);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app };