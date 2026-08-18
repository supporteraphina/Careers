'use client';

// In-funnel voice note recorder. Replaces the old "go to Vocaroo and paste a
// link back" step, which leaked applicants to a third-party site mid-funnel and
// produced links that expired, 404'd, or were pasted wrong.
//
// The recording uploads as soon as a take is kept, so by the time the applicant
// presses Continue the answer is already a hosted link on our own domain and
// the submission payload stays small.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  DEFAULT_MAX_SECONDS,
  RECORDER_MIME_CANDIDATES,
  DEFAULT_MIN_SECONDS,
  baseMimeType,
  extensionForMime,
} from '../lib/voice/format';

interface VoiceRecorderProps {
  slug: string;
  fieldId: string;
  /** Hosted link for the current take, or undefined before the first one. */
  value: string | undefined;
  maxSeconds?: number;
  minSeconds?: number;
  invalid?: boolean;
  onChange: (url: string) => void;
  onClear: () => void;
}

type Phase = 'idle' | 'arming' | 'recording' | 'uploading' | 'ready';

/** Bars in the live level meter. */
const METER_BARS = 28;

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The best container this browser will actually record. */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate) && extensionForMime(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Capability detection through useSyncExternalStore rather than an effect, so
// the server renders the recorder and the client only replaces it on a browser
// that genuinely cannot record. Capability never changes within a page life, so
// there is nothing to subscribe to.
const noopSubscribe = () => () => {};

function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    pickMimeType() !== null
  );
}

export default function VoiceRecorder({
  slug,
  fieldId,
  value,
  maxSeconds = DEFAULT_MAX_SECONDS,
  minSeconds = DEFAULT_MIN_SECONDS,
  invalid,
  onChange,
  onClear,
}: VoiceRecorderProps) {
  const [phase, setPhase] = useState<Phase>(value ? 'ready' : 'idle');
  const supported = useSyncExternalStore(noopSubscribe, canRecord, () => true);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => new Array(METER_BARS).fill(0));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const meterFrame = useRef<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const chunks = useRef<Blob[]>([]);
  // Set when the applicant cancels, so the stop handler discards the take
  // instead of uploading it.
  const discarding = useRef(false);
  const objectUrl = useRef<string | null>(null);

  const releaseHardware = useCallback(() => {
    if (meterFrame.current !== null) {
      cancelAnimationFrame(meterFrame.current);
      meterFrame.current = null;
    }
    if (ticker.current) {
      clearInterval(ticker.current);
      ticker.current = null;
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    analyser.current = null;
    if (audioContext.current && audioContext.current.state !== 'closed') {
      void audioContext.current.close().catch(() => {});
    }
    audioContext.current = null;
  }, []);

  // Tear everything down if the applicant navigates away mid-take: an open mic
  // after the question has passed is exactly the kind of thing that gets a
  // careers site distrusted.
  useEffect(
    () => () => {
      discarding.current = true;
      try {
        if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
      } catch {
        // Already torn down by the browser.
      }
      releaseHardware();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [releaseHardware],
  );

  const upload = useCallback(
    async (blob: Blob, recordedMs: number) => {
      setPhase('uploading');
      setError(null);
      try {
        const response = await fetch(
          `/api/voice?slug=${encodeURIComponent(slug)}&field=${encodeURIComponent(fieldId)}`,
          {
            method: 'POST',
            headers: {
              'content-type': baseMimeType(blob.type || 'audio/webm'),
              'x-voice-duration-ms': String(Math.round(recordedMs)),
            },
            body: blob,
          },
        );
        const body = (await response.json().catch(() => null)) as {
          url?: string;
          error?: string;
        } | null;
        if (!response.ok || !body?.url) {
          throw new Error(body?.error ?? 'Upload failed');
        }
        onChange(body.url);
        setPhase('ready');
      } catch (cause) {
        // The take is still in the player, so "Try again" costs nothing.
        setError(
          cause instanceof Error && cause.message !== 'Failed to fetch'
            ? `${cause.message}. Your recording is safe — try again.`
            : 'Could not save your recording. Check your connection and try again.',
        );
        setPhase('ready');
      }
    },
    [fieldId, onChange, slug],
  );

  const stop = useCallback(() => {
    if (recorder.current && recorder.current.state !== 'inactive') {
      recorder.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPhase('arming');
    discarding.current = false;

    const mimeType = pickMimeType();
    if (!mimeType) {
      setError('This browser cannot record audio. Try Chrome, Edge, Firefox or Safari.');
      setPhase('idle');
      return;
    }

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : '';
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access was blocked. Allow it in your browser settings, then try again.'
          : name === 'NotFoundError'
            ? 'No microphone found. Connect one and try again.'
            : 'Could not start recording. Check your microphone and try again.',
      );
      setPhase('idle');
      return;
    }

    stream.current = media;
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setPreviewUrl(null);
    setDuration(null);
    onClear();

    // Live level meter: proof to the applicant that the mic is actually hearing
    // them before they spend a minute talking into a dead input.
    try {
      const context = new AudioContext();
      audioContext.current = context;
      const node = context.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.75;
      context.createMediaStreamSource(media).connect(node);
      analyser.current = node;

      const data = new Uint8Array(node.frequencyBinCount);
      const paint = () => {
        const live = analyser.current;
        if (!live) return;
        live.getByteFrequencyData(data);
        // Low bins carry speech; weight them and normalise to a 0-1 bar height.
        const slice = data.subarray(0, Math.floor(data.length * 0.6));
        let sum = 0;
        for (const v of slice) sum += v;
        const level = Math.min(1, sum / slice.length / 120);
        setLevels((prev) => [...prev.slice(1), level]);
        meterFrame.current = requestAnimationFrame(paint);
      };
      meterFrame.current = requestAnimationFrame(paint);
    } catch {
      // No meter is survivable; recording matters more.
    }

    // 64 kbps is transparent for speech in Opus and keeps a full minute around
    // 480 KB, which is what each of these costs us as a Postgres row.
    const instance = new MediaRecorder(media, { mimeType, audioBitsPerSecond: 64_000 });
    chunks.current = [];
    recorder.current = instance;

    instance.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };

    instance.onstop = () => {
      const recordedMs = Date.now() - startedAt.current;
      releaseHardware();
      setLevels(new Array(METER_BARS).fill(0));

      if (discarding.current) {
        chunks.current = [];
        setPhase(value ? 'ready' : 'idle');
        return;
      }

      const blob = new Blob(chunks.current, { type: baseMimeType(mimeType) });
      chunks.current = [];
      if (blob.size === 0) {
        setError('That recording came back empty. Try again.');
        setPhase('idle');
        return;
      }

      const preview = URL.createObjectURL(blob);
      objectUrl.current = preview;
      setPreviewUrl(preview);
      setDuration(recordedMs / 1000);
      void upload(blob, recordedMs);
    };

    instance.onerror = () => {
      setError('Recording stopped unexpectedly. Try again.');
      releaseHardware();
      setPhase('idle');
    };

    startedAt.current = Date.now();
    setElapsed(0);
    // Timeslice keeps chunks flowing, so a tab crash costs seconds, not the take.
    instance.start(1000);
    setPhase('recording');

    ticker.current = setInterval(() => {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) stop();
    }, 100);
  }, [maxSeconds, onClear, releaseHardware, stop, upload, value]);

  const cancel = useCallback(() => {
    discarding.current = true;
    stop();
    setElapsed(0);
  }, [stop]);

  const again = useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setPreviewUrl(null);
    setDuration(null);
    setError(null);
    onClear();
    setPhase('idle');
  }, [onClear]);

  const retryUpload = useCallback(() => {
    if (!previewUrl) return;
    void fetch(previewUrl)
      .then((res) => res.blob())
      .then((blob) => upload(blob, (duration ?? 0) * 1000))
      .catch(() => setError('Could not save your recording. Try recording again.'));
  }, [duration, previewUrl, upload]);

  if (!supported) {
    return (
      <div className="vr" data-phase="unsupported">
        <p className="vr__unsupported">
          This browser cannot record audio. Open the application in Chrome, Edge, Firefox or
          Safari, or switch to your phone, and the recorder will appear here.
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, maxSeconds - elapsed);
  const saved = phase === 'ready' && Boolean(value);
  // Below the floor the stop button is inert, so a take can never be uploaded
  // only to bounce off the same rule on the server.
  const tooShort = elapsed < minSeconds;

  return (
    <div className="vr" data-phase={phase} aria-invalid={invalid || undefined}>
      {(phase === 'idle' || phase === 'arming') && (
        <div className="vr__stage">
          <button
            type="button"
            className="vr__record"
            onClick={() => void start()}
            disabled={phase === 'arming'}
            aria-label={`Record your ${maxSeconds}-second voice note`}
          >
            <span className="vr__record-dot" aria-hidden="true" />
          </button>
          <div className="vr__stage-copy">
            <span className="vr__stage-title">
              {phase === 'arming' ? 'Waiting for your microphone…' : 'Record your voice note'}
            </span>
            <span className="vr__stage-hint">
              {minSeconds > 0
                ? `At least ${formatTime(minSeconds)}, up to ${formatTime(maxSeconds)}.`
                : `Up to ${formatTime(maxSeconds)}.`}{' '}
              You can listen back and re-record before you continue.
            </span>
          </div>
        </div>
      )}

      {phase === 'recording' && (
        <div className="vr__stage vr__stage--live">
          <button
            type="button"
            className="vr__stop"
            onClick={stop}
            disabled={tooShort}
            aria-label={
              tooShort ? `Keep going, ${formatTime(minSeconds)} minimum` : 'Stop recording'
            }
          >
            <span className="vr__stop-square" aria-hidden="true" />
          </button>
          <div className="vr__meter" aria-hidden="true">
            {levels.map((level, i) => (
              <span
                key={i}
                className="vr__meter-bar"
                style={{ transform: `scaleY(${Math.max(0.06, level)})` }}
              />
            ))}
          </div>
          <div className="vr__live">
            <span className="vr__timer" role="timer" aria-live="off">
              {formatTime(elapsed)}
            </span>
            <span className="vr__remaining">
              {tooShort
                ? `${formatTime(minSeconds - elapsed)} to go`
                : `${formatTime(remaining)} left`}
            </span>
          </div>
          <button type="button" className="vr__ghost" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      {(phase === 'uploading' || phase === 'ready') && (
        <div className="vr__stage vr__stage--done">
          {previewUrl ? (
            <audio className="vr__player" src={previewUrl} controls preload="metadata" />
          ) : (
            value && <audio className="vr__player" src={value} controls preload="metadata" />
          )}

          <div className="vr__done-row">
            <span className={`vr__status${saved ? ' vr__status--saved' : ''}`}>
              {phase === 'uploading'
                ? 'Saving your recording…'
                : saved
                  ? `Saved${duration ? ` · ${formatTime(duration)}` : ''}`
                  : 'Not saved yet'}
            </span>
            <div className="vr__actions">
              {phase === 'ready' && !saved && previewUrl && (
                <button type="button" className="vr__ghost" onClick={retryUpload}>
                  Try again
                </button>
              )}
              <button
                type="button"
                className="vr__ghost"
                onClick={again}
                disabled={phase === 'uploading'}
              >
                Record again
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="vr__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
