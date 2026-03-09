const mongoose = require("mongoose");

async function connectToDatabase() {
  const mongoDbUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;

  if (!mongoDbUrl) {
    console.error(
      "No MongoDB url provided. Make sure there is a MONGODB_URL or MONGODB_URI environment variable set. See the README for more details."
    );
    throw new Error("No connection string provided");
  }

  // ABSOLUTE SAFEGUARD: Never allow tests to connect to the production database
  if (process.env.NODE_ENV === "test" && mongoDbUrl.includes("project_creative")) {
    throw new Error("CRITICAL: Attempted to run tests against the production database ('project_creative'). Aborting immediately.");
  }

  await mongoose.connect(mongoDbUrl);

  if (process.env.NODE_ENV !== "test") {
    console.log("Successfully connected to MongoDB");
  }
}

module.exports = { connectToDatabase };
