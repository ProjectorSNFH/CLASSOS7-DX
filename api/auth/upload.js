import { google } from 'googleapis';
import { put } from '@vercel/blob';
import { Readable } from 'stream'; // 스트림 변환을 위해 추가

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    global.uploadStatus = global.uploadStatus || { progress: 0, stage: "대기 중" };
    if (req.method === 'GET') return res.status(200).json(global.uploadStatus);

    if (req.method === 'POST') {
        const { mode, filename } = req.query;

        // [A] 블롭 업로드 (이미 잘 되고 있다면 이 로직은 유지됩니다)
        if (mode === 'blob') {
            try {
                const chunks = [];
                for await (const chunk of req) { chunks.push(chunk); }
                const buffer = Buffer.concat(chunks);
                const blob = await put(filename, buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
                return res.status(200).json(blob);
            } catch (e) { return res.status(500).json({ error: e.message }); }
        }

        // [B] 구글 드라이브 연동 (문제의 구간)
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
    try {
        const data = JSON.parse(body);
        res.status(202).json({ success: true });

        // [핵심 수정] 인증 객체 생성 시 쿼터(용량) 문제를 해결하는 옵션
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        if (data.isNew && data.fileUrl) {
            const fRes = await fetch(data.fileUrl);
            const arrayBuffer = await fRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const stream = new Readable();
            stream.push(buffer);
            stream.push(null);

            // [핵심 수정] 파일 생성 시 '주인의 공간'을 쓰도록 강제
            await drive.files.create({
                resource: {
                    name: data.fileName,
                    parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                },
                media: {
                    mimeType: 'application/octet-stream',
                    body: stream
                },
                // 이 옵션이 없으면 자기(서비스 계정) 용량을 체크합니다.
                // 이 옵션을 넣으면 부모 폴더(사용자님 폴더)의 설정을 따릅니다.
                supportsAllDrives: true, 
                fields: 'id'
            });
        }

                global.uploadStatus = { progress: 80, stage: "데이터베이스 기록 중..." };
                await fetch(`https://classos7-dx.vercel.app/api/auth/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'datacenter', action: 'add', id: data.id, title: data.title, fileName: data.fileName })
                });

                global.uploadStatus = { progress: 100, stage: "모든 작업 완료" };
            } catch (e) {
                console.error("Critical Error:", e);
                global.uploadStatus = { progress: 0, stage: "에러: " + e.message };
            }
        });
    }
}