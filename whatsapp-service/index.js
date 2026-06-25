const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';
let sock = null;
let isReady = false;


let pairingTimeout = null;
let reconnectTimeout = null;

async function connectToWhatsApp() {
 
    if (pairingTimeout) clearTimeout(pairingTimeout);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);


    const { state, saveCreds } = await useMultiFileAuthState('./baileys_session_v6');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        logger: pino({ level: 'silent' })
    });

    if (!sock.authState.creds.registered) {

        pairingTimeout = setTimeout(async () => {
            const myPhoneNumber = '94711285796'.replace(/[^0-9]/g, ''); 
            try {
                console.log(`\n📡 [System] Requesting Pairing Code for: ${myPhoneNumber}`);
                const code = await sock.requestPairingCode(myPhoneNumber);
                
                console.log(`\n======================================================`);
                console.log(`🏆 WHATSAPP PAIRING CODE GENERATED SUCCESSFULLY 🏆`);
                console.log(`------------------------------------------------------`);
                const formattedCode = code.match(/.{1,4}/g).join('-');
                console.log(`👉  YOUR CODE IS: [ ${formattedCode.toUpperCase()} ]  👈`);
                console.log(`======================================================\n`);
            } catch (err) {
                console.log('❌ Code Request Failed:', err.message);
            }
        }, 10000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            isReady = false;
            
          
            if (pairingTimeout) clearTimeout(pairingTimeout);
            
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ Connection closed (Status: ${statusCode}). Reconnecting safely in 12s...`);
            
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            
         
            reconnectTimeout = setTimeout(() => {
                connectToWhatsApp(); 
            }, 12000);
        } else if (connection === 'open') {
            isReady = true;
            if (pairingTimeout) clearTimeout(pairingTimeout);
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
