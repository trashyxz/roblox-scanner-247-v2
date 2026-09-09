const http = require('http');
const crypto = require('crypto');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 1. Health-check HTTP Server for Render Dashboard
const PORT = process.env.PORT || 10000;
const STATS = {
  startTime: Date.now(),
  totalChecked: 0,
  availableFound: 0,
  lastFound: 'None yet',
  currentDelay: 2000
};

http.createServer((req, res) => {
  const uptimeHours = ((Date.now() - STATS.startTime) / (1000 * 60 * 60)).toFixed(2);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Roblox Scanner Dashboard</title>
      <meta http-equiv="refresh" content="10">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 450px; border: 1px solid #334155; }
        h1 { margin-top: 0; font-size: 1.4rem; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        .box { background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155; }
        .val { font-size: 1.3rem; font-weight: bold; margin-top: 0.2rem; }
        .green { color: #4ade80; }
        .sub { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Roblox 24/7 Scanner <span>🟢 ONLINE</span></h1>
        <div class="grid">
          <div class="box"><div class="sub">Total Checked</div><div class="val">${STATS.totalChecked}</div></div>
          <div class="box"><div class="sub">Available Found</div><div class="val green">${STATS.availableFound}</div></div>
          <div class="box"><div class="sub">Uptime</div><div class="val">${uptimeHours} hrs</div></div>
          <div class="box"><div class="sub">Check Speed</div><div class="val">${(STATS.currentDelay / 1000).toFixed(1)}s</div></div>
        </div>
        <div class="box" style="margin-top:1rem;">
          <div class="sub">Last Rare Found</div>
          <div class="val green">${STATS.lastFound}</div>
        </div>
      </div>
    </body>
    </html>
  `);
}).listen(PORT, () => {
  console.log(`[HTTP Server] Live on port ${PORT}`);
});

// 2. Configuration & State Management
const CONFIG = {
  mode: process.env.SCAN_MODE || 'all_genres',
  discordToken: process.env.DISCORD_BOT_TOKEN || '',
  mainChannelId: process.env.DISCORD_MAIN_CHANNEL_ID || '',
  historyChannelId: process.env.DISCORD_HISTORY_CHANNEL_ID || '',
  autoClaimEnabled: process.env.AUTO_CLAIM === 'true',
  baseDelayMs: 2000
};

const seenUsernames = new Set();
const lifetimeHistory = [];

const VOWELS = "aeiou";
const CONSONANTS = "bcdfghjklmnpqrstvwxyz";
const ALL_LETTERS = "abcdefghijklmnopqrstuvwxyz";

const WORDLISTS = {
  anime: ["kuro", "neko", "yuki", "sora", "kami", "ren", "tsuki", "hana", "kage", "ryu", "sen", "zero", "shin"],
  y2k_edgy: ["vamp", "void", "grim", "slay", "goth", "soul", "cult", "risk", "foul", "hex", "purg", "veil", "toxic"],
  cute_soft: ["luna", "faye", "silk", "cozy", "star", "halo", "blush", "petal", "miso", "plum", "dove", "glow", "angel"],
  og_roots: ["sky", "zen", "orb", "vox", "arc", "pix", "lux", "neo", "aura", "nova", "echo", "mist", "frost", "dusk"],
  compound_bases: ["frost", "void", "grim", "shadow", "dusk", "star", "glow", "silk", "moon", "cloud", "soul", "ember", "mist"],
  compound_suffixes: ["arc", "mist", "veil", "orb", "dusk", "faye", "halo", "petal", "aura", "spire", "glow", "byte", "pulse"]
};

// 3. Username Generators
function generateCandidate(selectedMode) {
  let mode = selectedMode;
  if (mode === 'all_genres') {
    const genres = ['pure3l', 'clean4l', 'anime', 'y2k_edgy', 'cute_soft', 'og_prefix', 'pseudo5l', 'compound_og'];
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

  if (mode === 'pseudo5l') {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v1 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v2 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const end = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    return { name: `${c1}${v1}${c2}${v2}${end}`, genre: "5-Letter Pseudoword" };
  }

  if (mode === 'compound_og') {
    const base = WORDLISTS.compound_bases[Math.floor(Math.random() * WORDLISTS.compound_bases.length)];
    let suffix = WORDLISTS.compound_suffixes[Math.floor(Math.random() * WORDLISTS.compound_suffixes.length)];
    while (suffix === base) {
      suffix = WORDLISTS.compound_suffixes[Math.floor(Math.random() * WORDLISTS.compound_suffixes.length)];
    }
    return { name: `${base}${suffix}`, genre: "Compound Double OG" };
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

// 4. 0-Robux Free Auto-Signup Module
function generateRandomPassword() {
  return 'Rbx!' + crypto.randomBytes(6).toString('hex') + '99';
}

async function claimUsernameOnRoblox(username) {
  const password = generateRandomPassword();

  try {
    const signupRes = await fetch("https://auth.roblox.com/v2/signup", {
      method: "POST",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password,
        birthday: "2000-01-01",
        gender: 2,
        isRbxIsUnder13: false
      })
    });

    const data = await signupRes.json();

    if (signupRes.ok && data.userId) {
      return {
        success: true,
        username: username,
        password: password,
        userId: data.userId
      };
    } else {
      const errReason = data.errors?.[0]?.message || `HTTP ${signupRes.status}`;
      return { success: false, reason: errReason };
    }
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// 5. Dual Verification Check
async function checkUsername(username) {
  const customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

// 6. Discord Bot Client & Slash Commands Setup
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

const slashCommands = [
  new SlashCommandBuilder().setName('status').setDescription('View live status and scan statistics'),
  new SlashCommandBuilder().setName('mode').setDescription('Change the username scan mode')
    .addStringOption(opt => opt.setName('genre').setDescription('Choose genre')
      .setRequired(true)
      .addChoices(
        { name: 'All Genres', value: 'all_genres' },
        { name: '5-Letter Pseudowords', value: 'pseudo5l' },
        { name: 'Compound Double OG', value: 'compound_og' },
        { name: 'Pure 3-Letter', value: 'pure3l' },
        { name: 'Clean 4-Letter', value: 'clean4l' },
        { name: 'Anime', value: 'anime' },
        { name: 'Y2K Edgy', value: 'y2k_edgy' },
        { name: 'Cute Soft', value: 'cute_soft' },
        { name: 'Semi-OG Prefix', value: 'og_prefix' }
      )),
  new SlashCommandBuilder().setName('history').setDescription('View lifetime found available usernames')
];

discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'status') {
    const uptime = ((Date.now() - STATS.startTime) / (1000 * 60 * 60)).toFixed(2);
    const embed = new EmbedBuilder()
      .setTitle("📊 Roblox Scanner Bot Status")
      .setColor(0x38bdf8)
      .addFields(
        { name: "Total Checked", value: `${STATS.totalChecked}`, inline: true },
        { name: "Available Found", value: `${STATS.availableFound}`, inline: true },
        { name: "Current Mode", value: `\`${CONFIG.mode}\``, inline: true },
        { name: "Uptime", value: `${uptime} hours`, inline: true },
        { name: "Auto-Claimer (0-Robux)", value: CONFIG.autoClaimEnabled ? "🟢 ENABLED" : "🔴 DISABLED", inline: true },
        { name: "Unique Memory", value: `${seenUsernames.size} names`, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'mode') {
    const newMode = interaction.options.getString('genre');
    CONFIG.mode = newMode;
    await interaction.reply(`✅ Scan mode updated to **\`${newMode}\`**!`);
  }

  if (interaction.commandName === 'history') {
    if (lifetimeHistory.length === 0) {
      return interaction.reply("📜 Lifetime History is currently empty. No rare names found yet.");
    }
    const historyList = lifetimeHistory.slice(-15).map((item, idx) => `${idx + 1}. \`${item.name}\` (${item.genre}) - *<t:${Math.floor(item.time / 1000)}:R>*`).join("\n");
    const embed = new EmbedBuilder()
      .setTitle("📜 Lifetime Username History (Recent 15)")
      .setDescription(historyList)
      .setColor(0x4ade80);
    await interaction.reply({ embeds: [embed] });
  }
});

// 7. Dispatch Alerts (Main + Lifetime History Channels)
async function dispatchAlert(candidate, claimResult) {
  if (CONFIG.mainChannelId) {
    const channel = await discordClient.channels.fetch(CONFIG.mainChannelId).catch(() => null);
    if (channel) {
      if (CONFIG.autoClaimEnabled && claimResult.success) {
        // SUCCESSFULLY CREATED NEW ACCOUNT FOR FREE!
        const embed = new EmbedBuilder()
          .setTitle("🎉 NEW ACCOUNT AUTOMATICALLY CREATED!")
          .setDescription(`The bot successfully registered this username for **0 Robux**!`)
          .setColor(0x00FF00)
          .addFields(
            { name: "👤 Username", value: `\`${claimResult.username}\``, inline: true },
            { name: "🔑 Generated Password", value: `||\`${claimResult.password}\`|| *(Click to reveal)*`, inline: true },
            { name: "🆔 User ID", value: `\`${claimResult.userId}\``, inline: true },
            { name: "🎭 Genre Style", value: `\`${candidate.genre}\``, inline: true }
          )
          .setFooter({ text: "Log in immediately at Roblox.com and change the password!" })
          .setTimestamp();

        await channel.send({ content: "🚨 **NEW RARE ACCOUNT CLAIMED!** 🚨", embeds: [embed] });
      } else {
        // MANUAL CLAIM LINK (If auto-claim disabled or CAPTCHA triggered)
        const embed = new EmbedBuilder()
          .setTitle("🚨 RARE USERNAME UNLOCKED!")
          .setDescription(`**Username:** \`${candidate.name}\`\n**Genre:** \`${candidate.genre}\`\n**Length:** \`${candidate.name.length} Letters\``)
          .setColor(CONFIG.autoClaimEnabled ? 0xFFA500 : 0x00FF00)
          .addFields(
            { 
              name: "⚡ Quick Claim Link", 
              value: `[Click Here to Register on Roblox](https://www.roblox.com/CreateAccount?returnUrl=https%3A%2F%2Fwww.roblox.com%2F%3Fnl%3Dtrue)` 
            }
          )
          .setTimestamp();

        if (CONFIG.autoClaimEnabled && !claimResult.success) {
          embed.addFields({ name: "⚠️ Auto-Claim Status", value: `Failed: \`${claimResult.reason}\` (Manual signup required)` });
        }

        await channel.send({ embeds: [embed] });
      }
    }
  }

  // History Channel Permanent Log
  if (CONFIG.historyChannelId) {
    const histChannel = await discordClient.channels.fetch(CONFIG.historyChannelId).catch(() => null);
    if (histChannel) {
      const histEmbed = new EmbedBuilder()
        .setTitle("📜 History Entry")
        .setDescription(`\`${candidate.name}\` | **Genre:** ${candidate.genre} | **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setColor(0x38bdf8);
      histChannel.send({ embeds: [histEmbed] });
    }
  }
}

// 8. Scanner Loop with Unbounded Deduplication
async function startScanner() {
  console.log("🚀 Multi-Feature Roblox Scanner Booting...");

  if (CONFIG.discordToken) {
    try {
      await discordClient.login(CONFIG.discordToken);
      console.log(`🤖 Logged into Discord as ${discordClient.user.tag}`);

      const rest = new REST().setToken(CONFIG.discordToken);
      await rest.put(
        Routes.applicationCommands(discordClient.user.id),
        { body: slashCommands }
      );
      console.log("⚡ Discord Slash Commands Registered!");
    } catch (e) {
      console.error("Discord Login Error:", e.message);
    }
  }

  while (true) {
    try {
      // Unbounded retry filter ensuring zero repeat username checks
      let candidate;
      do {
        candidate = generateCandidate(CONFIG.mode);
      } while (seenUsernames.has(candidate.name));

      seenUsernames.add(candidate.name);

      const status = await checkUsername(candidate.name);

      if (status === 'available') {
        STATS.availableFound++;
        STATS.lastFound = `${candidate.name} (${candidate.genre})`;
        lifetimeHistory.push({ name: candidate.name, genre: candidate.genre, time: Date.now() });

        console.log(`\x1b[32m[AVAILABLE] ${candidate.name} (${candidate.genre})\x1b[0m`);

        let claimResult = { success: false, reason: "Disabled" };
        if (CONFIG.autoClaimEnabled) {
          claimResult = await claimUsernameOnRoblox(candidate.name);
        }

        await dispatchAlert(candidate, claimResult);
        STATS.currentDelay = CONFIG.baseDelayMs;
      } else if (status === 'taken') {
        STATS.totalChecked++;
        console.log(`[Taken] ${candidate.name} (${candidate.genre}) [Unique Memory: ${seenUsernames.size}]`);
        STATS.currentDelay = CONFIG.baseDelayMs;
      } else if (status === 'ratelimit') {
        console.warn("⚠️ Rate limited. Pausing 15s...");
        STATS.currentDelay = 15000;
      } else if (status === 'error') {
        STATS.currentDelay = 5000;
      }
    } catch (err) {
      STATS.currentDelay = 10000;
    }

    await new Promise(r => setTimeout(r, STATS.currentDelay));
  }
}

startScanner();
