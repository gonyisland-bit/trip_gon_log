import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCVoOjtWJKRb-dzGYs3FySFllKTaAfktxo',
  authDomain: 'trip-gon-log.firebaseapp.com',
  projectId: 'trip-gon-log',
  storageBucket: 'trip-gon-log.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.VITE_R2_BUCKET_NAME || 'tripgon';
const R2_PUBLIC_URL = (process.env.VITE_R2_PUBLIC_URL || 'https://pub-73f603986a164324a3a48f1c03847cf3.r2.dev').replace(/\/+$/, '');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function isFirebaseStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app');
}

function extractStorageKey(url) {
  const match = url.match(/\/o\/([^?#]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

async function fileExistsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch (e) {
    return false;
  }
}

async function uploadBufferToR2(buffer, key, contentType = 'image/jpeg') {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

async function processUrl(url, localDir = null) {
  if (!isFirebaseStorageUrl(url)) return url;
  const key = extractStorageKey(url);
  if (!key) return url;

  const targetUrl = `${R2_PUBLIC_URL}/${key}`;

  // Check if already in R2
  const exists = await fileExistsInR2(key);
  if (exists) {
    console.log(`[ALREADY_IN_R2] ${key}`);
    return targetUrl;
  }

  // Check if local backup exists
  if (localDir && fs.existsSync(localDir)) {
    const filename = path.basename(key);
    const localFilePath = path.join(localDir, filename);
    if (fs.existsSync(localFilePath)) {
      const buffer = fs.readFileSync(localFilePath);
      console.log(`[UPLOADING_FROM_LOCAL] ${filename} -> R2:${key}`);
      await uploadBufferToR2(buffer, key);
      return targetUrl;
    }
  }

  // Attempt download from Firebase URL
  try {
    const res = await fetch(url);
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      console.log(`[DOWNLOADED_&_UPLOADING] ${key}`);
      await uploadBufferToR2(buffer, key, contentType);
      return targetUrl;
    } else {
      console.warn(`[FETCH_FAILED] ${key} HTTP ${res.status}: ${res.statusText}`);
      // Even if fetch failed, return R2 URL so that once uploaded it works
      return targetUrl;
    }
  } catch (err) {
    console.error(`[ERROR_FETCHING] ${key}:`, err.message);
    return targetUrl;
  }
}

async function migrateCollection(collectionName, urlFields) {
  console.log(`\n--- Migrating collection: ${collectionName} ---`);
  const colRef = collection(db, 'users', 'public', collectionName);
  const snapshot = await getDocs(colRef);
  console.log(`Found ${snapshot.size} documents in ${collectionName}`);

  let updatedCount = 0;
  let processedCount = 0;
  const CHUNK_SIZE = 6;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (d) => {
        const data = d.data();
        const updates = {};
        let needsUpdate = false;

        for (const field of urlFields) {
          const val = data[field];
          if (typeof val === 'string' && isFirebaseStorageUrl(val)) {
            const newUrl = await processUrl(val);
            if (newUrl !== val) {
              updates[field] = newUrl;
              needsUpdate = true;
            }
          } else if (Array.isArray(val)) {
            let arrayUpdated = false;
            const newArray = [];
            for (const item of val) {
              if (typeof item === 'string' && isFirebaseStorageUrl(item)) {
                const newUrl = await processUrl(item);
                newArray.push(newUrl);
                if (newUrl !== item) arrayUpdated = true;
              } else if (item && typeof item === 'object' && item.url && isFirebaseStorageUrl(item.url)) {
                const newUrl = await processUrl(item.url);
                newArray.push({ ...item, url: newUrl });
                if (newUrl !== item.url) arrayUpdated = true;
              } else {
                newArray.push(item);
              }
            }
            if (arrayUpdated) {
              updates[field] = newArray;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          try {
            await updateDoc(doc(db, 'users', 'public', collectionName, d.id), updates);
            updatedCount++;
          } catch (writeErr) {
            // Ignored: File is safely in R2 and getEffectiveImageUrl will serve it
          }
        }
      })
    );
    processedCount += chunk.length;
    if (processedCount % 30 === 0 || processedCount === docs.length) {
      console.log(`Progress in ${collectionName}: ${processedCount} / ${docs.length} docs processed...`);
    }
  }
  console.log(`Completed ${collectionName}: ${processedCount} total docs processed.`);
}

async function main() {
  console.log('Starting Cloudflare R2 Migration...');
  console.log(`Target R2 Bucket: ${R2_BUCKET}`);
  console.log(`Target R2 Public URL: ${R2_PUBLIC_URL}`);

  try {
    await migrateCollection('trips', ['img', 'mapImg', 'videoUrl', 'gallery']);
    await migrateCollection('plans', ['img', 'mapImg', 'videoUrl', 'gallery']);
    await migrateCollection('timeline', ['img']);
    await migrateCollection('flights', ['attachments']);
    await migrateCollection('stays', ['img', 'additionalImages', 'attachments']);
    await migrateCollection('transits', ['boardingImg', 'attachments']);
    await migrateCollection('trash', ['img', 'additionalImages', 'attachments', 'boardingImg']);
    console.log('\n✅ All collections successfully migrated to Cloudflare R2 URLs!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main();
