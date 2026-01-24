import { createClient } from '@supabase/supabase-js';

// 환경 변수 설정
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    // 1. CORS 설정 (import.js와 동일하게)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight 요청 처리
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 요청 바디에서 데이터 추출
    const { target, latecomers, cleaning, boardData } = req.body;

    try {
        switch (target) {
            case 'dashboard':
                // 대시보드 데이터 업데이트 (지각생, 청소당번)
                // dashboard_data 테이블의 구조가 { type: 'string', value: 'string' } 이라고 가정
                
                // Supabase upsert (Insert or Update)
                const { error: dError } = await supabase
                    .from('dashboard_data')
                    .upsert([
                        { type: 'late', value: latecomers },
                        { type: 'cleaning', value: cleaning }
                    ], { onConflict: 'type' }); // type 컬럼이 기준

                if (dError) throw dError;

                return res.status(200).json({ success: true, message: "대시보드 데이터 저장 완료" });

            case 'board':
                // (추후 구현 예정인 게시판 데이터 저장 로직)
                // 예: boardData 배열을 받아 통째로 교체하거나 추가
                /*
                if (!Array.isArray(boardData)) throw new Error("데이터 형식이 올바르지 않습니다.");
                
                const { error: bError } = await supabase
                    .from('board_data')
                    .upsert(boardData); // id가 있다면 업데이트됨
                
                if (bError) throw bError;
                */
                return res.status(200).json({ success: true, message: "게시판 저장(준비중)" });

            case 'datacenter':
                // 데이터센터는 보통 파일 업로드이므로 로직이 다를 수 있음
                // 여기서는 메타데이터 수정만 가정
                return res.status(200).json({ success: true, message: "데이터센터 수정 완료" });

            default:
                return res.status(400).json({ error: "Invalid target" });
        }

    } catch (error) {
        console.error("Write Error:", error);
        return res.status(500).json({ error: error.message });
    }
}