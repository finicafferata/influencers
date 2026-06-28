// Pure URL → render-strategy helper for portfolio work samples. No network.
// v1: images render inline; YouTube renders an embed/thumbnail; TikTok/Instagram
// and everything else render as a link card.

export type EmbedKind = 'image' | 'youtube' | 'tiktok' | 'instagram' | 'link';

export interface Embed {
  kind: EmbedKind;
  /** iframe src for video embeds (YouTube only in v1). */
  embedUrl?: string;
  /** best-effort thumbnail (YouTube). */
  thumbnailUrl?: string;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return url.pathname.slice(1) || null;
  if (host.endsWith('youtube.com')) {
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const m = url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/);
    if (m) return m[1];
  }
  return null;
}

export function getEmbed(rawUrl: string): Embed {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'link' };
  }

  if (IMAGE_RE.test(url.pathname)) return { kind: 'image' };

  const yt = youtubeId(url);
  if (yt) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      thumbnailUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  const host = url.hostname.replace(/^www\./, '');
  if (host.endsWith('tiktok.com')) return { kind: 'tiktok' };
  if (host.endsWith('instagram.com')) return { kind: 'instagram' };

  return { kind: 'link' };
}
