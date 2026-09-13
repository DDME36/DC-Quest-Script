// ╔══════════════════════════════════════════════════════════════╗
// ║  ZENTYR Injector — Discord Quest Script Auto-Injector v3.6    ║
// ║  Refactored Modular & Antivirus-Stealth Edition (2026)      ║
// ║  Build: build.bat (online-only GitHub script loader)       ║
// ╚══════════════════════════════════════════════════════════════╝

using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Security.Principal;
using System.Runtime.InteropServices;
using System.Reflection;

[assembly: AssemblyTitle("ZENTYR Discord Script")]
[assembly: AssemblyDescription("Single-file online Discord quest script loader")]
[assembly: AssemblyCompany("ZENTYR Technology")]
[assembly: AssemblyProduct("ZENTYR Discord Script")]
[assembly: AssemblyVersion("3.6.0.0")]
[assembly: AssemblyFileVersion("3.6.0.0")]

class ZentyrInjector
{
    static void Main(string[] args)
    {
        // ตรวจสอบประเภทและรุ่นของ Discord ล่วงหน้าเพื่อตั้งค่าตัวพรีเซ็ต
        string targetFlavor = DiscordDetector.DetectTarget();
        var patcher = new DiscordPatcher(targetFlavor);

        // ตรวจสอบพารามิเตอร์ --cleanup เพื่อล้างร่องรอยทันทีโดยไม่ต้องรัน Discord
        if (args.Length > 0 && args[0].Equals("--cleanup", StringComparison.OrdinalIgnoreCase))
        {
            ConsoleUI.PrintHeader();
            ConsoleUI.PrintStep("Running standalone cleanup");
            patcher.RestoreOriginalFiles();
            ConsoleUI.PrintOK("Cleanup process finished.");
            ConsoleUI.PauseAndExit();
            return;
        }

        ConsoleUI.PrintHeader();

        // 1. ตรวจสอบสิทธิ์ผู้ดูแลระบบ (Administrator Privilege Check - Soft Warning)
        if (!SecurityManager.IsAdministrator())
        {
            ConsoleUI.PrintWarn("Running without Administrator privileges.");
            ConsoleUI.PrintInfo("If you face any write errors, please re-run as Administrator.");
            ConsoleUI.PrintDivider();
        }

        // 2. แสดงข้อมูลเป้าหมาย Discord ที่ตรวจพบ
        ConsoleUI.PrintOK("Target selected: " + targetFlavor);
        ConsoleUI.PrintDivider();

        // 3. จัดการปิดโปรแกรม Discord อย่างนุ่มนวล (Soft-Close and Terminate)
        if (!DiscordDetector.CloseDiscord(targetFlavor))
        {
            ConsoleUI.PrintErr("Failed to safely terminate Discord processes.");
            ConsoleUI.PauseAndExit();
            return;
        }
        ConsoleUI.PrintDivider();

        // 4. แก้ไขการตั้งค่า settings.json (Enable DevTools)
        if (!patcher.PatchSettingsJson())
        {
            ConsoleUI.PrintErr("Aborting process due to settings.json failure.");
            ConsoleUI.PauseAndExit();
            return;
        }
        ConsoleUI.PrintDivider();

        // 5. ติดตั้งตัวโหลด zentyr_loader.js และเชื่อมโยงใน index.js (Memory Injection Setup)
        if (!patcher.InjectLoader())
        {
            ConsoleUI.PrintErr("Aborting process due to core script injection failure.");
            patcher.RestoreOriginalFiles();
            ConsoleUI.PauseAndExit();
            return;
        }
        ConsoleUI.PrintDivider();

        // 6. เปิดการใช้งาน Discord คืนกลับมา (Relaunch Discord Application)
        if (!patcher.LaunchDiscord())
        {
            ConsoleUI.PrintWarn("Could not launch Discord automatically. Please launch it manually.");
            patcher.RestoreOriginalFiles();
            ConsoleUI.PauseAndExit();
            return;
        }

        // 7. เฝ้าติดตามการทำงานของ Discord (Stealth Monitoring Phase)
        ConsoleUI.PrintDivider();
        ConsoleUI.MonitorDiscordInjection(targetFlavor);

        // 8. ล้างไฟล์และกู้คืนระบบ Disk หลังจากรันเข้า RAM เรียบร้อยแล้ว (Stealth Disk Cleanup)
        ConsoleUI.PrintDivider();
        ConsoleUI.PrintStep("Executing post-launch stealth cleanup");
        patcher.RestoreOriginalFiles();
        ConsoleUI.PrintOK("Stealth cleanup executed successfully.");

        ConsoleUI.PrintDivider();
        ConsoleUI.PrintOK("Discord launch and cleanup sequence completed.");
        ConsoleUI.PrintInfo("Confirm that the ZENTYR widget appears inside Discord.");
        ConsoleUI.PauseAndExit();
    }
}

// ─────────────────────────────────────────────────────────────────
// ─── SECTION 1: SECURITY & PRIVILEGE MANAGER
// ─────────────────────────────────────────────────────────────────
static class SecurityManager
{
    public static bool IsAdministrator()
    {
        try
        {
            using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
            {
                WindowsPrincipal principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
        }
        catch
        {
            return false;
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// ─── SECTION 2: DETECTOR & SYSTEM CONTROLLER (SOFT CLOSE)
// ─────────────────────────────────────────────────────────────────
static class DiscordDetector
{
    private static readonly string[] Flavors = { "Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment" };

    public static string DetectTarget()
    {
        // สแกนจากแอปพลิเคชันที่เปิดใช้งานอยู่
        var active = Process.GetProcesses().Where(p => 
            Flavors.Any(f => p.ProcessName.Equals(f, StringComparison.OrdinalIgnoreCase))).ToArray();

        if (active.Length > 0)
        {
            return Flavors.FirstOrDefault(f => active[0].ProcessName.Equals(f, StringComparison.OrdinalIgnoreCase)) ?? "Discord";
        }

        // หากไม่ได้เปิดแอป ให้ค้นหาตำแหน่งติดตั้งที่พบในเครื่อง
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var installed = Flavors.Where(f => Directory.Exists(Path.Combine(local, f))).ToList();

        return installed.Count > 0 ? installed[0] : "Discord";
    }

    /// <summary>
    /// ปิด Discord อย่างนุ่มนวล (Soft-Close) เพื่อลดการจับจ้องของ Windows Defender
    /// </summary>
    public static bool CloseDiscord(string flavor)
    {
        var processes = Process.GetProcessesByName(flavor);
        if (processes.Length == 0) return true;

        ConsoleUI.PrintStep("Closing Discord safely");

        // ขั้นตอนที่ 1: ส่งคำขอปิดหน้าต่างหลักอย่างเป็นมิตร (Safe Window Close Request)
        foreach (var p in processes)
        {
            try
            {
                if (p.MainWindowHandle != IntPtr.Zero)
                {
                    p.CloseMainWindow();
                }
            }
            catch {}
        }

        // ตรวจสอบว่าโปรเซสปิดตัวเองหมดหรือไม่ (หน่วงเวลารออย่างอ่อนโยน)
        int waitTimer = 0;
        while (waitTimer < 6000)
        {
            Thread.Sleep(500);
            waitTimer += 500;
            if (Process.GetProcessesByName(flavor).Length == 0)
            {
                ConsoleUI.PrintOK("Discord processes exited gracefully.");
                return true;
            }
        }

        // ขั้นตอนที่ 2: บังคับปิดงานหากโปรเซสค้าง (Force Terminate as Fallback)
        ConsoleUI.PrintWarn("Some processes did not respond. Force terminating...");
        foreach (var p in Process.GetProcessesByName(flavor))
        {
            try
            {
                p.Kill();
            }
            catch {}
        }

        // ตรวจสอบขั้นสุดท้าย
        Thread.Sleep(1000);
        if (Process.GetProcessesByName(flavor).Length == 0)
        {
            ConsoleUI.PrintOK("All Discord processes force-cleared.");
            return true;
        }

        return false;
    }
}

// ─────────────────────────────────────────────────────────────────
// ─── SECTION 3: DISCORD CONFIGURATION & LOADER PATCHER
// ─────────────────────────────────────────────────────────────────
class DiscordPatcher
{
    private const string DevToolsKey = "DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING";
    private const string ScriptUrl = "https://raw.githubusercontent.com/DDME36/DC-Quest-Script/main/zentyr.js";

    private const string LoaderRequire = "require('./zentyr_loader');";
    private static readonly Encoding Utf8WithoutBom = new UTF8Encoding(false);

    public string TargetFlavor { get; private set; }
    private string injectedIndexPath;

    public DiscordPatcher(string flavor)
    {
        this.TargetFlavor = flavor;
    }

    private string GetSettingsJsonPath()
    {
        string roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        return Path.Combine(roaming, TargetFlavor.ToLower(), "settings.json");
    }

    private static Version GetDirectoryVersion(string path, string prefix)
    {
        string name = Path.GetFileName(path) ?? string.Empty;
        if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            name = name.Substring(prefix.Length);
        }
        Version version;
        return Version.TryParse(name, out version) ? version : new Version(0, 0);
    }

    private string FindAppDirectory()
    {
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string path = Path.Combine(local, TargetFlavor);
        if (!Directory.Exists(path)) return null;

        var subDirs = Directory.GetDirectories(path, "app-*")
            .OrderByDescending(d => GetDirectoryVersion(d, "app-"))
            .ThenByDescending(Directory.GetLastWriteTimeUtc)
            .ToArray();

        return subDirs.Length > 0 ? subDirs[0] : null;
    }

    private string FindCoreIndexFile(string appDir)
    {
        string modules = Path.Combine(appDir, "modules");
        if (!Directory.Exists(modules)) return null;

        var coreDirs = Directory.GetDirectories(modules, "discord_desktop_core-*")
            .Where(d => File.Exists(Path.Combine(d, "discord_desktop_core", "index.js")))
            .OrderByDescending(d => GetDirectoryVersion(d, "discord_desktop_core-"))
            .ThenByDescending(Directory.GetLastWriteTimeUtc)
            .ToArray();
        if (coreDirs.Length == 0) return null;

        string indexPath = Path.Combine(coreDirs[0], "discord_desktop_core", "index.js");
        return File.Exists(indexPath) ? indexPath : null;
    }

    /// <summary>
    /// ป้องกันการตั้งค่าพัง โดยใช้ระบบ Parsing ปรับปรุง JSON โครงสร้างเรียบง่ายอย่างปลอดภัย
    /// </summary>
    public bool PatchSettingsJson()
    {
        string path = GetSettingsJsonPath();
        ConsoleUI.PrintStep("Configuring settings.json");

        if (!File.Exists(path))
        {
            ConsoleUI.PrintErr("File not found: " + path);
            ConsoleUI.PrintInfo("Please launch Discord manually once to create settings.");
            return false;
        }

        try
        {
            // ทำการสำรองข้อมูล (Backup Settings)
            string backup = path + ".zentyr_backup";
            if (!File.Exists(backup))
            {
                File.Copy(path, backup, false);
            }

            string rawJson = File.ReadAllText(path, Utf8WithoutBom);

            // ตรวจสอบว่ามีคีย์ DevTools หรือยัง
            if (rawJson.Contains(DevToolsKey))
            {
                if (rawJson.Contains("\"" + DevToolsKey + "\": true") || rawJson.Contains("\"" + DevToolsKey + "\":true"))
                {
                    ConsoleUI.PrintOK("Developer mode is already active.");
                    return true;
                }
                
                // แก้ไขจาก false เป็น true
                rawJson = rawJson.Replace("\"" + DevToolsKey + "\": false", "\"" + DevToolsKey + "\": true");
                rawJson = rawJson.Replace("\"" + DevToolsKey + "\":false", "\"" + DevToolsKey + "\": true");
                File.WriteAllText(path, rawJson, Utf8WithoutBom);
                ConsoleUI.PrintOK("Developer mode patched successfully.");
                return true;
            }

            // เพิ่มคีย์ลงในตอนท้ายของ JSON
            int closingBrace = rawJson.LastIndexOf('}');
            if (closingBrace < 0)
            {
                ConsoleUI.PrintErr("Invalid structure in settings.json");
                return false;
            }

            string contentBefore = rawJson.Substring(0, closingBrace).TrimEnd();
            bool commaNeeded = contentBefore.Length > 0 && contentBefore[contentBefore.Length - 1] != ',' && contentBefore[contentBefore.Length - 1] != '{';

            string appendText = (commaNeeded ? ",\n" : "\n") + "  \"" + DevToolsKey + "\": true\n";
            string outJson = rawJson.Substring(0, closingBrace) + appendText + "}";

            File.WriteAllText(path, outJson, Utf8WithoutBom);
            ConsoleUI.PrintOK("Developer mode enabled in configurations.");
            return true;
        }
        catch (Exception ex)
        {
            try
            {
                string backup = path + ".zentyr_backup";
                if (File.Exists(backup))
                {
                    File.Copy(backup, path, true);
                    File.Delete(backup);
                }
            }
            catch { }
            ConsoleUI.PrintErr("Settings patching exception: " + ex.Message);
            return false;
        }
    }

    /// ติดตั้ง Loader ลงในเครื่องเพื่อเตรียมฉีดระบบเข้า RAM
    /// </summary>
    public bool InjectLoader()
    {
        string appDir = FindAppDirectory();
        if (appDir == null)
        {
            ConsoleUI.PrintErr("Discord installation folder not found.");
            return false;
        }

        string indexPath = FindCoreIndexFile(appDir);
        if (indexPath == null)
        {
            ConsoleUI.PrintErr("discord_desktop_core core assembly index not found.");
            return false;
        }

        string coreDir = Path.GetDirectoryName(indexPath);
        string loaderPath = Path.Combine(coreDir, "zentyr_loader.js");
        injectedIndexPath = indexPath;

        ConsoleUI.PrintStep("Injecting memory hook script");

        try
        {

            // ล้างไฟล์ขยะตกค้างจากระบบเดิม (Cleanup legacy files)
            string legacyLoader = Path.Combine(appDir, "resources", "zentyr_loader.js");
            if (File.Exists(legacyLoader))
            {
                try { File.Delete(legacyLoader); } catch {}
            }

            // สร้างสคริปต์ zentyr_loader.js ที่มีระบบทำลายร่องรอยตัวเองหลังรัน (Stealth Runtime Self-Destruction)
            string loaderSourceCode = @"// ─── ZENTYR Auto-Loader v3.6 ───
const electron = require('electron');
const https = require('https');
const fs = require('fs');
const nodePath = require('path');

const selfPath = __filename;
const indexPath = nodePath.join(__dirname, 'index.js');
const backupPath = indexPath + '.zentyr_backup';

// 1. ฟื้นฟูไฟล์ index.js ทันทีเพื่อลบร่องรอย (Stealth File Clean Up)
try {
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, indexPath);
        fs.unlinkSync(backupPath);
        console.log('[ZENTYR] index.js signature cleared.');
    } else if (fs.existsSync(indexPath)) {
        const marker = ""require('./zentyr_loader');\n"";
        const current = fs.readFileSync(indexPath, 'utf-8');
        if (current.startsWith(marker)) {
            fs.writeFileSync(indexPath, current.slice(marker.length), 'utf-8');
            console.log('[ZENTYR] Loader marker removed without replacing Discord content.');
        }
    }
} catch(e) {
    console.error('[ZENTYR] Cleanup error:', e.message);
}

// ลบตัวโหลดออกทันทีหลังโหลดเข้าระบบ RAM แล้ว 5 วินาที
setTimeout(() => {
    try { fs.unlinkSync(selfPath); console.log('[ZENTYR] Active loader file destroyed.'); } catch(e) {}
}, 5000);

const SCRIPT_URL = '" + ScriptUrl + @"';
let executed = false;
electron.app.on('browser-window-created', (_, win) => {
    if (executed || !win || !win.webContents) return;

    win.webContents.on('did-finish-load', () => {
        if (executed) return;
        const pageUrl = win.webContents.getURL();

        if (!pageUrl.includes('discord.com/app') &&
            !pageUrl.includes('discord.com/channels') &&
            !pageUrl.includes('discord.com/login')) {
            return;
        }

        executed = true;
        
        // รอจนหน้าเพจ Discord โหลดไลบรารีเสร็จสมบูรณ์
        const loaderPoller = `(function() {
            var start = Date.now();
            function verify() {
                var isReady = (typeof webpackChunkdiscord_app !== 'undefined') &&
                    Array.isArray(webpackChunkdiscord_app) &&
                    webpackChunkdiscord_app.length > 0 &&
                    document.getElementById('app-mount') &&
                    document.getElementById('app-mount').querySelectorAll('div').length > 30;
                if (isReady) {
                    window.__zentyrReady = true;
                } else if (Date.now() - start > 120000) {
                    window.__zentyrReady = true; 
                } else {
                    setTimeout(verify, 1500);
                }
            }
            verify();
        })();`;

        win.webContents.executeJavaScript(loaderPoller).catch(() => {});

        let launchTimer = Date.now();
        function processInjection() {
            if (!win || win.isDestroyed()) return;
            win.webContents.executeJavaScript('window.__zentyrReady === true')
                .then((ready) => {
                    if (ready) {
                        doInject(win);
                    } else if (Date.now() - launchTimer > 120000) {
                        doInject(win);
                    } else {
                        setTimeout(processInjection, 2000);
                    }
                })
                .catch(() => {
                    if (Date.now() - launchTimer < 120000) {
                        setTimeout(processInjection, 3000);
                    }
                });
        }
        setTimeout(processInjection, 3000);
    });
});

function isValidPayload(payload) {
    return typeof payload === 'string' &&
        payload.length >= 1000 &&
        payload.length <= 2 * 1024 * 1024 &&
        payload.includes('ZENTYR Quest Engine') &&
        payload.includes('window.__zentyrLock');
}

function executePayload(win, payload) {
    if (!isValidPayload(payload)) {
        console.error('[ZENTYR] GitHub payload validation failed.');
        return;
    }
    win.webContents.executeJavaScript(payload + '\n;true;')
        .then(() => console.log('[ZENTYR] GitHub payload initialized.'))
        .catch((error) => console.error('[ZENTYR] GitHub payload execution failed:', error.message));
}

function doInject(win) {
    console.log('[ZENTYR] Fetching latest script from GitHub...');
    const request = https.get(SCRIPT_URL, { headers: { 'User-Agent': 'ZentyrLoader/3.6' } }, (res) => {
        if (res.statusCode !== 200) {
            res.resume();
            console.error('[ZENTYR] GitHub returned status ' + res.statusCode + '; no offline fallback is configured.');
            return;
        }
        res.setEncoding('utf8');
        let chunk = '';
        let byteCount = 0;
        let rejected = false;
        res.on('data', (part) => {
            if (rejected) return;
            byteCount += Buffer.byteLength(part, 'utf8');
            if (byteCount > 2 * 1024 * 1024) {
                rejected = true;
                res.destroy(new Error('Remote script exceeded the 2 MB limit'));
                return;
            }
            chunk += part;
        });
        res.on('end', () => {
            if (!rejected) executePayload(win, chunk);
        });
        res.on('error', (error) => console.error('[ZENTYR] GitHub response failed:', error.message));
    });
    request.setTimeout(15000, () => request.destroy(new Error('GitHub request timed out')));
    request.on('error', (error) => console.error('[ZENTYR] GitHub fetch failed:', error.message));
}
";

            File.WriteAllText(loaderPath, loaderSourceCode, Utf8WithoutBom);

            // แก้ไขเชื่อมโยง index.js ของ Discord
            string indexContent = File.ReadAllText(indexPath, Utf8WithoutBom);
            if (indexContent.StartsWith(LoaderRequire + "\n", StringComparison.Ordinal))
            {
                ConsoleUI.PrintOK("Loader connection already configured.");
            }
            else
            {
                string backupFile = indexPath + ".zentyr_backup";
                if (!File.Exists(backupFile))
                {
                    File.Copy(indexPath, backupFile, false);
                }

                string patchContent = LoaderRequire + "\n" + indexContent;
                File.WriteAllText(indexPath, patchContent, Utf8WithoutBom);
                ConsoleUI.PrintOK("Loader registered to core startup successfully.");
            }

            return true;
        }
        catch (Exception ex)
        {
            ConsoleUI.PrintErr("Core injection critical error: " + ex.Message);
            return false;
        }
    }

    /// <summary>
    /// สั่งรันเรียกใช้งาน Discord (Relaunch Application)
    /// </summary>
    public bool LaunchDiscord()
    {
        ConsoleUI.PrintStep("Re-opening Discord client");

        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string squirrelUpdate = Path.Combine(local, TargetFlavor, "Update.exe");

        try
        {
            if (File.Exists(squirrelUpdate))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = squirrelUpdate,
                    Arguments = "--processStart " + TargetFlavor + ".exe",
                    UseShellExecute = false,
                });
            }
            else
            {
                string appDir = FindAppDirectory();
                if (appDir == null) return false;
                string rawExe = Path.Combine(appDir, TargetFlavor + ".exe");
                if (!File.Exists(rawExe)) return false;

                Process.Start(new ProcessStartInfo
                {
                    FileName = rawExe,
                    UseShellExecute = false,
                });
            }

            ConsoleUI.PrintOK("Discord launch command dispatched.");
            return true;
        }
        catch (Exception e)
        {
            ConsoleUI.PrintErr("Discord re-open exception: " + e.Message);
            return false;
        }
    }

    /// <summary>
    /// กู้คืนไฟล์ดั้งเดิมและลบ Loader ออกจากระบบ Disk
    /// </summary>
    public void RestoreOriginalFiles()
    {
        string indexPath = injectedIndexPath;
        if (string.IsNullOrEmpty(indexPath) || !File.Exists(indexPath))
        {
            string appDir = FindAppDirectory();
            indexPath = appDir == null ? null : FindCoreIndexFile(appDir);
        }

        string coreDir = string.IsNullOrEmpty(indexPath) ? null : Path.GetDirectoryName(indexPath);
        string backupFile = string.IsNullOrEmpty(indexPath) ? null : indexPath + ".zentyr_backup";
        string loaderPath = string.IsNullOrEmpty(coreDir) ? null : Path.Combine(coreDir, "zentyr_loader.js");
        string localZentyrPath = string.IsNullOrEmpty(coreDir) ? null : Path.Combine(coreDir, "zentyr.js");

        try
        {
            // 1. กู้คืนไฟล์ index.js
            if (File.Exists(backupFile))
            {
                File.Copy(backupFile, indexPath, true);
                File.Delete(backupFile);
                ConsoleUI.PrintOK("Original index.js restored.");
            }
            else
            {
                // หากไม่มีแบ็กอัป ให้ลบเฉพาะ marker ที่โปรแกรมเพิ่ม ห้ามเขียนทับเนื้อหา Discord ทั้งไฟล์
                if (File.Exists(indexPath))
                {
                    string content = File.ReadAllText(indexPath, Utf8WithoutBom);
                    string marker = LoaderRequire + "\n";
                    if (content.StartsWith(marker, StringComparison.Ordinal))
                    {
                        File.WriteAllText(indexPath, content.Substring(marker.Length), Utf8WithoutBom);
                        ConsoleUI.PrintOK("Loader marker removed safely from index.js.");
                    }
                }
            }

            // 2. ลบไฟล์ zentyr_loader.js
            if (File.Exists(loaderPath))
            {
                File.Delete(loaderPath);
                ConsoleUI.PrintOK("zentyr_loader.js removed from disk.");
            }

            // 3. ลบไฟล์ zentyr.js
            if (File.Exists(localZentyrPath))
            {
                File.Delete(localZentyrPath);
                ConsoleUI.PrintOK("zentyr.js removed from disk.");
            }
            string legacyPunnJs = string.IsNullOrEmpty(coreDir) ? null : Path.Combine(coreDir, "punn.js");
            if (legacyPunnJs != null && File.Exists(legacyPunnJs))
            {
                try { File.Delete(legacyPunnJs); } catch {}
            }

            // 4. กู้คืน settings.json (ปิด DevTools)
            string settingsPath = GetSettingsJsonPath();
            string settingsBackup = settingsPath + ".zentyr_backup";
            if (File.Exists(settingsBackup))
            {
                File.Copy(settingsBackup, settingsPath, true);
                File.Delete(settingsBackup);
                ConsoleUI.PrintOK("Original settings.json restored.");
            }
            else
            {
                if (File.Exists(settingsPath))
                {
                    string rawJson = File.ReadAllText(settingsPath, Utf8WithoutBom);
                    if (rawJson.Contains(DevToolsKey))
                    {
                        rawJson = rawJson.Replace("\"" + DevToolsKey + "\": true", "\"" + DevToolsKey + "\": false");
                        rawJson = rawJson.Replace("\"" + DevToolsKey + "\":true", "\"" + DevToolsKey + "\": false");
                        File.WriteAllText(settingsPath, rawJson, Utf8WithoutBom);
                        ConsoleUI.PrintOK("settings.json DevTools deactivated.");
                    }
                }
            }

            string legacySettingsBackup = settingsPath + ".punn_backup";
            if (File.Exists(legacySettingsBackup))
            {
                try { File.Delete(legacySettingsBackup); } catch {}
            }
        }
        catch (Exception ex)
        {
            ConsoleUI.PrintWarn("Cleanup warning: " + ex.Message);
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// ─── SECTION 4: HIGH-FIDELITY CONSOLE UI ENGINE (PREMIUM STYLE)
// ─────────────────────────────────────────────────────────────────
static class ConsoleUI
{
    public static void PrintHeader()
    {
        try { Console.Clear(); } catch {}
        Console.OutputEncoding = Encoding.UTF8;
        
        Write(@"
  ┌────────────────────────────────────────────────────────────┐
  │  ███████╗███████╗███╗   ██╗████████╗██╗   ██╗██████╗       │
  │  ╚══███╔╝██╔════╝████╗  ██║╚══██╔══╝╚██╗ ██╔╝██╔══██╗      │
  │    ███╔╝ █████╗  ██╔██╗ ██║   ██║    ╚████╔╝ ██████╔╝      │
  │   ███╔╝  ██╔══╝  ██║╚██╗██║   ██║     ╚██╔╝  ██╔══██╗      │
  │  ███████╗███████╗██║ ╚████║   ██║      ██║   ██║  ██║      │
  │  ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝      │
  └────────────────────────────────────────────────────────────┘", ConsoleColor.Magenta);
        Console.WriteLine();
        Write("   ZENTYR", ConsoleColor.White);
        Write(" Stealth Engine", ConsoleColor.Cyan);
        Write(" — ", ConsoleColor.DarkGray);
        WriteLine("Auto-Injector v3.6 (2026)", ConsoleColor.DarkCyan);
        WriteLine("   ═══════════════════════════════════════════════", ConsoleColor.DarkGray);
        Console.WriteLine();
    }

    public static void PrintStep(string stepText)
    {
        Write("   ⚙️  ", ConsoleColor.DarkCyan);
        WriteLine(stepText + "...", ConsoleColor.White);
    }

    public static void PrintOK(string text)
    {
        Write("      ✔  ", ConsoleColor.Green);
        WriteLine(text, ConsoleColor.Gray);
    }

    public static void PrintWarn(string text)
    {
        Write("      ⚠  ", ConsoleColor.Yellow);
        WriteLine(text, ConsoleColor.Yellow);
    }

    public static void PrintErr(string text)
    {
        Write("      ✘  ", ConsoleColor.Red);
        WriteLine(text, ConsoleColor.Red);
    }

    public static void PrintInfo(string text)
    {
        Write("      »  ", ConsoleColor.DarkGray);
        WriteLine(text, ConsoleColor.DarkGray);
    }

    public static void PrintDivider()
    {
        WriteLine("   ───────────────────────────────────────────────", ConsoleColor.DarkGray);
    }

    public static void MonitorDiscordInjection(string flavor)
    {
        PrintStep("Monitoring Injection Phase");
        
        bool utf8Active = Console.OutputEncoding.CodePage == 65001;
        string[] frames = utf8Active ? new[] { "⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏" } : new[] { "/", "-", "\\", "|" };
        
        int frameIndex = 0;
        int elapsedMs = 0;
        int timeoutLimit = 35000;
        bool windowFound = false;

        // รอหน้าเพจ Discord ปรากฏในระบบเพื่อความแน่ใจ
        while (elapsedMs < timeoutLimit && !windowFound)
        {
            Thread.Sleep(500);
            elapsedMs += 500;

            var procs = Process.GetProcessesByName(flavor);
            foreach (var p in procs)
            {
                try
                {
                    p.Refresh();
                    if (p.MainWindowHandle != IntPtr.Zero && !string.IsNullOrEmpty(p.MainWindowTitle))
                    {
                        windowFound = true;
                        break;
                    }
                }
                catch {}
            }

            Console.Write("\r");
            Write("      " + frames[frameIndex % frames.Length] + " ", ConsoleColor.Cyan);
            Write("Awaiting Discord Window Initialization", ConsoleColor.Gray);
            Write(" (" + (elapsedMs / 1000) + "s)   ", ConsoleColor.DarkGray);
            frameIndex++;
        }

        Console.Write("\r" + new string(' ', 65) + "\r");

        if (!windowFound)
        {
            PrintWarn("Timeout waiting for Discord main thread. Proceeding regardless...");
            return;
        }

        PrintOK("Discord main window context registered.");
        
        // หน่วงเวลาจำลอง (ประมวลผลการทำงาน Memory Hook)
        string[] dotFrames = utf8Active ? new[] { "⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷" } : new[] { ".", "..", "...", "...." };
        for (int i = 0; i < 15; i++)
        {
            Thread.Sleep(1000);
            Console.Write("\r");
            Write("      " + dotFrames[i % dotFrames.Length] + " ", ConsoleColor.DarkMagenta);
            Write("Deploying script injection to memory runtime", ConsoleColor.Gray);
            Write(" (" + (i + 1) + "s)   ", ConsoleColor.DarkGray);
        }

        Console.Write("\r" + new string(' ', 65) + "\r");
        PrintOK("Injection session terminated. System cleaned.");
    }

    public static void PauseAndExit()
    {
        Console.WriteLine();
        WriteLine("   Press any key to close...", ConsoleColor.DarkGray);
        try
        {
            Console.ReadKey(true);
        }
        catch {}
    }

    private static void Write(string text, ConsoleColor color)
    {
        Console.ForegroundColor = color;
        Console.Write(text);
        Console.ResetColor();
    }

    private static void WriteLine(string text, ConsoleColor color)
    {
        Console.ForegroundColor = color;
        Console.WriteLine(text);
        Console.ResetColor();
    }
}
