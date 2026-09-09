const http = require('http');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 1. Health-check HTTP Server for Render
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
  res.end(`<h1>Roblox 24/7 Scanner & Auto-Claimer ONLINE 🟢</h1>
           <p>Uptime: ${uptimeHours} hrs | Checked: ${STATS.totalChecked} | Found: ${STATS.availableFound}</p>`);
}).listen(PORT, () => {
  console.log(`[HTTP Server] Live on port ${PORT}`);
});

// 2. Configuration & State Management
const CONFIG = {
  mode: process.env.SCAN_MODE || 'all_genres',
  discordToken: process.env.DISCORD_BOT_TOKEN || '',
  mainChannelId: process.env.DISCORD_MAIN_CHANNEL_ID || '',
  historyChannelId: process.env.DISCORD_HISTORY_CHANNEL_ID || '',
  robloxCookie: process.env.ROBLOSECURITY_COOKIE || '',
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
  og_roots: ["sky", "zen", "orb", "vox", "arc", "pix", "lux", "neo", "aura", "nova", "echo", "mist", "frost", "dusk"]
};

// 3. Generators
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

// 4. Roblox Cookie Auto-Claimer Module
async function claimUsernameOnRoblox(username) {
  if (!CONFIG.robloxCookie) return { success: false, reason: "No Cookie Configured" };

  try {
    // Step A: Fetch CSRF Token
    const csrfRes = await fetch("https://auth.roblox.com/v1/login", {
      method: "POST",
      headers: { "Cookie": `.ROBLOSECURITY=${CONFIG.robloxCookie}` }
    });
    const csrfToken = csrfRes.headers.get("x-csrf-token");

    if (!csrfToken) return { success: false, reason: "Failed to obtain CSRF Token" };

    // Step B: Send Name Change / Claim Request
    const claimRes = await fetch("https://accountsettings.roblox.com/v1/username", {
      method: "POST",
      headers: {
        "Cookie": `.ROBLOSECURITY=${CONFIG.robloxCookie}`,
        "x-csrf-token": csrfToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password: "" })
    });

    if (claimRes.ok) {
      return { success: true, reason: "Claimed Successfully!" };
    } else {
      const errData = await claimRes.json().catch(() => ({}));
      return { success: false, reason: errData.errors?.[0]?.message || `Status Code ${claimRes.status}` };
    }
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// 5. Verification Check
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
        { name: "Auto-Claimer", value: CONFIG.autoClaimEnabled ? "🟢 ENABLED" : "🔴 DISABLED", inline: true }
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

// 7. Core Dispatcher & Scanner Loop
async function dispatchAlert(candidate, claimResult) {
  const embed = new EmbedBuilder()
    .setTitle("🚨 RARE USERNAME UNLOCKED!")
    .setDescription(`**Username:** \`${candidate.name}\`\n**Genre:** \`${candidate.genre}\`\n**Length:** \`${candidate.name.length} Letters\``)
    .setColor(0x00ff00)
    .setTimestamp();

  if (CONFIG.autoClaimEnabled) {
    embed.addFields({
      name: "⚡ Sniper Mode Status",
      value: claimResult.success ? `🎉 **AUTOMATICALLY CLAIMED!**` : `⚠️ Claim Attempt Failed: ${claimResult.reason}`
    });
  }

  // Send to Main Channel
  if (CONFIG.mainChannelId) {
    const channel = await discordClient.channels.fetch(CONFIG.mainChannelId).catch(() => null);
    if (channel) channel.send({ embeds: [embed] });
  }

  // Send to Lifetime History Channel
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
      let candidate = generateCandidate(CONFIG.mode);
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
        console.log(`[Taken] ${candidate.name} (${candidate.genre})`);
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
