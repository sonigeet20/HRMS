use keyring::Entry;

const SERVICE: &str = "hrms-agent";
const USER_ACCESS: &str = "access_token";
const USER_REFRESH: &str = "refresh_token";

pub fn save_token(token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER_ACCESS).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())
}

pub fn load_token() -> Result<String, String> {
    let entry = Entry::new(SERVICE, USER_ACCESS).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

pub fn delete_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER_ACCESS).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}

pub fn save_refresh_token(token: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER_REFRESH).map_err(|e| e.to_string())?;
    entry.set_password(token).map_err(|e| e.to_string())
}

pub fn load_refresh_token() -> Result<String, String> {
    let entry = Entry::new(SERVICE, USER_REFRESH).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

pub fn delete_refresh_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE, USER_REFRESH).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}
