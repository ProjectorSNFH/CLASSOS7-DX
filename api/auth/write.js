import { createClient } from '@supabase/supabase-js';
import { checkPermission } from '../middleware.js';

// 클라이언트 생성은 핸들러 밖에서 한 번만 수행
const supabase = createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
    // [1] CORS 헤더 즉시 설정 (모든 요청에 대해)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-user-role');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // [2] Preflight (OPTIONS) 요청인 경우, 로직 수행 없이 즉시 200 응답 후 종료
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // [3] POST 요청이 아니면 차단
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { target, latecomers, cleaning } = req.body;

        // [4] 권한 체크 (middleware 호출)
        // target이 없거나 권한이 없으면 에러 반환
        if (!target || !checkPermission(req, target)) {
            return res.status(403).json({ 
                success: false, 
                message: `[권한 오류] ${target || '알 수 없는'} 타겟에 대한 수정 권한이 없습니다.` 
            });
        }

        // [5] DB 작업 수행
        if (target === 'dashboard') {
            const { error: dError } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: latecomers || "" },
                    { type: 'cleaning', value: cleaning || "" }
                ], { onConflict: 'type' });

            if (dError) throw dError;
            return res.status(200).json({ success: true, message: "성공적으로 저장되었습니다." });
        }

        return res.status(400).json({ error: "지원하지 않는 타겟입니다." });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}