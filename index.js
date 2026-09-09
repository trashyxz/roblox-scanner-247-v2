const http = require('http');

// 1. Health-check HTTP Server (Required by Render so the app stays live)
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Roblox 24/7 Username Finder is ONLINE!');
}).listen(PORT, () => {
  console.log(`[HTTP Server] Listening on port ${PORT}`);
});

// 2. Configuration & Webhook Settings
const CONFIG = {
  mode: process.env.SCAN_MODE || '3char', // Options: '3char', '4char', 'og'
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  delayMs: 1800
};

const letters = "abcdefghijklmnopqrstuvwxyz";
const digits = "0123456789";
const alphanum = letters + digits;

function generateCandidate(mode) {
  if (mode === "3char") {
    const c1 = letters[Math.floor(Math.random() * letters.length)];
    const c2 = Math.random() > 0.4 ? "_" : alphanum[Math.floor(Math.random() * alphanum.length)];
    const c3 = alphanum[Math.floor(Math.random() * alphanum.length)];
    return `${c1}${c2}${c3}`;
  }
  if (mode === "4char") {
    let name = letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 3; i++) name += alphanum[Math.floor(Math.random() * alphanum.length)];
    return name;
  }
  const prefixes = ["v", "x", "z", "q", "i", "o"];
  const words = ["sky", "zen", "orb", "vox", "arc", "pix", "lux", "neo"];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${words[Math.floor(Math.random() * words.length)]}`;
}

async function sendDiscordAlert(username) {
  if (!CONFIG.discordWebhookUrl) return;

  try {
    await fetch(CONFIG.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `@everyone 🎉 **RARE USERNAME AVAILABLE!**`,
        embeds: [{
          title: '🎉 Roblox Rare Username Found!',
          description: `**Username:** \`${username}\`\n**Status:** Available for registration!`,
          color: 5763719,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
}

async function checkUsername(username) {
  try {
    const res = await fetch("https://auth.roblox.com/v1/usernames/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, birthday: "2000-01-01" })
    });

    if (res.status === 429) {
      console.warn("⚠️ Rate limited. Pausing for 10 seconds...");
      await new Promise(r => setTimeout(r, 10000));
      return 'ratelimit';
    }

    const data = await res.json();
    return data.code === 0 ? 'available' : 'taken';
  } catch (err) {
    return 'error';
  }
}

async function startScanner() {
  console.log("🚀 Roblox Username Scanner Started 24/7!");
  
  while (true) {
    const candidate = generateCandidate(CONFIG.mode);
    const status = await checkUsername(candidate);

    if (status === 'available') {
      console.log(`🎉 [FOUND AVAILABLE NAME] ${candidate}`);
      await sendDiscordAlert(candidate);
    } else if (status === 'taken') {
      console.log(`❌ [Taken] ${candidate}`);
    }

    await new Promise(r => setTimeout(r, CONFIG.delayMs));
  }
}

startScanner();
