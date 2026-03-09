const { MongoClient, GridFSBucket } = require("mongodb");

let db;
let bucket;

async function connectDB(mongoUri) {
  const client = new MongoClient(mongoUri);
  await client.connect();

  db = client.db();
  bucket = new GridFSBucket(db, {
    bucketName: "uploads",
  });

  console.log("MongoDB connected");
}

function getDB() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function getBucket() {
  if (!bucket) {
    throw new Error("GridFS bucket not initialized");
  }
  return bucket;
}

module.exports = {
  connectDB,
  getDB,
  getBucket,
};
