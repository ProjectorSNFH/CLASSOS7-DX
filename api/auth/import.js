import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// 1. 환경 설정 (Vercel 대시보드에서 설정할 변수들)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
                return res.status(200).json({
                    cleaning: dashboard.find(d => d.type === 'cleaning')?.value, // "쓸기(1,2), 닦기(3,4)"
                    latecomers: dashboard.find(d => d.type === 'late')?.value     // "홍길동,김민철"
                });

            case 'board':
                // [Supabase] 게시판 데이터 호출 (제공해주신 더미데이터 구조)
                const { data: board, error: bError } = await supabase
                    .from('board_data')
                    .select('*')
                    .order('date', { ascending: false });
                if (bError) throw bError;
                return res.status(200).json(board);

            case 'datacenter':
                // [Google Drive API] 파일 목록 호출
                // (실제 구현 시에는 Google Service Account 인증 로직이 추가됩니다)
                const drive = google.drive({ version: 'v3', auth: process.env.GOOGLE_AUTH });
                const { data: files } = await drive.files.list({
                    fields: 'files(id, name, createdTime, description, webViewLink)'
                });

                // 제공해주신 fileData 형식으로 매핑
                const formattedFiles = files.files.map(f => ({
                    id: f.id,
                    uploader: "시스템관리자", // 실제로는 메타데이터에서 추출
                    title: f.description || "제목 없음",
                    fileName: f.name,
                    fileLink: f.webViewLink,
                    date: f.createdTime.split('T')[0]
                }));
                return res.status(200).json(formattedFiles);

            default:
                return res.status(400).json({ error: "Invalid target" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}