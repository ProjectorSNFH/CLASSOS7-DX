import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } };
let uploadStatus = { progress: 0, stage: "대기 중" };

export default async function handler(req, res) {
    // 1. CORS 설정 (반드시 최상단에 위치)
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    // preflight(OPTIONS) 요청 대응
    if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });

    if (req.method === 'GET') {
        return res.status(200).json(uploadStatus);
    }

    if (req.method === 'POST') {
        const form = new formidable.IncomingForm();
        return form.parse(req, async (err, fields, files) => {
            if (err) return res.status(500).json({ error: "수신 실패" });

            uploadStatus = { progress: 45, stage: "서버 수신 완료" };
            const { title, id } = fields;
            const file = files.file;

            try {
                uploadStatus = { progress: 50, stage: "구글 드라이브로 복사 중..." };
                
                // 구글 업로드 시작
                const response = await drive.files.create({
                    resource: {
                        name: file.originalFilename,
                        description: `ID: ${id} | 제목: ${title}`,
                        parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                    },
                    media: { body: fs.createReadStream(file.filepath) },
                    fields: 'id'
                });

                uploadStatus = { progress: 100, stage: "완료" };
                return res.status(200).json({ success: true, fileId: response.data.id });
            } catch (error) {
                uploadStatus = { progress: 0, stage: "에러 발생" };
                return res.status(500).json({ error: error.message });
            }
        });
    }
}