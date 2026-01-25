import { generateToken } from '../middleware.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');

    const userRole = req.headers['x-user-role'];
    const token = generateToken(userRole);

    return res.status(200).json({ token });
}