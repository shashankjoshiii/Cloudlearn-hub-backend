const File = require("../models/File");

// Upload File (Metadata only for now)
exports.uploadFile = async (req, res) => {
  try {
    const { filename, fileUrl, uploadedBy } = req.body;

    const file = await File.create({
      filename,
      fileUrl,
      uploadedBy
    });

    res.status(201).json({
      message: "File uploaded successfully",
      file
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all files
exports.getFiles = async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });

    res.json(files);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};