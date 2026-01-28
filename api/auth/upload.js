import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };
let uploadStatus = { progress: 0, stage: "대기 중" };

export default async function handler(req, res) {
    // 1. CORS 허용 설정 (모든 응답에 포함되어야 함)
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. 구글 드라이브 인증 (Key 환경변수 확인 필수)
    let drive;
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        drive = google.drive({ version: 'v3', auth });
    } catch (e) {
        return res.status(500).json({ error: "Google Auth Config Error" });
    }

    if (req.method === 'GET') {
        return res.status(200).json(uploadStatus);
    }

    if (req.method === 'POST') {
        const form = new formidable.IncomingForm({ keepExtensions: true });
        
        return form.parse(req, async (err, fields, files) => {
            if (err) return res.status(500).json({ error: "파일 파싱 실패" });

            const title = fields.title?.[0] || fields.title; // formidable 버전에 따른 처리
            const id = fields.id?.[0] || fields.id;
            const file = files.file?.[0] || files.file;

            if (!file) {
                // 파일이 없는 '수정' 요청인 경우 (제목만 변경)
                uploadStatus = { progress: 100, stage: "정보 수정 완료" };
                return res.status(200).json({ success: true, message: "Title Updated" });
            }

            try {
                uploadStatus = { progress: 45, stage: "서버 수신 완료" };
                
                // 5% 구간: 수정 처리 (가상 시뮬레이션)
                uploadStatus = { progress: 50, stage: "구글 드라이브 업로드 중..." };

                const response = await drive.files.create({
                    resource: {
                        name: file.originalFilename,
                        description: `CLASS(OS) 7 Data | ${title}`,
                        parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                    },
                    media: {
                        mimeType: file.mimetype,
                        body: fs.createReadStream(file.filepath)
                    },
                    fields: 'id'
                });

                uploadStatus = { progress: 100, stage: "전송 완료" };
                return res.status(200).json({ success: true, fileId: response.data.id });

            } catch (error) {
                console.error("Upload Error:", error);
                uploadStatus = { progress: 0, stage: "업로드 실패" };
                return res.status(500).json({ error: error.message });
            }
        });
    }
}