require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const app = express();

// ✅ Use Render's PORT or default to 5000
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration for Local and Vercel production
app.use(cors({
    origin: [
        "http://localhost:3000",
        process.env.FRONTEND_URL 
    ],
    credentials: true
}));

app.use(express.json());

// ✅ Health check route to verify backend is live
app.get("/", (req, res) => {
    res.send("🚀 CloudLearn Hub Backend is Live");
});

// ================= MONGODB ATLAS =================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1); 
    });

// ================= AWS S3 CONFIG =================
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    }
});

// ================= MULTER (MEMORY STORAGE) =================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ================= AUTH ENDPOINTS =================
app.post('/api/signup', (req, res) => {
    res.json({ message: "Signup successful" });
});

app.post('/api/login', (req, res) => {
    res.json({ message: "Login successful", token: "jwt_123" });
});

// ================= GET FILES FROM S3 =================
app.get('/api/notes', async (req, res) => {
    try {
        const data = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME,
            Prefix: 'notes/'
        }));

        const notes = (data.Contents || [])
            .filter(item => item.Size > 0)
            .map(item => ({
                name: item.Key.split('/').pop(),
                url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
                size: (item.Size / 1024 / 1024).toFixed(2) + " MB"
            }));

        res.json(notes);
    } catch (err) {
        console.error("❌ AWS List Error:", err);
        res.status(500).json({ error: "Failed to fetch notes from cloud" });
    }
});

// ================= UPLOAD TO S3 =================
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const fileKey = `notes/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        res.json({ url: fileUrl });

    } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// ================= START SERVER =================
// ✅ "0.0.0.0" is critical for cloud hosting and local network access
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});