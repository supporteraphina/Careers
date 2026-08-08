import type { FormDefinition } from '../engine/types';

/** One job advert, following the section order in docs/hiring-funnel-spec.md §1.1. */
export interface JobAd {
  slug: string;
  title: string;
  team: string;
  location: string;
  employmentType: string;
  /** Display string, e.g. "Jul 2026". */
  datePosted: string;
  /** Job Summary paragraph. */
  summary: string;
  /** Your Role section: eyebrow sub-label + paragraphs. */
  role: { eyebrow: string; paragraphs: string[] };
  /**
   * Optional plain-terms disclosure block. Used where an applicant must
   * understand the true nature of the work before applying (e.g. adult-content
   * chat roles). Rendered prominently, high on the advert.
   */
  disclosure?: { label: string; paragraphs: string[] };
  idealCandidate: string[];
  requirements: { title: string; tagline: string; body: string }[];
  /** Rendered with 001-00N mono numbering. */
  whatYoullDo: string[];
  shouldntApply: string[];
  seo: { title: string; description: string };
}

/** One role = advert + funnel definition, stored as content/roles/<slug>.json. */
export interface RolePack {
  ad: JobAd;
  form: FormDefinition;
}
