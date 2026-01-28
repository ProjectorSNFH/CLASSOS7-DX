import { google } from 'googleapis';
import { put } from '@vercel/blob';

// Vercel의 기본 Body 파싱을 끄지 않아야 JSON 데이터를 편하게 받습니다.
// 단, 직접 파일을 이 API로 쏠 때는 4.5MB 제한이 걸리므로 Blob 처리는 브라우저에서 직송합니다.
export default async function handler(req, res) {
    // 1. 모든 응답에 공통 CORS 헤더 적용
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 서버 메모리에 임시 저장될 상태 (실제 서비스에선 DB나 Redis 권장)
    // 전역 변수는 Vercel 인스턴스가 재시작되면 초기화될 수 있습니다.
    global.uploadStatus = global.uploadStatus || { progress: 0, stage: "대기 중" };

    // [GET] 진행 상태 확인
    if (req.method === 'GET') {
        return res.status(200).json(global.uploadStatus);
    }

    // [POST] 데이터 처리
    if (req.method === 'POST') {
        const { id, title, fileUrl, fileName, isNew, mode } = req.body;

        // A. 브라우저에서 Blob 토큰 요청용 (선택사항이나, 여기선 직접 URL을 받는 방식 사용)
        // B. 구글 드라이브 전송 로직
        try {
            global.uploadStatus = { progress: 50, stage: "구글 드라이브 동기화 중..." };

            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            if (isNew && fileUrl) {
                // Blob에 저장된 파일을 가져와서 구글로 전달
                const response = await fetch(fileUrl);
                const buffer = await response.arrayBuffer();

                await drive.files.create({
                    resource: {
                        name: fileName,
                        parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                    },
                    media: { body: Buffer.from(buffer) },
                    fields: 'id'
                });
            }

            global.uploadStatus = { progress: 100, stage: "완료" };
            return res.status(200).json({ success: true });
        } catch (e) {
            global.uploadStatus = { progress: 0, stage: "에러: " + e.message };
            return res.status(500).json({ error: e.message });
        }
    }
}