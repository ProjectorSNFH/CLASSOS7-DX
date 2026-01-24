/**
 * middleWare.js
 * 권한 'A': 모든 데이터 접근 가능
 * 권한 'T': dashboard(대시보드)만
 * 권한 'D': datacenter(데이터센터)만
 * 권한 'B': board(게시판)만
 */

export function checkPermission(req, target) {
    // 프론트엔드에서 보낸 헤더 값 확인
    const userRole = req.headers['x-user-role']; 

    if (!userRole) return false; // 권한 정보가 없으면 거절
    if (userRole === 'A') return true; // 총관리자는 무조건 통과

    const permissionMap = {
        'dashboard': 'T',
        'board': 'B',
        'datacenter': 'D'
    };

    // 현재 요청한 target과 사용자의 권한이 일치하는지 확인
    return userRole === permissionMap[target];
}