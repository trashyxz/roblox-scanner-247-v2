const http = require('http');

// 1. Live Stats Tracking for Dashboard
const STATS = {
  startTime: Date.now(),
  totalChecked: 0,
  availableFound: 0,
  lastFound: 'None yet',
  status: 'ONLINE 🟢',
  currentDelay: 2000
};

// 2. Health-check & Visual Status Webpage
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  const uptimeHours = ((Date.now() - STATS.startTime) / (1000 * 60 * 60)).toFixed(2);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roblox Scanner Status</title>
      <meta http-equiv="refresh" content="10">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 450px; border: 1px solid #334155; }
        h1 { margin-top: 0; font-size: 1.5rem; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
        .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
        .stat-box { background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155; }
        .stat-value { font-size: 1.4rem; font-weight: bold; color: #f1f5f9; margin-top: 0.25rem; }
        .stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .highlight { color: #4ade80; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Roblox Finder <span>${STATS.status}</span></h1>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-label">Total Checked</div><div class="stat-value">${STATS.totalChecked}</div></div>
          <div class="stat-box"><div class="stat-label">Available Found</div><div class="stat-value highlight">${STATS.availableFound}</div></div>
          <div class="stat-box"><div class="stat-label">Uptime</div><div class="stat-value">${uptimeHours} hrs</div></div>
          <div class="stat-box"><div class="stat-label">Check Speed</div><div class="stat-value">${(STATS.currentDelay / 1000).toFixed(1)}s</div></div>
        </div>
        <div style="margin-top: 1.5rem;" class="stat-box">
          <div class="stat-label">Last Rare Name Found</div>
          <div class="stat-value highlight">${STATS.lastFound}</div>
        </div>
      </div>
    </body>
    </html>
  `;
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(PORT, () => {
  console.log(`[HTTP Server] Live on port ${PORT}`);
});

// 3. Configuration & State Management
const CONFIG = {
  mode: process.env.SCAN_MODE || 'all_genres',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  baseDelayMs: 2000
};

const seenUsernames = new Set(); // Memory cache prevents repeat checks

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const ALL_LETTERS = "abcdefghijklmnopqrstuvwxyz";

const WORDLISTS = {
  anime: ["kuro", "neko", "yuki", "sora", "kami", "ren", "tsuki", "hana", "kage", "ryu", "sen", "zero", "shin"],
  y2k_edgy: ["vamp", "void", "grim", "slay", "goth", "soul", "cult", "risk", "foul", "hex", "purg", "veil", "toxic"],
  cute_soft: ["luna", "faye", "silk", "cozy", "star", "halo", "blush", "petal", "miso", "plum", "dove", "glow", "angel"],
  og_roots: ["sky", "zen", "orb", "vox", "arc", "pix", "lux", "neo", "aura", "nova", "echo", "mist", "frost", "dusk"]
};

// 4. Generator Logic
function generateCandidate(selectedMode) {
  let mode = selectedMode;
  if (mode === 'all_genres') {
    const genres = ['pure3l', 'clean4l', 'anime', 'y2k_edgy', 'cute_soft', 'og_prefix'];
    mode = genres[Math.floor(Math.random() * genres.length)];
  }

  if (mode === 'pure3l') {
    const l1 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    const l2 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    const l3 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    return { name: `${l1}${l2}${l3}`, genre: "Pure 3-Letter" };
  }

  if (mode === 'clean4l') {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v1 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const c3 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    return { name: `${c1}${v1}${c2}${c3}`, genre: "Clean 4-Letter" };
  }

  if (mode === 'anime') {
    const word = WORDLISTS.anime[Math.floor(Math.random() * WORDLISTS.anime.length)];
    const pre = ["x", "v", "i", "z"][Math.floor(Math.random() * 4)];
    return { name: Math.random() > 0.5 ? `${pre}${word}` : `${word}x`, genre: "Anime / Japanese Aesthetic" };
  }

  if (mode === 'y2k_edgy') {
    const word = WORDLISTS.y2k_edgy[Math.floor(Math.random() * WORDLISTS.y2k_edgy.length)];
    const pre = ["v", "x", "z", "q"][Math.floor(Math.random() * 4)];
    return { name: Math.random() > 0.5 ? `${pre}${word}` : `${word}z`, genre: "Y2K / Gothic / PvP" };
  }

  if (mode === 'cute_soft') {
    const word = WORDLISTS.cute_soft[Math.floor(Math.random() * WORDLISTS.cute_soft.length)];
    const pre = ["i", "o", "v", "m"][Math.floor(Math.random() * 4)];
    return { name: `${pre}${word}`, genre: "Soft / Fairy / Cute" };
  }

  if (mode === 'og_prefix') {
    const pre = ["v", "x", "z", "q", "i", "o"];
    const root = WORDLISTS.og_roots[Math.floor(Math.random() * WORDLISTS.og_roots.length)];
    const prefix = pre[Math.floor(Math.random() * pre.length)];
    return { name: `${prefix}${root}`, genre: "Semi-OG Aesthetic" };
  }

  return { name: "vsky", genre: "Default" };
}

// 5. Silent Discord Alert
async function sendDiscordAlert(username, genre) {
  if (!CONFIG.discordWebhookUrl) return;

  try {
    await fetch(CONFIG.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **RARE USERNAME UNLOCKED!** 🚨`,
        embeds: [{
          title: `✨ Verified Available Roblox Username!`,
          description: `**Username:** \`${username}\`\n**Genre Style:** \`${genre}\`\n**Length:** \`${username.length} Letters\`\n**Numbers:** \`0 (Pure Letters)\``,
          color: 65280,
          fields: [{ name: "⚡ Quick Claim Link", value: `[Click Here to Register on Roblox](https://www.roblox.com)` }],
          footer: { text: "24/7 Silent Aesthetic Finder" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
}

// 6. Double-Verification Checker
async function checkUsername(username) {
  const customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
  };

  try {
    const userCheckRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });

    if (userCheckRes.status === 429) return 'ratelimit';

    if (userCheckRes.ok) {
      const userData = await userCheckRes.json();
      if (userData.data && userData.data.length > 0) return 'taken';
    }

    const validateRes = await fetch("https://auth.roblox.com/v1/usernames/validate", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ username, birthday: "2000-01-01" })
    });

    if (validateRes.status === 429) return 'ratelimit';

    if (validateRes.ok) {
      const valData = await validateRes.json();
      if (valData.code === 0) return 'available';
    }

    return 'taken';
  } catch (err) {
    return 'error';
  }
}

// 7. Infinite Self-Healing Scanner Loop
async function startScanner() {
  console.log("🚀 Bulletproof 24/7 Scanner Online!");

  while (true) {
    try {
      let candidate = generateCandidate(CONFIG.mode);
      
      // Avoid duplicate checks during the session
      let attempts = 0;
      while (seenUsernames.has(candidate.name) && attempts < 10) {
        candidate = generateCandidate(CONFIG.mode);
        attempts++;
      }
      seenUsernames.add(candidate.name);

      const status = await checkUsername(candidate.name);

      if (status === 'available') {
        STATS.availableFound++;
        STATS.lastFound = `${candidate.name} (${candidate.genre})`;
        console.log(`\x1b[32m[VERIFIED AVAILABLE] ${candidate.name} (${candidate.genre})\x1b[0m`);
        await sendDiscordAlert(candidate.name, candidate.genre);
        STATS.currentDelay = CONFIG.baseDelayMs;
      } else if (status === 'taken') {
        STATS.totalChecked++;
        console.log(`[Taken] ${candidate.name} (${candidate.genre})`);
        STATS.currentDelay = CONFIG.baseDelayMs;
      } else if (status === 'ratelimit') {
        console.warn("⚠️ Rate limit detected. Backing off for 15s...");
        STATS.currentDelay = 15000;
      } else if (status === 'error') {
        console.warn("⚠️ Network pause. Retrying in 5s...");
        STATS.currentDelay = 5000;
      }
    } catch (criticalErr) {
      console.error("Critical error caught:", criticalErr.message);
      STATS.currentDelay = 10000;
    }

    await new Promise(r => setTimeout(r, STATS.currentDelay));
  }
}

startScanner();
