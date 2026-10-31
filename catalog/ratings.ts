/** Shared by the catalog generator and any future browser. Evidence never changes arithmetic. */
export type Evidence = 'reviewed' | 'used' | 'tested';

export const rubricAxes = [
  { key: 'value', label: 'Practical value', weight: 25 },
  { key: 'dependability', label: 'Dependability', weight: 20 },
  { key: 'ease', label: 'Ease of use', weight: 15 },
  { key: 'safety', label: 'Safety and control', weight: 15 },
  { key: 'adoption', label: 'Adoption cost', weight: 10 },
  { key: 'portability', label: 'Portability', weight: 10 },
  { key: 'upkeep', label: 'Upkeep', weight: 5 },
] as const;
export type Axis = typeof rubricAxes[number]['key'];

export interface Rating {
  rubric: 'dev-v1';
  /** Missing grades are unknown, never zero or an imputed midpoint. */
  dimensions: Partial<Record<Axis, number>>;
  evidence: Evidence;
  reviewed: string;
  notes: string;
  /** Repository-relative curator assessment; not behavioral evidence. */
  review?: string;
  unknowns?: string[];
  blockers?: { scope: string; reason: string }[];
}

export function entryScore(rating: Rating): number | null {
  if (rubricAxes.some(({ key }) => rating.dimensions[key] === undefined)) return null;
  const total = rubricAxes.reduce((sum, { key, weight }) => sum + rating.dimensions[key]! * weight, 0);
  return Math.round(total / 4) / 10;
}

export function scoreLabel(entry: { rating: Rating; score: number | null }): string {
  const label = entry.score === null ? 'Assessment incomplete' : `${entry.score.toFixed(1)}/10`;
  return entry.rating.blockers?.length ? `${label} · blocker` : label;
}

/** Complete profiles first, then incomplete, then those with blockers; score ranks only within a group. */
export function compareRatings(a: { rating: Rating; score: number | null }, b: { rating: Rating; score: number | null }): number {
  const group = ({ rating, score }: typeof a) => (rating.blockers?.length ? 2 : score === null ? 1 : 0);
  return group(a) - group(b) || (b.score ?? -1) - (a.score ?? -1);
}
