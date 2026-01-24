import { createClient } from '@supabase/supabase-js';
import { checkPermission } from '../middleware.js'; // 소문자 파일명 확인 완료

// 1. 환경 설정 및 클라이언트 초기화 (import.js와 동일한 방식)
// [주의] 쓰기 작업이므로 ANON_KEY 대신 SERVICE_ROLE_KEY를 사용해야 RLS 에러가 안 납니다.
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 2. CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    // 3. OPTIONS 요청(Preflight) 즉시 처리
    if (req.method === 'OPTIONS') return res.status(200).end();

    // 4. POST 외의 요청 차단
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { target, latecomers, cleaning } = req.body;

    try {
        // 5. 권한 체크 (middleWare 활용)
        if (!checkPermission(req, target)) {
            return res.status(403).json({ 
                success: false, 
                message: `[접근 거부] ${target} 관리 권한이 없습니다.` 
            });
        }

        // 6. 타겟별 데이터 저장 로직
        switch (target) {
            case 'dashboard':
                const { error: dError } = await supabase
                    .from('dashboard_data')
                    .upsert([
                        { type: 'late', value: latecomers || "" },
                        { type: 'cleaning', value: cleaning || "" }
                    ], { onConflict: 'type' });

                if (dError) throw dError;
                return res.status(200).json({ success: true, message: "대시보드 저장 완료" });

            case 'board':
                // 여기에 게시판 수정 로직 추가 가능
                return res.status(200).json({ success: true, message: "게시판 저장 완료" });

            default:
                return res.status(400).json({ error: "올바르지 않은 타겟입니다." });
        }

    } catch (error) {
        console.error("서버 내부 에러:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}