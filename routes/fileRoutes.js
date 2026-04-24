const express = require("express");
const router = express.Router();

const {
  uploadFile,
  getFiles
} = require("../controllers/fileController");

// Routes
router.post("/upload", uploadFile);
router.get("/", getFiles);

module.exports = router;