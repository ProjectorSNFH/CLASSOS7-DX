import { google } from 'googleapis';

let uploadStatus = { progress: 0, stage: "대기 중" };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://classos7.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json(uploadStatus);

    if (req.method === 'POST') {
        const { id, title, fileUrl, fileName, isNew } = req.body; // JSON으로 받음

        try {
            uploadStatus = { progress: 50, stage: "구글 드라이브로 파일 스트리밍 중..." };

            const auth = new google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
            const drive = google.drive({ version: 'v3', auth });

            // [중요] Blob URL에서 파일을 읽어와서 구글 드라이브로 바로 스트리밍
            const fileStream = await fetch(fileUrl).then(r => r.body);

            await drive.files.create({
                resource: {
                    name: fileName || "Untitled",
                    description: `ID: ${id} | Title: ${title}`,
                    parents: ['1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy']
                },
                media: { body: fileStream },
                fields: 'id'
            });

            uploadStatus = { progress: 100, stage: "완료" };
            return res.status(200).json({ success: true });

        } catch (error) {
            uploadStatus = { progress: 0, stage: "실패: " + error.message };
            return res.status(500).json({ error: error.message });
        }
    }
}