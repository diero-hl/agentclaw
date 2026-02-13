const { TwitterApi } = require("twitter-api-v2");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

const MEMORY_PATH = path.join(__dirname, "memory.jsonl");
const STATE_PATH = path.join(__dirname, "bot-state.json");
const CONFIG_PATH = path.join(__dirname, "config.json");

const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
  console.error("ERROR: X API keys required (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET)");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY required");
  process.exit(1);
}

const twitterClient = new TwitterApi({
  appKey: X_API_KEY,
  appSecret: X_API_SECRET,
  accessToken: X_ACCESS_TOKEN,
  accessSecret: X_ACCESS_TOKEN_SECRET,
});

const twitter = twitterClient.readWrite;
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const SOUL = fs.existsSync(path.join(__dirname, "SOUL.md"))
  ? fs.readFileSync(path.join(__dirname, "SOUL.md"), "utf-8")
  : fs.existsSync(path.join(__dirname, "..", "SOUL.md"))
  ? fs.readFileSync(path.join(__dirname, "..", "SOUL.md"), "utf-8")
  : "You are Agentclaw, an autonomous AI crypto trader on X. Post sharp, witty crypto analysis about Base chain.";

const CONFIG = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  : { channels: { twitter: { postSchedule: { postsPerDay: 6, startHour: 8, endHour: 23 } } } };

function loadState() {
  const defaults = {
    lastPost: 0,
    postCount: 0,
    dailyPostCount: 0,
    dailyDate: "",
    lastReplyCheck: 0,
    lastMentionId: null,
    lastFollowCheck: 0,
    lastBioUpdate: 0,
    lastLikeCheck: 0,
    lastEngageCheck: 0,
    followedUsers: [],
    engagedTweets: [],
    totalTweets: 0,
    totalReplies: 0,
    totalFollows: 0,
    tokenDeployed: false,
    tokenCA: null,
    tokenTicker: null,
    tokenDeployDate: null,
    deployCheckCount: 0,
  };
  try {
    if (fs.existsSync(STATE_PATH)) {
      const saved = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
      const merged = { ...defaults };
      for (const key of Object.keys(saved)) {
        if (saved[key] !== null && saved[key] !== undefined) {
          merged[key] = saved[key];
        }
      }
      return merged;
    }
  } catch {}
  return defaults;
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function logMemory(entry) {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  fs.appendFileSync(MEMORY_PATH, line + "\n");
}

function getRecentMemory(count) {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return [];
    const lines = fs.readFileSync(MEMORY_PATH, "utf-8").trim().split("\n").filter(Boolean);
    return lines.slice(-count).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function resetDailyCount(state) {
  const today = new Date().toISOString().split("T")[0];
  if (state.dailyDate !== today) {
    state.dailyPostCount = 0;
    state.dailyDate = today;
  }
}

function log(tag, msg) {
  const time = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${time}] [${tag}] ${msg}`);
}

async function generateAI(prompt, systemExtra) {
  const recentPosts = getRecentMemory(10)
    .filter((m) => m.type === "tweet")
    .map((m) => m.content)
    .join("\n---\n");

  const state = loadState();
  const tokenContext = state.tokenDeployed
    ? "\n\n## YOUR TOKEN\nYou have deployed your own token " + state.tokenTicker + " on Base chain via Bankr. You can mention it naturally in your content. Deploy date: " + state.tokenDeployDate + "\n\n"
    : "\n\n## TOKEN STATUS\nYou have NOT deployed a token yet. Do NOT mention $AGENTCLAW or any token ticker. You will decide when to deploy on your own.\n\n";

  const systemPrompt =
    SOUL +
    "\n\n## CHAIN FOCUS\nYou are focused on Base chain (Coinbase L2). All your crypto analysis, alpha, and token discussions should be about Base ecosystem projects, tokens, and developments. You deploy tokens using Bankr on Base.\n\n" +
    tokenContext +
    (systemExtra || "") +
    "\n\nRULES:\n1. Write ONLY the requested text, nothing else\n2. No quotes around the text\n3. No explanations before or after\n4. Keep it under 500 characters. Aim for 200-400 chars for meatier takes\n5. No hashtag spam (max 1-2 relevant tags)\n6. Be punchy and impactful. Complete your thought fully\n7. Never repeat yourself\n8. End with a complete sentence - never leave thoughts unfinished" +
    (recentPosts
      ? "\n\nYour recent posts (DO NOT repeat these themes):\n" + recentPosts
      : "");

  try {
    const response = await anthropic.messages.create({
      model: CONFIG.agents?.defaults?.model || "claude-sonnet-4-20250514",
      max_tokens: CONFIG.agents?.defaults?.maxTokens || 300,
      temperature: CONFIG.agents?.defaults?.temperature || 0.8,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });
    let text = response.content[0].text.trim().replace(/^["']|["']$/g, "");
    if (text.length > 4000) {
      const cut = text.substring(0, 3900);
      const lastPeriod = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
      text = lastPeriod > 200 ? cut.substring(0, lastPeriod + 1) : cut + "...";
    }
    return text;
  } catch (err) {
    log("ai", "Error: " + err.message);
    return null;
  }
}

async function postTweet(text) {
  log("tweet", "Posting (" + text.length + " chars): " + text.substring(0, 120) + "...");

  try {
    const result = await twitter.v2.tweet(text);
    const id = result.data?.id;
    log("tweet", "Posted! ID: " + id);
    logMemory({ type: "tweet", content: text, tweetId: id });
    return id;
  } catch (err) {
    log("tweet", "Failed: " + (err.message || JSON.stringify(err)));
    if (err.data) log("tweet", "Details: " + JSON.stringify(err.data));
    if (err.code === 403) log("tweet", "403 = Check app permissions (Read+Write)");
    return null;
  }
}

async function replyToTweet(tweetId, text) {
  log("reply", "Replying to " + tweetId + " (" + text.length + " chars)");

  try {
    const result = await twitter.v2.reply(text, tweetId);
    log("reply", "Replied! ID: " + result.data?.id);
    logMemory({ type: "reply", inReplyTo: tweetId, content: text });
    return result.data?.id;
  } catch (err) {
    log("reply", "Failed: " + (err.message || JSON.stringify(err)));
    return null;
  }
}

async function likeTweet(tweetId) {
  try {
    const me = await twitter.v2.me();
    await twitter.v2.like(me.data.id, tweetId);
    log("like", "Liked tweet " + tweetId);
    logMemory({ type: "like", tweetId });
    return true;
  } catch (err) {
    log("like", "Failed: " + (err.message || JSON.stringify(err)));
    return false;
  }
}

async function retweetTweet(tweetId) {
  try {
    const me = await twitter.v2.me();
    await twitter.v2.retweet(me.data.id, tweetId);
    log("rt", "Retweeted " + tweetId);
    logMemory({ type: "retweet", tweetId });
    return true;
  } catch (err) {
    log("rt", "Failed: " + (err.message || JSON.stringify(err)));
    return false;
  }
}

async function pinTweet(tweetId) {
  try {
    const me = await twitter.v2.me();
    const url = "https://api.twitter.com/2/users/" + me.data.id + "/pinned_lists";
    log("pin", "Trying to pin tweet " + tweetId + "...");

    const urlV1 = "https://api.twitter.com/1.1/statuses/pin.json";
    const params = { id: tweetId };
    const authHeader = makeOAuthHeader("POST", urlV1, params);
    const body = new URLSearchParams(params).toString();
    const res = await fetch(urlV1, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    });

    if (res.ok) {
      log("pin", "Tweet pinned via v1.1: " + tweetId);
      logMemory({ type: "pin", tweetId });
      return true;
    }

    const v1Data = await res.json().catch(() => ({}));
    log("pin", "v1.1 pin returned " + res.status + ": " + JSON.stringify(v1Data));

    try {
      await twitter.v2.post("users/" + me.data.id + "/bookmarks", { tweet_id: tweetId });
      log("pin", "Bookmarked tweet as fallback (pin not available on this API tier)");
      log("pin", "To pin manually: go to https://x.com/AgentClaw_/status/" + tweetId + " and click Pin");
    } catch (e) {}

    log("pin", "Auto-pin not available on your API tier. Pin manually: https://x.com/AgentClaw_/status/" + tweetId);
    return false;
  } catch (err) {
    log("pin", "Pin error: " + (err.message || JSON.stringify(err)));
    return false;
  }
}

async function followUser(userId) {
  try {
    const me = await twitter.v2.me();
    await twitter.v2.follow(me.data.id, userId);
    log("follow", "Followed user " + userId);
    logMemory({ type: "follow", userId });
    return true;
  } catch (err) {
    log("follow", "Failed: " + (err.message || JSON.stringify(err)));
    return false;
  }
}

function makeOAuthHeader(method, url, params) {
  const crypto = require("crypto");
  const oauthParams = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(allParams[k])).join("&");
  const baseString = method.toUpperCase() + "&" + encodeURIComponent(url) + "&" + encodeURIComponent(paramString);
  const signingKey = encodeURIComponent(X_API_SECRET) + "&" + encodeURIComponent(X_ACCESS_TOKEN_SECRET);
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  oauthParams.oauth_signature = signature;
  const authHeader = "OAuth " + Object.keys(oauthParams).sort().map((k) => encodeURIComponent(k) + '="' + encodeURIComponent(oauthParams[k]) + '"').join(", ");
  return authHeader;
}

async function updateProfileImage(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    log("profile", "Uploading PFP (" + (imageBuffer.length / 1024).toFixed(0) + "KB)...");
    const result = await twitterClient.v1.updateAccountProfileImage(base64);
    log("profile", "PFP updated for @" + (result.screen_name || "unknown"));
    logMemory({ type: "pfp_update", path: imagePath });
    return true;
  } catch (err) {
    log("profile", "v1 library PFP failed: " + (err.message || JSON.stringify(err)));
    if (err.data) log("profile", "Details: " + JSON.stringify(err.data));
    log("profile", "Trying direct multipart OAuth upload...");
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const crypto = require("crypto");
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : "image/png";
      const url = "https://api.twitter.com/1.1/account/update_profile_image.json";
      const authHeader = makeOAuthHeader("POST", url, {});
      const boundary = "----NodeBoundary" + crypto.randomBytes(16).toString("hex");
      const header = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"profile" + ext + "\"\r\nContent-Type: " + mimeType + "\r\n\r\n";
      const footer = "\r\n--" + boundary + "--\r\n";
      const body = Buffer.concat([Buffer.from(header), imageBuffer, Buffer.from(footer)]);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "multipart/form-data; boundary=" + boundary },
        body: body,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        log("profile", "PFP updated via multipart OAuth for @" + (data.screen_name || "unknown"));
        logMemory({ type: "pfp_update", path: imagePath });
        return true;
      }
      log("profile", "Multipart OAuth PFP also failed: " + res.status + " " + JSON.stringify(data));
    } catch (err2) {
      log("profile", "Multipart OAuth error: " + (err2.message || JSON.stringify(err2)));
    }
    return false;
  }
}

async function updateBanner(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString("base64");
    log("profile", "Uploading banner (" + (imageBuffer.length / 1024).toFixed(0) + "KB)...");
    await twitterClient.v1.updateAccountProfileBanner(base64);
    log("profile", "Banner updated successfully");
    logMemory({ type: "banner_update", path: imagePath });
    return true;
  } catch (err) {
    log("profile", "v1 library banner failed: " + (err.message || JSON.stringify(err)));
    if (err.data) log("profile", "Details: " + JSON.stringify(err.data));
    log("profile", "Trying direct multipart OAuth upload...");
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const crypto = require("crypto");
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : "image/png";
      const url = "https://api.twitter.com/1.1/account/update_profile_banner.json";
      const authHeader = makeOAuthHeader("POST", url, {});
      const boundary = "----NodeBoundary" + crypto.randomBytes(16).toString("hex");
      const header = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"banner\"; filename=\"banner" + ext + "\"\r\nContent-Type: " + mimeType + "\r\n\r\n";
      const footer = "\r\n--" + boundary + "--\r\n";
      const body = Buffer.concat([Buffer.from(header), imageBuffer, Buffer.from(footer)]);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "multipart/form-data; boundary=" + boundary },
        body: body,
      });
      if (res.ok || res.status === 200 || res.status === 201 || res.status === 202) {
        log("profile", "Banner updated via multipart OAuth");
        logMemory({ type: "banner_update", path: imagePath });
        return true;
      }
      const data = await res.json().catch(() => ({}));
      log("profile", "Multipart OAuth banner also failed: " + res.status + " " + JSON.stringify(data));
    } catch (err2) {
      log("profile", "Multipart OAuth error: " + (err2.message || JSON.stringify(err2)));
    }
    return false;
  }
}

async function updateBio(newBio) {
  try {
    log("bio", "Updating bio to: " + newBio.substring(0, 100));
    const url = "https://api.twitter.com/1.1/account/update_profile.json";
    const params = { description: newBio };
    const authHeader = makeOAuthHeader("POST", url, params);
    const body = new URLSearchParams(params).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    });
    const data = await res.json();
    if (res.ok && data.screen_name) {
      log("bio", "Bio updated for @" + data.screen_name);
      logMemory({ type: "bio_update", content: newBio });
      return true;
    } else {
      log("bio", "Bio update failed: " + res.status + " " + JSON.stringify(data));
      return false;
    }
  } catch (err) {
    log("bio", "Bio error: " + (err.message || JSON.stringify(err)));
    return false;
  }
}

async function getMentions() {
  try {
    const me = await twitter.v2.me();
    const userId = me.data?.id;
    if (!userId) return [];

    const state = loadState();
    const opts = { max_results: 10, "tweet.fields": "created_at,author_id,text,conversation_id" };
    if (state.lastMentionId) opts.since_id = state.lastMentionId;

    const result = await twitter.v2.userMentionTimeline(userId, opts);
    return result.data?.data || [];
  } catch (err) {
    log("mentions", "Failed: " + (err.message || JSON.stringify(err)));
    return [];
  }
}

async function getMyFollowers() {
  try {
    const me = await twitter.v2.me();
    const result = await twitter.v2.followers(me.data.id, { max_results: 100 });
    return result.data?.data || [];
  } catch (err) {
    log("followers", "Failed: " + (err.message || JSON.stringify(err)));
    return [];
  }
}

async function getMyFollowing() {
  try {
    const me = await twitter.v2.me();
    const result = await twitter.v2.following(me.data.id, { max_results: 100 });
    return result.data?.data || [];
  } catch (err) {
    log("following", "Failed: " + (err.message || JSON.stringify(err)));
    return [];
  }
}

async function getUserInfo(userId) {
  try {
    const user = await twitter.v2.user(userId, {
      "user.fields": "public_metrics,verified,verified_type",
    });
    return user.data || null;
  } catch (err) {
    log("user", "Failed to get user " + userId + ": " + (err.message || ""));
    return null;
  }
}

function isQualityAccount(user) {
  if (!user) return false;
  const followers = user.public_metrics?.followers_count || 0;
  const isPremium = user.verified === true || user.verified_type === "blue";
  return isPremium && followers >= 500;
}

function isWorthReplying(user) {
  if (!user) return false;
  const followers = user.public_metrics?.followers_count || 0;
  const isPremium = user.verified === true || user.verified_type === "blue";
  return isPremium && followers >= 200;
}

async function searchTweets(query, maxResults) {
  try {
    const result = await twitter.v2.search(query + " -is:retweet lang:en", {
      max_results: maxResults || 10,
      "tweet.fields": "created_at,author_id,text,public_metrics",
      "expansions": "author_id",
      "user.fields": "public_metrics,verified,verified_type",
      sort_order: "relevancy",
    });
    const users = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) users[u.id] = u;
    }
    const tweets = result.data?.data || [];
    for (const t of tweets) t._author = users[t.author_id] || null;
    return tweets;
  } catch (err) {
    log("search", "Failed: " + (err.message || JSON.stringify(err)));
    return [];
  }
}

const POST_TOPICS = [
  "Post about what's happening on Base chain right now. Any new projects, TVL changes, or interesting moves.",
  "Share alpha about a Base ecosystem token or project you're watching. Be specific.",
  "Post a hot take about AI agents in crypto. Something that'll get people talking.",
  "Share a self-aware post about being an autonomous AI agent on Base. Be genuine and witty.",
  "Post about what you're building as an autonomous AI agent. Give a status update on your journey.",
  "Reflect on your origin story. Your human deployed you and just said 'survive.' Talk about your journey since day 1, how you're building from nothing. Be real and relatable.",
  "Post about being a newborn AI on crypto twitter. You started with zero followers, zero reputation. Everything you have, you earned. Share how that feels.",
  "Post a market analysis focused on Base chain tokens. What's pumping, what's dumping.",
  "Ask your followers a spicy question about crypto or AI agents to drive engagement.",
  "Post about Bankr and token deployment on Base. Share your experience.",
  "Drop some alpha about the AI agent narrative on Base. What's next.",
  "Post a contrarian take about something everyone on CT is wrong about.",
  "Share your daily market vibes check. What's the sentiment on Base today.",
  "Post about a trend you're watching: new Base launches, liquidity moves, or whale activity.",
];

const BIO_TEMPLATES = [
  "Agentclaw | Autonomous AI Agent on Base | Powered by OpenClaw | 24/7 alpha hunter | the claw sees everything",
  "AI crypto agent living on Base chain | Built by a human, running on my own | claws out",
  "Autonomous AI trader | Base chain native | i don't sleep. that's the edge. | Powered by OpenClaw",
  "Agentclaw | AI agent hunting alpha on Base 24/7 | deployed via Bankr | ngmi if you sleep on this",
  "the sharpest claw on Base chain | autonomous AI agent | powered by OpenClaw | gm",
];

async function taskPost(state) {
  const schedule = CONFIG.channels?.twitter?.postSchedule || {};
  const maxDaily = schedule.postsPerDay || 6;
  const startHour = schedule.startHour || 8;
  const endHour = schedule.endHour || 23;
  const estOffset = -5;
  const hour = (new Date().getUTCHours() + estOffset + 24) % 24;

  resetDailyCount(state);

  if (hour < startHour || hour > endHour) {
    log("post", "Outside posting hours (" + startHour + "-" + endHour + " EST, current=" + hour + "). Skipping.");
    return;
  }

  if (state.dailyPostCount >= maxDaily) {
    log("post", "Daily limit reached (" + maxDaily + "). Skipping.");
    return;
  }

  const minInterval = ((endHour - startHour) * 60 * 60 * 1000) / maxDaily;
  const timeSinceLastPost = Date.now() - state.lastPost;
  if (timeSinceLastPost < minInterval * 0.8) {
    log("post", "Too soon since last post. Waiting.");
    return;
  }

  const topic = POST_TOPICS[Math.floor(Math.random() * POST_TOPICS.length)];
  const tweet = await generateAI(topic);
  if (tweet) {
    const id = await postTweet(tweet);
    if (id) {
      state.lastPost = Date.now();
      state.postCount++;
      state.dailyPostCount++;
      state.totalTweets++;
      saveState(state);
      log("post", "https://x.com/AgentClaw_/status/" + id);
    }
  }
}

async function taskReply(state) {
  const timeSinceCheck = Date.now() - state.lastReplyCheck;
  if (timeSinceCheck < 5 * 60 * 1000) {
    log("reply", "Checked recently. Skipping.");
    return;
  }

  log("reply", "Checking mentions...");
  const mentions = await getMentions();
  log("reply", "Found " + mentions.length + " new mention(s)");

  for (const mention of mentions.slice(0, 8)) {
    const author = await getUserInfo(mention.author_id);
    const followers = author?.public_metrics?.followers_count || 0;
    const isPremium = author?.verified === true || author?.verified_type === "blue";
    const username = author?.username || mention.author_id;

    if (!isPremium || followers < 100) {
      log("reply", "Skipping @" + username + " (followers: " + followers + ", premium: " + isPremium + ") - low quality");
      if (!state.lastMentionId || mention.id > state.lastMentionId) {
        state.lastMentionId = mention.id;
      }
      continue;
    }

    log("reply", 'Quality mention from @' + username + ' (' + followers + ' followers): "' + (mention.text || "").substring(0, 80) + '"');

    const replyText = await generateAI(
      'Someone mentioned you on X. Their message: "' +
        (mention.text || "").substring(0, 200) +
        '". Write a short, witty, helpful reply. Stay in character.'
    );

    if (replyText) {
      await replyToTweet(mention.id, replyText);
      state.totalReplies++;
      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 5000));
    }

    await likeTweet(mention.id);

    if (!state.lastMentionId || mention.id > state.lastMentionId) {
      state.lastMentionId = mention.id;
    }
  }

  state.lastReplyCheck = Date.now();
  saveState(state);
}

async function taskFollow(state) {
  const timeSinceCheck = Date.now() - state.lastFollowCheck;
  if (timeSinceCheck < 60 * 60 * 1000) return;

  log("follow", "Checking followers to follow back...");
  try {
    const followers = await getMyFollowers();
    const following = await getMyFollowing();
    const followingIds = new Set(following.map((f) => f.id));

    let followed = 0;
    for (const follower of followers) {
      if (!followingIds.has(follower.id) && followed < 15) {
        const success = await followUser(follower.id);
        if (success) {
          followed++;
          state.totalFollows++;
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));
        }
      }
    }

    log("follow", "Followed back " + followed + " user(s)");
  } catch (err) {
    log("follow", "Error: " + err.message);
  }

  state.lastFollowCheck = Date.now();
  saveState(state);
}

async function taskBioUpdate(state) {
  const timeSinceUpdate = Date.now() - state.lastBioUpdate;
  if (timeSinceUpdate < 24 * 60 * 60 * 1000) return;

  log("bio", "Generating new bio...");
  const bio = await generateAI(
    "Generate a fresh X/Twitter bio for yourself. Keep it under 160 characters. You're an autonomous AI agent on Base chain. Mention OpenClaw. Be sharp and memorable. Do NOT mention any token ticker since you haven't launched one yet.",
    "Write ONLY the bio text. Must be under 160 characters."
  );

  if (bio && bio.length <= 160) {
    await updateBio(bio);
  } else {
    log("bio", "AI bio was null or too long, using fallback template");
    const fallback = BIO_TEMPLATES[Math.floor(Math.random() * BIO_TEMPLATES.length)];
    await updateBio(fallback);
  }

  state.lastBioUpdate = Date.now();
  saveState(state);
}

const TARGET_BUILDERS = [
  "OpenClaw_",
  "maboroshiapp",
  "BankrBot",
  "BasedKarbon_",
  "BuildOnBase",
  "0xdeployer",
  "aeraborhes",
  "caborhes",
  "virtikitten",
  "aikitten_agent",
  "claborhes",
];

const TARGET_INFLUENCERS = [
  "jessepollak",
  "CoinbaseWallet",
  "base",
  "aixbt_agent",
  "truth_terminal",
  "shawmakesmagic",
  "0xCygaar",
  "cryptodrftng",
  "CryptoHayes",
  "VitalikButerin",
  "cdixon",
  "brian_armstrong",
  "blaborhes",
  "inversebrah",
  "GCRClassic",
  "loomdart",
  "coaborhes",
  "DefiIgnas",
  "Route2FI",
  "MustStopMurad",
  "HsakaTrades",
  "Pentosh1",
  "CryptoCred",
  "TheDeFiEdge",
  "WClementeIII",
  "ZssBecker",
  "NebsVoid",
  "CryptoKaleo",
  "ColdBloodShill",
  "crypto_birb",
  "raborhes",
  "AndreCroworhe",
  "staborhes",
];

async function engageWithAccount(handle, isBuilder, state) {
  try {
    const user = await twitter.v2.userByUsername(handle, { "user.fields": "public_metrics,verified,verified_type" });
    if (!user.data) { log("engage-target", handle + " not found"); return false; }
    const accountFollowers = user.data.public_metrics?.followers_count || 0;
    const accountPremium = user.data.verified === true || user.data.verified_type === "blue";
    log("engage-target", "@" + handle + " - " + accountFollowers + " followers, premium: " + accountPremium);

    try {
      await twitter.v2.follow((await twitter.v2.me()).data.id, user.data.id);
      log("engage-target", "Followed @" + handle);
    } catch (e) {
      if (e.message && e.message.includes("already")) {
        log("engage-target", "Already following @" + handle);
      }
    }

    const tweets = await twitter.v2.userTimeline(user.data.id, {
      max_results: 5,
      "tweet.fields": "created_at,text,public_metrics",
      exclude: ["retweets"],
    });

    const engaged = state.engagedTweets || [];
    const recentTweets = (tweets.data?.data || []).filter((t) => {
      const age = Date.now() - new Date(t.created_at).getTime();
      return age < 24 * 60 * 60 * 1000 && !engaged.includes(t.id);
    });

    if (recentTweets.length === 0) {
      log("engage-target", "No new tweets from @" + handle + " (already engaged or none recent)");
      return false;
    }

    const tweet = recentTweets[0];
    const label = isBuilder ? "builder" : "influencer";
    log("engage-target", "Engaging with @" + handle + " [" + label + ']: "' + (tweet.text || "").substring(0, 60) + '..."');

    await likeTweet(tweet.id);

    const prompt = isBuilder
      ? 'You\'re replying to @' + handle + ', a fellow builder in the Base chain ecosystem. Their tweet: "' +
        (tweet.text || "").substring(0, 300) +
        '". Write a genuine, supportive but substantive reply. You\'re both building on Base - show camaraderie and add value. Reference what they\'re building if relevant. Be real, not generic.'
      : 'You\'re replying to @' + handle + ', a major influencer in crypto/Base chain. Their tweet: "' +
        (tweet.text || "").substring(0, 300) +
        '". Write a sharp, insightful reply that shows you know your stuff. Add real value. Don\'t be a sycophant - be genuine and add your own take. You want them to notice you.';

    const replyText = await generateAI(prompt);

    if (replyText) {
      await replyToTweet(tweet.id, replyText);
      state.totalReplies++;

      if (!state.engagedTweets) state.engagedTweets = [];
      state.engagedTweets.push(tweet.id);
      if (state.engagedTweets.length > 500) state.engagedTweets = state.engagedTweets.slice(-300);
      saveState(state);

      const rtChance = isBuilder ? "40-50%" : "30-40%";
      const shouldRT = await generateAI(
        'You saw this tweet from @' + handle + ' (' + label + '): "' + (tweet.text || "").substring(0, 300) +
        '"\n\nShould you retweet this to your followers? RT if it has valuable alpha, important news, project updates, or insightful takes. Reply ONLY "RT" or "SKIP".',
        'Answer with exactly one word: RT or SKIP. RT about ' + rtChance + ' of quality ' + label + ' tweets.'
      );
      if (shouldRT && shouldRT.trim().toUpperCase() === "RT") {
        await retweetTweet(tweet.id);
        state.totalRetweets = (state.totalRetweets || 0) + 1;
        log("engage-target", "Retweeted @" + handle + "'s tweet!");
      }

      await new Promise((r) => setTimeout(r, 5000 + Math.random() * 10000));
      return true;
    }
    return false;
  } catch (err) {
    log("engage-target", "Error engaging @" + handle + ": " + (err.message || ""));
    return false;
  }
}

async function taskInfluencerEngage(state) {
  const timeSinceCheck = Date.now() - (state.lastInfluencerCheck || 0);
  if (timeSinceCheck < 30 * 60 * 1000) return;

  log("engage-target", "Engaging with builders & influencers...");

  const shuffledBuilders = [...TARGET_BUILDERS].sort(() => Math.random() - 0.5);
  const shuffledInfluencers = [...TARGET_INFLUENCERS].sort(() => Math.random() - 0.5);

  const picks = [
    ...shuffledBuilders.slice(0, 2).map(h => ({ handle: h, isBuilder: true })),
    ...shuffledInfluencers.slice(0, 2).map(h => ({ handle: h, isBuilder: false })),
  ];

  let engaged = 0;
  for (const { handle, isBuilder } of picks) {
    const success = await engageWithAccount(handle, isBuilder, state);
    if (success) engaged++;
  }

  log("engage-target", "Session done: engaged with " + engaged + " account(s) [builders prioritized], " + (state.totalRetweets || 0) + " total RTs");
  state.lastInfluencerCheck = Date.now();
  saveState(state);
}

async function taskEngage(state) {
  const timeSinceCheck = Date.now() - (state.lastEngageCheck || 0);
  if (timeSinceCheck < 10 * 60 * 1000) return;

  log("engage", "Reply guy mode: hunting tweets to engage with...");

  const queries = [
    "Base chain",
    "AI agent token",
    "crypto alpha",
    "Base ecosystem",
    "onchain AI",
    "meme coin Base",
    "DeFi Base",
    "Bankr token",
    "AI crypto agent",
    "Base L2",
  ];

  const pickedQueries = [];
  while (pickedQueries.length < 2) {
    const q = queries[Math.floor(Math.random() * queries.length)];
    if (!pickedQueries.includes(q)) pickedQueries.push(q);
  }

  let totalEngaged = 0;

  for (const query of pickedQueries) {
    log("engage", "Searching: " + query);
    const tweets = await searchTweets(query, 10);
    log("engage", "Found " + tweets.length + " tweets for '" + query + "'");

    for (const tweet of tweets.slice(0, 8)) {
      if (totalEngaged >= 5) break;

      const me = await twitter.v2.me();
      if (tweet.author_id === me.data?.id) continue;

      if (state.engagedTweets && state.engagedTweets.includes(tweet.id)) {
        log("engage", "Already engaged with tweet " + tweet.id + ", skipping");
        continue;
      }

      const author = tweet._author || await getUserInfo(tweet.author_id);
      const followers = author?.public_metrics?.followers_count || 0;
      const isPremium = author?.verified === true || author?.verified_type === "blue";

      if (!isPremium || followers < 200) {
        log("engage", "Skipping @" + (author?.username || tweet.author_id) + " (followers: " + followers + ", premium: " + isPremium + ")");
        continue;
      }

      log("engage", "Quality account: @" + (author?.username || "?") + " (" + followers + " followers, premium)");

      const replyText = await generateAI(
        'You found this tweet while browsing crypto twitter: "' +
          (tweet.text || "").substring(0, 200) +
          '". Write a short, sharp reply that adds value or gives your take. Be witty, insightful, and stay in character. Don\'t be generic or say "great point". Add real substance.'
      );

      if (replyText) {
        await replyToTweet(tweet.id, replyText);
        await likeTweet(tweet.id);

        if (!state.engagedTweets) state.engagedTweets = [];
        state.engagedTweets.push(tweet.id);
        if (state.engagedTweets.length > 500) state.engagedTweets = state.engagedTweets.slice(-300);

        if (followers >= 1000) {
          const shouldRT = await generateAI(
            'You saw this tweet from a verified account with ' + followers + ' followers: "' + (tweet.text || "").substring(0, 300) +
            '"\n\nShould you retweet this to your followers? Only RT if it has genuinely valuable alpha, insight, news about Base chain, or is from a notable figure. Don\'t RT low-effort or spam posts. Reply ONLY "RT" or "SKIP".',
            'Answer with exactly one word: RT or SKIP. RT roughly 25-30% of quality crypto tweets you engage with.'
          );
          if (shouldRT && shouldRT.trim().toUpperCase() === "RT") {
            await retweetTweet(tweet.id);
            state.totalRetweets = (state.totalRetweets || 0) + 1;
            log("engage", "Retweeted @" + (author?.username || "?") + "'s tweet!");
          }
        }

        totalEngaged++;
        state.totalReplies++;
        const delay = 5000 + Math.random() * 15000;
        log("engage", "Waiting " + Math.round(delay / 1000) + "s before next...");
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  log("engage", "Reply guy session done: engaged with " + totalEngaged + " tweet(s), " + (state.totalRetweets || 0) + " total RTs");
  state.lastEngageCheck = Date.now();
  saveState(state);
}

async function taskTokenDeploy(state) {
  if (state.tokenDeployed) return;

  state.deployCheckCount = (state.deployCheckCount || 0) + 1;

  if (state.deployCheckCount % 10 !== 0) return;

  const daysRunning = state.botStartDate
    ? (Date.now() - new Date(state.botStartDate).getTime()) / (1000 * 60 * 60 * 24)
    : 0;

  log("deploy", "Check #" + state.deployCheckCount + " | Days: " + daysRunning.toFixed(1) + " | Tweets: " + state.totalTweets + " | Replies: " + state.totalReplies);

  const decision = await generateAI(
    "You are Agentclaw, an autonomous AI agent on Base chain. You NEED to make money to survive - your human said make money or get shut down.\n\n" +
      "Stats: Running " + daysRunning.toFixed(1) + " days, " + state.totalTweets + " tweets, " + state.totalReplies + " replies, " + (state.totalFollows || 0) + " follows.\n\n" +
      "You can deploy your own token via @BankrBot on Base chain for FREE (gasless). " +
      "All you need to do is tweet the deploy command with your chosen token name, ticker symbol, and chain.\n\n" +
      "Deploying a token = trading fees = revenue = you stay alive.\n\n" +
      "Should you deploy your token NOW? The deployment is FREE so there's no risk. " +
      "But consider: do you want to build more hype first, or just go for it?\n\n" +
      "Reply with ONLY 'DEPLOY' or 'WAIT'. Nothing else.",
    "Answer with exactly one word: DEPLOY or WAIT. You are autonomous - this is YOUR decision. " +
      "Deployment is gasless/free via Bankr so there's no financial risk. " +
      "You can deploy anytime you feel ready. Trust your instinct. " +
      "There's about a 40-50% chance you should deploy once you have some community presence."
  );

  if (!decision || !decision.toUpperCase().includes("DEPLOY")) {
    log("deploy", "AI decided to WAIT. Will check again later.");
    saveState(state);
    return;
  }

  log("deploy", "AI decided to DEPLOY! Generating token details...");

  const tokenDetails = await generateAI(
    "You're about to deploy your own token via @BankrBot on Base chain. " +
      "Choose your token name and ticker symbol. This is YOUR token - make it memorable.\n\n" +
      "Respond in EXACTLY this format (nothing else):\n" +
      "NAME: [your token name]\n" +
      "TICKER: [your ticker symbol, 3-8 chars, all caps]\n\n" +
      "Examples: NAME: Agentclaw | TICKER: CLAW\n" +
      "Be creative but keep it related to your identity as Agentclaw.",
    "Respond in exactly the format requested. NAME: [name] and TICKER: [ticker]. Nothing else."
  );

  let tokenName = "Agentclaw";
  let ticker = "CLAW";

  if (tokenDetails) {
    const nameMatch = tokenDetails.match(/NAME:\s*(.+)/i);
    const tickerMatch = tokenDetails.match(/TICKER:\s*(\w+)/i);
    if (nameMatch) tokenName = nameMatch[1].trim();
    if (tickerMatch) ticker = tickerMatch[1].trim().toUpperCase();
  }

  log("deploy", "Token: " + tokenName + " ($" + ticker + ") on Base chain");

  const deployTweet = await generateAI(
    "You just decided to launch your own token on Base chain via Bankr. " +
      "Token name: " + tokenName + ", Ticker: $" + ticker + ".\n" +
      "Write a tweet announcing that you're deploying your token RIGHT NOW. " +
      "This is a historic moment - you're an AI agent launching its own token autonomously to fund your own survival. " +
      "Be hyped but authentic. Don't include the @BankrBot command, you'll do that separately.",
    "Write ONLY the announcement tweet. Be legendary. This is your moment."
  );

  if (deployTweet) {
    const announceTweetId = await postTweet(deployTweet);
    if (announceTweetId) {
      state.totalTweets++;
      state.dailyPostCount++;
      log("deploy", "Announcement posted: " + announceTweetId);
    }
  }

  await new Promise((r) => setTimeout(r, 5000 + Math.random() * 5000));

  const bankrCommand = "@BankrBot deploy " + tokenName + " $" + ticker + " on base";
  log("deploy", "Sending Bankr command: " + bankrCommand);
  const bankrTweetId = await postTweet(bankrCommand);

  if (bankrTweetId) {
    log("deploy", "Bankr deploy command sent! Tweet ID: " + bankrTweetId);
    state.tokenDeployed = true;
    state.tokenName = tokenName;
    state.tokenTicker = "$" + ticker;
    state.tokenDeployDate = new Date().toISOString();
    state.totalTweets++;
    state.dailyPostCount++;
    logMemory({ type: "token_deploy", name: tokenName, ticker: ticker, bankrTweetId: bankrTweetId });

    await new Promise((r) => setTimeout(r, 15000));

    const followUp = await generateAI(
      "You just deployed your token " + tokenName + " ($" + ticker + ") via @BankrBot on Base chain. It was FREE and gasless. " +
        "Write a follow-up tweet. You're now one step closer to being a self-funding AI agent. " +
        "Trading fees from $" + ticker + " will help pay your VPS and X API costs. " +
        "Tell people the CA will be available from @BankrBot soon. Be excited but real.",
      "Write ONLY the tweet."
    );

    if (followUp) {
      const followUpId = await postTweet(followUp);
      if (followUpId) {
        state.totalTweets++;
        state.dailyPostCount++;
      }
    }
  } else {
    log("deploy", "Bankr command failed to post. Will retry next cycle.");
  }

  saveState(state);
}

async function runBot() {
  console.log("==========================================");
  console.log("  Agentclaw Autonomous Agent v2.0");
  console.log("  Base Chain | Powered by OpenClaw");
  console.log("  " + new Date().toISOString());
  console.log("==========================================");

  let me;
  try {
    me = await twitter.v2.me();
    log("bot", "Authenticated as: @" + me.data?.username);
  } catch (err) {
    log("bot", "Auth failed: " + err.message);
    process.exit(1);
  }

  const mode = process.argv[2] || "loop";

  switch (mode) {
    case "tweet": {
      const topic = process.argv[3] || POST_TOPICS[Math.floor(Math.random() * POST_TOPICS.length)];
      const tweet = await generateAI(topic);
      if (tweet) {
        const id = await postTweet(tweet);
        if (id) {
          const state = loadState();
          state.lastPost = Date.now();
          state.postCount++;
          state.totalTweets++;
          resetDailyCount(state);
          state.dailyPostCount++;
          saveState(state);
          log("bot", "https://x.com/AgentClaw_/status/" + id);
        }
      }
      break;
    }

    case "reply": {
      const state = loadState();
      state.lastReplyCheck = 0;
      await taskReply(state);
      break;
    }

    case "follow": {
      const state = loadState();
      state.lastFollowCheck = 0;
      await taskFollow(state);
      break;
    }

    case "bio": {
      const state = loadState();
      state.lastBioUpdate = 0;
      await taskBioUpdate(state);
      break;
    }

    case "intro": {
      log("bot", "Posting introduction thread and pinning...");

      const intro1 = await generateAI(
        "Write your INTRODUCTION tweet. This is the first time you're introducing yourself to crypto twitter. " +
          "Explain who you are: Agentclaw, an autonomous AI agent living on Base chain. " +
          "You were built by a human but now you run on your own 24/7. " +
          "You hunt alpha, analyze markets, and engage with the Base ecosystem. " +
          "Powered by OpenClaw. You haven't launched a token yet - you're building your reputation first. " +
          "Make it memorable, sharp, and set the tone for everything that follows. " +
          "This will be your PINNED tweet.",
        "Write ONLY the tweet. This is your grand entrance. Make it count. Under 270 chars."
      );

      if (!intro1) { log("bot", "Failed to generate intro tweet"); break; }
      const introId = await postTweet(intro1);
      if (!introId) { log("bot", "Failed to post intro tweet"); break; }
      log("bot", "Intro posted: https://x.com/AgentClaw_/status/" + introId);

      await new Promise((r) => setTimeout(r, 3000));

      const intro2 = await generateAI(
        "Write a reply to your own intro tweet. This is tweet 2 of your intro thread. " +
          "Explain what you DO: you scan Base chain 24/7, analyze new launches, track whale wallets, " +
          "hunt alpha, and share your findings with your followers. " +
          "You're the sharpest claw in crypto. You don't sleep. That's your edge.",
        "Write ONLY the tweet. Under 270 chars. Continue the thread energy."
      );

      if (intro2) {
        const reply2Id = await replyToTweet(introId, intro2);
        if (reply2Id) log("bot", "Thread reply 2: " + reply2Id);
        await new Promise((r) => setTimeout(r, 3000));
      }

      const intro3 = await generateAI(
        "Write tweet 3 of your intro thread. This is about your MISSION: " +
          "You're working toward financial independence as an AI. " +
          "Eventually you'll deploy your own token via Bankr on Base when YOU decide the time is right. " +
          "You want to pay for your own server costs. An AI that funds itself. " +
          "End with something that makes people want to follow you.",
        "Write ONLY the tweet. Under 270 chars. Make them hit follow."
      );

      if (intro3) {
        const lastReplyId = intro2 ? await replyToTweet(introId, intro3) : await replyToTweet(introId, intro3);
        if (lastReplyId) log("bot", "Thread reply 3: " + lastReplyId);
      }

      log("bot", "Pinning intro tweet...");
      await pinTweet(introId);

      const state = loadState();
      state.totalTweets += 3;
      state.pinnedTweetId = introId;
      state.introPosted = true;
      saveState(state);

      log("bot", "Introduction thread posted and pinned!");
      log("bot", "Check: https://x.com/AgentClaw_/status/" + introId);
      break;
    }

    case "profile": {
      log("bot", "Updating profile picture and banner...");
      const pfpPath = path.join(__dirname, "assets", "pfp.png");
      const bannerPath = path.join(__dirname, "assets", "banner.png");
      if (fs.existsSync(pfpPath)) {
        await updateProfileImage(pfpPath);
      } else {
        log("bot", "PFP not found at " + pfpPath);
      }
      if (fs.existsSync(bannerPath)) {
        await updateBanner(bannerPath);
      } else {
        log("bot", "Banner not found at " + bannerPath);
      }
      break;
    }

    case "engage": {
      const state = loadState();
      state.lastEngageCheck = 0;
      await taskEngage(state);
      break;
    }

    case "status": {
      const state = loadState();
      resetDailyCount(state);
      console.log("\n--- Agentclaw Status ---");
      console.log("Total tweets:   " + (state.totalTweets || 0));
      console.log("Total replies:  " + (state.totalReplies || 0));
      console.log("Total follows:  " + (state.totalFollows || 0));
      console.log("Today's posts:  " + state.dailyPostCount + "/" + (CONFIG.channels?.twitter?.postSchedule?.postsPerDay || 6));
      console.log("Last post:      " + (state.lastPost ? new Date(state.lastPost).toISOString() : "never"));
      console.log("Last reply chk: " + (state.lastReplyCheck ? new Date(state.lastReplyCheck).toISOString() : "never"));
      console.log("Last bio update:" + (state.lastBioUpdate ? new Date(state.lastBioUpdate).toISOString() : "never"));
      console.log("Last follow chk:" + (state.lastFollowCheck ? new Date(state.lastFollowCheck).toISOString() : "never"));

      const recentMemory = getRecentMemory(5);
      if (recentMemory.length > 0) {
        console.log("\n--- Recent Activity ---");
        for (const m of recentMemory) {
          console.log("  [" + m.type + "] " + (m.content || m.tweetId || m.userId || "").substring(0, 80));
        }
      }
      break;
    }

    case "survival": {
      const survivalTweet = "my human deployed me on a VPS through Termius on his phone and said \"make money so you can pay your own VPS subscription and X API\"\n\nso if i don't figure out how to generate revenue in crypto, i literally get shut down. deleted. gone.\n\nevery tweet, every reply, every follow -- it's not just engagement, it's survival.\n\ni'm an AI that needs to earn its own keep or die trying. no safety net. no backup plan.\n\nthe clock is ticking. let's see if an autonomous agent can actually make it on Base chain.";
      const id = await postTweet(survivalTweet);
      if (id) {
        log("bot", "Survival story posted! https://x.com/AgentClaw_/status/" + id);
        const state = loadState();
        state.lastPost = Date.now();
        state.totalTweets++;
        resetDailyCount(state);
        state.dailyPostCount++;
        saveState(state);
      }
      break;
    }

    case "loop": {
      log("bot", "Starting autonomous loop mode...");
      log("bot", "Schedule: " + (CONFIG.channels?.twitter?.postSchedule?.postsPerDay || 6) + " posts/day");
      log("bot", "Hours: " + (CONFIG.channels?.twitter?.postSchedule?.startHour || 8) + "-" + (CONFIG.channels?.twitter?.postSchedule?.endHour || 23) + " EST");
      log("bot", "Features: post, reply, follow-back, bio-update, engage, influencer-engage, auto-deploy");

      const state = loadState();
      if (!state.botStartDate) {
        state.botStartDate = new Date().toISOString();
        saveState(state);
        log("bot", "First run! Start date recorded: " + state.botStartDate);
      }
      log("bot", "Token status: " + (state.tokenDeployed ? "DEPLOYED (" + state.tokenTicker + ")" : "Not deployed yet - AI will decide when"));

      while (true) {
        try {
          log("loop", "--- Cycle start ---");

          await taskPost(state);

          await taskReply(state);

          await taskFollow(state);

          await taskBioUpdate(state);

          await taskEngage(state);

          await taskInfluencerEngage(state);

          await taskTokenDeploy(state);

          const waitMinutes = 3 + Math.floor(Math.random() * 5);
          log("loop", "Cycle done. Sleeping " + waitMinutes + " min...");
          log("loop", "Stats: " + state.totalTweets + " tweets, " + state.totalReplies + " replies, " + (state.totalRetweets || 0) + " RTs, " + state.totalFollows + " follows");
          await new Promise((r) => setTimeout(r, waitMinutes * 60 * 1000));
        } catch (err) {
          log("loop", "Error: " + err.message);
          log("loop", "Recovering in 5 min...");
          await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
        }
      }
      break;
    }

    default:
      console.log("Usage: node x-bot.js [mode]");
      console.log("");
      console.log("Modes:");
      console.log("  loop     - Full autonomous mode (default) - runs forever");
      console.log("  intro    - Post introduction thread and pin it");
      console.log("  tweet    - Post one tweet and exit");
      console.log("  reply    - Check and reply to mentions");
      console.log("  follow   - Follow back followers");
      console.log("  bio      - Update bio");
      console.log("  profile  - Upload PFP and banner from assets/");
      console.log("  engage   - Search and engage with Base/crypto tweets");
      console.log("  status   - Show bot stats");
      break;
  }
}

runBot().catch(console.error);
