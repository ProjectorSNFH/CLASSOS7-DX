import { createClient } from '@supabase/supabase-js';

// RLS를 껐으므로 ANON_KEY로도 쓰기가 가능합니다.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// write.js 또는 import.js 내부
const { data: config } = await supabase.from('server_config').select('is_online').eq('id', 1).single();

// 서버가 꺼져있고 사용자가 총관리자(A)가 아니라면 차단
if (!config.is_online && req.headers['x-user-role'] !== 'A') {
    return res.status(503).json({ success: false, message: "SERVER IS CURRENTLY OFF." });
}


export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { target, token, data } = req.body;

    try {
        // [1] 토큰 검증 (DB 기반)
        const { data: tokenData, error: tError } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token_value', token)
            .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 1분 이내
            .single();

        if (!tokenData || tError) {
            return res.status(400).json({ success: false, message: "요청된 프로세스가 일치하지 않거나 만료됨" });
        }

        // 검증 성공 시 토큰 즉시 삭제
        await supabase.from('auth_tokens').delete().eq('token_value', token);

        // [2] 타겟별 데이터 처리
        if (target === 'dashboard') {
            const { error } = await supabase
                .from('dashboard_data')
                .upsert([
                    { type: 'late', value: data.latecomers },
                    { type: 'cleaning', value: data.cleaning }
                ], { onConflict: 'type' });
            if (error) throw error;
        }
        // ... (생략)
        else if (target === 'board') {
            await supabase.from('board_data').delete().neq('id', 0);

            // 프론트에서 넘어온 category를 그대로 DB에 꽂아줍니다.
            const cleanData = data.boardList.map(item => ({
                category: item.category || "수행",
                title: item.title,
                date: item.date
            }));

            const { error } = await supabase.from('board_data').insert(cleanData);
            if (error) throw error;
        }
        // ... (생략)

        return res.status(200).json({ success: true, message: "서버에 저장되었습니다!" });

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}