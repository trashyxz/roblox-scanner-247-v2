const http = require('http');

// 1. Health-check HTTP Server for Render
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Roblox 24/7 Username Finder is ONLINE!');
}).listen(PORT, () => {
  console.log(`[HTTP Server] Listening on port ${PORT}`);
});

// 2. Configuration Settings
const CONFIG = {
  mode: process.env.SCAN_MODE || '3char', // Options: '3char', '4char', 'og'
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  delayMs: 2000 // 2 seconds prevents rate limits across both APIs
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
        content: `@everyone 🎉 **VERIFIED RARE USERNAME AVAILABLE!**`,
        embeds: [{
          title: '🎉 Roblox Rare Username Found!',
          description: `**Username:** \`${username}\`\n**Status:** Verified Available for Registration!`,
          color: 5763719,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
}

// STRICT DOUBLE-CHECK VERIFICATION
async function checkUsername(username) {
  const customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    // CHECK 1: Search if an account currently or previously existed with this name
    const userCheckRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });

    if (userCheckRes.status === 429) {
      console.warn("⚠️ Rate limit on User Search. Cooling down 10s...");
      await new Promise(r => setTimeout(r, 10000));
      return 'ratelimit';
    }

    if (userCheckRes.ok) {
      const userData = await userCheckRes.json();
      // If the array contains ANY user object, the name is taken or terminated
      if (userData.data && userData.data.length > 0) {
        return 'taken';
      }
    }

    // CHECK 2: Validate if Roblox registration system allows claiming it
    const validateRes = await fetch("https://auth.roblox.com/v1/usernames/validate", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ username, birthday: "2000-01-01" })
    });

    if (validateRes.status === 429) {
      console.warn("⚠️ Rate limit on Auth API. Cooling down 10s...");
      await new Promise(r => setTimeout(r, 10000));
      return 'ratelimit';
    }

    if (validateRes.ok) {
      const valData = await validateRes.json();
      // Code 0 = Valid and available for new account registration
      if (valData.code === 0) {
        return 'available';
      }
    }

    return 'taken';
  } catch (err) {
    console.error("Network/API error:", err.message);
    return 'error';
  }
}

async function startScanner() {
  console.log("🚀 Strict Double-Verification Roblox Scanner Started!");

  while (true) {
    const candidate = generateCandidate(CONFIG.mode);
    const status = await checkUsername(candidate);

    if (status === 'available') {
      console.log(`\x1b[32m[VERIFIED AVAILABLE] ${candidate}\x1b[0m`);
      await sendDiscordAlert(candidate);
    } else if (status === 'taken') {
      console.log(`[Taken/Unavailable] ${candidate}`);
    }

    await new Promise(r => setTimeout(r, CONFIG.delayMs));
  }
}

startScanner();
