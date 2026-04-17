const DB_NAME = 'audiobook-player-files';
const DB_VERSION = 2;
const STORE_NAME = 'audio-files';
const COVER_STORE = 'cover-images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(COVER_STORE)) {
        db.createObjectStore(COVER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileLocally(key: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFileLocally(key: string): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFileLocally(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getLocalFileUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}

// Cover image storage
export async function saveCoverLocally(bookId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVER_STORE, 'readwrite');
    tx.objectStore(COVER_STORE).put(blob, `cover_${bookId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCoverLocally(bookId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVER_STORE, 'readonly');
    const request = tx.objectStore(COVER_STORE).get(`cover_${bookId}`);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCoverLocally(bookId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COVER_STORE, 'readwrite');
    tx.objectStore(COVER_STORE).delete(`cover_${bookId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Search covers via Open Library API
export interface CoverSearchResult {
  title: string;
  author: string;
  coverId: number;
  coverUrl: string;
}

export async function searchCovers(query: string): Promise<CoverSearchResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i&limit=12`;
  const res = await fetch(url);
  const data = await res.json();

  return (data.docs ?? [])
    .filter((d: any) => d.cover_i)
    .map((d: any) => ({
      title: d.title,
      author: (d.author_name ?? []).join(', '),
      coverId: d.cover_i,
      coverUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
    }));
}

export async function downloadCoverFromUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}
