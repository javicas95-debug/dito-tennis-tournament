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

export function computeGroupStandings(group: Group, matches: Match[]): StandingRow[] {
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

  function headToHeadWinner(aId: string, bId: string): string | null {
    const direct = groupMatches.find(
      (m) =>
        (m.playerAId === aId && m.playerBId === bId) || (m.playerAId === bId && m.playerBId === aId),
    );
    return direct?.winnerId ?? null;
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (a.played === group.playerIds.length - 1 && b.played === group.playerIds.length - 1) {
      const h2h = headToHeadWinner(a.playerId, b.playerId);
      if (h2h === a.playerId) return -1;
      if (h2h === b.playerId) return 1;
    }
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.pointsFor - a.pointsFor;
  });
}

export function playerName(players: Player[], id: string | null | undefined): string {
  if (!id) return 'Por determinar';
  return players.find((p) => p.id === id)?.name ?? 'Desconocido';
}
