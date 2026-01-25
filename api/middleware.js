// 서버 임시 저장소 (Vercel 특성상 전역 변수는 짧은 시간 유지됨)
let currentToken = "";
let tokenExpiry = 0;

export function checkPermission(req, target) {
    const userRole = req.headers['x-user-role'];
    if (!userRole) return false;
    
    const role = userRole.trim().toUpperCase();
    if (role === 'A') return true;
    
    const map = { 'dashboard': 'T', 'board': 'B', 'datacenter': 'D' };
    return role === map[target];
}

// [신규] 토큰 생성 함수 (요청 시 호출)
export function generateToken(role) {
    if (!['A', 'T', 'B', 'D'].includes(role)) return "none";
    
    // 5자리 랜덤 숫자 토큰 생성
    const newToken = Math.floor(10000 + Math.random() * 90000).toString();
    currentToken = newToken;
    tokenExpiry = Date.now() + 10000; // 10초간 유효
    return newToken;
}

// [신규] 토큰 검증 함수
export function verifyToken(inputToken) {
    if (!inputToken || inputToken === "none") return "ACCESS_DENIED";
    if (Date.now() > tokenExpiry) return "EXPIRED";
    if (inputToken !== currentToken) return "MISMATCH";
    return "SUCCESS";
}