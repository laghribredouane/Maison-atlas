import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
let firebaseConfig: any = {};
try {
  firebaseConfig = require('../../firebase-applet-config.json');
} catch {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load firebase-applet-config.json in firebase-admin:', err);
  }
}

const resolvedProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  firebaseConfig?.projectId;

if (!getApps().length && resolvedProjectId) {
  initializeApp({
    projectId: resolvedProjectId,
  });
}

export const adminAuth = getAuth();
