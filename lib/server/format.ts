// Small display helpers for the admin console.

import type { Answers } from '../engine/types';

/** "3m ago" / "2d ago" style relative time. */
export function relativeTime(date: Date, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Longest free-text answer, trimmed to a scannable excerpt. */
export function answerExcerpt(answersJson: string, max = 90): string {
  try {
    const answers = JSON.parse(answersJson) as Answers;
    const texts = Object.values(answers)
      .filter((v): v is string => typeof v === 'string' && v.length > 40)
      .sort((a, b) => b.length - a.length);
    const best = texts[0] ?? '';
    if (!best) return '';
    return best.length > max ? `${best.slice(0, max).trimEnd()}…` : best;
  } catch {
    return '';
  }
}
