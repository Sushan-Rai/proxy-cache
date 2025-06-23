const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const logger = require("./logger.js")("persistence");

class Persistence {
  DATA_FILE = path.join(__dirname, "data.rdb");

  constructor() {
    this.store = {};
    this.expiryTime = {};
  }

  async saveSnapshot() {
    const data = JSON.stringify({
      store: this.store,
      expiryTime: this.expiryTime,
    });

    try {
      await fsp.writeFile(this.DATA_FILE, data);
      logger.log(`Saved datastore to file: ${this.DATA_FILE}`);
    } catch (error) {
      logger.error(`Failed to save datastore: ${error.message}`);
    }
  }

  loadSnapshotSync() {
    if (!fs.existsSync(this.DATA_FILE)) return;

    try {
      const data = fs.readFileSync(this.DATA_FILE).toString();

      if (data) {
        const { store: loadedStore, expiryTime: loadedexpiryTime } =
          JSON.parse(data);

        Object.assign(this.store, loadedStore);
        Object.assign(this.expiryTime, loadedexpiryTime);

        logger.log("Datastore loaded successfully");
      }
    } catch (error) {
      logger.error(`Failed to load datastore: ${error.message}`);
    }
  }
}

module.exports = new Persistence();