import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

  generateBracket: () => string | null;
  recordKnockoutResult: (matchId: string, result: KnockoutResult) => string | null;
  clearKnockoutResult: (matchId: string) => void;

  setSchedule: (matchId: string, scheduledAt?: string, court?: string) => void;

  resetTournament: () => void;
  importState: (state: TournamentState) => void;
  exportState: () => TournamentState;
}

type Store = TournamentState & Actions;

export const useTournamentStore = create<Store>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      players: [],
      groups: emptyGroups(defaultConfig.numGroups),
      matches: [],
      isAdmin: false,

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
          config: { ...get().config, numGroups: count },
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
        const seeds = buildQualifierSeeds(rankedGroups);
        if (!isPowerOfTwo(seeds.length)) {
          return `El número de clasificados (${seeds.length}) debe ser una potencia de 2 (2, 4, 8, 16...) para generar el cuadro automáticamente.`;
        }
        const order = standardSeedOrder(seeds.length);
        const orderedPlayers = order.map((seedNum) => seeds[seedNum - 1]);

        const numRounds = Math.log2(seeds.length);
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
    }),
    {
      name: 'dito-tennis-tournament',
      partialize: (s) => ({
        config: s.config,
        players: s.players,
        groups: s.groups,
        matches: s.matches,
      }),
    },
  ),
);

export function usePlayerById(id: string | null | undefined): Player | undefined {
  return useTournamentStore((s) => s.players.find((p) => p.id === id));
}
