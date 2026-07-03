import type { Group, Match, Player } from '../types';

export interface StandingRow {
  playerId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

function computeBaseRows(group: Group, matches: Match[]): { rows: Map<string, StandingRow>; groupMatches: Match[] } {
  const rows = new Map<string, StandingRow>();
  for (const playerId of group.playerIds) {
    rows.set(playerId, {
      playerId,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
    });
  }

  const groupMatches = matches.filter(
    (m) => m.phase === 'group' && m.groupId === group.id && m.status === 'completed' && m.groupResult,
  );

  for (const match of groupMatches) {
    const { playerAId, playerBId, groupResult, winnerId } = match;
    if (!playerAId || !playerBId || !groupResult || !winnerId) continue;
    const rowA = rows.get(playerAId);
    const rowB = rows.get(playerBId);
    if (!rowA || !rowB) continue;

    rowA.played++;
    rowB.played++;
    rowA.pointsFor += groupResult.pointsA;
    rowA.pointsAgainst += groupResult.pointsB;
    rowB.pointsFor += groupResult.pointsB;
    rowB.pointsAgainst += groupResult.pointsA;

    if (winnerId === playerAId) {
      rowA.wins++;
      rowA.points += 1;
      rowB.losses++;
    } else {
      rowB.wins++;
      rowB.points += 1;
      rowA.losses++;
    }
  }

  for (const row of rows.values()) {
    row.diff = row.pointsFor - row.pointsAgainst;
  }

  return { rows, groupMatches };
}

/**
 * Tie-break order, applied within a cluster of players tied on points:
 * - exactly 2 tied: head-to-head result between them decides.
 * - 3 or more tied: total point differential decides.
 * Anything still tied after that is left in place for the admin to
 * settle manually (e.g. after a mini-partido) via `group.manualOrder`.
 */
function autoOrderStandings(rows: StandingRow[], groupMatches: Match[]): StandingRow[] {
  function headToHeadWinner(aId: string, bId: string): string | null {
    const direct = groupMatches.find(
      (m) => (m.playerAId === aId && m.playerBId === bId) || (m.playerAId === bId && m.playerBId === aId),
    );
    return direct?.winnerId ?? null;
  }

  const byPoints = new Map<number, StandingRow[]>();
  for (const row of rows) {
    if (!byPoints.has(row.points)) byPoints.set(row.points, []);
    byPoints.get(row.points)!.push(row);
  }

  const ordered: StandingRow[] = [];
  for (const points of Array.from(byPoints.keys()).sort((a, b) => b - a)) {
    const cluster = byPoints.get(points)!;
    if (cluster.length === 1) {
      ordered.push(cluster[0]);
    } else if (cluster.length === 2) {
      const [a, b] = cluster;
      const winner = headToHeadWinner(a.playerId, b.playerId);
      if (winner === a.playerId) ordered.push(a, b);
      else if (winner === b.playerId) ordered.push(b, a);
      // match not played yet: fall back to point differential
      else ordered.push(...[...cluster].sort((x, y) => y.diff - x.diff || y.pointsFor - x.pointsFor));
    } else {
      ordered.push(...[...cluster].sort((x, y) => y.diff - x.diff || y.pointsFor - x.pointsFor));
    }
  }
  return ordered;
}

export function computeGroupStandings(group: Group, matches: Match[]): StandingRow[] {
  const { rows, groupMatches } = computeBaseRows(group, matches);
  const autoOrder = autoOrderStandings(Array.from(rows.values()), groupMatches);

  const manual = group.manualOrder;
  if (manual && manual.length === autoOrder.length && manual.every((id) => rows.has(id))) {
    return manual.map((id) => rows.get(id)!);
  }
  return autoOrder;
}

/** Whether every round-robin match of the group has already been played. */
export function isGroupComplete(group: Group, matches: Match[]): boolean {
  if (group.playerIds.length < 2) return false;
  const expectedMatches = (group.playerIds.length * (group.playerIds.length - 1)) / 2;
  const completed = matches.filter(
    (m) => m.phase === 'group' && m.groupId === group.id && m.status === 'completed',
  ).length;
  return completed >= expectedMatches;
}

/**
 * Clusters of players still tied on both points and point differential
 * after the automatic tie-break rules — these need a mini-partido and a
 * manual standings edit to settle. Only meaningful once the group has
 * finished its round robin, so it returns nothing before that.
 */
export function findUnresolvedTies(group: Group, matches: Match[]): string[][] {
  if (!isGroupComplete(group, matches)) return [];
  const { rows, groupMatches } = computeBaseRows(group, matches);
  const autoOrder = autoOrderStandings(Array.from(rows.values()), groupMatches);

  const clusters: string[][] = [];
  let i = 0;
  while (i < autoOrder.length) {
    let j = i + 1;
    while (
      j < autoOrder.length &&
      autoOrder[j].points === autoOrder[i].points &&
      autoOrder[j].diff === autoOrder[i].diff
    ) {
      j++;
    }
    if (j - i >= 2) clusters.push(autoOrder.slice(i, j).map((r) => r.playerId));
    i = j;
  }
  return clusters;
}

export function playerName(players: Player[], id: string | null | undefined): string {
  if (!id) return 'Por determinar';
  return players.find((p) => p.id === id)?.name ?? 'Desconocido';
}
