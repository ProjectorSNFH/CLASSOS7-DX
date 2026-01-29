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
    if (req.method === 'DELETE') return res.status(200).json({ success: true });

    if (req.method === 'POST') {
        const { mode, filename } = req.query;

        if (mode === 'blob') {
            try {
                const token = process.env.BLOB_READ_WRITE_TOKEN;
                const blob = await put(filename, req, { access: 'public', token });
                return res.status(200).json(blob);
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }

        // [핵심] JSON 요청 처리 - 응답을 먼저 보내 타임아웃 방지
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                // 브라우저에 "접수됨"을 즉시 알림 (연결 끊김 방지)
                res.status(202).json({ success: true, message: "작업 시작됨" });

                // 실제 무거운 작업 시작 (비동기 백그라운드 처리)
                global.uploadStatus = { progress: 30, stage: "구글 드라이브 업로드 준비..." };
                
                const auth = new google.auth.GoogleAuth({
                    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                });
                const drive = google.drive({ version: 'v3', auth });
                
                if (data.isNew && data.fileUrl) {
                    global.uploadStatus = { progress: 50, stage: "구글 드라이브로 파일 복사 중..." };
                    const fRes = await fetch(data.fileUrl);
                    const buf = await fRes.arrayBuffer();
                    await drive.files.create({
                        resource: { name: data.fileName, parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy'] },
                        media: { body: Buffer.from(buf) }
                    });
                }

                global.uploadStatus = { progress: 80, stage: "리스트 업데이트 중..." };
                await fetch(`https://classos7-dx.vercel.app/api/auth/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'datacenter', action: 'add', id: data.id, title: data.title, fileName: data.fileName })
                });

                global.uploadStatus = { progress: 100, stage: "모든 작업 완료" };
            } catch (e) {
                console.error("백그라운드 오류:", e);
                global.uploadStatus = { progress: 0, stage: "에러: " + e.message };
            }
        });
    }
}