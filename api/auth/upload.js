import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

// Vercel 기본 본문 파싱 비활성화 (파일 스트림 처리를 위해 필수)
export const config = {
    api: {
        bodyParser: false,
    },
};

// 서버 메모리 역할을 할 상태 객체 (인스턴스 재사용 시 유지됨)
let uploadStatus = { progress: 0, stage: "대기 중" };

export default async function handler(req, res) {
    // 1. CORS 설정
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. GET 요청: 진행 현황 확인 (Polling)
    if (req.method === 'GET') {
        return res.status(200).json(uploadStatus);
    }

    // 3. POST 요청: 파일 업로드 및 구글 전송
    if (req.method === 'POST') {
        // [수정 포인트] formidable v3+ 생성 방식
        const form = formidable({
            keepExtensions: true,
            maxFileSize: 100 * 1024 * 1024, // 100MB 허용 (단, Vercel 4.5MB 제한 주의)
        });

        return new Promise((resolve, reject) => {
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    uploadStatus = { progress: 0, stage: "파일 해석 실패" };
                    res.status(500).json({ error: "Parsing error" });
                    return resolve();
                }

                // 값 추출 (formidable 버전에 따라 배열로 올 수 있음)
                const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
                const id = Array.isArray(fields.id) ? fields.id[0] : fields.id;
                const file = Array.isArray(files.file) ? files.file[0] : files.file;

                if (!file) {
                    uploadStatus = { progress: 100, stage: "제목 수정 완료" };
                    res.status(200).json({ success: true });
                    return resolve();
                }

                try {
                    uploadStatus = { progress: 45, stage: "서버 수신 및 전송 준비" };

                    // 구글 드라이브 인증
                    const auth = new google.auth.GoogleAuth({
                        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                        scopes: ['https://www.googleapis.com/auth/drive.file'],
                    });
                    const drive = google.drive({ version: 'v3', auth });

                    uploadStatus = { progress: 50, stage: "구글 드라이브로 복사 중..." };

                    // 구글 드라이브 업로드
                    const response = await drive.files.create({
                        resource: {
                            name: file.originalFilename,
                            description: `CLASS(OS) 7 | ID: ${id} | ${title}`,
                            parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                        },
                        media: {
                            mimeType: file.mimetype,
                            body: fs.createReadStream(file.filepath)
                        },
                        fields: 'id'
                    });

                    uploadStatus = { progress: 100, stage: "모든 작업 완료" };
                    res.status(200).json({ success: true, fileId: response.data.id });
                    resolve();

                } catch (error) {
                    console.error("Google Drive Error:", error);
                    uploadStatus = { progress: 0, stage: "구글 드라이브 전송 에러" };
                    res.status(500).json({ error: error.message });
                    resolve();
                }
            });
        });
    }

    // 4. DELETE 요청: 삭제 처리
    if (req.method === 'DELETE') {
        // 삭제 로직 구현 (필요 시)
        return res.status(200).json({ message: "Delete endpoint" });
    }
}