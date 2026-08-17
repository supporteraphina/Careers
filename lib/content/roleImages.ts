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
  'customer-support': {
    src: unsplash('photo-1522071820081-009f0129c71c'),
    alt: 'A support team working together around one table',
  },
  'short-form-editor': {
    src: unsplash('photo-1574717024653-61fd2cf4d44d'),
    alt: 'A video editing timeline glowing on a dark monitor',
  },
  'creative-designer': {
    src: unsplash('photo-1581291518857-4e27b48ff24e'),
    alt: 'A designer sketching interface wireframes by hand',
  },
  'full-stack-developer': {
    src: unsplash('photo-1461749280684-dccba630e2f6'),
    alt: 'Source code on a dark screen',
  },
  'operations-assistant': {
    src: unsplash('photo-1454165804606-c3d57bc86b40'),
    alt: 'Laptops and handwritten plans on a working desk',
  },
  'social-media-manager': {
    src: unsplash('photo-1611262588024-d12430b98920'),
    alt: 'A glossy social app icon glowing against a dark background',
  },
  'south-african-talent': {
    src: unsplash('photo-1580060839134-75a5edca2e99', 2800),
    alt: 'Aerial view of Cape Town beneath Table Mountain',
  },
};

export function getRoleImage(slug: string): RoleImage | undefined {
  return IMAGES[slug];
}
