import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { target, latecomers, cleaning, token } = req.body;

    try {
        // [토큰 검증 로직] DB에서 방금 만든 토큰이 있는지 확인 (최근 1분 이내)
        const { data: tokenData, error: tError } = await supabase
            .from('auth_tokens')
            .select('*')
            .eq('token_value', token)
            .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 1분 이내 것만
            .single();

        if (!tokenData || tError) {
            return res.status(400).json({ success: false, message: "요청된 프로세스가 일치하지 않거나 만료됨" });
        }

        // 검증 성공 시 사용한 토큰은 삭제 (1회용)
        await supabase.from('auth_tokens').delete().eq('token_value', token);

        // [데이터 저장 로직]
        if (target === 'dashboard') {
            const { error } = await supabase
                .from('dashboard_data')
                .upsert([{ type: 'late', value: latecomers }, { type: 'cleaning', value: cleaning }], { onConflict: 'type' });

            if (error) throw error;
            return res.status(200).json({ success: true, message: "저장에 성공함" });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}