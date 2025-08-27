// lib/storage/files.ts
import { supabaseBrowser } from '@/lib/supabase/client';

export async function createSignedUrl(path: string, expiresIn = 60) {
  const supabase = supabaseBrowser();
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeFile(path: string) {
  const supabase = supabaseBrowser();
  const { error } = await supabase.storage.from('documents').remove([path]);
  if (error) throw error;
  return true;
}
