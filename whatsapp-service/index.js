const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

const app = express();
app.use(express.json());

const SHARED_SECRET = process.env.WHATSAPP_SHARED_SECRET || 'dev-only-change-me';
let isReady = false;

// 1. Railway එකට සහ Pairing Code වලට ගැලපෙන විදිහට Client එක සෙට් කිරීම
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './session' }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014.589-alpha.html'
  },
  puppeteer: {
    headless: true,
    // 💡 Railway එකේදී environment path එක ගන්නවා, නැත්නම් ලෝකල් එකේදී Chrome එක ගන්නවා
    executablePath: process.env.CHROME_PATH || undefined, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--unhandled-rejections=strict'
    ],
  },
});

// 2. ⚠️ QR එක Terminal එකේ අඳින එක සදහටම බ්ලොක් කිරීම
client.on('qr', (qr) => {
  // මේක හිස්ව තියන්න මචන්, එතකොට අර කැඩිච්ච QR කොටු ලොග් එකේ වැටෙන්නේ නැහැ
});

// 3. 🚀 බ්‍රවුසර් එක ලෝඩ් වෙලා සර්වර් එක සූදානම් වුණු ගමන් කෙලින්ම Pairing Code එක ඉල්ලීම
client.on('ready', () => {
  isReady = true;
  console.log('✅ WhatsApp client ready. FlexiWork can now send messages.');
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated — session saved.');
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.warn('⚠️  WhatsApp disconnected:', reason);
});

// සර්විස් එක පණ ගැන්වීම
client.initialize();

// 📡 [ප්‍රධාන උපක්‍රමය] - සර්වර් එක ස්ටාර්ට් වී තත්පර 15කින් කෝඩ් එක එක පාරක් පමණක් ඉල්ලීම
setTimeout(async () => {
  if (!isReady) {
    console.log('\n📡 [System] Initializing WhatsApp Pairing Session...');
    try {
      const myPhoneNumber = '94719075355'; // ඔයාගේ WhatsApp නම්බර් එක
      console.log(`📡 [System] Requesting 8-digit Pairing Code for: ${myPhoneNumber}`);
      
      const pairingCode = await client.requestPairingCode(myPhoneNumber);
      
      console.log(`\n======================================================`);
      console.log(`🏆 WHATSAPP PAIRING CODE GENERATED SUCCESSFULLY 🏆`);
      console.log(`------------------------------------------------------`);
      
      const formattedCode = pairingCode.match(/.{1,4}/g).join('-');
      console.log(`👉  YOUR CODE IS: [ ${formattedCode.toUpperCase()} ]  👈`);
      
      console.log(`------------------------------------------------------`);
      console.log(`💡 Go to WhatsApp -> Linked Devices -> Link with phone number instead`);
      console.log(`======================================================\n`);
      
    } catch (err) {
      console.log('❌ Pairing Code Error Info:', err);
    }
  }
}, 15000); // ⏱️ සර්වර් එකට නිදහසේ ලෝඩ් වෙන්න තත්පර 15ක් දෙනවා

// ── REST API ──────────────────────────────────────────────────────────────────

app.post('/send', async (req, res) => {
  if (req.header('X-Internal-Secret') !== SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Both "to" and "message" are required.' });
  }
  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp client not ready yet.' });
  }

  try {
    const chatId = to.replace(/^\+/, '') + '@c.us';
    await client.sendMessage(chatId, message);
    console.log(`📤 Sent to ${to}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ Failed to send to ${to}:`, err.message);
    if (/detached frame|session closed|protocol error/i.test(err.message)) {
      isReady = false;
    }
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
