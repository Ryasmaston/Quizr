// docs: https://github.com/motdotla/dotenv#%EF%B8%8F-usage
require("dotenv").config();

const app = require("./app.js");
const { connectToDatabase } = require("./db/db.js");
const { runDueDeletions } = require("./services/userDeletion");

function listenForRequests() {
  const port = process.env.PORT || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log("Now listening on port", port);
  });
}

connectToDatabase().then(() => {
  if (process.env.NODE_ENV !== "test") {
    runDueDeletions().catch((error) => {
      console.error("Error processing scheduled deletions:", error);
    });
    setInterval(() => {
      runDueDeletions().catch((error) => {
        console.error("Error processing scheduled deletions:", error);
      });
    }, 60 * 60 * 1000);
  }
  listenForRequests();
});
