const DATABASE = 'rgu-preview-clips';
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('clips');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Browser clip storage is unavailable.'));
  });
}
export async function putClip(id: string, blob: Blob) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('clips', 'readwrite');
      tx.objectStore('clips').put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error('Could not save this clip. Browser storage may be full.'));
      tx.onabort = () => reject(new Error('Clip storage was interrupted.'));
    });
  } finally {
    db.close();
  }
}
export async function getClip(id: string): Promise<Blob | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('clips').objectStore('clips').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error('Could not load this clip.'));
    });
  } finally {
    db.close();
  }
}
export async function removeClip(id: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('clips', 'readwrite');
      tx.objectStore('clips').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Could not delete the clip.'));
    });
  } finally {
    db.close();
  }
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
