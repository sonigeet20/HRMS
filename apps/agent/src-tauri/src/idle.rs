use crate::AppState;
use std::sync::{Arc, Mutex};

/// Monitors system idle time and reports idle events to the server.
/// Uses a simple polling approach — every 30 seconds, check system uptime vs last input.
/// On macOS, calls `ioreg` to get HIDIdleTime; on Linux, uses `xprintidle`; on Windows, uses GetLastInputInfo.
pub async fn start_idle_detection(state: Arc<Mutex<AppState>>) {
    let mut was_idle = false;
    let idle_threshold_secs: u64 = 300; // 5 minutes
    let mut idle_start: Option<(std::time::Instant, chrono::DateTime<chrono::Utc>)> = None;

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
                // Transition to idle — record both monotonic and wall-clock time
                was_idle = true;
                idle_start = Some((std::time::Instant::now(), chrono::Utc::now()));
                println!("[idle] System became idle ({} secs)", idle_secs);
            }
        } else if was_idle {
            // Transition from idle to active
            was_idle = false;
            let (duration_secs, started_at_iso) = idle_start
                .map(|(inst, wall)| (inst.elapsed().as_secs(), wall.to_rfc3339()))
                .unwrap_or((0, chrono::Utc::now().to_rfc3339()));
            idle_start = None;

            // Convert seconds to minutes (round up so short idles still register)
            let idle_minutes = ((duration_secs as f64) / 60.0).ceil() as u64;

            if let Some(ref token) = token {
                let client = reqwest::Client::new();
                let payload = serde_json::json!({
                    "idle_minutes": idle_minutes,
                    "started_at": started_at_iso,
                });

                match client
                    .post(format!("{}/attendance-idle-event", api_base))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&payload)
                    .send()
                    .await
                {
                    Ok(res) if res.status() == reqwest::StatusCode::UNAUTHORIZED => {
                        eprintln!("[idle] 401 Unauthorized — attempting token refresh");
                        if crate::refresh_auth_token(&state).await {
                            let new_token = state.lock().unwrap().access_token.clone().unwrap_or_default();
                            let _ = client
                                .post(format!("{}/attendance-idle-event", api_base))
                                .header("Authorization", format!("Bearer {}", new_token))
                                .json(&payload)
                                .send()
                                .await;
                        }
                    }
                    _ => {}
                }

                println!("[idle] Reported {} minutes of idle time (started at {})", idle_minutes, started_at_iso);
            }
        }
    }
}

/// Gets the system idle time in seconds.
pub fn get_system_idle_seconds() -> Option<u64> {
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
