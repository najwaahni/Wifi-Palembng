require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 2. Access the secret securely via process.env
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY; 

app.post('/submit-form', async (req, res) => {
    const token = req.body['cf-turnstile-response'];
    
    if (!token) {
        return res.status(400).json({ success: false, message: "CAPTCHA token missing." });
    }

    try {
        const cloudflareResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET_KEY, // Used securely here
                response: token
            })
        });

        const result = await cloudflareResponse.json();

        if (result.success) {
            return res.send("Verified successfully!");
        } else {
            return res.status(400).send("Verification failed.");
        }
    } catch (error) {
        return res.status(500).send("Internal Server Error.");
    }
});

// Using PORT from .env, fallback to 3000 if not defined
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    // ============================================================
    // AUTH CHECK
    // ============================================================
    if (!isAdminLoggedIn()) {
        window.location.href = 'login.html';
    }
    const adminInfo = getAdminInfo();
    if (adminInfo) {
        document.getElementById('sidebarUserName').textContent = adminInfo.user;
        document.getElementById('sidebarUserEmail').textContent = adminInfo.email;
    }

    // ============================================================
    // STATE
    // ============================================================
    let currentPage = 1;
    const perPage = 8;
    let filteredData = [];
    let editingId = null;
    let deleteId = null;
    let tags = [];
    let adminMap = null;
    let mapMarkers = [];
    let currentProposalFilter = 'pending';
    let currentImages = [];
    let modalMap = null;
    let modalMarker = null;

    // ============================================================
    // VIEW SWITCHING
    // ============================================================
    function switchView(viewName, linkEl) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        const target = document.getElementById('view-' + viewName);
        if (target) target.classList.add('active');

        document.querySelectorAll('.sidebar-links a').forEach(l => l.classList.remove('active'));
        if (linkEl) linkEl.classList.add('active');

        if (viewName === 'dashboard') { loadOverview(); loadMapMarkers(); }
        if (viewName === 'daftar-lokasi') { renderLocationGrid(); }
        if (viewName === 'kelola-wifi') { currentPage = 1; loadTable(); }
        if (viewName === 'usulan-masuk') { currentProposalFilter = 'pending'; renderProposals(); }
        if (viewName === 'usulan-disetujui') { renderFilteredProposals('approved', 'approvedList'); }
        if (viewName === 'usulan-ditolak') { renderFilteredProposals('rejected', 'rejectedList'); }
        if (viewName === 'bantuan-masuk') { renderHelpRequests(); }

        if (viewName === 'dashboard' && adminMap) {
            setTimeout(() => adminMap.invalidateSize(), 100);
        }

        document.querySelector('.sidebar').classList.remove('open');
    }

    function toggleSection(el) {
        el.closest('.sidebar-section').classList.toggle('open');
    }

    async function loadOverview() {
        const stats = await getWifiStats();
        document.getElementById('totalWifi').innerHTML = `${stats.total} <span>Wifi</span>`;
        document.getElementById('totalAktif').innerHTML = `${stats.aktif} <span>Wifi</span>`;
        document.getElementById('totalTidakAktif').innerHTML = `${stats.tidakAktif} <span>Wifi</span>`;
        document.getElementById('subAktif').textContent = `Dari ${stats.total} Wifi terdaftar`;
        document.getElementById('subTidakAktif').textContent = `Dari ${stats.total} Wifi terdaftar`;
    }

    function initMap() {
        adminMap = L.map('admin-map', { zoomControl: true }).setView([-2.976074, 104.775431], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(adminMap);
        loadMapMarkers();
    }

    async function loadMapMarkers() {
        mapMarkers.forEach(m => adminMap.removeLayer(m));
        mapMarkers = [];
        const data = await getWifiData();

        data.forEach(wifi => {
            if (wifi.lat && wifi.lng) {
                const marker = L.marker([wifi.lat, wifi.lng]).addTo(adminMap);
                const statusColor = wifi.status === 'Aktif' ? 'green' : 'orange';
                const statusText = wifi.status === 'Aktif' ? '● Aktif' : '⏳ Tidak Aktif';
                
                let imgSrc = '';
                if (wifi.image) {
                    try {
                        const parsed = JSON.parse(wifi.image);
                        if (Array.isArray(parsed) && parsed.length > 0) imgSrc = parsed[0];
                        else imgSrc = wifi.image;
                    } catch(e) { imgSrc = wifi.image; }
                }
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:8px;">` : '';

                marker.bindPopup(`
                    <div style="font-family:Inter,sans-serif;min-width:180px;">
                        ${imgHtml}
                        <b style="font-size:14px;">${escHtml(wifi.ssid)}</b><br>
                        <span style="color:${statusColor};font-size:12px;font-weight:600;">${statusText}</span><br>
                        <span style="color:#666;font-size:12px;">${escHtml(wifi.kelurahan)}, ${escHtml(wifi.kecamatan)}</span><br>
                        <span style="color:#666;font-size:12px;">Kecepatan: ${wifi.downloadSpeed ? 'Up to ' + wifi.downloadSpeed + ' Mbps' : 'N/A'}</span>
                    </div>
                `);
                mapMarkers.push(marker);
            }
        });
    }

    async function renderLocationGrid() {
        const query = document.getElementById('locationSearchInput').value.toLowerCase();
        let data = await getWifiData();
        if (query) {
            data = data.filter(w =>
                w.ssid.toLowerCase().includes(query) ||
                w.kelurahan.toLowerCase().includes(query) ||
                w.kecamatan.toLowerCase().includes(query)
            );
        }

        const grid = document.getElementById('locationGrid');
        if (data.length === 0) {
            grid.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">location_off</span><h3>Tidak ada lokasi ditemukan</h3><p>Coba ubah kata kunci pencarian</p></div>`;
            return;
        }

        grid.innerHTML = data.map(w => {
            let imgSrc = '';
            if (w.image) {
                try {
                    const parsed = JSON.parse(w.image);
                    if (Array.isArray(parsed) && parsed.length > 0) imgSrc = parsed[0];
                    else imgSrc = w.image;
                } catch(e) { imgSrc = w.image; }
            }
            let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:12px;">` : '';
            return `
            <div class="location-card">
                ${imgHtml}
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <h4>${escHtml(w.ssid)}</h4>
                    <span class="status-badge ${w.status === 'Aktif' ? 'aktif' : 'tidak-aktif'}">${w.status}</span>
                </div>
                <div class="loc-detail"><span class="material-symbols-outlined">person</span> PIC: ${escHtml(w.pic)}</div>
                <div class="loc-detail"><span class="material-symbols-outlined">location_on</span> ${escHtml(w.kelurahan)}, ${escHtml(w.kecamatan)}</div>
                <div class="loc-detail"><span class="material-symbols-outlined">wifi</span> ${escHtml(w.provider)} • ${w.bandwidth || '-'}</div>
                <div class="loc-detail"><span class="material-symbols-outlined">speed</span> ↓ ${w.downloadSpeed || 0} Mbps / ↑ ${w.uploadSpeed || 0} Mbps</div>
                ${w.deskripsi ? `<p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">${escHtml(w.deskripsi)}</p>` : ''}
            </div>
            `;
        }).join('');
    }

    async function loadTable(query) {
        filteredData = query ? await searchWifi(query) : await getWifiData();
        renderTable();
    }

    function renderTable() {
        const tbody = document.getElementById('tableBody');
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const pageData = filteredData.slice(start, end);

        tbody.innerHTML = pageData.map(wifi => {
            let imgSrc = '';
            if (wifi.image) {
                try {
                    const parsed = JSON.parse(wifi.image);
                    if (Array.isArray(parsed) && parsed.length > 0) imgSrc = parsed[0];
                    else imgSrc = wifi.image;
                } catch(e) { imgSrc = wifi.image; }
            }
            return `
            <tr>
                <td class="ssid-cell">
                    <div style="display:flex;align-items:center;gap:8px;">
                        ${imgSrc ? `<img src="${imgSrc}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;">` : `<div style="width:32px;height:32px;border-radius:4px;background:#eee;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:16px;color:#aaa;">wifi</span></div>`}
                        ${escHtml(wifi.ssid)}
                    </div>
                </td>
                <td>${escHtml(wifi.pic)}</td>
                <td>${escHtml(wifi.kelurahan)}</td>
                <td>${escHtml(wifi.kecamatan)}</td>
                <td>${escHtml(wifi.provider)}</td>
                <td><span class="status-badge ${wifi.status === 'Aktif' ? 'aktif' : 'tidak-aktif'}">${wifi.status}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="row-action-btn" title="Edit" onclick="openEditModal(${wifi.id})">
                            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
                        </button>
                        <button class="row-action-btn delete" title="Hapus" onclick="openConfirm(${wifi.id})">
                            <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        const total = filteredData.length;
        const showing = Math.min(end, total);
        document.getElementById('pageInfo').textContent = `Menampilkan ${total > 0 ? start + 1 : 0}-${showing} dari ${total} Wifi`;
        renderPagination();
    }

    function renderPagination() {
        const totalPages = Math.ceil(filteredData.length / perPage);
        const pagination = document.getElementById('pagination');
        let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})"><span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span></button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 7) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    html += `<button disabled>...</button>`;
                }
            } else {
                html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
            }
        }
        html += `<button ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})"><span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span></button>`;
        pagination.innerHTML = html;
    }

    function goToPage(page) {
        const totalPages = Math.ceil(filteredData.length / perPage);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        renderTable();
    }

    function handleSearch() {
        currentPage = 1;
        loadTable(document.getElementById('searchInput').value);
    }

    function openAddModal() {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Tambah WiFi';
        document.getElementById('wifiForm').reset();
        document.getElementById('formWifiId').value = '';
        document.getElementById('formAlamat').value = '';
        tags = [];
        currentImages = [];
        renderTags();
        renderImageGrid();
        document.getElementById('wifiModal').classList.add('active');
        initModalMap(-2.9760, 104.7754);
    }

    async function openEditModal(id) {
        editingId = id;
        const wifi = await getWifiById(id);
        if (!wifi) return;
        document.getElementById('modalTitle').textContent = 'Edit WiFi';
        document.getElementById('formWifiId').value = id;
        document.getElementById('formSsid').value = wifi.ssid || '';
        document.getElementById('formPic').value = wifi.pic || '';
        document.getElementById('formBandwidth').value = wifi.bandwidth || '';
        document.getElementById('formDownload').value = wifi.downloadSpeed || '';
        document.getElementById('formUpload').value = wifi.uploadSpeed || '';
        document.getElementById('formDeskripsi').value = wifi.deskripsi || '';
        document.getElementById('formProvider').value = wifi.provider || '';
        document.getElementById('formStatus').value = wifi.status || 'Aktif';
        document.getElementById('formKelurahan').value = wifi.kelurahan || '';
        document.getElementById('formKecamatan').value = wifi.kecamatan || '';
        document.getElementById('formAlamat').value = wifi.alamat || '';
        document.getElementById('formLat').value = wifi.lat || '';
        document.getElementById('formLng').value = wifi.lng || '';
        
        currentImages = [];
        if (wifi.image) {
            try {
                const parsed = JSON.parse(wifi.image);
                if (Array.isArray(parsed)) currentImages = parsed;
                else currentImages = [wifi.image];
            } catch(e) {
                currentImages = [wifi.image];
            }
        }
        renderImageGrid();

        tags = wifi.tags ? [...wifi.tags] : [];
        renderTags();
        document.getElementById('wifiModal').classList.add('active');
        initModalMap(wifi.lat || -2.9760, wifi.lng || 104.7754);
    }

    function closeModal() {
        document.getElementById('wifiModal').classList.remove('active');
        editingId = null;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = {
            ssid: document.getElementById('formSsid').value.trim(),
            pic: document.getElementById('formPic').value.trim(),
            bandwidth: document.getElementById('formBandwidth').value.trim(),
            downloadSpeed: parseInt(document.getElementById('formDownload').value) || 0,
            uploadSpeed: parseInt(document.getElementById('formUpload').value) || 0,
            deskripsi: document.getElementById('formDeskripsi').value.trim(),
            provider: document.getElementById('formProvider').value.trim(),
            status: document.getElementById('formStatus').value,
            kelurahan: document.getElementById('formKelurahan').value.trim(),
            kecamatan: document.getElementById('formKecamatan').value.trim(),
            alamat: document.getElementById('formAlamat').value.trim(),
            lat: parseFloat(document.getElementById('formLat').value),
            lng: parseFloat(document.getElementById('formLng').value),
            tags: [...tags],
            image: currentImages.length > 0 ? JSON.stringify(currentImages) : null
        };

        if (editingId) {
            await updateWifi(editingId, formData, null);
            showToast('WiFi berhasil diperbarui!', 'success');
        } else {
            await addWifi(formData, null);
            showToast('WiFi baru berhasil ditambahkan!', 'success');
        }
        closeModal();
        refreshAll();
    }

    // Modal Map Handling
    function initModalMap(lat, lng) {
        if (!modalMap) {
            modalMap = L.map('modalMap').setView([lat, lng], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(modalMap);
            modalMap.on('click', function(e) {
                document.getElementById('formLat').value = e.latlng.lat;
                document.getElementById('formLng').value = e.latlng.lng;
                if (modalMarker) modalMarker.setLatLng(e.latlng);
                else modalMarker = L.marker(e.latlng).addTo(modalMap);
            });
        } else {
            modalMap.setView([lat, lng], 13);
        }
        
        if (modalMarker) {
            modalMarker.setLatLng([lat, lng]);
        } else {
            modalMarker = L.marker([lat, lng]).addTo(modalMap);
        }
        setTimeout(() => modalMap.invalidateSize(), 100);
    }

    // Multi Image Handling
    function handleImageSelect(e) {
        const files = Array.from(e.target.files);
        if (currentImages.length + files.length > 10) {
            alert('Maksimal 10 foto!');
            return;
        }
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentImages.push(event.target.result);
                renderImageGrid();
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    }

    function removeImage(index) {
        currentImages.splice(index, 1);
        renderImageGrid();
    }

    function renderImageGrid() {
        document.querySelectorAll('.img-preview-wrapper').forEach(el => el.remove());
        const uploadBox = document.getElementById('uploadBox');
        document.getElementById('imgCount').textContent = currentImages.length;
        
        currentImages.forEach((src, idx) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'img-preview-wrapper';
            wrapper.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px;';
            wrapper.innerHTML = `
                <img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:8px; border:1px solid #ccc;">
                <button type="button" onclick="removeImage(${idx})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:20px; height:20px; border:none; cursor:pointer; font-size:12px; line-height:1; padding:0;">&times;</button>
            `;
            document.getElementById('imagePreviewGrid').insertBefore(wrapper, uploadBox);
        });
        
        uploadBox.style.display = currentImages.length >= 10 ? 'none' : 'flex';
    }

    document.getElementById('tagsInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = this.value.trim().replace(/,/g, '');
            if (val && !tags.includes(val)) { tags.push(val); renderTags(); }
            this.value = '';
        }
    });

    function renderTags() {
        const container = document.getElementById('tagsContainer');
        const input = document.getElementById('tagsInput');
        container.querySelectorAll('.tag').forEach(t => t.remove());
        tags.forEach((tag, i) => {
            const el = document.createElement('span');
            el.className = 'tag';
            el.innerHTML = `${escHtml(tag)}<span class="remove-tag" onclick="removeTag(${i})">&times;</span>`;
            container.insertBefore(el, input);
        });
    }

    function removeTag(index) { tags.splice(index, 1); renderTags(); }

    async function openConfirm(id) {
        deleteId = id;
        const wifi = await getWifiById(id);
        document.getElementById('confirmText').textContent = `Apakah Anda yakin ingin menghapus "${wifi ? wifi.ssid : ''}"?`;
        document.getElementById('confirmDelete').classList.add('active');
    }
    
    function closeConfirm() { document.getElementById('confirmDelete').classList.remove('active'); deleteId = null; }
    
    async function confirmDeleteAction() {
        if (deleteId) { 
            await deleteWifi(deleteId); 
            showToast('WiFi berhasil dihapus!', 'success'); 
            closeConfirm(); 
            refreshAll(); 
        }
    }

    async function renderProposals() {
        const pStats = await getProposalStats();
        document.getElementById('pendingBadge').textContent = pStats.pending;
        document.getElementById('pendingBadge').style.display = pStats.pending > 0 ? 'inline' : 'none';

        document.getElementById('proposalOverview').innerHTML = `
            <div class="overview-card"><div class="card-label">Total Usulan</div><div class="card-value">${pStats.total}</div></div>
            <div class="overview-card"><div class="card-label" style="color:var(--warning)">Menunggu</div><div class="card-value">${pStats.pending}</div></div>
            <div class="overview-card aktif"><div class="card-label">Disetujui</div><div class="card-value">${pStats.approved}</div></div>
            <div class="overview-card tidak-aktif"><div class="card-label">Ditolak</div><div class="card-value">${pStats.rejected}</div></div>
        `;

        document.getElementById('tabPending').textContent = pStats.pending;
        document.getElementById('tabAll').textContent = pStats.total;

        let proposals = await getProposals();
        if (currentProposalFilter !== 'all') {
            proposals = proposals.filter(p => p.status === currentProposalFilter);
        }
        proposals.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        const container = document.getElementById('proposalList');
        if (proposals.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">inbox</span><h3>Tidak ada usulan</h3><p>Belum ada usulan ${currentProposalFilter === 'pending' ? 'yang menunggu tinjauan' : ''}</p></div>`;
            return;
        }

        container.innerHTML = proposals.map(p => renderProposalCard(p)).join('');
    }

    function renderProposalCard(p) {
        const date = new Date(p.submittedAt);
        const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="proposal-card">
                <div class="proposal-header">
                    <div>
                        <h3>${escHtml(p.locationName)}</h3>
                        <span class="status-pill ${p.status}">${p.status === 'pending' ? 'Menunggu' : p.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span>
                    </div>
                    <span class="proposal-date">${dateStr}, ${timeStr}</span>
                </div>
                <div class="proposal-meta">
                    <div class="proposal-meta-item"><span class="material-symbols-outlined">category</span> ${getCategoryLabel(p.category)}</div>
                    <div class="proposal-meta-item"><span class="material-symbols-outlined">location_on</span> ${escHtml(p.address)}</div>
                </div>
                <div class="proposal-reason">${escHtml(p.reason)}</div>
                <div class="proposal-actions">
                    ${p.status === 'pending' ? `
                        <button class="btn btn-primary btn-sm" onclick="handleProposalAction(${p.id}, 'approved')">
                            <span class="material-symbols-outlined" style="font-size:16px;">check</span> Setujui
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="handleProposalAction(${p.id}, 'rejected')">
                            <span class="material-symbols-outlined" style="font-size:16px;">close</span> Tolak
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" onclick="handleProposalAction(${p.id}, 'pending')">
                            <span class="material-symbols-outlined" style="font-size:16px;">undo</span> Kembalikan ke Menunggu
                        </button>
                    `}
                    <button class="btn btn-outline btn-sm" onclick="deleteProposalItem(${p.id})" style="margin-left:auto;">
                        <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Hapus
                    </button>
                </div>
            </div>
        `;
    }

    async function handleProposalAction(id, status) {
        await updateProposalStatus(id, status);
        const label = status === 'approved' ? 'disetujui' : status === 'rejected' ? 'ditolak' : 'dikembalikan';
        showToast(`Usulan berhasil ${label}!`, 'success');
        renderProposals();
    }

    async function deleteProposalItem(id) {
        await deleteProposal(id);
        showToast('Usulan berhasil dihapus!', 'success');
        renderProposals();
    }

    function filterProposals(filter, btn) {
        currentProposalFilter = filter;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProposals();
    }

    async function renderFilteredProposals(status, containerId) {
        let proposals = await getProposals();
        proposals = proposals.filter(p => p.status === status);
        proposals.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        const container = document.getElementById(containerId);
        if (proposals.length === 0) {
            const label = status === 'approved' ? 'disetujui' : 'ditolak';
            container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">inbox</span><h3>Belum ada usulan ${label}</h3><p>Usulan yang telah ${label} akan muncul di sini</p></div>`;
            return;
        }
        container.innerHTML = proposals.map(p => renderProposalCard(p)).join('');
    }

    async function refreshAll() {
        await loadOverview();
        await loadTable(document.getElementById('searchInput').value);
        await loadMapMarkers();
        const pStats = await getProposalStats();
        document.getElementById('pendingBadge').textContent = pStats.pending;
        document.getElementById('pendingBadge').style.display = pStats.pending > 0 ? 'inline' : 'none';
        await renderHelpRequests();
    }

    // ============================================================
    // HELP REQUESTS
    // ============================================================
    async function renderHelpRequests() {
        const helps = await getHelpRequests();
        const waitingCount = helps.filter(h => h.status === 'waiting').length;
        
        document.getElementById('helpBadge').textContent = waitingCount;
        document.getElementById('helpBadge').style.display = waitingCount > 0 ? 'inline' : 'none';

        const container = document.getElementById('helpList');
        if (helps.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">inbox</span><h3>Tidak ada laporan</h3><p>Belum ada laporan bantuan yang masuk</p></div>`;
            return;
        }

        container.innerHTML = helps.map(h => {
            const date = new Date(h.submittedAt);
            const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            
            return `
                <div class="proposal-card" style="border-left: 4px solid ${h.status === 'waiting' ? '#dc2626' : '#059669'}">
                    <div class="proposal-header">
                        <div>
                            <h3>Laporan dari: ${escHtml(h.name)}</h3>
                            <span class="status-pill ${h.status === 'waiting' ? 'rejected' : 'approved'}">
                                ${h.status === 'waiting' ? 'Menunggu Balasan' : 'Selesai'}
                            </span>
                        </div>
                        <span class="proposal-date">${dateStr}</span>
                    </div>
                    <div class="proposal-meta">
                        <div class="proposal-meta-item"><span class="material-symbols-outlined">mail</span> ${escHtml(h.email)}</div>
                        <div class="proposal-meta-item"><span class="material-symbols-outlined">location_on</span> ${escHtml(h.location)}</div>
                    </div>
                    <div class="proposal-reason">
                        <b>Kendala:</b><br/>${escHtml(h.issue)}
                    </div>
                    ${h.replyMessage ? `<div style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px;margin-bottom:12px;"><b>Balasan Admin:</b><br>${escHtml(h.replyMessage)}</div>` : ''}
                    <div class="proposal-actions">
                        ${h.status === 'waiting' ? `
                            <button class="btn btn-primary btn-sm" onclick="openReplyModal(${h.id})">
                                <span class="material-symbols-outlined" style="font-size:16px;">reply</span> Balas Pesan
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function openReplyModal(id) {
        document.getElementById('replyHelpId').value = id;
        document.getElementById('replyTemplate').value = '';
        document.getElementById('replyMessage').value = '';
        document.getElementById('replyModal').classList.add('active');
    }

    function closeReplyModal() {
        document.getElementById('replyModal').classList.remove('active');
    }

    function applyTemplate() {
        const val = document.getElementById('replyTemplate').value;
        if (val) {
            document.getElementById('replyMessage').value = val;
        }
    }

    async function sendReply() {
        const id = document.getElementById('replyHelpId').value;
        const msg = document.getElementById('replyMessage').value.trim();
        if (!msg) {
            alert('Pesan balasan tidak boleh kosong!');
            return;
        }
        
        // Disable button while sending
        const btn = document.querySelector('#replyModal .btn-primary');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = 'Mengirim...';
        btn.disabled = true;

        try {
            await replyHelpRequest(id, msg);
            showToast('Balasan email berhasil dikirim!', 'success');
            closeReplyModal();
            refreshAll();
        } catch (e) {
            showToast('Gagal mengirim email.', 'error');
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }

    // ============================================================
    // TOAST
    // ============================================================
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.className = `toast ${type}`;
        document.getElementById('toastText').textContent = message;
        document.getElementById('toastIcon').textContent = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function escHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    document.getElementById('wifiModal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
    document.getElementById('confirmDelete').addEventListener('click', function(e) { if (e.target === this) closeConfirm(); });
    document.getElementById('replyModal').addEventListener('click', function(e) { if (e.target === this) closeReplyModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeModal(); closeConfirm(); closeReplyModal(); } });

    async function init() {
        await loadOverview();
        await loadTable();
        initMap();
        const pStats = await getProposalStats();
        document.getElementById('pendingBadge').textContent = pStats.pending;
        document.getElementById('pendingBadge').style.display = pStats.pending > 0 ? 'inline' : 'none';
        renderHelpRequests();

        // Real-time polling for new proposals and help requests
        setInterval(async () => {
            try {
                // Update usulan badge
                const pStats = await getProposalStats();
                document.getElementById('pendingBadge').textContent = pStats.pending;
                document.getElementById('pendingBadge').style.display = pStats.pending > 0 ? 'inline' : 'none';

                // Update laporan badge
                const helps = await getHelpRequests();
                const waitingCount = helps.filter(h => h.status === 'waiting').length;
                document.getElementById('helpBadge').textContent = waitingCount;
                document.getElementById('helpBadge').style.display = waitingCount > 0 ? 'inline' : 'none';
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 5000); // Polling every 5 seconds
    }

    init();
