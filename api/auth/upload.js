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

    if (req.method === 'POST') {
        const { mode, filename } = req.query;

        // [A] Blob 업로드 모드 - 토큰 체크 보강
        if (mode === 'blob') {
            try {
                // 환경변수가 없을 경우에 대한 예외 처리
                if (!process.env.BLOB_READ_WRITE_TOKEN) {
                    throw new Error("BLOB_READ_WRITE_TOKEN이 설정되지 않았습니다.");
                }

                const blob = await put(filename, req, {
                    access: 'public',
                    token: process.env.BLOB_READ_WRITE_TOKEN // 토큰을 명시적으로 전달
                });
                return res.status(200).json(blob);
            } catch (e) {
                console.error("Blob Error:", e.message);
                return res.status(500).json({ error: e.message });
            }
        }

        // [B] 구글 드라이브 및 DB 반영 모드
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                global.uploadStatus = { progress: 40, stage: "구글 드라이브 동기화 중..." };

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
                    });
                }

                global.uploadStatus = { progress: 80, stage: "리스트 업데이트 중..." };
                
                // 실제 데이터 기록 API 호출
                await fetch(`https://classos7-dx.vercel.app/api/auth/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'datacenter',
                        action: 'add',
                        id: data.id,
                        title: data.title,
                        fileName: data.fileName
                    })
                });

                global.uploadStatus = { progress: 100, stage: "완료" };
                res.status(200).json({ success: true });
            } catch (e) {
                global.uploadStatus = { progress: 0, stage: "오류: " + e.message };
                res.status(500).json({ error: e.message });
            }
        });
    }

    if (req.method === 'DELETE') {
        return res.status(200).json({ success: true });
    }
}