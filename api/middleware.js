/**
 * middleware.js
 * 권한 'A': 모든 데이터 접근 가능
 * 권한 'T': dashboard 데이터만
 * 권한 'D': datacenter 데이터만
 * 권한 'B': board 데이터만
 */

export function checkPermission(req, target) {
    // 1. 헤더에서 권한 가져오기 (대소문자 구분 없이 처리)
    const userRole = req.headers['x-user-role']; 

    // [디버깅 로그] 서버에 어떤 값이 들어오는지 확인
    console.log(`[AUTH DEBUG] 요청 타겟: ${target}, 전달된 권한: "${userRole}"`);

    if (!userRole) {
        console.log("❌ 권한 헤더가 없습니다.");
        return false;
    }

    // 2. 총관리자 'A'는 모든 문을 통과
    if (userRole.trim().toUpperCase() === 'A') {
        console.log("✅ 총관리자(A) 승인됨");
        return true;
    }

    // 3. 각 파트별 권한 매핑
    const permissionMap = {
        'dashboard': 'T',
        'board': 'B',
        'datacenter': 'D'
    };

    const requiredRole = permissionMap[target];
    const isAuthorized = userRole.trim().toUpperCase() === requiredRole;

    if (isAuthorized) {
        console.log(`✅ ${target} 권한(${requiredRole}) 일치함`);
    } else {
        console.log(`❌ 권한 불일치: 필요한 권한은 ${requiredRole}이지만 받은 권한은 ${userRole}입니다.`);
    }

    return isAuthorized;
}