const admin = require("firebase-admin");

let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", error);
  }
}

if (!serviceAccount && process.env.NODE_ENV !== "test") {
  try {
    serviceAccount = require("../secrets/firebase-service-account.json");
  } catch (err) {
    console.warn("Firebase service account file not found in secrets/");
    console.warn("Ensure FIREBASE_SERVICE_ACCOUNT_JSON is set, or the app might run with default credentials if available.");
  }
}

if (!admin.apps.length && process.env.NODE_ENV !== "test") {
  const config = {};
  if (serviceAccount) {
    config.credential = admin.credential.cert(serviceAccount);
  }
  admin.initializeApp(config);
}

module.exports = admin;
