export interface Player {
  id: string;
  name: string;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  playerIds: string[];
  // Admin-forced final standings order (playerIds), used to settle ties
  // that can't be resolved automatically (e.g. after a mini-partido).
  // Ignored if it doesn't match the group's current players.
  manualOrder?: string[];
}

export interface GroupFormat {
  type: 'superTiebreak';
  points: number; // first to this many points
  winBy: number; // minimum winning margin
}

export interface KnockoutFormat {
  setsToWin: number; // e.g. 2 = best of 3 sets
  gamesToWinSet: number; // e.g. 4
  tiebreakAtGames: number; // e.g. 3 -> tiebreak triggered at 3-3
  tiebreakPoints: number; // e.g. 7
  tiebreakWinBy: number; // e.g. 2
}

// A qualifier slot identified by its group and rank within that group
// (rank 0 = winner of the group, rank 1 = runner-up, ...).
export interface CrossingSlot {
  groupId: string;
  rank: number;
}

export interface Crossing {
  a: CrossingSlot;
  b: CrossingSlot;
}

export interface TournamentConfig {
  name: string;
  numGroups: number;
  qualifiersPerGroup: number;
  groupFormat: GroupFormat;
  knockoutFormat: KnockoutFormat;
  adminPin: string;
  // Manual first-round bracket pairings. When absent (or stale), the
  // standard seeding algorithm is used instead.
  customCrossings?: Crossing[];
}

export interface GroupResult {
  pointsA: number;
  pointsB: number;
}

export interface SetTiebreak {
  pointsA: number;
  pointsB: number;
}

export interface SetScore {
  gamesA: number;
  gamesB: number;
  tiebreak?: SetTiebreak;
}

export interface KnockoutResult {
  sets: SetScore[];
}

// 'group' for group-stage matches; any other value is a knockout round
// label such as 'final', 'semifinal', 'quarterfinal', 'round-of-16', ...
export type MatchPhase = string;

export type MatchStatus = 'pending' | 'scheduled' | 'completed';

export interface Match {
  id: string;
  phase: MatchPhase;
  groupId?: string;
  bracketSlot?: number; // position within the phase, used for ordering/seeding
  playerAId: string | null;
  playerBId: string | null;
  order?: number; // play order within the group stage (single-day event, no fixed time)
  scheduledAt?: string; // ISO datetime, only used for knockout-phase matches
  court?: string;
  status: MatchStatus;
  groupResult?: GroupResult;
  knockoutResult?: KnockoutResult;
  winnerId?: string;
  nextMatchId?: string;
  nextMatchSlot?: 'A' | 'B';
}

export interface TournamentState {
  config: TournamentConfig;
  players: Player[];
  groups: Group[];
  matches: Match[];
}
