<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 세이프닥 (SafetyDoc) - 건설현장 안전관리비 솔루션

스마트한 건설현장 안전관리비 관리 시스템으로, 인건비, 자재비, 사진 증빙 등을 통합 관리할 수 있습니다.

## 주요 기능

✅ **프로젝트 정보 관리** - 공사명, 기간, 담당자, 전자서명  
✅ **근로자 관리** - 인건비 기부 및 일일 출역 현황 관리  
✅ **안전시설비 관리** - 안전 자재 및 설비 구매 내역 추적  
✅ **사진 증빙** - 일일 안전 관리 활동 사진 등록  
✅ **AI 보고서** - Gemini AI를 활용한 자동 보고서 생성  
✅ **데이터 백업** - JSON 형식의 전체 데이터 백업/복구  
✅ **인쇄 기능** - A4 보고서 형식 출력

## 시스템 요구사항

- **Node.js**: v18.0.0 이상
- **npm**: v9.0.0 이상
- **모던 웹브라우저**: Chrome, Firefox, Safari, Edge (최신 버전)

## 설치 및 실행

### 1단계: 프로젝트 설정

```bash
# 1. 저장소 클론 또는 폴더에서 터미널 열기
cd 세이프닥---건설현장-안전관리비-솔루션

# 2. 의존성 설치
npm install

# 3. 환경 설정 (선택사항: AI 보고서 생성 기능 사용시)
cp .env.local.example .env.local
```

### 2단계: Gemini API 설정 (선택사항)

AI 보고서 자동 생성 기능을 사용하려면:

1. **Google AI Studio** 접속: https://ai.google.dev
2. **API 키 생성** (무료 제공)
3. `.env.local` 파일 편집:
   ```
   VITE_GEMINI_API_KEY=your_generated_api_key_here
   ```

### 3단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 열기

## 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

### 프리뷰
```bash
npm run preview
```

빌드 결과는 `dist/` 폴더에 생성됩니다.

## 기능별 사용 가이드

### 1️⃣ 기본 정보 설정
- **공사명, 연월, 담당자 정보를 입력**하세요
- **현장대리인과 안전팀장의 전자서명을 등록**하세요
- 모든 항목은 보고서에 반영됩니다

### 2️⃣ 근로자 관리
- **근로자 정보 등록**: 이름, 직책, 기본급 설정
- **일일 출역 입력**: 캘린더에서 각 날짜의 출역 현황 기록
- **자동 계산**: 총 인건비는 자동으로 계산됩니다

### 3️⃣ 안전시설비 관리
- **품명, 규격, 수량, 단가**를 입력하세요
- 자동으로 합계 금액이 계산됩니다
- 건설 안전 기준에 따른 항목 관리

### 4️⃣ 일일 활동 기록
- **날짜별 캘린더 네비게이션**으로 원하는 날짜 선택
- **사진 업로드**: 안전 관리 활동 현장 사진 등록
  - 지원 형식: JPEG, PNG, WebP, GIF
  - 최대 크기: 20MB (자동 압축)
- **설명 및 위치** 입력으로 사진 정보 저장

### 5️⃣ 보고서 생성 및 인쇄
- **미리보기 탭**에서 최종 보고서 확인
- **인쇄 버튼** 클릭 시 A4 형식으로 출력 가능
- **필수 입력 항목** 검증으로 완전한 보고서 생성 확인

### 6️⃣ 데이터 관리
- **백업**: 현재 작성 중인 모든 데이터를 JSON 파일로 저장
- **복구**: 저장된 백업 파일에서 데이터 복원
- **초기화**: 새 프로젝트 시작을 위한 전체 데이터 초기화

## 파일 구조

```
세이프닥---건설현장-안전관리비-솔루션/
├── src/
│   ├── components/           # React 컴포넌트들
│   │   ├── ProjectHeader.tsx         # 기본정보 및 서명
│   │   ├── LaborCostTable.tsx        # 근로자 및 인건비
│   │   ├── SafetyCostTable.tsx       # 안전시설비
│   │   ├── DailyLogManager.tsx       # 일일 출역 및 사진
│   │   ├── PhotoLedger.tsx           # 사진 관리
│   │   ├── GeminiAssistant.tsx       # AI 보고서
│   │   ├── SignaturePad.tsx          # 전자서명
│   │   └── UserGuide.tsx             # 사용자 가이드
│   ├── utils/                       # 유틸리티
│   │   ├── validation.ts            # 폼 검증
│   │   └── errorHandler.ts          # 에러 처리
│   ├── App.tsx                      # 메인 앱
│   ├── types.ts                     # TypeScript 타입 정의
│   └── index.tsx                    # 진입점
├── .env.local.example               # 환경 설정 예시
├── vite.config.ts                   # Vite 설정
├── tsconfig.json                    # TypeScript 설정
├── package.json                     # 프로젝트 의존성
└── README.md                        # 이 파일
```

## 기술 스택

- **Frontend Framework**: React 19
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: Google Gemini API
- **State Management**: React Hooks (useState, useEffect)
- **Storage**: Browser LocalStorage, Blob URLs

## 데이터 보안

- 모든 데이터는 **로컬 브라우저에 저장**되며, 서버로 전전되지 않습니다
- 사진 파일은 자동으로 **압축**되어 저장됩니다 (JPEG 70% 품질)
- **전자서명**은 Base64로 인코딩되어 데이터에 포함됩니다
- **백업 파일**은 암호화되지 않으므로, 민감한 정보 취급 시 주의하세요

## 성능 최적화

- 이미지 자동 압축: 원본 이미지는 1280x1280으로 최적화
- 효율적인 Blob URL 관리로 메모리 누수 방지
- 자동 저장 기능으로 1초 디바운싱
- LocalStorage 이용 (5MB 제한 초과 시 사진은 제외)

## 브라우저 호환성

| 브라우저 | 버전 | 지원 |
|---------|------|------|
| Chrome | 90+ | ✅ |
| Firefox | 88+ | ✅ |
| Safari | 14+ | ✅ |
| Edge | 90+ | ✅ |

## 알려진 제한사항

⚠️ **웹 저장소 제한**
- LocalStorage: 약 5MB 제한
- 대량의 사진 저장 시 일부 데이터 손실 가능
- **해결방법**: 주기적으로 백업 파일로 저장하세요

⚠️ **브라우저 캐시**
- PWA 기능 미지원
- 브라우저 캐시 초기화 시 로컬 데이터 삭제 됨
- **해결방법**: 정기적인 백업 권장

## 문제 해결 (FAQ)

### Q: API 키를 설정했는데 AI 보고서가 안 나옵니다
**A:** 
1. `.env.local` 파일의 `VITE_GEMINI_API_KEY` 확인
2. 앱 재시작: `npm run dev`
3. 브라우저 캐시 삭제 후 재접속

### Q: 사진 업로드가 실패합니다
**A:**
1. 파일 형식 확인 (JPEG, PNG, WebP, GIF만 가능)
2. 파일 크기 확인 (최대 20MB)
3. 브라우저 저장 공간 확인

### Q: 백업 파일을 복구했는데 일부 사진이 없습니다
**A:** Blob URL 기한 만료로 인한 손실입니다
- **예방방법**: 백업 시 사진이 포함되어야 함
- 최신 백업 파일 사용 권장

### Q: 보고서 인쇄가 제대로 안 됩니다
**A:**
1. 브라우저 인쇄 미리보기 확인
2. 필수 정보 입력 완료 확인
3. Chrome으로 시도해보세요 (가장 안정적)

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 지원 및 피드백

문제가 발생하거나 기능 요청이 있으시면, 이슈를 생성해주세요.

---

**버전**: 1.0.0  
**마지막 업데이트**: 2026년 2월 10일

