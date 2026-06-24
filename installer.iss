[Setup]
AppName=devLauncher
AppVersion=1.0.0
AppPublisher=fedevoral
AppPublisherURL=https://github.com/fedevoral
AppSupportURL=https://github.com/fedevoral
DefaultDirName={autopf}\devLauncher
DefaultGroupName=devLauncher
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=devLauncher_Setup
SetupIconFile=assets\icons\installer.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\win-unpacked\devLauncher.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\devLauncher"; Filename: "{app}\devLauncher.exe"
Name: "{autodesktop}\devLauncher"; Filename: "{app}\devLauncher.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\devLauncher.exe"; Description: "{cm:LaunchProgram,devLauncher}"; Flags: nowait postinstall skipifsilent
