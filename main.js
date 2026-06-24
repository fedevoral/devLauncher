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
        frame: true,
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

ipcMain.on('open-mods-folder', () => {
    const minecraftDir = process.platform === 'win32' 
        ? path.join(process.env.APPDATA, '.minecraft', 'mods')
        : path.join(app.getPath('home'), '.minecraft', 'mods');

    if (!fs.existsSync(minecraftDir)) {
        fs.mkdirSync(minecraftDir, { recursive: true });
    }
    shell.openPath(minecraftDir);
});


ipcMain.on('get-versions', (event) => {
    const mojangUrl = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
    const fabricUrl = 'https://meta.fabricmc.net/v2/versions/loader';

    https.get(mojangUrl, (res) => {
        let mojangData = '';
        res.on('data', (chunk) => { mojangData += chunk; });
        res.on('end', () => {
            try {
                const manifest = JSON.parse(mojangData);
                const vanillaReleases = manifest.versions
                    .filter(v => v.type === 'release')
                    .map(v => v.id);

                https.get(fabricUrl, (fabRes) => {
                    let fabricData = '';
                    fabRes.on('data', (chunk) => { fabricData += chunk; });
                    fabRes.on('end', () => {
                        try {
                            const fabricManifest = JSON.parse(fabricData);
                            const stableLoader = fabricManifest.find(l => l.stable === true)?.version || '0.19.3';

                            event.reply('versions-list', {
                                vanilla: vanillaReleases,
                                fabricLoader: stableLoader
                            });
                        } catch (e) {
                            event.reply('versions-list', { vanilla: vanillaReleases, fabricLoader: '0.19.3' });
                        }
                    });
                }).on('error', () => {
                    event.reply('versions-list', { vanilla: vanillaReleases, fabricLoader: '0.19.3' });
                });

            } catch (err) {
                console.error("Sürümler alınamadı:", err);
                event.reply('versions-list', { vanilla: ['1.21.8', '1.21.1', '1.20.1'], fabricLoader: '0.19.3' });
            }
        });
    });
});

ipcMain.on('launch-game', (event, config) => {
    const minecraftDir = process.platform === 'win32'
        ? path.join(process.env.APPDATA, '.minecraft')
        : path.join(app.getPath('home'), '.minecraft');

    let gameVersion = config.version;
    let customProfile = null;

    if (gameVersion.startsWith('fabric-')) {
        customProfile = gameVersion;
        gameVersion = gameVersion.split('-').pop();
    } else if (gameVersion.startsWith('forge-') || gameVersion.startsWith('optifine-')) {
        gameVersion = gameVersion.split('-').pop();
    }

    let opts = {
        clientPackage: null,
        authorization: Authenticator.getAuth(config.username),
        root: minecraftDir,
        version: {
            number: gameVersion,
            type: "release"
        },
        memory: {
            max: config.maxRam,
            min: config.minRam
        },
        javaPath: config.javaPath || undefined
    };

    if (customProfile) {
        opts.version.custom = customProfile;
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
