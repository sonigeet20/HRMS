use crate::AppState;
use std::sync::{Arc, Mutex};

/// Sends a location/heartbeat ping to the server every 2 minutes while checked in.
pub async fn start_ping_loop(state: Arc<Mutex<AppState>>) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(120)).await;

        let (checked_in, api_base, token) = {
            let s = state.lock().unwrap();
            (s.checked_in, s.api_base.clone(), s.access_token.clone())
        };

        if !checked_in {
            break;
        }

        if let Some(token) = token {
            let client = reqwest::Client::new();
            let idle_secs = crate::idle::get_system_idle_seconds().unwrap_or(0);
            let payload = serde_json::json!({
                "idle_seconds": idle_secs as i64,
            });

            match client
                .post(format!("{}/attendance-ping", api_base))
                .header("Authorization", format!("Bearer {}", token))
                .json(&payload)
                .send()
                .await
            {
                Ok(res) if res.status().is_success() => {
                    println!("[ping] OK at {}", chrono::Local::now().format("%H:%M:%S"));
                }
                Ok(res) if res.status() == reqwest::StatusCode::UNAUTHORIZED => {
                    eprintln!("[ping] 401 Unauthorized — attempting token refresh");
                    if crate::refresh_auth_token(&state).await {
                        // Retry with new token
                        let new_token = state.lock().unwrap().access_token.clone().unwrap_or_default();
                        let _ = client
                            .post(format!("{}/attendance-ping", api_base))
                            .header("Authorization", format!("Bearer {}", new_token))
                            .json(&payload)
                            .send()
                            .await;
                    }
                }
                Ok(res) => {
                    eprintln!("[ping] Server returned {}", res.status());
                }
                Err(e) => {
                    eprintln!("[ping] Error: {}", e);
                }
            }
        }
    }
}
