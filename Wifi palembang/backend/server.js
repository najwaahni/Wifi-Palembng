const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { WifiLocation, HelpRequest } = require('./database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });


const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------
// WIFI LOCATIONS
// ---------------------------------------------------------
app.get('/api/wifi', async (req, res) => {
    try {
        const locations = await WifiLocation.find({});
        const mapped = locations.map(w => {
            const obj = w.toObject();
            obj.id = obj._id.toString();
            return obj;
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wifi', async (req, res) => {
    try {
        const { ssid, pic, bandwidth, downloadSpeed, uploadSpeed, deskripsi, provider, status, kelurahan, kecamatan, alamat, lat, lng, tags, image } = req.body;
        const wifi = new WifiLocation({ ssid, pic, bandwidth, downloadSpeed, uploadSpeed, deskripsi, provider, status, kelurahan, kecamatan, alamat, lat, lng, tags: Array.isArray(tags) ? tags : [], image });
        const saved = await wifi.save();
        res.json({ id: saved._id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/wifi/:id', async (req, res) => {
    try {
        const { ssid, pic, bandwidth, downloadSpeed, uploadSpeed, deskripsi, provider, status, kelurahan, kecamatan, alamat, lat, lng, tags, image } = req.body;
        const updateData = { ssid, pic, bandwidth, downloadSpeed, uploadSpeed, deskripsi, provider, status, kelurahan, kecamatan, alamat, lat, lng, tags: Array.isArray(tags) ? tags : [] };
        if (image !== undefined) updateData.image = image;

        const result = await WifiLocation.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ updated: result ? 1 : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/wifi/:id', async (req, res) => {
    try {
        await WifiLocation.findByIdAndDelete(req.params.id);
        res.json({ deleted: 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// HELP REQUESTS (Bantuan & Laporan)
// ---------------------------------------------------------
let sseClients = [];

app.get('/api/help-requests/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

app.get('/api/help-requests', async (req, res) => {
    try {
        const requests = await HelpRequest.find({}).sort({ createdAt: -1 });
        const mapped = requests.map(h => {
            const obj = h.toObject();
            obj.id = obj._id.toString();
            return obj;
        });
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/help-requests', async (req, res) => {
    try {
        const { name, email, location, issue } = req.body;
        const help = new HelpRequest({ name, email, location, issue, submittedAt: new Date().toISOString() });
        const saved = await help.save();
        
        const obj = saved.toObject();
        obj.id = obj._id.toString();
        
        // Kirim notifikasi real-time ke semua admin via SSE
        sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(obj)}\n\n`);
        });

        res.json({ id: saved._id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------
// SEND EMAIL (Nodemailer)
// ---------------------------------------------------------
// Konfigurasi Email - Admin HARUS MENGUBAH EMAIL DAN APP PASSWORD DI file .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'EMAIL_ANDA@gmail.com', // Menggunakan .env
        pass: process.env.EMAIL_PASS || 'APP_PASSWORD_ANDA'     // Menggunakan .env
    }
});

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ PERINGATAN: Kredensial email belum dikonfigurasi di file .env. Email mungkin tidak akan terkirim.");
}

app.post('/api/help-requests/:id/reply', async (req, res) => {
    try {
        const { replyMessage } = req.body;

        // 1. Dapatkan data laporan berdasarkan ID
        const request = await HelpRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Data tidak ditemukan' });

        // 2. Siapkan opsi email
        const firstLetter = request.name ? request.name.charAt(0).toUpperCase() : 'U';
        const mailOptions = {
            from: `WiFi Gratis Palembang <${process.env.EMAIL_USER || 'EMAIL_ANDA@gmail.com'}>`,
            to: request.email,
            subject: 'Balasan: Laporan Kendala WiFi Palembang',
            html: `
                <div style="background-color: #f4f4f4; padding: 40px 20px; font-family: Roboto, Arial, sans-serif;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 8px; padding: 40px 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        <!-- Header / Logo -->
                        <div style="text-align: center; margin-bottom: 24px;">
                            <span style="font-size: 20px; font-weight: 500; color: #5f6368; letter-spacing: -0.5px;">WiFi Gratis Palembang</span>
                        </div>
                        
                        <!-- Title -->
                        <h1 style="font-size: 24px; font-weight: 400; color: #202124; text-align: center; margin: 0 0 16px 0; line-height: 1.3;">
                            Tanggapan Laporan Kendala
                        </h1>
                        
                        <!-- Sender Badge / Account Indicator -->
                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px auto;">
                            <tr>
                                <td style="background-color: #e8f0fe; color: #1a73e8; font-size: 14px; font-weight: bold; width: 28px; height: 28px; border-radius: 50%; text-align: center; vertical-align: middle;">
                                    ${firstLetter}
                                </td>
                                <td style="font-size: 14px; color: #3c4043; font-weight: 500; padding-left: 10px; vertical-align: middle;">
                                    ${request.email}
                                </td>
                            </tr>
                        </table>
                        
                        <!-- Divider Line -->
                        <div style="border-bottom: 1px solid #dadce0; margin-bottom: 24px;"></div>
                        
                        <!-- Main Content -->
                        <p style="font-size: 14px; color: #3c4043; line-height: 1.5; margin: 0 0 16px 0;">
                            Halo <strong>${request.name}</strong>, laporan kendala Anda mengenai akses WiFi di lokasi <strong>${request.location}</strong> telah ditinjau dan ditindaklanjuti oleh petugas teknis kami.
                        </p>
                        
                        <p style="font-size: 14px; color: #202124; font-weight: bold; margin: 0 0 8px 0;">
                            Tanggapan Tim Teknis:
                        </p>
                        <div style="font-size: 14px; color: #3c4043; line-height: 1.6; background-color: #f8f9fa; border: 1px solid #f1f3f4; border-radius: 4px; padding: 16px; margin: 0 0 20px 0;">
                            ${replyMessage.replace(/\n/g, '<br>')}
                        </div>
                        
                        <p style="font-size: 14px; color: #202124; font-weight: bold; margin: 0 0 8px 0;">
                            Tips Koneksi:
                        </p>
                        <p style="font-size: 14px; color: #3c4043; line-height: 1.5; margin: 0 0 24px 0;">
                            Jika Anda masih mengalami masalah saat menyambungkan perangkat, silakan gunakan opsi <strong>"Lupakan Jaringan" (Forget Network)</strong> di pengaturan WiFi Anda, lalu hubungkan kembali ke SSID <strong>${request.location}</strong>.
                        </p>
                        
                        <!-- Footer Text Inside Card -->
                        <div style="border-top: 1px solid #dadce0; padding-top: 20px; font-size: 12px; color: #70757a; text-align: center; line-height: 1.5;">
                            Anda menerima notifikasi ini sebagai balasan atas pengajuan laporan bantuan Anda.<br>
                            © Dinas Komunikasi dan Informatika (Diskominfo) Kota Palembang
                        </div>
                    </div>
                </div>
            `
        };

        // Update database segera (agar notifikasi admin langsung hilang / berubah)
        await HelpRequest.findByIdAndUpdate(req.params.id, { status: 'Selesai', replyMessage });

        // Kembalikan respons berhasil seketika ke admin (tidak menunggu kirim email selesai)
        res.json({ success: true, note: 'Database updated and email queued' });

        // 3. Kirim Email di background
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent successfully to", request.email);
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// START SERVER
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
