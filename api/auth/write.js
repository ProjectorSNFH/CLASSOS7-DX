const express = require('express');
const router = express.Router();
// fs는 데이터를 파일로 영구 저장할 때 필요합니다. (Koyeb 환경 기준)
const fs = require('fs');
const path = require('path');

// [참고] 실제 운영 시에는 아래 변수들을 별도의 JSON 파일로 관리하는 것이 좋습니다.

// POST: /api/auth/export
// [수정된 write.js - POST 부분]
router.post('/export', (req, res) => {
    const { target, latecomers, cleaning, data } = req.body; // 구조 분해를 명확히 함

    if (target === 'dashboard') {
        // 빈 문자열("")로 저장할 수도 있으므로 || 대신 undefined 체크
        dashboardData.latecomers = (latecomers !== undefined) ? latecomers : dashboardData.latecomers;
        dashboardData.cleaning = (cleaning !== undefined) ? cleaning : dashboardData.cleaning;
        
        console.log("Dashboard Updated:", dashboardData);
        return res.json({ success: true, message: "대시보드 저장 완료" });
    }

    if (target === 'board') {
        if (Array.isArray(data)) {
            boardData = data;
            return res.json({ success: true, message: "게시판 저장 완료" });
        }
        return res.status(400).json({ success: false, message: "배열 형식이 아닙니다." });
    }

    res.status(400).json({ success: false, message: "잘못된 타겟입니다." });
});

// GET: /api/auth/import (기존 import 기능을 여기에 통합해서 테스트 가능)
router.get('/import', (req, res) => {
    const { target } = req.query;

    if (target === 'dashboard') return res.json(dashboardData);
    if (target === 'board') return res.json(boardData);

    res.status(404).send("Target not found");
});

module.exports = router;