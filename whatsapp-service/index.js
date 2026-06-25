const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';
let sock = null;
let isReady = false;
let pairingCodeRequested = false; 

async function connectToWhatsApp() {
    // 💡 පරණ කරදරකාරී Junk සෙෂන්ස් අයින් වෙන්න අලුත්ම Clean ෆෝල්ඩර් එකක් දුන්නා
    const { state, saveCreds } = await useMultiFileAuthState('./baileys_session_v4');

    // 📡 [පිළියම 1] - වට්ස්ඇප් එකෙන් බ්ලොක් නොවෙන්න ලයිව් සර්වර් එකෙන්ම අලුත්ම වර්ෂන් එක ලබාගැනීම
    let version = [2, 3000, 1015, 0]; // Fallback version
    try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
        console.log(`📡 [System] Using WhatsApp Web Version: v${version.join('.')}`);
    } catch (err) {
        console.log('⚠️ Could not fetch latest WA version, using secure fallback.');
    }

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, 
        browser: ['Mac OS', 'Chrome', '124.0.0.0'], // Stable User-Agent
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // 🎯 වට්ස්ඇප් එක ලින්ක් වෙන්න ලෑස්ති වූ සැනින් පිරිසිදුව කෝඩ් එක ඉල්ලීම
        if (qr && !sock.authState.creds.registered && !pairingCodeRequested) {
            pairingCodeRequested = true;
            const myPhoneNumber = '94719075355'.replace(/[^0-9]/g, ''); 
            
            try {
                console.log(`\n📡 [System] Connection stable. Requesting code for: ${myPhoneNumber}`);
                const code = await sock.requestPairingCode(myPhoneNumber);
                
                console.log(`\n======================================================`);
                console.log(`🏆 WHATSAPP PAIRING CODE GENERATED SUCCESSFULLY 🏆`);
                console.log(`------------------------------------------------------`);
                
                const formattedCode = code.match(/.{1,4}/g).join('-');
                console.log(`👉  YOUR CODE IS: [ ${formattedCode.toUpperCase()} ]  👈`);
                
                console.log(`------------------------------------------------------`);
                console.log(`💡 Go to WhatsApp -> Linked Devices -> Link with phone number instead`);
                console.log(`======================================================\n`);
            } catch (err) {
                console.error('❌ Failed to generate pairing code:', err.message);
                pairingCodeRequested = false;
            }
        }

        if (connection === 'close') {
            isReady = false;
            pairingCodeRequested = false;
            
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`⚠️ WhatsApp connection closed (Status: ${statusCode}). Reconnecting in 5s...`);
            
            // 🔒 [පිළියම 2] - පරණ ලිස්නර්ස් අයින් කරලා සොකට් එක ක්ලීන් කිරීම
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            
            // ⏱️ [පිළියම 3] - වට්ස්ඇප් සර්වර් එක ස්පෑම් නොවෙන්න තත්පර 5ක ඩිලේ එකක් තැබීම
            if (shouldReconnect) {
                setTimeout(() => {
                    connectToWhatsApp(); 
                }, 5000);
            }
        } else if (connection === 'open') {
            isReady = true;
            pairingCodeRequested = false;
            console.log('✅ WhatsApp client ready! FlexiWork can now send messages.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

// ── REST API ──────────────────────────────────────────────────────────────────

app.post('/send', async (req, res) => {
    if (req.header('X-Internal-Secret') !== SHARED_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Both "to" and "message" are required.' });
    }
    if (!isReady || !sock) {
        return res.status(503).json({ error: 'WhatsApp client not ready yet.' });
    }

    try {
        const formattedNumber = to.replace(/^\+/, '').replace(/\s+/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(formattedNumber, { text: message });
        console.log(`📤 Sent to ${to}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`❌ Failed to send to ${to}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 FlexiWork WhatsApp service running on http://localhost:${PORT}`);
    console.log('   Waiting for WhatsApp to initialize...\n');
});
