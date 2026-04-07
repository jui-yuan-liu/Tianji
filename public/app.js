// --- Auth Handling ---
const API_URL = '/api';

function getToken() {
    return localStorage.getItem('tianji_token');
}

function setToken(token) {
    localStorage.setItem('tianji_token', token);
}

function logout() {
    localStorage.removeItem('tianji_token');
    window.location.href = '/';
}

async function fetchMe() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            console.log("Fetched User Profile:", data);
            return data;
        } else {
            console.error("Failed to fetch me, status:", res.status);
            localStorage.removeItem('tianji_token');
            return null;
        }
    } catch (err) {
        console.error("Fetch Me Error:", err);
        return null;
    }
}
