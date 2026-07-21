import { supabase } from './supabaseClient';

const BUCKET = 'tournament-assets';

/** Uploads a file to the shared Storage bucket and returns its public URL. */
export async function uploadTournamentImage(file: File, slot: 'background' | 'cover'): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${slot}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // cache-bust so overwriting the same filename shows the new image right away
  return `${data.publicUrl}?t=${Date.now()}`;
}
