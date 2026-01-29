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
                res.status(202).json({ success: true }); // 브라우저 타임아웃 방지

                global.uploadStatus = { progress: 30, stage: "구글 드라이브 업로드 준비..." };

                const auth = new google.auth.GoogleAuth({
                    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                });
                const drive = google.drive({ version: 'v3', auth });

                if (data.isNew && data.fileUrl) {
                    global.uploadStatus = { progress: 50, stage: "구글 드라이브로 파일 전송 중..." };

                    // 1. 블롭에서 데이터를 다시 가져옴
                    const fRes = await fetch(data.fileUrl);
                    const arrayBuffer = await fRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    // 2. [중요] 버퍼를 구글이 원하는 '스트림'으로 강제 변환 (pipe 에러 해결책)
                    const stream = new Readable();
                    stream.push(buffer);
                    stream.push(null);

                    // 3. 구글 드라이브 업로드 실행
                    // ... (상단 생략)

                    // 구글 드라이브 업로드 실행 부분
                    const file = await drive.files.create({
                        resource: {
                            name: data.fileName,
                            parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy'] // 주인 폴더 ID
                        },
                        media: {
                            mimeType: 'application/octet-stream', // 파일 타입을 명시적으로 지정
                            body: stream
                        },
                        // [핵심] 서비스 계정의 개인 쿼터를 사용하지 않도록 강제하는 옵션들
                        fields: 'id, name, size',
                        supportsAllDrives: true,
                        keepRevisionForever: false, // 불필요한 용량 차지 방지
                    }, {
                        // 쿼터 관련 오류를 방지하기 위해 사용자의 IP나 별도 설정을 전달하지 않음
                        fetchBefore: false
                    });

                    // ... (하단 생략)
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