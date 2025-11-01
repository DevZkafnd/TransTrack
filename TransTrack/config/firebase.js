const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/**
 * Inisialisasi Firebase Admin SDK
 * Mendukung beberapa metode: Service Account Key, Environment Variable, atau file default
 */
let firebaseApp;

try {
  let serviceAccount = null;
  let projectId = null;

  // Metode 1: Menggunakan Service Account Key dari environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (fs.existsSync(keyPath)) {
      serviceAccount = require(keyPath);
      projectId = serviceAccount.project_id;
      console.log(`Menggunakan Firebase Service Account Key dari: ${keyPath}`);
    }
  }
  
  // Metode 2: Mencoba menggunakan file default di root directory
  if (!serviceAccount) {
    const defaultKeyPath = path.resolve(__dirname, '../transtrack-86fba-firebase-adminsdk-fbsvc-fd4ee18a0d.json');
    if (fs.existsSync(defaultKeyPath)) {
      serviceAccount = require(defaultKeyPath);
      projectId = serviceAccount.project_id;
      console.log(`Menggunakan Firebase Service Account Key default dari: ${defaultKeyPath}`);
    }
  }

  // Inisialisasi dengan Service Account Key
  if (serviceAccount) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || process.env.FIREBASE_PROJECT_ID || 'transtrack-86fba'
    });
  }
  // Metode 3: Menggunakan Application Default Credentials
  else if (process.env.FIREBASE_PROJECT_ID) {
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    console.log(`Menggunakan Application Default Credentials dengan project: ${process.env.FIREBASE_PROJECT_ID}`);
  }
  // Metode 4: Fallback - menggunakan project ID default
  else {
    firebaseApp = admin.initializeApp({
      projectId: 'transtrack-86fba'
    });
    console.log('Menggunakan project ID default: transtrack-86fba');
  }

  console.log(`Firebase Admin SDK berhasil diinisialisasi untuk project: ${firebaseApp.options.projectId}`);
} catch (error) {
  console.error('Kesalahan saat menginisialisasi Firebase Admin SDK:', error);
  throw error;
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db, firebaseApp };

