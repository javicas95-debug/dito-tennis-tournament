import type { Group, Match } from '../types';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const BYE = '__BYE__';

/**
 * Circle-method round robin: splits every pairing of `ids` into rounds
 * where no player appears twice within the same round (odd-sized groups
 * get a bye each round). Used so a player's matches land spread apart
 * once rounds are interleaved with other groups.
 */
function roundRobinRounds(ids: string[]): Array<Array<[string, string]>> {
  if (ids.length < 2) return [];
  let arr = ids.length % 2 === 0 ? [...ids] : [...ids, BYE];
  const n = arr.length;
  const rounds: Array<Array<[string, string]>> = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a, b]);
    }
    rounds.push(pairs);
    const [fixed, ...rest] = arr;
    const last = rest.pop() as string;
    arr = [fixed, last, ...rest];
  }
  return rounds;
}

/**
 * Builds a random play order for the group stage: matches from different
 * groups are interleaved round by round so consecutive matches come from
 * different groups whenever possible, and each player's matches (spaced
 * out by the round-robin rounds of their own group) never land back to
 * back.
 */
export function generateGroupPlayOrder(groups: Group[], groupMatches: Match[]): string[] {
  const groupOrder = shuffle(groups.map((g) => g.id));
  const roundsByGroup = new Map(
    groups.map((g) => [g.id, roundRobinRounds(shuffle(g.playerIds))] as const),
  );

  const maxRounds = Math.max(0, ...groups.map((g) => roundsByGroup.get(g.id)!.length));
  const order: string[] = [];
  const used = new Set<string>();

  for (let round = 0; round < maxRounds; round++) {
    const maxSlots = Math.max(0, ...groups.map((g) => roundsByGroup.get(g.id)![round]?.length ?? 0));
    for (let slot = 0; slot < maxSlots; slot++) {
      for (const groupId of groupOrder) {
        const pair = roundsByGroup.get(groupId)![round]?.[slot];
        if (!pair) continue;
        const match = groupMatches.find(
          (m) =>
            m.groupId === groupId &&
            !used.has(m.id) &&
            ((m.playerAId === pair[0] && m.playerBId === pair[1]) ||
              (m.playerAId === pair[1] && m.playerBId === pair[0])),
        );
        if (match) {
          order.push(match.id);
          used.add(match.id);
        }
      }
    }
  }
  // Safety net in case a match couldn't be matched to a pairing above.
  for (const m of groupMatches) {
    if (!used.has(m.id)) order.push(m.id);
  }
  return order;
}
