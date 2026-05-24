// Twitter OAuth 1.0a client for posting tweets on behalf of @FootPredictOM.
// Requires four env vars:
//   TWITTER_API_KEY            — Consumer Key (from Twitter Developer Portal)
//   TWITTER_API_SECRET         — Consumer Secret
//   TWITTER_ACCESS_TOKEN       — Access Token (for @FootPredictOM)
//   TWITTER_ACCESS_TOKEN_SECRET — Access Token Secret

import { TwitterApi } from "twitter-api-v2";

/**
 * Returns a Twitter v2 client authenticated for @FootPredictOM.
 * Throws if any required env var is missing.
 */
export function getTwitterClient(): TwitterApi {
  const { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET } = process.env;

  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_TOKEN_SECRET) {
    throw new Error(
      "Missing Twitter credentials. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET."
    );
  }

  return new TwitterApi({
    appKey: TWITTER_API_KEY,
    appSecret: TWITTER_API_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_TOKEN_SECRET,
  });
}

/** Post a tweet. Returns the created tweet id. */
export async function postTweet(text: string): Promise<string> {
  const client = getTwitterClient();
  const result = await client.v2.tweet(text);
  return result.data.id;
}
