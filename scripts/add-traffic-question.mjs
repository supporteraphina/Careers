// One-off content migration: add the standardized traffic-source question
// to every role pack and bump the form version (snapshot integrity).
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'content', 'roles');
const PAGE = {
  id: 'q-traffic-source',
  kind: 'question',
  title: 'Where did you find this role?',
  fields: [
    {
      id: 'traffic_source',
      type: 'single_choice',
      label: 'Pick the closest match.',
      required: true,
      options: [
        'Instagram',
        'TikTok',
        'YouTube',
        'X / Twitter',
        'LinkedIn',
        'Job board',
        'Friend or referral',
        'Other',
      ],
    },
  ],
};

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const full = path.join(dir, file);
  const pack = JSON.parse(fs.readFileSync(full, 'utf8'));
  const pages = pack.form.pages;

  if (pages.some((p) => p.id === 'q-traffic-source')) {
    console.log(`${file}: already present, skipped`);
    continue;
  }

  // Insert before the first income question; fall back to before the endings.
  let index = pages.findIndex((p) =>
    (p.fields ?? []).some((f) => f.type === 'number' && /income/.test(f.id)),
  );
  if (index === -1) index = pages.findIndex((p) => p.kind === 'ending');

  pages.splice(index, 0, PAGE);
  pack.form.version = (pack.form.version ?? 1) + 1;
  fs.writeFileSync(full, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  console.log(`${file}: inserted at ${index}, version -> ${pack.form.version}`);
}
