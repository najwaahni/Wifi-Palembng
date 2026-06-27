/**
 * WiFi Data Layer - Palembang City
 * Menggunakan MongoDB Backend via REST API
 */

const API_BASE = 'http://localhost:3000/api';
const ADMIN_AUTH_KEY = 'palembang_admin_auth';

// ============================================
// WIFI DATA CRUD
// ============================================
async function getWifiData() {
    try {
        const res = await fetch(`${API_BASE}/wifi`);
        return await res.json();
    } catch (e) {
        console.error("Error fetching wifi data", e);
        return [];
    }
}

async function getWifiStats() {
    const data = await getWifiData();
    const aktif = data.filter(w => w.status === 'Aktif').length;
    return {
        total: data.length,
        aktif: aktif,
        tidakAktif: data.length - aktif
    };
}

async function addWifi(data, imageFile) {
    if (imageFile) {
        data.image = await fileToBase64(imageFile);
    }
    const res = await fetch(`${API_BASE}/wifi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function updateWifi(id, data, imageFile) {
    if (imageFile) {
        data.image = await fileToBase64(imageFile);
    }
    const res = await fetch(`${API_BASE}/wifi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

async function deleteWifi(id) {
    const res = await fetch(`${API_BASE}/wifi/${id}`, {
        method: 'DELETE'
    });
    return res.json();
}

async function getWifiById(id) {
    const data = await getWifiData();
    return data.find(w => w.id == id || w._id == id);
}

async function searchWifi(query) {
    const data = await getWifiData();
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(w =>
        (w.ssid && w.ssid.toLowerCase().includes(q)) ||
        (w.kelurahan && w.kelurahan.toLowerCase().includes(q)) ||
        (w.kecamatan && w.kecamatan.toLowerCase().includes(q)) ||
        (w.provider && w.provider.toLowerCase().includes(q)) ||
        (w.tags && w.tags.some(t => t.toLowerCase().includes(q)))
    );
}

// ============================================
// HELP REQUESTS (Bantuan/Kendala) CRUD
// ============================================
async function getHelpRequests() {
    try {
        const res = await fetch(`${API_BASE}/help-requests`);
        return await res.json();
    } catch (e) {
        console.error("Error fetching help requests", e);
        return [];
    }
}

async function addHelpRequest(request) {
    const res = await fetch(`${API_BASE}/help-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
    });
    return res.json();
}

async function replyHelpRequest(id, message) {
    const res = await fetch(`${API_BASE}/help-requests/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyMessage: message })
    });
    return res.json();
}

// ============================================
// HELPERS
// ============================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ============================================
// Admin Auth Functions
// ============================================
async function adminLogin(username, password, turnstileToken) {
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, turnstileToken })
        });

        const data = await res.json();
        if (data.success) {
            sessionStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify({ user: 'admin', email: 'admin@gmail.com', loggedIn: true, time: Date.now() }));
        }
        return data;
    } catch (e) {
        console.error('Admin login request failed', e);
        return { success: false, message: 'Gagal terhubung ke server.' };
    }
}

function isAdminLoggedIn() {
    const auth = sessionStorage.getItem(ADMIN_AUTH_KEY);
    return auth ? JSON.parse(auth).loggedIn : false;
}

function adminLogout() {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
}

function getAdminInfo() {
    const auth = sessionStorage.getItem(ADMIN_AUTH_KEY);
    return auth ? JSON.parse(auth) : null;
}

function getCategoryLabel(cat) {
    const map = { taman: 'Taman Kota', halte: 'Halte Transportasi', pasar: 'Pasar Tradisional', puskesmas: 'Puskesmas / Layanan Kesehatan', sekolah: 'Area Pendidikan', lainnya: 'Lainnya' };
    return map[cat] || cat;
}
