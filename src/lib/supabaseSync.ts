import { supabase } from './supabaseClient';
import { useTournamentStore } from '../store/useTournamentStore';
import type { TournamentState } from '../types';

const ROW_ID = 1;

let lastSyncedJson: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function currentTournamentData(): TournamentState {
  const { config, players, groups, matches } = useTournamentStore.getState();
  return { config, players, groups, matches };
}

async function pushState() {
  const payload = currentTournamentData();
  const json = JSON.stringify(payload);
  if (json === lastSyncedJson) return;
  lastSyncedJson = json;
  const { error } = await supabase
    .from('tournament_state')
    .upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() });
  if (error) console.error('Error guardando en Supabase:', error.message);
}

/**
 * Wires the local store to a shared Supabase row: pulls the current
 * state on load, pushes local changes (debounced), and applies remote
 * changes from other devices in real time.
 */
export function initSupabaseSync() {
  supabase
    .from('tournament_state')
    .select('data')
    .eq('id', ROW_ID)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error('Error cargando el torneo desde Supabase:', error.message);
        useTournamentStore.setState({ isSynced: true });
        return;
      }
      if (data?.data) {
        lastSyncedJson = JSON.stringify(data.data);
        useTournamentStore.getState().importState(data.data as TournamentState);
      } else {
        pushState();
      }
      useTournamentStore.setState({ isSynced: true });
    });

  supabase
    .channel('tournament_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournament_state' },
      (payload) => {
        const incoming = (payload.new as { data?: TournamentState } | undefined)?.data;
        if (!incoming) return;
        const json = JSON.stringify(incoming);
        if (json === lastSyncedJson) return;
        lastSyncedJson = json;
        useTournamentStore.getState().importState(incoming);
      },
    )
    .subscribe();

  useTournamentStore.subscribe((state, prevState) => {
    if (
      state.config === prevState.config &&
      state.players === prevState.players &&
      state.groups === prevState.groups &&
      state.matches === prevState.matches
    ) {
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(pushState, 400);
  });
}
