import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // [1] CORS 헤더 무조건 적용
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { target, latecomers, cleaning } = req.body;
        const userRole = req.headers['x-user-role'];

        // [2] 환경 변수 확인 (가장 빈번한 500 원인)
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error("서버 환경 변수가 설정되지 않았습니다. (SUPABASE_URL 또는 KEY 누락)");
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // [3] 권한 체크
        const isAuthorized = userRole === 'A' || (target === 'dashboard' && userRole === 'T');
        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: `권한 거부 (Role: ${userRole})` });
        }

        if (target === 'dashboard') {
            // [4] DB 작업 수행 시도
            const { error: dbError } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: latecomers || "" },
                    { type: 'cleaning', value: cleaning || "" }
                ], { onConflict: 'type' });

            if (dbError) {
                // DB에서 난 에러를 구체적으로 던짐
                throw new Error(`DB 저장 실패: ${dbError.message} (상세: ${dbError.details})`);
            }
            
            return res.status(200).json({ success: true, message: "저장 성공" });
        }

        return res.status(400).json({ error: "잘못된 타겟" });

    } catch (err) {
        // [5] 500 에러 발생 시 그 원인을 JSON으로 반환
        console.error("DEBUG SERVER ERROR:", err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.message,
            hint: "Supabase 테이블에 'type' 컬럼이 있고 기본키인지 확인하세요."
        });
    }
}