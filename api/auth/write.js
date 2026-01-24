import { createClient } from '@supabase/supabase-js';
import { checkPermission } from '../middleware.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // 1. 모든 응답에 CORS 헤더를 붙입니다.
    res.setHeader('Access-Control-Allow-Origin', '*'); // 특정 도메인만 허용하려면 'https://classos7.vercel.app'
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-user-role');

    // 2. 브라우저의 예비 요청(Preflight)인 OPTIONS 요청을 즉시 승인합니다.
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. POST 외의 요청은 차단합니다.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target, latecomers, cleaning } = req.body;

    // 4. 권한 체크
    if (!checkPermission(req, target)) {
        return res.status(403).json({ 
            success: false, 
            message: `권한 거부: ${target} 관리 권한이 없습니다.` 
        });
    }

    try {
        if (target === 'dashboard') {
            const { error: dError } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: latecomers },
                    { type: 'cleaning', value: cleaning }
                ], { onConflict: 'type' });

            if (dError) throw dError;
            return res.status(200).json({ success: true, message: "대시보드 저장 완료" });
        }
        
        // 다른 target(board, datacenter) 로직 추가 지점
        
    } catch (error) {
        console.error("Write Error:", error);
        return res.status(500).json({ error: error.message });
    }
}