const express = require('express');
const router = express.Router();

// 데이터 메모리 저장소 (초기값)
let dashboardData = {
    latecomers: "김철수, 이영희",
    cleaning: "01, 02 / 03, 04"
};
let boardData = [];

// POST: /api/auth/write
router.post('/write', (req, res) => {
    try {
        // req.body가 없으면 400 에러 반환 (500 에러 방지)
        if (!req.body) {
            return res.status(400).json({ success: false, message: "Request body is missing" });
        }

        const { target, latecomers, cleaning, data } = req.body;

        if (target === 'dashboard') {
            // undefined 체크를 통해 값이 올 때만 업데이트
            if (latecomers !== undefined) dashboardData.latecomers = latecomers;
            if (cleaning !== undefined) dashboardData.cleaning = cleaning;
            
            console.log("Dashboard Updated:", dashboardData);
            return res.json({ success: true, message: "대시보드 저장 완료" });
        }

        if (target === 'board') {
            if (Array.isArray(data)) {
                boardData = data;
                console.log("Board Updated:", boardData);
                return res.json({ success: true, message: "게시판 저장 완료" });
            }
            return res.status(400).json({ success: false, message: "data 형식이 배열이 아닙니다." });
        }

        return res.status(400).json({ success: false, message: "잘못된 target입니다." });

    } catch (err) {
        // 서버 콘솔에 진짜 에러 원인을 출력 (디버깅용)
        console.error("SERVER CRASH ERROR:", err);
        return res.status(500).json({ success: false, message: "서버 내부 로직 에러: " + err.message });
    }
});

// GET: /api/auth/import
router.get('/import', (req, res) => {
    const { target } = req.query;
    if (target === 'dashboard') return res.json(dashboardData);
    if (target === 'board') return res.json(boardData);
    return res.status(404).json({ message: "Not Found" });
});

module.exports = router;