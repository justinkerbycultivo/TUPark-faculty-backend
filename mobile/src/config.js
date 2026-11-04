// ---------------------------------------------------------------------------
// API_BASE_URL — Expo Go runs on your PHONE, so "localhost" would refer to
// the phone itself, not your development machine. Set this to your
// computer's LAN IP address (run `ipconfig` on Windows or `ifconfig` /
// `ip addr` on Mac/Linux to find it) so your phone can reach the backend,
// e.g. "http://192.168.1.23:5000". Your phone and computer must be on the
// same Wi-Fi network. Do NOT point this at localhost/127.0.0.1 and do NOT
// invent a fake production domain — this is a placeholder LAN IP for local
// development/testing with Expo Go only.
// ---------------------------------------------------------------------------
export const API_BASE_URL = 'http://192.168.254.111:5000';

export const API_URL = `${API_BASE_URL}/api`;
