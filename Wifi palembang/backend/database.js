const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/palembang_wifi';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connected.');
        seedDatabase();
    })
    .catch(err => console.error('MongoDB connection error:', err));

// ============================================================
// SCHEMA: WiFi Locations
// ============================================================
const wifiLocationSchema = new mongoose.Schema({
    ssid: { type: String, required: true },
    pic: String,
    bandwidth: String,
    downloadSpeed: Number,
    uploadSpeed: Number,
    deskripsi: String,
    provider: String,
    status: String,
    kelurahan: String,
    kecamatan: String,
    alamat: String,
    lat: Number,
    lng: Number,
    image: String,
    tags: [String]
}, { timestamps: true });

// ============================================================
// SCHEMA: Help Requests (Bantuan/Laporan)
// ============================================================
const helpRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    location: String,
    issue: String,
    status: { type: String, default: 'waiting' },
    replyMessage: String,
    submittedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

const WifiLocation = mongoose.model('WifiLocation', wifiLocationSchema);
const HelpRequest = mongoose.model('HelpRequest', helpRequestSchema);

// ============================================================
// SEED DATA
// ============================================================
async function seedDatabase() {
    const count = await WifiLocation.countDocuments();
    if (count === 0) {
        console.log('Seeding initial WiFi locations...');
        const seedData = [
            { ssid: 'Masjid Darussaid Abiasan', pic: 'Zidan', kelurahan: 'DELAPAN ILIR', kecamatan: 'ILIR TIMUR TIGA', provider: 'Diskominfo Palembang', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 30, uploadSpeed: 20, deskripsi: 'WiFi gratis dari Diskominfo Kota Palembang.', tags: ['wifi', 'internet', 'public'], lat: -2.9760, lng: 104.7554 },
            { ssid: 'Taman Simpang Radial', pic: 'Ipan', kelurahan: 'DUA-PULUH-EMPAT ILIR', kecamatan: 'BUKITKECIL', provider: 'Diskominfo', status: 'Aktif', bandwidth: '50 Mbps', downloadSpeed: 25, uploadSpeed: 15, deskripsi: 'WiFi publik di Taman Simpang Radial.', tags: ['wifi', 'taman', 'public'], lat: -2.9830, lng: 104.7510 },
            { ssid: 'Taman Sekanak Lambidaro', pic: 'Pak Heri', kelurahan: 'DUA-PULUH-ENAM ILIR', kecamatan: 'BUKITKECIL', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 30, uploadSpeed: 20, deskripsi: 'WiFi gratis di taman kota.', tags: ['wifi', 'taman', 'public'], lat: -2.9870, lng: 104.7560 },
            { ssid: 'Benteng Kuto Besak', pic: 'Ahmad', kelurahan: 'SEMBILAN-BELAS ILIR', kecamatan: 'BUKITKECIL', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 50, uploadSpeed: 30, deskripsi: 'WiFi gratis di area wisata BKB.', tags: ['wifi', 'wisata', 'public'], lat: -2.9906, lng: 104.7601 },
            { ssid: 'Ampera Bridge View', pic: 'Budi', kelurahan: 'SEBERANG ULU', kecamatan: 'SEBERANG ULU I', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 30, uploadSpeed: 20, deskripsi: 'WiFi publik area Jembatan Ampera.', tags: ['wifi', 'wisata', 'public'], lat: -2.9917, lng: 104.7634 },
            { ssid: 'Taman Kambang Iwak Besak', pic: 'Rini', kelurahan: 'TALANG SEMUT', kecamatan: 'BUKITKECIL', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 40, uploadSpeed: 25, deskripsi: 'WiFi gratis di taman KIB.', tags: ['wifi', 'taman', 'public'], lat: -2.9770, lng: 104.7530 },
            { ssid: 'Pasar 16 Ilir', pic: 'Hj. Fatimah', kelurahan: 'ENAM-BELAS ILIR', kecamatan: 'ILIR TIMUR SATU', provider: 'Diskominfo', status: 'Aktif', bandwidth: '50 Mbps', downloadSpeed: 20, uploadSpeed: 10, deskripsi: 'WiFi gratis untuk pedagang dan pengunjung.', tags: ['wifi', 'pasar', 'public'], lat: -2.9880, lng: 104.7620 },
            { ssid: 'Masjid Agung SMB', pic: 'Ustaz Ridwan', kelurahan: 'SEMBILAN-BELAS ILIR', kecamatan: 'BUKITKECIL', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 30, uploadSpeed: 20, deskripsi: 'WiFi publik di Masjid Agung.', tags: ['wifi', 'ibadah', 'public'], lat: -2.9901, lng: 104.7580 },
            { ssid: 'Stasiun LRT Ampera', pic: 'Hendri', kelurahan: 'ILIR TIMUR', kecamatan: 'ILIR TIMUR SATU', provider: 'Diskominfo', status: 'Tidak Aktif', bandwidth: '100 Mbps', downloadSpeed: 0, uploadSpeed: 0, deskripsi: 'WiFi sedang dalam pemeliharaan.', tags: ['wifi', 'transportasi'], lat: -2.9892, lng: 104.7622 },
            { ssid: 'Kampus UNSRI Bukit', pic: 'Mahdi', kelurahan: 'BUKIT LAMA', kecamatan: 'ILIR BARAT SATU', provider: 'Diskominfo', status: 'Aktif', bandwidth: '100 Mbps', downloadSpeed: 50, uploadSpeed: 30, deskripsi: 'WiFi gratis area kampus.', tags: ['wifi', 'pendidikan', 'public'], lat: -2.9820, lng: 104.7350 }
        ];
        await WifiLocation.insertMany(seedData);
        console.log('Seed data inserted successfully.');
    }
}

module.exports = { WifiLocation, HelpRequest };
