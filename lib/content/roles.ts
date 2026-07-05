// Build-time accessor for role packs. Pages call these helpers so the
// filesystem layout stays in one place.

import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import { loadRolePacks } from './load';
import type { RolePack } from './types';

const ROLES_DIR = path.join(process.cwd(), 'content', 'roles');

export const getRolePacks = cache((): RolePack[] =>
  fs.existsSync(ROLES_DIR) ? loadRolePacks(ROLES_DIR) : [],
);

export function getRolePack(slug: string): RolePack | undefined {
  return getRolePacks().find((p) => p.ad.slug === slug);
}
