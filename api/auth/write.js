const express = require('express');
const router = express.Router();
// fs는 데이터를 파일로 영구 저장할 때 필요합니다. (Koyeb 환경 기준)
const fs = require('fs');
const path = require('path');

// [참고] 실제 운영 시에는 아래 변수들을 별도의 JSON 파일로 관리하는 것이 좋습니다.
let dashboardData = {
    latecomers: "김철수, 이영희",
    cleaning: "01, 02 / 03, 04"
};

let boardData = [
    { id: 1, title: "1차 수행평가", date: "2026-03-20", category: "수행" },
    { id: 2, title: "학급 회의 안내", date: "2026-03-25", category: "안내" }
];

// POST: /api/auth/export
router.post('/export', (req, res) => {
    const { target, ...payload } = req.body;

    if (target === 'dashboard') {
        // 대시보드 데이터 업데이트 (지각생, 청소당번)
        dashboardData.latecomers = payload.latecomers || dashboardData.latecomers;
        dashboardData.cleaning = payload.cleaning || dashboardData.cleaning;
        
        console.log("Dashboard Updated:", dashboardData);
        return res.json({ success: true, message: "대시보드 저장 완료" });
    }

    if (target === 'board') {
        // 게시판 데이터 업데이트 (배열 형태로 교체하거나 추가)
        // payload.data는 전체 게시글 배열이라고 가정합니다.
        if (Array.isArray(payload.data)) {
            boardData = payload.data;
            console.log("Board Updated:", boardData);
            return res.json({ success: true, message: "게시판 저장 완료" });
        }
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