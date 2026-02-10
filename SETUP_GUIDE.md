# 세이프닥 셋업 가이드

## 🚀 빠른 시작 (5분)

### 1단계: 의존성 설치
```bash
npm install
```

### 2단계: 앱 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## ⚙️ Gemini AI 보고서 기능 활성화 (선택사항)

### 대략 3분 소요

#### Step 1: Google AI Studio에서 API 키 발급

1. **Google AI Studio 접속**
   - 브라우저에서 https://ai.google.dev 이동
   - 기존 Google 계정으로 로그인 (또는 생성)

2. **API 키 생성**
   - 좌측 메뉴: "API keys"
   - "Create API key" 버튼 클릭
   - 무료로 개인 개발용 API 키 생성 완료

3. **API 키 복사**
   - 생성된 키 정보 복사 (예: `AIz...`)

#### Step 2: 로컬 환경 설정

1. **`.env.local` 파일 생성**
   ```bash
   # 프로젝트 루트 폴더에서
   cp .env.local.example .env.local
   ```

2. **API 키 입력**
   ```bash
   # .env.local 파일 편집
   VITE_GEMINI_API_KEY=AIz... (위에서 복사한 키)
   ```

3. **개발 서버 재시작**
   ```bash
   # 터미널에서 Ctrl+C로 중지
   npm run dev
   ```

#### Step 3: AI 보고서 기능 테스트

1. **앱에서 기본 정보 입력**
   - 공사명, 담당자 등 작성

2. **근로자 1명 이상 추가**

3. **"AI 보고서 초안 생성" 버튼 클릭**
   - Gemini가 자동으로 보고서 텍스트 생성

---

## 📊 주요 기능 실행 흐름

### 가장 빠른 보고서 생성방법 (10분)

```
1. 공사명 입력 (Setup 탭)
2. 현장대리인, 안전팀장 입력
3. 근로자 1명 추가
4. (선택) 사진 1장 업로드 (Daily 탭)
5. (선택) AI 보고서 생성 클릭
6. Preview 탭에서 확인
7. 인쇄 버튼으로 PDF 출력
```

---

## 🔧 개발 관련 명령어

### 개발 서버 실행
```bash
npm run dev
```
- Hot reload 활성화
- `http://localhost:3000`에서 접속

### 프로덕션 빌드
```bash
npm run build
```
- `dist/` 폴더에 최적화된 파일 생성
- 프로덕션 배포용

### 빌드 결과 미리보기
```bash
npm run preview
```
- 프로덕션 빌드 결과 로컬 테스트

---

## 📁 파일 관리

### 자동 저장 구조
```
LocalStorage (브라우저 로컬 저장)
├── safetydoc_draft_v1  (자동 저장 데이터)
│   ├── projectInfo
│   ├── workers
│   ├── attendance
│   └── safetyItems
└── (주의: 사진은 메모리 누수로 인해 제외)
```

### 수동 백업 필수!

```
다운로드 폴더
├── 세이프닥_백업_OO아파트_2026-02-10.json
├── 세이프닥_백업_OO아파트_2026-02-11.json
└── (정기적으로 백업 권장)
```

---

## ✅ 체크리스트

### 초기 설정
- [ ] `npm install` 완료
- [ ] `npm run dev` 실행 (포트 3000)
- [ ] 브라우저에서 앱 실행 확인

### AI 보고서 활성화 (선택)
- [ ] Google AI Studio에서 API 키 발급
- [ ] `.env.local` 파일 생성
- [ ] `VITE_GEMINI_API_KEY` 입력
- [ ] 앱 재시작 후 테스트

### 첫 보고서 작성
- [ ] 공사명, 담당자명 입력
- [ ] 근로자 1명 이상 등록
- [ ] (선택) 사진 업로드
- [ ] Preview에서 보고서 확인
- [ ] 인쇄 또는 PDF 저장

### 정기 관리
- [ ] **매월 초**: 새로운 달 데이터로 시작
- [ ] **매주**: 데이터 백업
- [ ] **프로젝트 종료**: 최종 백업 및 아카이빙

---

## 🆘 일반적인 문제 해결

### 문제: 개발 서버가 실행되지 않음
```bash
# 해결방법
npm cache clean --force
rm -rf node_modules
npm install
npm run dev
```

### 문제: API 키 인식 안 됨
```bash
# 확인사항
1. .env.local 파일 확인
2. 파일명이 정확히 ".env.local"인지 확인 (대소문자)
3. VITE_ 프리픽스 확인
4. 터미널에서 npm run dev 재실행
5. 브라우저 새로고침 (Ctrl+F5)
```

### 문제: 사진이 저장되지 않음
```bash
# 원인 및 해결
- 파일 형식: JPEG, PNG, WebP, GIF만 가능
- 파일 크기: 20MB 초과 불가
- 메모리 부족: 사진 삭제 후 재시도
```

### 문제: 일부 데이터가 손실됨
```bash
# 예방책
1. 정기적으로 JSON 백업 저장
2. 브라우저 캐시 자동 삭제 설정 금지
3. 여러 브라우저 탭에서 동시 편집 금지
```

---

## 📈 성능 및 최적화

### 메모리 관리
- 사진: 자동 1280x1280 압축, 70% JPEG 품질
- 로컬 저장소: 약 5MB 제한
- 자동 저장: 1초 디바운싱

### 브라우저 권장사항
| 브라우저 | 권장 버전 | 특이사항 |
|---------|---------|--------|
| Chrome | 90+ | ✅ 최적 호환성 |
| Edge | 90+ | ✅ Chrome과 동일 |
| Firefox | 88+ | ✅ 완벽 호환 |
| Safari | 14+ | ✅ Mac/iOS 지원 |

---

## 📚 추가 자료

- **상세 매뉴얼**: README.md 참고
- **개선 사항**: IMPROVEMENT_REPORT.md 참고
- **API 문서**: https://ai.google.dev/docs
- **Vite 문서**: https://vitejs.dev

---

## ⚡ 팁과 트릭

### 빠른 테스트 데이터 입력
```
공사명: 테스트 아파트
담당자: 테스트 담당자
안전팀장: 테스트 팀장
근로자: 근로자1 (1명)
```

### 대량의 날짜 입력
```
1. DailyLogManager에서 날짜 선택
2. 각 근로자별 출역 클릭
3. 캘린더 네비게이션으로 빠르게 이동
```

### 사진 정리
```
1. PhotoLedger 또는 DailyLogManager에서 확인
2. 불필요한 사진 삭제
3. 정기적으로 중요 사진만 백업
```

---

## 💾 데이터 마이그레이션

### 다른 PC로 옮기기
```
1. 현재 PC: JSON 백업 파일 생성
2. 파일 저장 (Google Drive, 이메일 등)
3. 새 PC: 앱 설치 및 실행
4. 새 앱에서: "백업 복구" 클릭하여 파일 선택
5. 모든 데이터 복원 완료
```

### 브라우저 변경하기
```
⚠️ 주의: 각 브라우저의 LocalStorage는 독립적입니다

1. Chrome에서 작업하던 데이터를 Firefox로 옮기려면
   - Chrome: JSON 백업 생성
   - Firefox: 앱 실행 후 백업 복구
```

---

## 🎓 학습 자료

### TypeScript
- 타입 정의: `types.ts`
- 검증 함수: `utils/validation.ts`

### React Hooks
- useState, useEffect, useRef 사용 예제: `App.tsx`
- 커스텀 로직: 각 컴포넌트 참고

### Vite
- 환경 변수: `.env.local`
- 설정: `vite.config.ts`

---

**Updated**: 2026년 2월 10일  
**Version**: 1.0.0
