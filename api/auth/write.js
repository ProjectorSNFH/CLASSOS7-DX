import { createClient } from '@supabase/supabase-js';
ㅈ

// [중요] RLS를 우회하기 위해 'SUPABASE_SERVICE_ROLE_KEY'를 사용합니다.
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 1. CORS 및 헤더 설정 (x-user-role 헤더를 반드시 허용해야 함)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { target, latecomers, cleaning, boardData } = req.body;

    // 2. 권한 검증 (middleWare 호출)
    if (!checkPermission(req, target)) {
        return res.status(403).json({ 
            success: false, 
            message: `[권한 오류] 해당 작업(${target})에 대한 권한이 없습니다.` 
        });
    }

    try {
        switch (target) {
            case 'dashboard':
                // 대시보드 데이터 업데이트 (type을 기준으로 덮어쓰기)
                const { error: dError } = await supabase
                    .from('dashboard_data')
                    .upsert([
                        { type: 'late', value: latecomers },
                        { type: 'cleaning', value: cleaning }
                    ], { onConflict: 'type' });

                if (dError) throw dError;
                return res.status(200).json({ success: true, message: "대시보드 저장 완료" });

            case 'board':
                // [구현 예정] 게시판 저장 로직
                return res.status(200).json({ success: true, message: "게시판 데이터 저장 완료" });

            case 'datacenter':
                // [구현 예정] 데이터센터 수정 로직
                return res.status(200).json({ success: true, message: "데이터센터 수정 완료" });

            default:
                return res.status(400).json({ error: "잘못된 target 값입니다." });
        }
    } catch (error) {
        console.error("Write Error:", error);
        return res.status(500).json({ error: error.message });
    }
}