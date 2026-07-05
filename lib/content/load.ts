// Server-side loader for role packs (content/roles/*.json).
// Every pack is validated on load; an invalid pack fails the build and
// the test suite rather than shipping a broken funnel.

import fs from 'node:fs';
import path from 'node:path';
import { validateForm } from '../engine/runner';
import type { RolePack } from './types';

export function loadRolePack(filePath: string): RolePack {
  const raw = fs.readFileSync(filePath, 'utf8');
  const pack = JSON.parse(raw) as RolePack;

  if (pack.ad.slug !== pack.form.slug) {
    throw new Error(
      `${path.basename(filePath)}: ad slug "${pack.ad.slug}" and form slug "${pack.form.slug}" disagree`,
    );
  }

  const errors = validateForm(pack.form);
  if (errors.length > 0) {
    throw new Error(`${path.basename(filePath)}: ${errors.join('; ')}`);
  }

  return pack;
}

export function loadRolePacks(dir: string): RolePack[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
  const packs = files.map(loadRolePack);
  return packs.sort((a, b) => a.ad.title.localeCompare(b.ad.title));
}
