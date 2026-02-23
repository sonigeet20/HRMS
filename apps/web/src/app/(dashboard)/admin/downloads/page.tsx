'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import {
  Download, Upload, Monitor, Apple, Laptop, CheckCircle2,
  AlertCircle, Trash2, Star, FileDown, HardDrive, Wifi,
  KeyRound, MapPin, Clock, Shield, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ───────────────────── Types ───────────────────── */
interface AgentRelease {
  id: string;
  version: string;
  platform: 'windows' | 'macos' | 'linux';
  filename: string;
  file_size: number | null;
  storage_path: string;
  release_notes: string | null;
  is_latest: boolean;
  created_at: string;
}

const PLATFORM_META = {
  windows: { label: 'Windows', icon: Monitor, ext: '.exe / .msi', color: 'bg-blue-500' },
  macos: { label: 'macOS', icon: Apple, ext: '.dmg', color: 'bg-gray-700' },
  linux: { label: 'Linux', icon: Laptop, ext: '.deb / .AppImage', color: 'bg-orange-500' },
} as const;

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ───────────────────── Page ───────────────────── */
export default function DownloadsPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  const [releases, setReleases] = useState<AgentRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ version: '', platform: 'windows' as string, notes: '', isLatest: true });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  const fetchReleases = useCallback(async () => {
    const { data } = await supabase
      .from('agent_releases')
      .select('*')
      .order('created_at', { ascending: false });
    setReleases(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  /* ── Download handler ── */
  const handleDownload = async (release: AgentRelease) => {
    const { data } = supabase.storage
      .from('agent-releases')
      .getPublicUrl(release.storage_path);
    window.open(data.publicUrl, '_blank');
  };

  /* ── Upload handler (Admin only) ── */
  const handleUpload = async () => {
    if (!uploadFile || !uploadForm.version.trim()) {
      setMessage({ type: 'error', text: 'Please fill in version and select a file.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const storagePath = `${uploadForm.platform}/${uploadForm.version}/${uploadFile.name}`;

      // Upload file to storage
      const { error: storageError } = await supabase.storage
        .from('agent-releases')
        .upload(storagePath, uploadFile, { upsert: true });

      if (storageError) throw storageError;

      // Insert release record
      const { error: dbError } = await supabase.from('agent_releases').insert({
        version: uploadForm.version.trim(),
        platform: uploadForm.platform,
        filename: uploadFile.name,
        file_size: uploadFile.size,
        storage_path: storagePath,
        release_notes: uploadForm.notes.trim() || null,
        is_latest: uploadForm.isLatest,
        uploaded_by: profile?.id,
      });

      if (dbError) throw dbError;

      setMessage({ type: 'success', text: `${uploadFile.name} uploaded successfully!` });
      setUploadFile(null);
      setUploadForm({ version: '', platform: 'windows', notes: '', isLatest: true });
      fetchReleases();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete handler (Admin only) ── */
  const handleDelete = async (release: AgentRelease) => {
    if (!confirm(`Delete ${release.filename} v${release.version}?`)) return;

    await supabase.storage.from('agent-releases').remove([release.storage_path]);
    await supabase.from('agent_releases').delete().eq('id', release.id);
    fetchReleases();
  };

  /* ── Mark as latest (Admin only) ── */
  const handleMarkLatest = async (release: AgentRelease) => {
    await supabase
      .from('agent_releases')
      .update({ is_latest: true })
      .eq('id', release.id);
    fetchReleases();
  };

  /* ── Get latest per platform ── */
  const latestByPlatform = (platform: string) =>
    releases.find((r) => r.platform === platform && r.is_latest);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* ════════ Header ════════ */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HRMS Desktop Agent</h1>
        <p className="text-muted-foreground mt-1">
          Download and install the desktop agent for automatic attendance tracking, idle detection, and geo-fencing.
        </p>
      </div>

      {/* ════════ Quick Download Cards ════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['windows', 'macos', 'linux'] as const).map((platform) => {
          const meta = PLATFORM_META[platform];
          const latest = latestByPlatform(platform);
          const Icon = meta.icon;

          return (
            <div
              key={platform}
              className="rounded-xl border bg-card p-6 flex flex-col items-center text-center space-y-3"
            >
              <div className={cn('rounded-full p-3', meta.color, 'text-white')}>
                <Icon className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-lg">{meta.label}</h3>
              <p className="text-xs text-muted-foreground">{meta.ext}</p>

              {latest ? (
                <>
                  <p className="text-sm font-medium text-primary">v{latest.version}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(latest.file_size)}</p>
                  <button
                    onClick={() => handleDownload(latest)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">No release available yet</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ════════ Setup Guide ════════ */}
      <div className="rounded-xl border bg-card">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h2 className="text-xl font-semibold">📋 Post-Install Setup Guide</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step-by-step instructions to configure the agent after installation
            </p>
          </div>
          {showGuide ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-6">
            {/* ── Prerequisites ── */}
            <section className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Prerequisites
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                <li>You must have an active HRMS account (email + password provided by your admin)</li>
                <li>Your machine must be connected to the internet</li>
                <li>Windows 10+ or macOS 12+ is required</li>
                <li>Allow location access when prompted (required for geo-fencing)</li>
              </ul>
            </section>

            {/* ── Step 1: Install ── */}
            <SetupStep
              number={1}
              title="Install the Agent"
              icon={<HardDrive className="h-5 w-5" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" /> Windows
                  </h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Download the <strong>.exe</strong> or <strong>.msi</strong> installer above</li>
                    <li>Double-click the downloaded file</li>
                    <li>If Windows SmartScreen appears, click <strong>&quot;More info&quot;</strong> → <strong>&quot;Run anyway&quot;</strong></li>
                    <li>Follow the installation wizard (default settings are fine)</li>
                    <li>The agent will start automatically and appear in your <strong>system tray</strong> (bottom-right)</li>
                  </ol>
                </div>
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Apple className="h-4 w-4 text-gray-600" /> macOS
                  </h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Download the <strong>.dmg</strong> file above</li>
                    <li>Open the .dmg and drag <strong>HRMS Agent</strong> to <strong>Applications</strong></li>
                    <li>Open from Applications — if blocked, go to <strong>System Settings → Privacy & Security</strong> and click <strong>&quot;Open Anyway&quot;</strong></li>
                    <li>Grant permissions when prompted (Accessibility, Location)</li>
                    <li>The agent will appear in your <strong>menu bar</strong> (top-right)</li>
                  </ol>
                </div>
              </div>
            </SetupStep>

            {/* ── Step 2: Login ── */}
            <SetupStep
              number={2}
              title="Sign In to Your Account"
              icon={<KeyRound className="h-5 w-5" />}
            >
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Click the <strong>HRMS Agent icon</strong> in your system tray / menu bar</li>
                <li>Select <strong>&quot;Sign In&quot;</strong> from the menu</li>
                <li>A browser window will open — log in with your <strong>HRMS email and password</strong></li>
                <li>Once authenticated, the browser will show a confirmation — you can close it</li>
                <li>The tray icon will turn <strong className="text-green-600">green</strong> indicating you&apos;re connected</li>
              </ol>
              <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Your credentials are stored securely in your OS keychain (Windows Credential Manager / macOS Keychain). You only need to sign in once.
                </p>
              </div>
            </SetupStep>

            {/* ── Step 3: Configure ── */}
            <SetupStep
              number={3}
              title="Grant Permissions"
              icon={<Shield className="h-5 w-5" />}
            >
              <p className="text-sm text-muted-foreground mb-3">
                The agent needs certain permissions to track attendance accurately:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PermissionCard
                  icon={<MapPin className="h-5 w-5 text-red-500" />}
                  title="Location Access"
                  description="Required for geo-fence check-in. The agent sends your coordinates only during check-in/check-out to verify you're at an approved office location."
                />
                <PermissionCard
                  icon={<Wifi className="h-5 w-5 text-blue-500" />}
                  title="Network Access"
                  description="Used for WiFi SSID verification as an additional location proof. Only the network name is checked — no traffic is monitored."
                />
                <PermissionCard
                  icon={<Clock className="h-5 w-5 text-orange-500" />}
                  title="Idle Detection"
                  description="Monitors system idle time (keyboard/mouse inactivity). Used to track productive hours and flag extended idle periods. No keystrokes or screen content are recorded."
                />
              </div>
            </SetupStep>

            {/* ── Step 4: Daily Usage ── */}
            <SetupStep
              number={4}
              title="Daily Usage"
              icon={<Clock className="h-5 w-5" />}
            >
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Once set up, the agent runs automatically in the background:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <h4 className="font-medium text-foreground mb-1">🟢 Auto Check-In</h4>
                    <p>When you arrive at an approved office location (verified via GPS + WiFi), the agent automatically records your check-in time.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <h4 className="font-medium text-foreground mb-1">🔴 Auto Check-Out</h4>
                    <p>When you leave the office or shut down your laptop, the agent records your check-out time.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <h4 className="font-medium text-foreground mb-1">📍 Periodic Geo-Ping</h4>
                    <p>Every 15 minutes, the agent sends a lightweight location ping to confirm your presence at the office.</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <h4 className="font-medium text-foreground mb-1">💤 Idle Tracking</h4>
                    <p>If your system is idle for more than 5 minutes, the agent logs an idle event. Extended idle periods (&gt;30 min) are flagged for review.</p>
                  </div>
                </div>
              </div>
            </SetupStep>

            {/* ── Step 5: Troubleshooting ── */}
            <SetupStep
              number={5}
              title="Troubleshooting"
              icon={<AlertCircle className="h-5 w-5" />}
            >
              <div className="space-y-3 text-sm">
                <TroubleshootItem
                  question="Agent icon not appearing in system tray?"
                  answer="Try restarting the application. On Windows, check the hidden icons area (▲ arrow in taskbar). On macOS, check System Settings → Login Items to ensure HRMS Agent is listed."
                />
                <TroubleshootItem
                  question="'Unable to connect' error?"
                  answer="Check your internet connection. If behind a corporate VPN or firewall, ensure *.supabase.co domains are whitelisted. Contact your IT admin if the issue persists."
                />
                <TroubleshootItem
                  question="Location not being detected?"
                  answer="Ensure location services are enabled in your OS settings. On macOS: System Settings → Privacy & Security → Location Services. On Windows: Settings → Privacy → Location."
                />
                <TroubleshootItem
                  question="Agent not auto-starting on boot?"
                  answer="Windows: Check Settings → Apps → Startup. macOS: System Settings → General → Login Items. Ensure HRMS Agent is enabled."
                />
                <TroubleshootItem
                  question="Need to reset your credentials?"
                  answer="Right-click the tray icon → 'Sign Out', then sign in again. This clears your stored credentials from the OS keychain and lets you re-authenticate."
                />
              </div>
            </SetupStep>
          </div>
        )}
      </div>

      {/* ════════ Admin: Upload Section ════════ */}
      {isAdmin && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload New Release
          </h2>
          <p className="text-sm text-muted-foreground">
            Build the desktop agent with <code className="px-1.5 py-0.5 bg-muted rounded text-xs">npm run build --workspace=apps/agent</code> (requires Rust toolchain), then upload the artifact here.
          </p>

          {message && (
            <div
              className={cn(
                'rounded-lg p-3 text-sm flex items-center gap-2',
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              )}
            >
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Version *</label>
              <input
                type="text"
                placeholder="e.g. 0.1.0"
                value={uploadForm.version}
                onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platform *</label>
              <select
                value={uploadForm.platform}
                onChange={(e) => setUploadForm({ ...uploadForm, platform: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="windows">Windows (.exe / .msi)</option>
                <option value="macos">macOS (.dmg)</option>
                <option value="linux">Linux (.deb / .AppImage)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Installer File *</label>
              <input
                type="file"
                accept=".exe,.msi,.dmg,.deb,.AppImage,.tar.gz,.zip"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Release Notes</label>
            <textarea
              placeholder="What's new in this version..."
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={uploadForm.isLatest}
                onChange={(e) => setUploadForm({ ...uploadForm, isLatest: e.target.checked })}
                className="rounded"
              />
              Mark as latest release
            </label>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {uploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Release
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════ All Releases Table ════════ */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileDown className="h-5 w-5" /> All Releases
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading releases...</p>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No releases uploaded yet</p>
            <p className="text-sm mt-1">
              {isAdmin
                ? 'Use the upload form above to add your first release.'
                : 'Your admin hasn\'t uploaded any releases yet. Check back later.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Platform</th>
                  <th className="pb-3 font-medium">Version</th>
                  <th className="pb-3 font-medium">Filename</th>
                  <th className="pb-3 font-medium">Size</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {releases.map((release) => {
                  const meta = PLATFORM_META[release.platform];
                  const PlatformIcon = meta.icon;
                  return (
                    <tr key={release.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <PlatformIcon className="h-4 w-4" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 font-mono">v{release.version}</td>
                      <td className="py-3 text-muted-foreground">{release.filename}</td>
                      <td className="py-3 text-muted-foreground">{formatBytes(release.file_size)}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(release.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {release.is_latest ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                            <Star className="h-3 w-3" /> Latest
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button
                          onClick={() => handleDownload(release)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        {isAdmin && !release.is_latest && (
                          <button
                            onClick={() => handleMarkLatest(release)}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition"
                            title="Mark as latest"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(release)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-100 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                            title="Delete release"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════ Build Instructions (Admin) ════════ */}
      {isAdmin && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-xl font-semibold">🔧 How to Build the Desktop Agent</h2>
          <div className="text-sm text-muted-foreground space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium text-foreground">Prerequisites</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Rust toolchain</strong> — Install from <a href="https://rustup.rs" target="_blank" rel="noopener noreferrer" className="text-primary underline">rustup.rs</a></li>
                <li><strong>Node.js 18+</strong> and npm</li>
                <li><strong>Tauri CLI</strong> — <code className="px-1.5 py-0.5 bg-muted rounded text-xs">cargo install tauri-cli</code></li>
                <li><strong>Platform-specific deps</strong>:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>Windows: Microsoft Visual Studio C++ Build Tools</li>
                    <li>macOS: Xcode Command Line Tools (<code className="px-1.5 py-0.5 bg-muted rounded text-xs">xcode-select --install</code>)</li>
                    <li>Linux: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">sudo apt install libwebkit2gtk-4.0-dev build-essential</code></li>
                  </ul>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium text-foreground">Build Commands</h3>
              <div className="space-y-2">
                <CodeBlock label="Navigate to agent directory" code="cd apps/agent" />
                <CodeBlock label="Build release binary" code="cargo tauri build" />
                <CodeBlock label="Output locations" code={`# Windows:  src-tauri/target/release/bundle/msi/*.msi\n#           src-tauri/target/release/bundle/nsis/*.exe\n# macOS:    src-tauri/target/release/bundle/dmg/*.dmg\n# Linux:    src-tauri/target/release/bundle/deb/*.deb\n#           src-tauri/target/release/bundle/appimage/*.AppImage`} />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                💡 <strong>Cross-compilation:</strong> You need to build on each target OS. Use GitHub Actions for automated multi-platform builds — see the <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs">.github/workflows/</code> directory for CI templates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Sub-components ───────────── */

function SetupStep({ number, title, icon, children }: {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
          {number}
        </span>
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="ml-11">{children}</div>
    </div>
  );
}

function PermissionCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function TroubleshootItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="font-medium text-foreground">{question}</p>
      <p className="text-muted-foreground mt-1">{answer}</p>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}
