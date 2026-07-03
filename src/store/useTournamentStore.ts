import { create } from 'zustand';
import type {
  Group,
  GroupResult,
  KnockoutResult,
  Match,
  Player,
  TournamentConfig,
  TournamentState,
} from '../types';
import { createId } from '../lib/id';
import { roundRobinPairs } from '../lib/roundRobin';
import { generateGroupPlayOrder } from '../lib/playOrder';
import { computeGroupStandings } from '../lib/standings';
import { buildQualifierSeeds, isPowerOfTwo, standardSeedOrder } from '../lib/seeding';
import { roundLabels } from '../lib/rounds';
import {
  knockoutResultWinner,
  groupResultWinner,
  validateGroupResult,
  validateKnockoutResult,
} from '../lib/matchFormat';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const defaultConfig: TournamentConfig = {
  name: 'CZ Dito Open',
  numGroups: 4,
  qualifiersPerGroup: 2,
  groupFormat: { type: 'superTiebreak', points: 10, winBy: 2 },
  knockoutFormat: {
    setsToWin: 2,
    gamesToWinSet: 4,
    tiebreakAtGames: 3,
    tiebreakPoints: 7,
    tiebreakWinBy: 2,
  },
  adminPin: '1234',
};

function emptyGroups(count: number): Group[] {
  return Array.from({ length: count }, (_, i) => ({
    id: createId('grp'),
    name: `Grupo ${GROUP_LETTERS[i] ?? i + 1}`,
    playerIds: [],
  }));
}

interface Actions {
  isAdmin: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  // Whether the initial state has been loaded from Supabase yet.
  isSynced: boolean;

  setConfig: (partial: Partial<TournamentConfig>) => void;

  addPlayer: (name: string) => void;
  updatePlayer: (id: string, name: string) => void;
  removePlayer: (id: string) => void;

  setNumGroups: (count: number) => void;
  assignPlayerToGroup: (playerId: string, groupId: string | null) => void;
  autoAssignGroups: () => void;

  generateGroupMatches: () => void;
  recordGroupResult: (matchId: string, result: GroupResult) => string | null;
  clearGroupResult: (matchId: string) => void;
  generateGroupOrder: () => void;
  moveGroupMatchOrder: (matchId: string, direction: 'up' | 'down') => void;
  moveGroupStandingRow: (groupId: string, playerId: string, direction: 'up' | 'down') => void;
  clearGroupManualOrder: (groupId: string) => void;

  generateBracket: () => string | null;
  recordKnockoutResult: (matchId: string, result: KnockoutResult) => string | null;
  clearKnockoutResult: (matchId: string) => void;

  setSchedule: (matchId: string, scheduledAt?: string, court?: string) => void;

  resetTournament: () => void;
  importState: (state: TournamentState) => void;
  exportState: () => TournamentState;
}

type Store = TournamentState & Actions;

export const useTournamentStore = create<Store>()((set, get) => ({
      config: defaultConfig,
      players: [],
      groups: emptyGroups(defaultConfig.numGroups),
      matches: [],
      isAdmin: false,
      isSynced: false,

      unlockAdmin: (pin) => {
        const ok = pin === get().config.adminPin;
        if (ok) set({ isAdmin: true });
        return ok;
      },
      lockAdmin: () => set({ isAdmin: false }),

      setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

      addPlayer: (name) =>
        set((s) => ({ players: [...s.players, { id: createId('ply'), name: name.trim() }] })),

      updatePlayer: (id, name) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)),
        })),

      removePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          groups: s.groups.map((g) => ({ ...g, playerIds: g.playerIds.filter((pid) => pid !== id) })),
          matches: s.matches.filter(
            (m) => m.status !== 'completed' ? m.playerAId !== id && m.playerBId !== id : true,
          ),
        })),

      setNumGroups: (count) =>
        set(() => ({
          groups: emptyGroups(count),
          players: get().players.map((p) => ({ ...p, groupId: undefined })),
          matches: get().matches.filter((m) => m.phase !== 'group'),
          config: { ...get().config, numGroups: count, customCrossings: undefined },
        })),

      assignPlayerToGroup: (playerId, groupId) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === playerId ? { ...p, groupId: groupId ?? undefined } : p)),
          groups: s.groups.map((g) => {
            const withoutPlayer = g.playerIds.filter((id) => id !== playerId);
            if (g.id === groupId) return { ...g, playerIds: [...withoutPlayer, playerId] };
            return { ...g, playerIds: withoutPlayer };
          }),
        })),

      autoAssignGroups: () =>
        set((s) => {
          const shuffled = [...s.players].sort(() => Math.random() - 0.5);
          const groups = s.groups.map((g) => ({ ...g, playerIds: [] as string[] }));
          shuffled.forEach((player, i) => {
            groups[i % groups.length].playerIds.push(player.id);
          });
          const playerToGroup = new Map<string, string>();
          groups.forEach((g) => g.playerIds.forEach((pid) => playerToGroup.set(pid, g.id)));
          return {
            groups,
            players: s.players.map((p) => ({ ...p, groupId: playerToGroup.get(p.id) })),
          };
        }),

      generateGroupMatches: () =>
        set((s) => {
          const nonGroupMatches = s.matches.filter((m) => m.phase !== 'group');
          const newMatches: Match[] = [];
          for (const group of s.groups) {
            for (const [a, b] of roundRobinPairs(group.playerIds)) {
              newMatches.push({
                id: createId('mtc'),
                phase: 'group',
                groupId: group.id,
                playerAId: a,
                playerBId: b,
                status: 'pending',
              });
            }
          }
          return { matches: [...nonGroupMatches, ...newMatches] };
        }),

      recordGroupResult: (matchId, result) => {
        const { config, matches } = get();
        const check = validateGroupResult(result, config.groupFormat);
        if (!check.valid) return check.error ?? 'Resultado no válido.';
        set({
          matches: matches.map((m) => {
            if (m.id !== matchId || !m.playerAId || !m.playerBId) return m;
            return {
              ...m,
              groupResult: result,
              winnerId: groupResultWinner(result, m.playerAId, m.playerBId),
              status: 'completed',
            };
          }),
        });
        return null;
      },

      clearGroupResult: (matchId) =>
        set((s) => ({
          matches: s.matches.map((m) =>
            m.id === matchId
              ? { ...m, groupResult: undefined, winnerId: undefined, status: m.scheduledAt ? 'scheduled' : 'pending' }
              : m,
          ),
        })),

      generateGroupOrder: () =>
        set((s) => {
          const groupMatches = s.matches.filter((m) => m.phase === 'group');
          const orderedIds = generateGroupPlayOrder(s.groups, groupMatches);
          const orderByMatchId = new Map(orderedIds.map((id, i) => [id, i + 1]));
          return {
            matches: s.matches.map((m) =>
              m.phase === 'group' ? { ...m, order: orderByMatchId.get(m.id) } : m,
            ),
          };
        }),

      moveGroupMatchOrder: (matchId, direction) =>
        set((s) => {
          const ordered = s.matches
            .filter((m) => m.phase === 'group')
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const idx = ordered.findIndex((m) => m.id === matchId);
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return {};
          const current = ordered[idx];
          const neighbor = ordered[swapIdx];
          const currentOrder = current.order ?? idx + 1;
          const neighborOrder = neighbor.order ?? swapIdx + 1;
          return {
            matches: s.matches.map((m) => {
              if (m.id === current.id) return { ...m, order: neighborOrder };
              if (m.id === neighbor.id) return { ...m, order: currentOrder };
              return m;
            }),
          };
        }),

      moveGroupStandingRow: (groupId, playerId, direction) =>
        set((s) => {
          const group = s.groups.find((g) => g.id === groupId);
          if (!group) return {};
          const currentOrder = computeGroupStandings(group, s.matches).map((r) => r.playerId);
          const idx = currentOrder.indexOf(playerId);
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (idx === -1 || swapIdx < 0 || swapIdx >= currentOrder.length) return {};
          const newOrder = [...currentOrder];
          [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
          return {
            groups: s.groups.map((g) => (g.id === groupId ? { ...g, manualOrder: newOrder } : g)),
          };
        }),

      clearGroupManualOrder: (groupId) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, manualOrder: undefined } : g)),
        })),

      generateBracket: () => {
        const { config, groups, players, matches } = get();
        const rankedGroups = groups.map((g) =>
          computeGroupStandings(g, matches)
            .slice(0, config.qualifiersPerGroup)
            .map((row) => row.playerId),
        );
        if (rankedGroups.some((g) => g.length < config.qualifiersPerGroup)) {
          return 'Todavía no hay suficientes resultados para determinar los clasificados de cada grupo.';
        }
        const totalQualifiers = groups.length * config.qualifiersPerGroup;
        if (!isPowerOfTwo(totalQualifiers)) {
          return `El número de clasificados (${totalQualifiers}) debe ser una potencia de 2 (2, 4, 8, 16...) para generar el cuadro automáticamente.`;
        }

        const groupIndexById = new Map(groups.map((g, i) => [g.id, i]));
        const expectedPairs = totalQualifiers / 2;
        const crossings = config.customCrossings;
        const validCrossings =
          crossings &&
          crossings.length === expectedPairs &&
          crossings.every(
            (c) =>
              groupIndexById.has(c.a.groupId) &&
              groupIndexById.has(c.b.groupId) &&
              c.a.rank < config.qualifiersPerGroup &&
              c.b.rank < config.qualifiersPerGroup,
          );

        let orderedPlayers: string[];
        if (validCrossings) {
          orderedPlayers = crossings!.flatMap((c) => [
            rankedGroups[groupIndexById.get(c.a.groupId)!][c.a.rank],
            rankedGroups[groupIndexById.get(c.b.groupId)!][c.b.rank],
          ]);
        } else {
          const seeds = buildQualifierSeeds(rankedGroups);
          const seedOrder = standardSeedOrder(seeds.length);
          orderedPlayers = seedOrder.map((seedNum) => seeds[seedNum - 1]);
        }

        const numRounds = Math.log2(orderedPlayers.length);
        const labels = roundLabels(numRounds);

        const rounds: Match[][] = [];
        // first round, filled with qualifiers
        const firstRound: Match[] = [];
        for (let i = 0; i < orderedPlayers.length; i += 2) {
          firstRound.push({
            id: createId('mtc'),
            phase: labels[0],
            bracketSlot: i / 2,
            playerAId: orderedPlayers[i],
            playerBId: orderedPlayers[i + 1],
            status: 'pending',
          });
        }
        rounds.push(firstRound);

        for (let r = 1; r < labels.length; r++) {
          const prevRound = rounds[r - 1];
          const round: Match[] = [];
          for (let i = 0; i < prevRound.length; i += 2) {
            round.push({
              id: createId('mtc'),
              phase: labels[r],
              bracketSlot: i / 2,
              playerAId: null,
              playerBId: null,
              status: 'pending',
            });
          }
          prevRound.forEach((m, i) => {
            const next = round[Math.floor(i / 2)];
            m.nextMatchId = next.id;
            m.nextMatchSlot = i % 2 === 0 ? 'A' : 'B';
          });
          rounds.push(round);
        }

        const knockoutMatches = rounds.flat();
        const nonKnockout = matches.filter((m) => m.phase === 'group');
        set({ matches: [...nonKnockout, ...knockoutMatches] });
        void players;
        return null;
      },

      recordKnockoutResult: (matchId, result) => {
        const { config, matches } = get();
        const check = validateKnockoutResult(result, config.knockoutFormat);
        if (!check.valid) return check.error ?? 'Resultado no válido.';

        const match = matches.find((m) => m.id === matchId);
        if (!match || !match.playerAId || !match.playerBId) return 'Partido no encontrado.';
        const winnerId = knockoutResultWinner(result, match.playerAId, match.playerBId);

        set({
          matches: matches.map((m) => {
            if (m.id === matchId) {
              return { ...m, knockoutResult: result, winnerId, status: 'completed' };
            }
            if (m.id === match.nextMatchId) {
              return { ...m, [match.nextMatchSlot === 'A' ? 'playerAId' : 'playerBId']: winnerId };
            }
            return m;
          }),
        });
        return null;
      },

      clearKnockoutResult: (matchId) =>
        set((s) => {
          const match = s.matches.find((m) => m.id === matchId);
          return {
            matches: s.matches.map((m) => {
              if (m.id === matchId) {
                return {
                  ...m,
                  knockoutResult: undefined,
                  winnerId: undefined,
                  status: m.scheduledAt ? 'scheduled' : 'pending',
                };
              }
              if (match?.nextMatchId && m.id === match.nextMatchId) {
                return { ...m, [match.nextMatchSlot === 'A' ? 'playerAId' : 'playerBId']: null };
              }
              return m;
            }),
          };
        }),

      setSchedule: (matchId, scheduledAt, court) =>
        set((s) => ({
          matches: s.matches.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  scheduledAt,
                  court,
                  status: m.status === 'completed' ? 'completed' : scheduledAt ? 'scheduled' : 'pending',
                }
              : m,
          ),
        })),

      resetTournament: () =>
        set(() => ({
          players: [],
          groups: emptyGroups(get().config.numGroups),
          matches: [],
        })),

      importState: (state) => set(() => ({ ...state })),
      exportState: () => {
        const { config, players, groups, matches } = get();
        return { config, players, groups, matches };
      },
    }));

export function usePlayerById(id: string | null | undefined): Player | undefined {
  return useTournamentStore((s) => s.players.find((p) => p.id === id));
}
