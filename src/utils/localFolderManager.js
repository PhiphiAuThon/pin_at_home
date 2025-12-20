/*
 * localFolderManager.js
 * Handles File System Access API directory handles and persistence using IndexedDB.
 */

const DB_NAME = 'PinAtHomeLocalSource';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

/**
 * Open the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save a directory handle to IndexedDB
 */
export async function saveDirectoryHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const id = `local_${Date.now()}`;
    const entry = {
      id,
      handle,
      name: handle.name,
      type: 'local'
    };
    const request = store.put(entry);
    request.onsuccess = () => resolve(entry);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Get all directory handles from IndexedDB
 */
export async function getAllDirectoryHandles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (e) {
    console.error('LocalFolderManager: Failed to get handles', e);
    return [];
  }
}

/**
 * Get a specific directory handle by ID
 */
export async function getDirectoryHandle(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Remove a directory handle by ID
 */
export async function removeDirectoryHandle(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Verify permission for a handle, requesting if necessary
 */
export async function verifyPermission(handle, readWrite = false) {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

/**
 * Recursively scan directory for images
 */
export async function scanDirectoryForImages(handle) {
  const fileHandles = [];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  async function scan(dirHandle) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
        if (validExtensions.includes(ext)) {
          fileHandles.push(entry);
        }
      } else if (entry.kind === 'directory') {
        await scan(entry);
      }
    }
  }

  await scan(handle);
  return fileHandles;
}

/**
 * Create Blob URLs for a list of file handles
 * Returns an object containing the URLs and a revoke function
 */
export async function createBlobUrls(fileHandles) {
  const urls = [];
  for (const handle of fileHandles) {
    try {
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      urls.push(url);
    } catch (e) {
      console.warn(`LocalFolderManager: Failed to load file ${handle.name}`, e);
    }
  }
  
  const revokeAll = () => {
    urls.forEach(url => URL.revokeObjectURL(url));
    console.log(`LocalFolderManager: Revoked ${urls.length} Blob URLs`);
  };

  return { urls, revokeAll };
}
