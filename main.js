const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { Client, Authenticator } = require('minecraft-launcher-core');
const launcher = new Client();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        resizable: false,
        frame: true, // İsteğe göre kapatıp custom bar yapabilirsin
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Mods klasörünü açma tetikleyicisi
ipcMain.on('open-mods-folder', () => {
    const minecraftDir = process.platform === 'win32' 
        ? path.join(process.env.APPDATA, '.minecraft', 'mods')
        : path.join(app.getPath('home'), '.minecraft', 'mods');

    if (!fs.existsSync(minecraftDir)) {
        fs.mkdirSync(minecraftDir, { recursive: true });
    }
    shell.openPath(minecraftDir);
});

// Mojang API'sinden resmi sürümleri çekme fonksiyonu
ipcMain.on('get-versions', (event) => {
    const url = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const manifest = JSON.parse(data);
                // Sadece ana sürümleri (release) filtrele ve sürümlerin adını dizi yap
                const releases = manifest.versions
                    .filter(v => v.type === 'release')
                    .map(v => v.id);
                event.reply('versions-list', releases);
            } catch (err) {
                console.error("Sürüm JSON'ı ayrıştırılamadı:", err);
                event.reply('versions-list', ['1.21.1', '1.21.8']); // Hata durumunda yedek plan
            }
        });
    }).on('error', (err) => {
        console.error("Mojang API bağlantı hatası:", err);
        event.reply('versions-list', ['1.21.1', '1.21.8']);
    });
});

// Oyunu Başlatma Fonksiyonu
ipcMain.on('launch-game', (event, config) => {
    const minecraftDir = process.platform === 'win32'
        ? path.join(process.env.APPDATA, '.minecraft')
        : path.join(app.getPath('home'), '.minecraft');

    let opts = {
        clientPackage: null,
        authorization: Authenticator.getAuth(config.username),
        root: minecraftDir,
        version: {
            number: config.version.includes('fabric') ? "1.21.1" : config.version,
            type: config.version.includes('fabric') ? "release" : "release"
        },
        memory: {
            max: config.maxRam,
            min: config.minRam
        },
        javaPath: config.javaPath || undefined
    };

    // Eğer seçilen sürüm Fabric ise ayarları ona göre yapılandır
    if (config.version.includes('fabric')) {
        opts.version.custom = config.version;
    }

    launcher.launch(opts);

    launcher.on('debug', (e) => console.log(`[DEBUG] ${e}`));
    launcher.on('data', (e) => console.log(`[DATA] ${e}`));

    launcher.on('progress', (e) => {
        event.reply('download-progress', { type: 'progress', current: e.task, total: e.total });
    });

    launcher.on('download-status', (e) => {
        if (e.type === 'extract') {
            event.reply('download-progress', { type: 'extract' });
        }
    });

    launcher.on('launch', () => {
        event.reply('game-launched');
    });

    launcher.on('close', () => {
        event.reply('game-closed');
    });
});
