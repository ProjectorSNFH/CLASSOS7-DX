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

        // [A] Blob 업로드 모드 - 스트림 대신 ArrayBuffer 사용으로 에러 차단
        if (mode === 'blob') {
            try {
                const token = process.env.BLOB_READ_WRITE_TOKEN;
                if (!token) throw new Error("토큰 설정 누락");

                // 이 부분이 핵심: 어떤 환경에서도 작동하게 데이터를 바이너리로 직접 추출
                let buffer;
                if (typeof req.arrayBuffer === 'function') {
                    const ab = await req.arrayBuffer();
                    buffer = Buffer.from(ab);
                } else {
                    const chunks = [];
                    for await (const chunk of req) { chunks.push(chunk); }
                    buffer = Buffer.concat(chunks);
                }

                // put 함수에 buffer를 직접 전달하여 pipe 에러 방지
                const blob = await put(filename, buffer, { access: 'public', token });
                return res.status(200).json(blob);
            } catch (e) {
                console.error("Blob Critical Error:", e.message);
                return res.status(500).json({ error: e.message });
            }
        }

        // [B] 구글 전송 및 DB 기록 모드
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                res.status(202).json({ success: true }); 

                global.uploadStatus = { progress: 30, stage: "구글 드라이브 연동 중..." };
                
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
                        media: { body: Buffer.from(buf) }
                    });
                }

                global.uploadStatus = { progress: 80, stage: "최종 데이터 저장 중..." };
                await fetch(`https://classos7-dx.vercel.app/api/auth/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'datacenter', action: 'add', id: data.id, title: data.title, fileName: data.fileName })
                });

                global.uploadStatus = { progress: 100, stage: "모든 작업 완료" };
            } catch (e) {
                global.uploadStatus = { progress: 0, stage: "실패: " + e.message };
            }
        });
    }
}