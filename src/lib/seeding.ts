/**
 * Standard single-elimination bracket seeding order, e.g. for 8 seeds:
 * [1,8,4,5,2,7,3,6] so round 1 pairs 1v8, 4v5, 2v7, 3v6, keeping top
 * seeds apart for as long as possible.
 */
export function standardSeedOrder(size: number): number[] {
  let seeds = [1];
  while (seeds.length < size) {
    const m = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s, m + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Builds the seed list (1 = best) from group standings: group winners
 * first (in group order), then runners-up, then thirds, etc. This keeps
 * players from the same group as far apart as possible in the bracket.
 */
export function buildQualifierSeeds<T>(rankedGroups: T[][]): T[] {
  const seeds: T[] = [];
  const maxRank = Math.max(...rankedGroups.map((g) => g.length), 0);
  for (let rank = 0; rank < maxRank; rank++) {
    for (const group of rankedGroups) {
      if (group[rank]) seeds.push(group[rank]);
    }
  }
  return seeds;
}
