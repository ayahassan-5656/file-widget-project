const express = require("express");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const { getDB, getBucket } = require("../db");

const router = express.Router();

const allowedExtensions = [
  ".csv",
  ".xlsx",
  ".pdf",
  ".docx",
  ".txt",
  ".ppt",
  ".jpg",
  ".png",
];

const maxFileSize = 50 * 1024 * 1024; // 50 MB
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
});

function getExtension(filename) {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uniqueFileKey = req.body.uniqueFileKey;

    if (!uniqueFileKey || uniqueFileKey.trim() === "") {
      return res.status(400).json({ message: "Missing unique file key" });
    }

    const extension = getExtension(req.file.originalname);

    if (!allowedExtensions.includes(extension)) {
      return res.status(400).json({
        message: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`
      });
    }

    const db = getDB();
    const bucket = getBucket();

    const existingFile = await db.collection("uploads.files").findOne({
      filename: uniqueFileKey,
    });

    if (existingFile) {
      return res.status(409).json({
        message: `A file with ID "${uniqueFileKey}" already exists.`
      });
    }

    const uploadStream = bucket.openUploadStream(uniqueFileKey, {
      contentType: req.file.mimetype,
      metadata: {
        originalName: req.file.originalname,
        uniqueFileKey: uniqueFileKey,
      },
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", () => {
      return res.status(201).json({
        message: "File uploaded successfully",
        fileId: uploadStream.id,
        filename: uniqueFileKey,
      });
    });

    uploadStream.on("error", (error) => {
      return res.status(500).json({
        message: "Upload failed",
        error: error.message,
      });
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error during upload",
      error: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const db = getDB();

    const files = await db
      .collection("uploads.files")
      .find({})
      .project({
        filename: 1,
        length: 1,
        uploadDate: 1,
        contentType: 1,
        metadata: 1,
      })
      .toArray();

    return res.json(files);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch files",
      error: error.message,
    });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const bucket = getBucket();
    const db = getDB();
    const fileId = new ObjectId(req.params.id);

    const file = await db.collection("uploads.files").findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.set("Content-Type", file.contentType || "application/octet-stream");
    res.set(
      "Content-Disposition",
      `attachment; filename="${file.filename}"`
    );

    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on("error", () => {
      return res.status(500).json({ message: "Download failed" });
    });

    downloadStream.pipe(res);
  } catch (error) {
    return res.status(500).json({
      message: "Server error during download",
      error: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const bucket = getBucket();
    const fileId = new ObjectId(req.params.id);

    await bucket.delete(fileId);

    return res.json({ message: "File deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete file",
      error: error.message,
    });
  }
});

module.exports = router;
