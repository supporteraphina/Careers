import type { Metadata } from 'next';
import Reveal from '../../../components/Reveal';
import RoleCard, { orderRolePacks } from '../../../components/RoleCard';
import { getRolePacks } from '@/lib/content/roles';

export const metadata: Metadata = {
  title: 'Open Roles at Halevora',
  description:
    'Remote, full-time roles across content, design, support, development, and operations. Apply directly, no CV theater.',
};

export default function HiringPage() {
  const ordered = orderRolePacks(getRolePacks());

  return (
    <main className="cine">
      <section className="roles-hero">
        <div className="container hero-choreo">
          <h1>Open Roles</h1>
        </div>
      </section>

      <section style={{ paddingBottom: 'clamp(48px, 5vw, 90px)' }}>
        <div className="bleed">
          {ordered.length === 0 ? (
            <p style={{ color: 'var(--text-faint)' }}>
              No roles are open right now. Check back soon.
            </p>
          ) : (
            <Reveal>
              <div className="roles-grid">
                {ordered.map((pack) => (
                  <RoleCard key={pack.ad.slug} pack={pack} />
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}
