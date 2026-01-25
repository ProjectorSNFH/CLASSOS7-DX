import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const userRole = req.headers['x-user-role'];

    if (!['A', 'T', 'B', 'D'].includes(userRole)) {
        return res.status(200).json({ token: "none" });
    }

    const newToken = Math.floor(10000 + Math.random() * 90000).toString();

    // DB에 토큰 저장
    await supabase.from('auth_tokens').insert([{ token_value: newToken }]);

    return res.status(200).json({ token: newToken });
}