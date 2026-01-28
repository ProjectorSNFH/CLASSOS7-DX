import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

export const config = { api: { bodyParser: false } }; // 파일 수신을 위해 필수

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method Not Allowed" });

    const form = new formidable.IncomingForm();
    form.maxFileSize = 50 * 1024 * 1024; // 50MB 제한

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ success: false, message: "파일 수신 오류" });

        const { title, uploader } = fields;
        const file = files.file; 

        try {
            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            // 구글 드라이브 업로드 (이 단계가 전체 프로세스의 마지막 50%를 차지)
            const response = await drive.files.create({
                resource: {
                    name: file.originalFilename,
                    description: `${uploader} | ${title}`,
                    parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy'] 
                },
                media: {
                    mimeType: file.mimetype,
                    body: fs.createReadStream(file.filepath)
                },
                fields: 'id'
            });

            return res.status(200).json({ success: true, fileId: response.data.id });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    });
}