import { PhotoEvidence } from '../types';

const DB_NAME = 'safetydoc-photo-db';
const STORE_NAME = 'photo-state';
const STATE_KEY = 'current';

type StoredPhotoState = {
  laborPhotos: PhotoEvidence[];
  safetyPhotos: PhotoEvidence[];
  updatedAt: number;
};

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 열기 실패'));
  });
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Base64 변환 실패'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('파일 읽기 실패'));
    reader.readAsDataURL(blob);
  });
};

const normalizePhotosForStorage = async (photos: PhotoEvidence[]): Promise<PhotoEvidence[]> => {
  return Promise.all(
    photos.map(async (photo) => {
      if (!photo.fileUrl) return photo;
      if (photo.fileUrl.startsWith('data:')) return photo;

      try {
        const response = await fetch(photo.fileUrl);
        if (!response.ok) return { ...photo, fileUrl: '' };
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        return { ...photo, fileUrl: dataUrl };
      } catch {
        return { ...photo, fileUrl: '' };
      }
    })
  );
};

export const savePhotoState = async (laborPhotos: PhotoEvidence[], safetyPhotos: PhotoEvidence[]): Promise<void> => {
  const db = await openDb();

  try {
    const normalizedLaborPhotos = await normalizePhotosForStorage(laborPhotos);
    const normalizedSafetyPhotos = await normalizePhotosForStorage(safetyPhotos);

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      store.put(
        {
          laborPhotos: normalizedLaborPhotos.filter(photo => photo.fileUrl),
          safetyPhotos: normalizedSafetyPhotos.filter(photo => photo.fileUrl),
          updatedAt: Date.now(),
        } satisfies StoredPhotoState,
        STATE_KEY
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('사진 저장 실패'));
    });
  } finally {
    db.close();
  }
};

export const loadPhotoState = async (): Promise<StoredPhotoState | null> => {
  const db = await openDb();

  try {
    return await new Promise<StoredPhotoState | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STATE_KEY);

      request.onsuccess = () => resolve((request.result as StoredPhotoState | undefined) || null);
      request.onerror = () => reject(request.error || new Error('사진 복구 실패'));
    });
  } finally {
    db.close();
  }
};

export const clearPhotoState = async (): Promise<void> => {
  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(STATE_KEY);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('사진 저장소 초기화 실패'));
    });
  } finally {
    db.close();
  }
};