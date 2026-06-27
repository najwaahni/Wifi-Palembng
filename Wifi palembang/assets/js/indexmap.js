/* ============================================
   WiFi Gratis Palembang — Index Map Logic
   ============================================ */

// Inisialisasi peta
const map = L.map('map', { zoomControl: false }).setView([-2.976074, 104.775431], 14);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let allMarkers = [];
let currentFilter = 'all';

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadWifiCards() {
    let data = await getWifiData();
    const searchQuery = document.getElementById('userSearchInput').value.toLowerCase();

    // Search filter
    if (searchQuery) {
        data = data.filter(w =>
            w.ssid.toLowerCase().includes(searchQuery) ||
            w.kelurahan.toLowerCase().includes(searchQuery) ||
            w.kecamatan.toLowerCase().includes(searchQuery)
        );
    }

    // Category filter
    if (currentFilter !== 'all') {
        data = data.filter(w => {
            const s = w.ssid.toLowerCase();
            const t = (w.tags || []).map(x => x.toLowerCase());
            if (currentFilter === 'taman') return s.includes('taman') || s.includes('lapangan') || t.includes('taman');
            if (currentFilter === 'perpustakaan') return s.includes('perpustakaan') || t.includes('perpustakaan') || t.includes('pendidikan');
            if (currentFilter === 'halte') return s.includes('halte') || s.includes('stasiun') || s.includes('terminal') || t.includes('transportasi');
            return true;
        });
    }

    document.getElementById('locationCount').textContent = `Menemukan ${data.length} titik akses`;

    // Clear markers
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];

    // Render cards
    const container = document.getElementById('wifiCardList');
    container.innerHTML = data.map(wifi => {
        const isActive = wifi.status === 'Aktif';
        let images = [];
        if (wifi.image) {
            try {
                const parsed = JSON.parse(wifi.image);
                if (Array.isArray(parsed)) images = parsed;
                else images = [wifi.image];
            } catch(e) { images = [wifi.image]; }
        }
        
        let imgHtml = '';
        if (images.length > 0) {
            window.wifiImagesData = window.wifiImagesData || {};
            window.wifiImagesData[wifi.id] = { images: images, currentIndex: 0 };
            const hasMultiple = images.length > 1;
            const btnStyle = "position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;";
            const prevBtn = hasMultiple ? `<button onclick="changeWifiImage('${wifi.id}', -1, event)" style="${btnStyle} left:8px;"><span class="material-symbols-outlined" style="font-size:16px;">chevron_left</span></button>` : '';
            const nextBtn = hasMultiple ? `<button onclick="changeWifiImage('${wifi.id}', 1, event)" style="${btnStyle} right:8px;"><span class="material-symbols-outlined" style="font-size:16px;">chevron_right</span></button>` : '';
            
            imgHtml = `
                <div style="position:relative; width:100%;" class="mb-3">
                    ${prevBtn}
                    <img id="img-card-${wifi.id}" src="${images[0]}" class="w-full h-32 object-cover rounded-md" alt="Foto ${escapeHtml(wifi.ssid)}">
                    ${nextBtn}
                    ${hasMultiple ? `<div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); color:white; padding:2px 6px; border-radius:10px; font-size:10px; pointer-events:none;" id="badge-card-${wifi.id}">1/${images.length}</div>` : ''}
                </div>
            `;
        }
        return `
            <div data-lat="${wifi.lat}" data-lng="${wifi.lng}" class="wifi-card ${isActive
                ? 'bg-white/90 backdrop-blur-sm p-md rounded-lg border border-white/60 hover:border-primary transition-all cursor-pointer group shadow-sm'
                : 'bg-white/50 backdrop-blur-sm p-md rounded-lg border border-white/20 opacity-75 grayscale hover:grayscale-0 transition-all cursor-pointer shadow-sm'}">
                ${imgHtml}
                <div class="flex justify-between items-start mb-sm">
                    <div>
                        <h3 class="font-bold text-base ${isActive ? 'group-hover:text-primary transition-colors' : ''}">${escapeHtml(wifi.ssid)}</h3>
                        <p class="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                            <span class="material-symbols-outlined text-[14px]">location_on</span>
                            ${escapeHtml(wifi.kecamatan)}
                        </p>
                    </div>
                    <span class="${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">${wifi.status}</span>
                </div>
                <div class="flex gap-md">
                    ${isActive ? `
                        <button onclick="event.stopPropagation(); window.open('https://www.google.com/maps/dir/?api=1&destination=${wifi.lat},${wifi.lng}', '_blank')" class="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors">
                            <span class="material-symbols-outlined text-[18px]">directions</span> Petunjuk Arah
                        </button>
                        <button class="p-2 border border-outline-variant rounded-lg text-primary hover:bg-white/60 transition-colors">
                            <span class="material-symbols-outlined text-[18px]">info</span>
                        </button>
                    ` : `
                        <button class="flex-1 bg-gray-400 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed text-center">
                            Tidak Tersedia
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');

    // Add markers
    data.forEach(wifi => {
        if (wifi.lat && wifi.lng) {
            const marker = L.marker([wifi.lat, wifi.lng]).addTo(map);
            const statusColor = wifi.status === 'Aktif' ? 'green' : 'orange';
            const statusText = wifi.status === 'Aktif' ? '● Aktif' : '⏳ Tidak Aktif';
            let images = [];
            if (wifi.image) {
                try {
                    const parsed = JSON.parse(wifi.image);
                    if (Array.isArray(parsed)) images = parsed;
                    else images = [wifi.image];
                } catch(e) { images = [wifi.image]; }
            }
            let imgHtml = '';
            if (images.length > 0) {
                const hasMultiple = images.length > 1;
                const btnStyle = "position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; width:20px; height:20px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; padding:0;";
                const prevBtn = hasMultiple ? `<button onclick="changeWifiImage('${wifi.id}', -1, event)" style="${btnStyle} left:4px;"><span class="material-symbols-outlined" style="font-size:14px;">chevron_left</span></button>` : '';
                const nextBtn = hasMultiple ? `<button onclick="changeWifiImage('${wifi.id}', 1, event)" style="${btnStyle} right:4px;"><span class="material-symbols-outlined" style="font-size:14px;">chevron_right</span></button>` : '';
                
                imgHtml = `
                    <div style="position:relative; width:100%; margin-bottom:8px;">
                        ${prevBtn}
                        <img id="img-popup-${wifi.id}" src="${images[0]}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;display:block;">
                        ${nextBtn}
                        ${hasMultiple ? `<div style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.6); color:white; padding:2px 4px; border-radius:8px; font-size:9px; pointer-events:none;" id="badge-popup-${wifi.id}">1/${images.length}</div>` : ''}
                    </div>
                `;
            }
            marker.bindPopup(`<div style='font-family:Inter,sans-serif;min-width:180px;'>${imgHtml}<b>${escapeHtml(wifi.ssid)}</b><br><span style='color:${statusColor};'>${statusText}</span><br>Kecepatan: ${wifi.downloadSpeed ? 'Up to ' + wifi.downloadSpeed + ' Mbps' : 'N/A'}</div>`);
            allMarkers.push(marker);
        }
    });

    // Card click → fly to location
    document.querySelectorAll('.wifi-card').forEach(card => {
        card.addEventListener('click', () => {
            const lat = parseFloat(card.dataset.lat);
            const lng = parseFloat(card.dataset.lng);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
                const name = card.querySelector('h3')?.textContent?.trim();
                if (name) {
                    allMarkers.forEach(m => {
                        if (m.getPopup() && m.getPopup().getContent().includes(name)) m.openPopup();
                    });
                }
            }
        });
    });
}

// Search
document.getElementById('userSearchInput').addEventListener('input', loadWifiCards);

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.className = 'filter-btn bg-white/80 text-on-surface-variant px-4 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-white transition-colors';
        });
        btn.className = 'filter-btn bg-primary text-white px-4 py-1.5 rounded-full text-xs whitespace-nowrap';
        loadWifiCards();
    });
});

// Initial load
async function initMapApp() {
    loadWifiCards();
}

initMapApp();

window.changeWifiImage = function(wifiId, step, event) {
    if(event) {
        event.stopPropagation();
    }
    const data = window.wifiImagesData[wifiId];
    if(!data) return;
    data.currentIndex += step;
    if(data.currentIndex >= data.images.length) data.currentIndex = 0;
    if(data.currentIndex < 0) data.currentIndex = data.images.length - 1;
    
    const newSrc = data.images[data.currentIndex];
    
    // Update card
    const imgCard = document.getElementById(`img-card-${wifiId}`);
    if(imgCard) imgCard.src = newSrc;
    const badgeCard = document.getElementById(`badge-card-${wifiId}`);
    if(badgeCard) badgeCard.textContent = `${data.currentIndex + 1}/${data.images.length}`;
    
    // Update popup
    const imgPopup = document.getElementById(`img-popup-${wifiId}`);
    if(imgPopup) imgPopup.src = newSrc;
    const badgePopup = document.getElementById(`badge-popup-${wifiId}`);
    if(badgePopup) badgePopup.textContent = `${data.currentIndex + 1}/${data.images.length}`;
};
