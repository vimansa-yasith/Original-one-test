const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';
let sock = null;
let isReady = false;
let pairingCodeRequested = false;

async function connectToWhatsApp() {
    // 💡 අලුත් නම්බර් එකේ පැටලීම් අයින් කරන්න සෙෂන් ෆෝල්ඩර් එක v5 කළා මචන්
    const { state, saveCreds } = await useMultiFileAuthState('./baileys_session_v5');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        browser: ["Chromium", "Ubuntu", "3.0"], 
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            if (pairingCodeRequested) return;
            // 🎯 ඔයාගේ අලුත් නම්බර් එක කෝඩ් එකටම පිරිසිදුව දැම්මා
            const myPhoneNumber = '94711285796'.replace(/[^0-9]/g, ''); 
            try {
                pairingCodeRequested = true;
                console.log(`\n📡 [System] Requesting Pairing Code for: ${myPhoneNumber}`);
                const code = await sock.requestPairingCode(myPhoneNumber);
                
                console.log(`\n======================================================`);
                console.log(`🏆 WHATSAPP PAIRING CODE GENERATED SUCCESSFULLY 🏆`);
                console.log(`------------------------------------------------------`);
                const formattedCode = code.match(/.{1,4}/g).join('-');
                console.log(`👉  YOUR CODE IS: [ ${formattedCode.toUpperCase()} ]  👈`);
                console.log(`======================================================\n`);
            } catch (err) {
                console.log('❌ Code Request Pending/Failed:', err.message);
                pairingCodeRequested = false;
            }
        }, 8000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            isReady = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ Connection closed (Status: ${statusCode}). Waiting 10s before retry...`);
            
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            
            setTimeout(() => {
                connectToWhatsApp(); 
            }, 10000);
        } else if (connection === 'open') {
            isReady = true;
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
        let cleanedNumber = to.replace(/[^0-9]/g, ''); 
        if (cleanedNumber.startsWith('0')) {
            cleanedNumber = '94' + cleanedNumber.substring(1); 
        } else if (!cleanedNumber.startsWith('94') && cleanedNumber.length === 9) {
            cleanedNumber = '94' + cleanedNumber;
        }

        const formattedNumber = cleanedNumber + '@s.whatsapp.net';
        await sock.sendMessage(formattedNumber, { text: message });
        console.log(`📤 Verification Code successfully sent to: ${cleanedNumber}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`❌ Failed to send verification code to ${to}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 FlexiWork WhatsApp service running on port ${PORT}`);
});
