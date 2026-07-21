import { supabase } from './supabaseClient';
import { useTournamentStore } from '../store/useTournamentStore';
import type { TournamentState } from '../types';

const ROW_ID = 1;

// Timestamp of the last state we know Supabase has (ours or someone
// else's) — used to ignore stale/duplicate updates instead of comparing
// serialized JSON, since Postgres' jsonb doesn't preserve key order and
// would make every one of our own pushes look like a "new" remote change.
let latestKnownUpdatedAt: string | null = null;
// True while we're applying a remote update, so the store subscriber
// below knows not to treat it as a local edit and echo it back.
let applyingRemote = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function currentTournamentData(): TournamentState {
  const { config, players, groups, matches } = useTournamentStore.getState();
  return { config, players, groups, matches };
}

async function pushState() {
  const payload = currentTournamentData();
  const updatedAt = new Date().toISOString();
  latestKnownUpdatedAt = updatedAt;
  try {
    const { error } = await supabase
      .from('tournament_state')
      .upsert({ id: ROW_ID, data: payload, updated_at: updatedAt });
    if (error) console.error('Error guardando en Supabase:', error.message);
  } catch (err) {
    console.error('No se pudo guardar en Supabase:', err);
  }
}

function applyRemote(data: TournamentState, updatedAt: string) {
  // Ignore our own echo and anything older than what we've already applied.
  if (latestKnownUpdatedAt && updatedAt <= latestKnownUpdatedAt) return;
  latestKnownUpdatedAt = updatedAt;
  applyingRemote = true;
  useTournamentStore.getState().importState(data);
  applyingRemote = false;
}

/**
 * Wires the local store to a shared Supabase row: pulls the current
 * state on load, pushes local changes (debounced), and applies remote
 * changes from other devices in real time.
 */
export function initSupabaseSync() {
  (async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_state')
        .select('data, updated_at')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (error) {
        console.error('Error cargando el torneo desde Supabase:', error.message);
      } else if (data?.data) {
        applyRemote(data.data as TournamentState, data.updated_at as string);
      } else {
        await pushState();
      }
    } catch (err) {
      console.error('No se pudo conectar con Supabase:', err);
    } finally {
      useTournamentStore.setState({ isSynced: true });
    }
  })();

  supabase
    .channel('tournament_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournament_state' },
      (payload) => {
        const row = payload.new as { data?: TournamentState; updated_at?: string } | undefined;
        if (!row?.data || !row.updated_at) return;
        applyRemote(row.data, row.updated_at);
      },
    )
    .subscribe();

  useTournamentStore.subscribe((state, prevState) => {
    if (applyingRemote) return;
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
