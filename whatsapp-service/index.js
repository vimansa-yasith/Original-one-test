const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';
let sock = null;
let isReady = false;
let pairingCodeSent = false; 

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./baileys_session_fresh');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, 
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        logger: pino({ level: 'silent' })
    });

  
    if (!sock.authState.creds.registered && !pairingCodeSent) {
        pairingCodeSent = true; 
        const myPhoneNumber = '94719075355'.replace(/[^0-9]/g, ''); 
        
        setTimeout(async () => {
            try {
                console.log(`\n📡 [System] Requesting Single Pairing Code for: ${myPhoneNumber}`);
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
                pairingCodeSent = false; 
            }
        }, 6000); 
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            isReady = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ WhatsApp connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(); 
            }
        } else if (connection === 'open') {
            isReady = true;
            pairingCodeSent = false; 
            console.log('✅ WhatsApp client ready! FlexiWork can now send messages.');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();



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
