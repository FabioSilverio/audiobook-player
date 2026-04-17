import { supabase } from './supabase';
import type { Audiobook, Bookmark, Chapter } from '../types';

export async function getAudiobooks(userId: string): Promise<Audiobook[]> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDbToAudiobook);
}

export async function getAudiobook(id: string): Promise<Audiobook | null> {
  const { data, error } = await supabase
    .from('audiobooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return mapDbToAudiobook(data);
}

export async function createAudiobook(
  book: Omit<Audiobook, 'id' | 'created_at' | 'updated_at'>
): Promise<Audiobook> {
  const { data, error } = await supabase
    .from('audiobooks')
    .insert({
      user_id: book.user_id,
      title: book.title,
      author: book.author,
      file_name: book.file_name,
      file_path: book.file_path,
      cover_url: book.cover_url,
      duration: book.duration,
      current_position: book.current_position,
      chapters: JSON.stringify(book.chapters),
      bookmarks: JSON.stringify(book.bookmarks),
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbToAudiobook(data);
}

export async function updateProgress(id: string, position: number): Promise<void> {
  const { error } = await supabase
    .from('audiobooks')
    .update({ current_position: position, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function updateBookmarks(id: string, bookmarks: Bookmark[]): Promise<void> {
  const { error } = await supabase
    .from('audiobooks')
    .update({ bookmarks: JSON.stringify(bookmarks), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAudiobook(id: string, filePath: string): Promise<void> {
  await supabase.storage.from('audiobooks').remove([filePath]);
  const { error } = await supabase.from('audiobooks').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadAudioFile(
  userId: string,
  file: File
): Promise<string> {
  const filePath = `${userId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from('audiobooks')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;
  return filePath;
}

export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from('audiobooks').getPublicUrl(filePath);
  return data.publicUrl;
}

function mapDbToAudiobook(row: any): Audiobook {
  return {
    ...row,
    chapters: typeof row.chapters === 'string' ? JSON.parse(row.chapters) : (row.chapters ?? []),
    bookmarks: typeof row.bookmarks === 'string' ? JSON.parse(row.bookmarks) : (row.bookmarks ?? []),
  };
}
