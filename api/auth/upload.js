import { google } from 'googleapis';
import { put } from '@vercel/blob';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    global.uploadStatus = global.uploadStatus || { progress: 0, stage: "대기 중" };

    if (req.method === 'GET') return res.status(200).json(global.uploadStatus);

    if (req.method === 'DELETE') {
        // 삭제 로직 (여기에 구글 드라이브 삭제 등을 추가할 수 있습니다)
        return res.status(200).json({ success: true });
    }

    if (req.method === 'POST') {
        const { mode, filename } = req.query;
        if (mode === 'blob') {
            const blob = await put(filename, req, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
            return res.status(200).json(blob);
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                global.uploadStatus = { progress: 50, stage: "동기화 중..." };
                
                const auth = new google.auth.GoogleAuth({
                    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                });
                const drive = google.drive({ version: 'v3', auth });

                if (data.isNew && data.fileUrl) {
                    const fRes = await fetch(data.fileUrl);
                    const buf = await fRes.arrayBuffer();
                    await drive.files.create({
                        resource: { name: data.fileName, parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy'] },
                        media: { body: Buffer.from(buf) },
                        fields: 'id'
                    });
                }
                global.uploadStatus = { progress: 100, stage: "완료" };
                res.status(200).json({ success: true });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
}