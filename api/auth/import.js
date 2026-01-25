import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { target } = req.query;
    const userRole = req.headers['x-user-role'];

    try {
        // [1] 서버 가동 상태 확인
        const { data: config } = await supabase.from('server_config').select('is_online').eq('id', 1).single();
        
        // 서버가 OFF 상태이고 총관리자(A)가 아니라면 불러오기 차단
        if (config && !config.is_online && userRole !== 'A') {
            return res.status(503).json({ success: false, message: "SERVER IS OFF: 점검 중입니다." });
        }

        switch (target) {
            case 'dashboard':
                const [dRes, bRes] = await Promise.all([
                    supabase.from('dashboard_data').select('*'),
                    supabase.from('board_data').select('*')
                ]);
                if (dRes.error) throw dRes.error;
                if (bRes.error) throw bRes.error;

                return res.status(200).json({
                    cleaning: dRes.data.find(d => d.type === 'cleaning')?.value || "",
                    latecomers: dRes.data.find(d => d.type === 'late')?.value || "",
                    allNotices: bRes.data || []
                });

            case 'board':
                const { data: board, error: bError } = await supabase
                    .from('board_data')
                    .select('*')
                    .order('date', { ascending: false });
                if (bError) throw bError;
                return res.status(200).json(board);

            case 'datacenter':
                const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                const auth = new google.auth.GoogleAuth({
                    credentials,
                    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                });
                const drive = google.drive({ version: 'v3', auth });

                const response = await drive.files.list({
                    pageSize: 20,
                    fields: 'files(id, name, createdTime, description)',
                    q: "'1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy' in parents and trashed = false"
                });

                const formattedFiles = response.data.files.map(f => {
                    // 한국 시간 변환 로직
                    const utcDate = new Date(f.createdTime);
                    const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
                    const formattedDate = kstDate.toISOString().split('T')[0];

                    const desc = f.description || "";
                    const [uploader, title] = desc.includes('|') ? desc.split('|') : ["시스템관리자", f.name];

                    return {
                        id: f.id,
                        uploader: uploader.trim(),
                        title: title.trim(),
                        fileName: f.name,
                        fileLink: `https://drive.google.com/uc?export=download&id=${f.id}`,
                        date: formattedDate
                    };
                });
                return res.status(200).json(formattedFiles);

            default:
                return res.status(400).json({ error: "Invalid target" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}