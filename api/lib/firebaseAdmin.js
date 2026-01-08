const admin = require("firebase-admin");

let serviceAccount = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", error);
  }
}

if (!serviceAccount) {
  serviceAccount = require("../secrets/firebase-service-account.json");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
