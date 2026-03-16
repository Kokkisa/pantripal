// ── PantriPal Photo Storage ──────────────────────────────────
// Handles uploading/deleting space and shelf photos to Firebase Storage.
// Photos are stored as compressed JPEGs (~80KB max) at:
//   photos/{householdId}/spaces/{spaceId}.jpg
//   photos/{householdId}/shelves/{spaceId}_{shelfId}.jpg
//
// Firebase Storage security rules required:
//   match /photos/{householdId}/{allPaths=**} {
//     allow read: if request.auth != null;
//     allow write: if request.auth != null
//                  && request.resource.size < 200 * 1024
//                  && request.resource.contentType.matches('image/.*');
//   }

import { IS_DEMO, getFirebase } from "./firebaseClient.js";

/**
 * Upload a base64 data URI to Firebase Storage.
 * Returns the public download URL.
 * Returns null in demo mode or if householdId is missing.
 * Throws on upload failure — caller should catch.
 */
export async function uploadPhoto(householdId, path, base64DataUri) {
  if (IS_DEMO || !householdId || !base64DataUri) return null;
  const fb = await getFirebase();
  // Convert base64 data URI → Blob
  const res = await fetch(base64DataUri);
  const blob = await res.blob();
  const storageRef = fb.ref(fb.storage, `photos/${householdId}/${path}`);
  await fb.uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return fb.getDownloadURL(storageRef);
}

/**
 * Delete a photo from Firebase Storage.
 * Silently ignores errors (file may not exist).
 */
export async function deletePhoto(householdId, path) {
  if (IS_DEMO || !householdId) return;
  try {
    const fb = await getFirebase();
    const storageRef = fb.ref(fb.storage, `photos/${householdId}/${path}`);
    await fb.deleteObject(storageRef);
  } catch {
    // File may not exist — safe to ignore
  }
}

/**
 * Remove a legacy localStorage photo entry.
 * Used to clean up after successful upload to Storage.
 */
export function clearLocalPhoto(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage may be unavailable in some contexts
  }
}
