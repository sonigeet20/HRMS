use crate::AppState;
use std::sync::{Arc, Mutex};

/// Monitors system idle time and reports idle events to the server.
/// Uses a simple polling approach — every 30 seconds, check system uptime vs last input.
/// On macOS, calls `ioreg` to get HIDIdleTime; on Linux, uses `xprintidle`; on Windows, uses GetLastInputInfo.
pub async fn start_idle_detection(state: Arc<Mutex<AppState>>) {
    let mut was_idle = false;
    let idle_threshold_secs: u64 = 300; // 5 minutes
    let mut idle_start: Option<std::time::Instant> = None;

    loop {
        tokio::time::sleep(std::time::Duration::from_secs(30)).await;

        let (checked_in, api_base, token) = {
            let s = state.lock().unwrap();
            (s.checked_in, s.api_base.clone(), s.access_token.clone())
        };

        if !checked_in {
            was_idle = false;
            idle_start = None;
            continue;
        }

        let idle_secs = get_system_idle_seconds().unwrap_or(0);

        if idle_secs >= idle_threshold_secs {
            if !was_idle {
                // Transition to idle
                was_idle = true;
                idle_start = Some(std::time::Instant::now());
                println!("[idle] System became idle ({} secs)", idle_secs);
            }
        } else if was_idle {
            // Transition from idle to active
            was_idle = false;
            let duration_secs = idle_start
                .map(|s| s.elapsed().as_secs())
                .unwrap_or(0);
            idle_start = None;

            if let Some(ref token) = token {
                let client = reqwest::Client::new();
                let payload = serde_json::json!({
                    "idle_duration_seconds": duration_secs,
                    "source": "AGENT",
                });

                let _ = client
                    .post(format!("{}/attendance-idle-event", api_base))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&payload)
                    .send()
                    .await;

                println!("[idle] Reported {} seconds of idle time", duration_secs);
            }
        }
    }
}

/// Gets the system idle time in seconds.
fn get_system_idle_seconds() -> Option<u64> {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("ioreg")
            .args(["-c", "IOHIDSystem"])
            .output()
            .ok()?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Find HIDIdleTime line
        for line in stdout.lines() {
            if line.contains("HIDIdleTime") {
                // Extract the number (nanoseconds)
                let parts: Vec<&str> = line.split('=').collect();
                if let Some(val_str) = parts.last() {
                    let val_str = val_str.trim().trim_end_matches('}').trim();
                    if let Ok(nanos) = val_str.parse::<u64>() {
                        return Some(nanos / 1_000_000_000);
                    }
                }
            }
        }
        None
    }

    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("xprintidle")
            .output()
            .ok()?;
        let ms: u64 = String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse()
            .ok()?;
        Some(ms / 1000)
    }

    #[cfg(target_os = "windows")]
    {
        // Placeholder — use winapi GetLastInputInfo in production
        Some(0)
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        None
    }
}
