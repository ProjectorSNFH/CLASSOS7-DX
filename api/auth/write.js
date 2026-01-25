import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../middleware.js';

// 쓰기 전용이므로 서비스 롤 키(Master Key)를 사용해야 RLS 오류를 넘길 수 있습니다.
// Vercel의 SUPABASE_ANON_KEY 변수 값을 서비스 롤 키로 교체해두셨다면 그대로 사용 가능합니다.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role, x-verify-token');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { target, latecomers, cleaning, token } = req.body;
    
    // [보안 1단계] 토큰 검증
    const tokenStatus = verifyToken(token);
    if (tokenStatus === "ACCESS_DENIED") {
        return res.status(403).json({ success: false, message: "액세스 권한이 부족하여 처리 실패함" });
    }
    if (tokenStatus === "MISMATCH" || tokenStatus === "EXPIRED") {
        return res.status(400).json({ success: false, message: "요청된 프로세스가 일치하지 않거나 만료됨" });
    }

    try {
        if (target === 'dashboard') {
            const { error } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: latecomers },
                    { type: 'cleaning', value: cleaning }
                ], { onConflict: 'type' });

            if (error) throw error;
            return res.status(200).json({ success: true, message: "저장에 성공함" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}