const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';

let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014.589-alpha.html'
  },
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

// First run: print QR code in terminal — scan with WhatsApp once, never again
let pairingCodeRequested = false;

client.on('qr', async (qr) => {
  if (pairingCodeRequested) return; 
    
    console.log('[System] Inside QR event. Canceling terminal QR print...');
    console.log('[System] Requesting 8-digit Pairing Code from WhatsApp...');
    
    try {
        pairingCodeRequested = true;
        const myPhoneNumber = '94719075355'; //phone number
        
        // requesting the code directly from whatsapp
        const pairingCode = await client.requestPairingCode(myPhoneNumber);
        
        console.log(`\n======================================================`);
        console.log(`WHATSAPP PAIRING CODE GENERATED SUCCESSFULLY`);
        console.log(`------------------------------------------------------`);
        
        
        const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
        console.log(`YOUR CODE IS: [ ${formattedCode.toUpperCase()} ] `);
        
        console.log(`------------------------------------------------------`);
        console.log(`Go to WhatsApp -> Linked Devices -> Link with phone number instead`);
        console.log(`======================================================\n`);
        
    } catch (err) {
        pairingCodeRequested = false;
        console.error('❌ Failed to generate pairing code:', err.message);
    }
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated — session saved.');
});

client.on('ready', () => {
  isReady = true;
  console.log('✅ WhatsApp client ready. FlexiWork can now send messages.');
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.warn('⚠️  WhatsApp disconnected:', reason);
});

client.initialize();

// ── REST API ──────────────────────────────────────────────────────────────────

// POST /send  { to: "+94771234567", message: "Hello" }
app.post('/send', async (req, res) => {
  if (req.header('X-Internal-Secret') !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Both "to" and "message" are required.' });
  }
  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp client not ready yet. Check terminal for QR code.' });
  }

  try {
    const chatId = to.replace(/^\+/, '') + '@c.us';
    await client.sendMessage(chatId, message);
    console.log(`📤 Sent to ${to}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ Failed to send to ${to}:`, err.message);
    // Puppeteer's underlying page/frame died (e.g. the linked WhatsApp
    // session was invalidated or reused on another machine) — mark not
    // ready instead of letting every future /send fail the same silent way.
    if (/detached frame|session closed|protocol error/i.test(err.message)) {
      isReady = false;
      console.error('   WhatsApp session appears dead. Restart this service and re-scan the QR code.');
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /status
app.get('/status', (req, res) => {
  res.json({ ready: isReady });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 FlexiWork WhatsApp service running on http://localhost:${PORT}`);
  console.log('   Waiting for WhatsApp to initialize...\n');
});
