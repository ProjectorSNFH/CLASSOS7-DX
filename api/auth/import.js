import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// 1. 환경 설정 (Vercel 대시보드에서 설정할 변수들)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { target } = req.query; // 무엇을 불러올지 파라미터로 받음 (dashboard, board, datacenter)

    try {
        switch (target) {
            case 'dashboard':
                // [Supabase] 청소당번 및 지각생 데이터 호출
                const { data: dashboard, error: dError } = await supabase
                    .from('dashboard_data')
                    .select('*');
                if (dError) throw dError;

                // 예시 데이터 구조로 가공하여 반환
                const [dRes, bRes] = await Promise.all([
                    supabase.from('dashboard_data').select('*'),
                    supabase.from('board_data').select('*')
                ]);

                if (dRes.error) throw dRes.error;
                if (bRes.error) throw bRes.error;

                return res.status(200).json({
                    cleaning: dRes.data.find(d => d.type === 'cleaning')?.value || "", // "01, 02, 03, 04" 형태 가정
                    latecomers: dRes.data.find(d => d.type === 'late')?.value || "",
                    allNotices: bRes.data || [] // 게시판의 모든 데이터를 공지사항용으로 전달
                });

            case 'board':
                // [Supabase] 게시판 데이터 호출 (제공해주신 더미데이터 구조)
                const { data: board, error: bError } = await supabase
                    .from('board_data')
                    .select('*')
                    .order('date', { ascending: false });
                if (bError) throw bError;
                return res.status(200).json(board);

            // switch (target) 내부의 case 'datacenter' 부분 수정
            case 'datacenter':
                try {
                    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
                    const auth = new google.auth.GoogleAuth({
                        credentials,
                        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                    });

                    const drive = google.drive({ version: 'v3', auth });

                    // 특정 폴더 내의 파일들만 가져오기 (폴더 ID 필요)
                    // import.js 내의 drive.files.list 부분을 이렇게 수정하세요.
                    const response = await drive.files.list({
                        pageSize: 10,
                        fields: 'files(id, name, createdTime, description, webViewLink)',
                        // [수정] q 파라미터를 추가하여 특정 폴더 안의 파일만 가져오게 합니다.
                        q: "'1ITNE8LN-2mx6VzPJczzi42Yh3kl5ElFy' in parents and trashed = false"
                    });
                    const formattedFiles = response.data.files.map(f => {
                        // 설명(description)이 있으면 '|'로 나누고, 없으면 기본값 설정
                        const desc = f.description || "";
                        const [uploader, title] = desc.includes('|')
                            ? desc.split('|')
                            : ["시스템관리자", f.name]; // '|'가 없으면 파일명을 제목으로 사용

                        return {
                            id: f.id,
                            uploader: uploader.trim(), // '학생회장'
                            title: title.trim(),       // '2026학년도 축제 기획안'
                            fileName: f.name,
                            fileLink: `https://drive.google.com/uc?export=download&id=${f.id}`,
                            date: f.createdTime.split('T')[0]
                        };
                    });

                    return res.status(200).json(formattedFiles);
                } catch (err) {
                    return res.status(500).json({ error: "Drive API Error: " + err.message });
                }

            default:
                return res.status(400).json({ error: "Invalid target" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}