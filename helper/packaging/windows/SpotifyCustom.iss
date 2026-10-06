; Windows installer (Inno Setup 6). Per-user: no admin prompt, installs into %LOCALAPPDATA%\Programs, so the
; helper can update itself by running a newer setup silently (internal/update/install_windows.go).
; Build: iscc /DAppVersion=1.2.3 /DSourceExe=path\to\SpotifyCustom.exe /DOutDir=path\to\dist SpotifyCustom.iss

#ifndef AppVersion
  #error Pass /DAppVersion=x.y.z
#endif
#ifndef SourceExe
  #error Pass /DSourceExe=path\to\SpotifyCustom.exe
#endif
#ifndef OutDir
  #define OutDir "."
#endif

[Setup]
; Never change AppId: it is how setup recognises an existing install to update.
AppId={{5B7C6B2E-3F0A-4E43-9C1D-6E2F8A9B4D17}
AppName=Spotify Custom
AppVersion={#AppVersion}
AppVerName=Spotify Custom {#AppVersion}
AppPublisher=Spotify Custom
AppPublisherURL=https://github.com/robo311/spotify-custom
VersionInfoVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\Spotify Custom
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutDir}
OutputBaseFilename=SpotifyCustom-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=Spotify Custom
UninstallDisplayIcon={app}\SpotifyCustom.exe
; An update runs while the helper may still be shutting down: close it rather than fail.
CloseApplications=force
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "SpotifyCustom.exe"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Spotify Custom"; Filename: "{app}\SpotifyCustom.exe"
Name: "{autodesktop}\Spotify Custom"; Filename: "{app}\SpotifyCustom.exe"; Tasks: desktopicon

[Run]
; Also runs after a silent update (no skipifsilent), which is what restarts the helper.
Filename: "{app}\SpotifyCustom.exe"; Description: "Open Spotify Custom"; Flags: nowait postinstall

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM SpotifyCustom.exe"; Flags: runhidden; RunOnceId: "StopHelper"

[Registry]
; "Start at login" is written by the helper itself (internal/autostart); remove it with the app.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "SpotifyCustom"; Flags: uninsdeletevalue dontcreatekey
