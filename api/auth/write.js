import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { target, token, data } = req.body;
    const userRole = req.headers['x-user-role'];

    try {
        // [1] 서버 가동 상태 확인 (Master Control)
        const { data: config } = await supabase.from('server_config').select('is_online').eq('id', 1).single();

        // 서버가 꺼져있고 총관리자(A)가 아니면 모든 수정 작업 차단
        if (config && !config.is_online && userRole !== 'A') {
            return res.status(503).json({ success: false, message: "SERVER IS CURRENTLY OFF." });
        }

        // [2] 토큰 검증 (DB 기반)
        const { data: tokenData, error: tError } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token_value', token)
            .gte('created_at', new Date(Date.now() - 60000).toISOString())
            .single();

        if (!tokenData || tError) {
            return res.status(400).json({ success: false, message: "요청된 프로세스가 일치하지 않거나 만료됨" });
        }

        // 검증 성공 시 토큰 즉시 삭제 (1회용)
        await supabase.from('auth_tokens').delete().eq('token_value', token);

        // [3] 타겟별 데이터 처리
        if (target === 'dashboard') {
            // data가 undefined일 경우를 대비해 기본 객체 {}를 할당합니다.
            const dashboardData = data || {};

            if (!dashboardData.latecomers && dashboardData.latecomers !== "") {
                throw new Error("latecomers 데이터가 누락되었습니다.");
            }

            const { error } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: dashboardData.latecomers },
                    { type: 'cleaning', value: dashboardData.cleaning || "" }
                ], { onConflict: 'type' });

            if (error) throw error;
        }
        else if (target === 'board') {
            // 게시판 초기화 후 재생성 (Overwrite 방식)
            await supabase.from('board_data').delete().neq('id', 0);

            const cleanData = data.boardList.map(item => ({
                category: item.category || "수행",
                title: item.title,
                date: item.date
            }));

            const { error } = await supabase.from('board_data').insert(cleanData);
            if (error) throw error;
        }

        return res.status(200).json({ success: true, message: "서버에 저장되었습니다!" });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}