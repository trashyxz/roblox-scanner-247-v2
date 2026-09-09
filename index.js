const http = require('http');

// 1. Health-check HTTP Server for Render Cloud
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Aesthetic Roblox Username Finder is 100% ONLINE!');
}).listen(PORT, () => {
  console.log(`[HTTP Server] Listening on port ${PORT}`);
});

// 2. Configuration & Environment Variables
const CONFIG = {
  // Options: 'all_genres', 'pure3l', 'clean4l', 'anime', 'y2k_edgy', 'cute_soft', 'og_prefix'
  mode: process.env.SCAN_MODE || 'all_genres',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  delayMs: 2000
};

// Word & Character Libraries (NO NUMBERS)
const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const ALL_LETTERS = "abcdefghijklmnopqrstuvwxyz";

const WORDLISTS = {
  anime: ["kuro", "neko", "yuki", "sora", "kami", "ren", "tsuki", "hana", "kage", "ryu", "sen", "zero", "shin"],
  y2k_edgy: ["vamp", "void", "grim", "slay", "goth", "soul", "cult", "risk", "foul", "hex", "purg", "veil", "toxic"],
  cute_soft: ["luna", "faye", "silk", "cozy", "star", "halo", "blush", "petal", "miso", "plum", "dove", "glow", "angel"],
  og_roots: ["sky", "zen", "orb", "vox", "arc", "pix", "lux", "neo", "aura", "nova", "echo", "mist", "frost", "dusk"]
};

// Zero-Number Aesthetic Name Generators
function generateCandidate(selectedMode) {
  let mode = selectedMode;
  if (mode === 'all_genres') {
    const genres = ['pure3l', 'clean4l', 'anime', 'y2k_edgy', 'cute_soft', 'og_prefix'];
    mode = genres[Math.floor(Math.random() * genres.length)];
  }

  if (mode === 'pure3l') {
    // Pure 3-Letter (e.g. vqz, xrk)
    const l1 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    const l2 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    const l3 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    return { name: `${l1}${l2}${l3}`, genre: "Pure 3-Letter (Ultra Rare)" };
  }

  if (mode === 'clean4l') {
    // Pronounceable 4-Letter
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

// Silent Discord Notification (No Pings / No @everyone)
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
          color: 65280, // Emerald Green
          fields: [
            {
              name: "⚡ Quick Claim Link",
              value: `[Click Here to Register on Roblox](https://www.roblox.com)`
            }
          ],
          footer: { text: "24/7 Aesthetic Roblox Finder" },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Webhook Error:', err.message);
  }
}

// STRICT DOUBLE-CHECK VERIFICATION (Prevents False Positives)
async function checkUsername(username) {
  const customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  try {
    // CHECK 1: Search if an account currently or previously existed
    const userCheckRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });

    if (userCheckRes.status === 429) {
      console.warn("⚠️ Rate limit hit. Cooling down for 10 seconds...");
      await new Promise(r => setTimeout(r, 10000));
      return 'ratelimit';
    }

    if (userCheckRes.ok) {
      const userData = await userCheckRes.json();
      if (userData.data && userData.data.length > 0) return 'taken';
    }

    // CHECK 2: Confirm registration API allows creation
    const validateRes = await fetch("https://auth.roblox.com/v1/usernames/validate", {
      method: "POST",
      headers: customHeaders,
      body: JSON.stringify({ username, birthday: "2000-01-01" })
    });

    if (validateRes.status === 429) {
      await new Promise(r => setTimeout(r, 10000));
      return 'ratelimit';
    }

    if (validateRes.ok) {
      const valData = await validateRes.json();
      if (valData.code === 0) return 'available';
    }

    return 'taken';
  } catch (err) {
    return 'error';
  }
}

async function startScanner() {
  console.log("🚀 24/7 Silent Multi-Genre Roblox Scanner Active!");

  while (true) {
    const candidate = generateCandidate(CONFIG.mode);
    const status = await checkUsername(candidate.name);

    if (status === 'available') {
      console.log(`\x1b[32m[VERIFIED AVAILABLE] Name: ${candidate.name} | Genre: ${candidate.genre}\x1b[0m`);
      await sendDiscordAlert(candidate.name, candidate.genre);
    } else if (status === 'taken') {
      console.log(`[Taken] ${candidate.name} (${candidate.genre})`);
    }

    await new Promise(r => setTimeout(r, CONFIG.delayMs));
  }
}

startScanner();
