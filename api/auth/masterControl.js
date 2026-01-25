import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { password, command } = req.body;

    try {
        // 1. 서버 설정 및 비번 가져오기
        const { data: config } = await supabase.from('server_config').select('*').eq('id', 1).single();

        if (password !== config.master_pw) {
            return res.status(200).send("INVALID PASSWORD.");
        }

        // 2. 로그인 성공 시 응답 (명령어 없을 때)
        if (!command) {
            return res.status(200).send("MASTER CONTROL READY...");
        }

        const args = command.split(' ');
        const cmd = args[0];
        const sub = args[1];

        if (cmd === "serv") {
            if (sub === "on") {
                if (config.is_online) return res.send("Already On");
                await supabase.from('server_config').update({ is_online: true }).eq('id', 1);
                return res.send("SERVER STARTED SUCCESSFULLY.");
            }
            if (sub === "off") {
                if (!config.is_online) return res.send("Already Off");
                await supabase.from('server_config').update({ is_online: false }).eq('id', 1);
                return res.send("SERVER STOPPED. DATA ACCESS RESTRICTED.");
            }
            if (sub === "login") return res.send("Already Login");
            if (sub === "logout") return res.send("LOGGED OUT.");
        }

        return res.status(200).send("UNKNOWN COMMAND.");

    } catch (err) {
        return res.status(500).send("INTERNAL SERVER ERROR: " + err.message);
    }
}