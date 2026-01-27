import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Vercel 기본 body 호환성 해제 (파일 수신을 위해 필수)
export const config = {
    api: { bodyParser: false }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const form = new formidable.IncomingForm();
    form.maxFileSize = 50 * 1024 * 1024; // 50MB 제한

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ success: false, message: "파일 크기 초과 또는 수신 오류" });

        const { title, uploader } = fields;
        const file = files.file; // 전송된 파일 객체
        const userRole = req.headers['x-user-role'];

        try {
            // 1. 서버 ON/OFF 체크
            const { data: serverConfig } = await supabase.from('server_config').select('is_online').eq('id', 1).single();
            if (serverConfig && !serverConfig.is_online && userRole !== 'A') {
                return res.status(503).json({ success: false, message: "SERVER IS OFF" });
            }

            // 2. Google Drive 인증
            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            // 3. 구글 드라이브 업로드
            const fileMetadata = {
                name: file.originalFilename,
                description: `${uploader} | ${title}`,
                parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy'] // 사용자 폴더 ID
            };

            const media = {
                mimeType: file.mimetype,
                body: fs.createReadStream(file.filepath)
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
            });

            return res.status(200).json({ success: true, fileId: response.data.id });

        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    });
}