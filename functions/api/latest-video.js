const CHANNEL_ID = "UCALZtGVdi97O-GT-y9RW_vQ";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

function decodeXml(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function onRequestGet() {
  try {
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent": "meteomaps.bg latest-video/1.0",
        "Accept": "application/atom+xml, application/xml, text/xml"
      }
    });

    if (!response.ok) {
      return Response.json(
        { error: `YouTube feed returned HTTP ${response.status}` },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const xml = await response.text();
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);

    if (!entryMatch) {
      return Response.json(
        { error: "No public video found in the YouTube feed" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const entry = entryMatch[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim();
    const rawTitle = entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
    const published = entry.match(/<published>([^<]+)<\/published>/i)?.[1]?.trim() || "";

    if (!videoId) {
      return Response.json(
        { error: "Could not extract videoId from YouTube feed" },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      {
        videoId,
        title: decodeXml(rawTitle),
        published,
        url: `https://www.youtube.com/watch?v=${videoId}`
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=900",
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: "Failed to load latest YouTube video",
        detail: String(error?.message || error)
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
}
