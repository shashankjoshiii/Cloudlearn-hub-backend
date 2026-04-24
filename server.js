require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// --- MONGODB ---
mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log("✅ MONGO CONNECTED"))
    .catch(err => console.log("❌ MONGO ERROR:", err.message));

// --- S3 CONFIG ---
const s3 = new S3Client({
    region: process.env.AWS_REGION.trim(),
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY.trim(),
        secretAccessKey: process.env.AWS_SECRET_KEY.trim(),
    }
});

// --- MULTER MEMORY ---
const upload = multer({ storage: multer.memoryStorage() });

// --- AUTH ---
app.post('/api/signup', (req, res) => res.json({ message: "Signup successful" }));
app.post('/api/login', (req, res) => res.json({ message: "Login successful", token: "jwt_123" }));

// --- GET FILES ---
app.get('/api/notes', async (req, res) => {
    try {
        const data = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME.trim(),
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
        console.error("AWS List Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- UPLOAD FIXED ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });

        const fileKey = `notes/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME.trim(),
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }));

        const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        res.json({ url });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(5000, () => console.log("🚀 BACKEND READY ON 5000"));