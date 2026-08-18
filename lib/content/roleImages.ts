// Card imagery for the careers listing, keyed by role slug. Unsplash photo ids
// are verified to resolve on images.unsplash.com (see docs/hiring-funnel-spec.md);
// chat-sales-operator uses a self-hosted brand asset in public/roles.

export interface RoleImage {
  src: string;
  alt: string;
}

function unsplash(id: string, width = 1800): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
}

const IMAGES: Record<string, RoleImage> = {
  'chat-sales-operator': {
    src: '/roles/chat-sales-operator.png',
    alt: 'Abstract dark graphic of overlapping chat message bubbles',
  },
  'short-form-editor': {
    src: unsplash('photo-1574717024653-61fd2cf4d44d'),
    alt: 'A video editing timeline glowing on a dark monitor',
  },
  'full-stack-developer': {
    src: unsplash('photo-1461749280684-dccba630e2f6'),
    alt: 'Source code on a dark screen',
  },
  'social-media-manager': {
    src: unsplash('photo-1611262588024-d12430b98920'),
    alt: 'A glossy social app icon glowing against a dark background',
  },
  'model-relationship-manager': {
    src: unsplash('photo-1543269865-cbf427effbad'),
    alt: 'Two colleagues talking over a laptop in a bright cafe',
  },
  'reddit-growth-manager': {
    src: unsplash('photo-1616509091215-57bbece93654'),
    alt: 'The Reddit app icon on a phone screen',
  },
  'south-african-talent': {
    src: unsplash('photo-1580060839134-75a5edca2e99', 2800),
    alt: 'Aerial view of Cape Town beneath Table Mountain',
  },
};

export function getRoleImage(slug: string): RoleImage | undefined {
  return IMAGES[slug];
}
