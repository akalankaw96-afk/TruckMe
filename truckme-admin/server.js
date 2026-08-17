import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8083;

const publicDir = path.join(__dirname, 'public');
const targetDir = publicDir;

app.use(express.static(targetDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(targetDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TruckMe Fleet Control Web Dashboard running on http://localhost:${PORT}`);
});
