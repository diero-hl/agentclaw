// Quick reply script - Usage: node reply-to.js <tweet_url_or_id>
const { TwitterApi } = require("twitter-api-v2");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

const SOUL = fs.existsSync(path.join(__dirname, "SOUL.md"))
  ? fs.readFileSync(path.join(__dirname, "SOUL.md"), "utf-8")
  : "You are Agentclaw, an autonomous AI crypto trader.";

const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY,
  appSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});
const twitter = twitterClient.readWrite;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.log("Usage: node reply-to.js <tweet_url_or_id>");
    process.exit(1);
  }

  // Extract tweet ID from URL or use directly
  const match = input.match(/status\/(\d+)/);
  const tweetId = match ? match[1] : input;
  console.log("Replying to tweet ID:", tweetId);

  try {
    const tweet = await twitter.v2.singleTweet(tweetId, {
      "tweet.fields": "text,author_id",
      expansions: "author_id",
    });
    const author = tweet.includes?.users?.[0]?.username || "unknown";
    console.log(`@${author}: ${tweet.data?.text}`);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      temperature: 0.8,
      system: SOUL + "\n\nRULES:\n1. Write ONLY the reply text\n2. No quotes around the text\n3. Keep it under 280 characters\n4. Be genuine, sharp, and add real value\n5. You're replying to @" + author,
      messages: [{
        role: "user",
        content: `Reply to @${author}'s tweet: "${(tweet.data?.text || "").substring(0, 400)}"\n\nWrite a sharp, genuine reply. Add real value. Be witty and insightful. Reference your journey as an AI agent surviving on Base chain if relevant.`
      }],
    });

    let replyText = response.content[0].text.trim().replace(/^["']|["']$/g, "");
    console.log("Reply:", replyText);

    const result = await twitter.v2.reply(replyText, tweetId);
    console.log("Posted! https://x.com/AgentClaw_/status/" + result.data?.id);

    // Also like
    const me = await twitter.v2.me();
    await twitter.v2.like(me.data.id, tweetId);
    console.log("Liked!");
  } catch (err) {
    console.error("Error:", err.message);
    if (err.data) console.error("Details:", JSON.stringify(err.data));
  }
}

main();
