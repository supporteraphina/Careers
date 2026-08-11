// Shared vocabulary for browser-recorded voice notes: which container formats
// we accept, how big a take may get, and the shape of the hosted link that
// becomes the answer value. Pure and dependency-free so the funnel runner, the
// upload route, and the playback route all agree on one definition.

/** Recording cap when a field does not set its own `maxSeconds`. */
export const DEFAULT_MAX_SECONDS = 60;

/**
 * Ceiling on an upload, generous enough for the worst-case container a browser
 * might hand us for a minute of speech, tight enough to bound a Postgres row.
 */
export const MAX_VOICE_BYTES = 12 * 1024 * 1024;

/**
 * Containers we accept, mapped to the extension we serve them under. Browsers
 * disagree here and there is no universal recording format: Chrome, Firefox and
 * Edge produce WebM/Opus, Safari produces MP4/AAC. We store whichever arrives
 * and serve it back with its own type rather than transcoding, which would mean
 * shipping ffmpeg into the container for no reviewer-visible gain.
 */
const CONTAINERS: ReadonlyArray<{ mime: string; ext: string }> = [
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/ogg', ext: 'ogg' },
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/mpeg', ext: 'mp3' },
  { mime: 'audio/wav', ext: 'wav' },
];

/** Preference order for MediaRecorder, best-supported and smallest first. */
export const RECORDER_MIME_CANDIDATES: readonly string[] = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
];

/** Strip codec parameters: 'audio/webm;codecs=opus' -> 'audio/webm'. */
export function baseMimeType(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase();
}

/** The extension we serve a container under, or null if we do not accept it. */
export function extensionForMime(mime: string): string | null {
  const base = baseMimeType(mime);
  return CONTAINERS.find((c) => c.mime === base)?.ext ?? null;
}

/** The content type to serve a stored extension back as. */
export function mimeForExtension(ext: string): string | null {
  return CONTAINERS.find((c) => c.ext === ext.toLowerCase())?.mime ?? null;
}

/** Public path for a stored recording. Absolute URLs are built from this. */
export function voiceNotePath(id: string, ext: string): string {
  return `/voice/${id}.${ext}`;
}

// cuid()s are lowercase alphanumeric; keep the match tight so the playback
// route never sees anything it has to sanitise.
const VOICE_PATH = /^\/voice\/([a-z0-9]{6,64})\.([a-z0-9]{2,4})$/i;

/**
 * The id inside a voice note link, or null if this is not one of ours. Accepts
 * the absolute URL we hand the client and the bare path, so a value that has
 * been through a draft resume or a copy-paste still resolves.
 */
export function voiceNoteIdFrom(value: string): string | null {
  const raw = value.trim();
  if (raw === '') return null;

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname;
    } catch {
      return null;
    }
  } else if (!raw.startsWith('/')) {
    return null;
  }

  const match = VOICE_PATH.exec(pathname);
  if (!match) return null;
  return mimeForExtension(match[2]) ? match[1] : null;
}

/** Whether a value looks like a link to a recording we host. */
export function isVoiceNotePath(value: string): boolean {
  return voiceNoteIdFrom(value) !== null;
}
