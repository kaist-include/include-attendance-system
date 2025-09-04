# 프로젝트 구조

## 📁 디렉토리 구조

```
include-attendance-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth 그룹 라우트
│   │   │   ├── login/         # 로그인 페이지
│   │   │   └── register/      # 회원가입 페이지
│   │   ├── dashboard/         # 메인 대시보드 페이지
│   │   ├── seminars/          # 세미나 관련 페이지
│   │   │   └── [id]/          # 세미나 상세 페이지
│   │   ├── admin/             # 관리자 페이지
│   │   ├── profile/           # 프로필 페이지
│   │   ├── settings/          # 설정 페이지
│   │   ├── error/             # 에러 페이지
│   │   ├── auth/              # 인증 관련 서버 액션
│   │   ├── api/               # API 라우트
│   │   │   ├── auth/          # 인증 API
│   │   │   ├── seminars/      # 세미나 API
│   │   │   ├── users/         # 사용자 API
│   │   │   ├── sessions/      # 세션 API
│   │   │   ├── admin/         # 관리자 API
│   │   │   └── debug/         # 디버그 API
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   ├── page.tsx           # 홈 페이지
│   │   └── globals.css        # 글로벌 스타일
│   ├── components/            # 컴포넌트
│   │   ├── ui/                # 기본 UI 컴포넌트
│   │   │   ├── Button.tsx     # 버튼 컴포넌트
│   │   │   └── Card.tsx       # 카드 컴포넌트
│   │   ├── layout/            # 레이아웃 컴포넌트
│   │   │   └── MainLayout.tsx # 메인 레이아웃
│   │   ├── forms/             # 폼 컴포넌트
│   │   ├── dashboard/         # 대시보드 컴포넌트
│   │   ├── seminar/           # 세미나 컴포넌트
│   │   └── auth/              # 인증 컴포넌트
│   ├── types/                 # TypeScript 타입 정의
│   │   ├── index.ts           # 주요 타입 정의
│   │   └── database.ts        # Supabase 데이터베이스 타입
│   ├── lib/                   # 라이브러리 설정
│   │   └── supabase.ts        # Supabase 클라이언트 설정
│   ├── hooks/                 # 커스텀 훅
│   │   └── useAuth.ts         # 인증 관련 훅
│   ├── utils/                 # 유틸리티 함수
│   │   └── index.ts           # 공통 유틸리티
│   └── config/                # 설정 파일
│       └── constants.ts       # 상수 정의
├── package.json               # 프로젝트 의존성
├── tsconfig.json              # TypeScript 설정
├── next.config.ts             # Next.js 설정
├── tailwind.config.js         # Tailwind CSS 설정
├── .env.example               # 환경 변수 예시
└── README.md                  # 프로젝트 설명
```

## 🔧 주요 파일 설명

### 📋 타입 정의 (`src/types/`)

#### `index.ts`
- User, Profile, Seminar, Session 등 핵심 엔티티 타입
- 폼 데이터, API 응답, 필터링을 위한 보조 타입
- 통계, 알림, QR 코드를 위한 타입 정의

#### `database.ts`
- Supabase 데이터베이스 스키마에 맞는 타입
- 테이블별 Row, Insert, Update 타입 정의

### 🔌 라이브러리 설정 (`src/lib/`)

#### `supabase.ts`
- Supabase 클라이언트 초기화
- 인증 및 데이터베이스 헬퍼 함수
- 에러 처리 유틸리티

### 🎣 커스텀 훅 (`src/hooks/`)

#### `useAuth.ts`
- 사용자 인증 상태 관리
- 로그인, 회원가입, 로그아웃 기능
- 역할 기반 접근 제어
- 보호된 라우트 처리

### 🛠️ 유틸리티 (`src/utils/`)

#### `index.ts`
- 날짜/시간 포맷팅 함수
- 폼 검증 함수
- 문자열, 배열, 객체 조작 함수
- 로컬 스토리지 관리
- 에러 처리 및 재시도 로직

### ⚙️ 설정 (`src/config/`)

#### `constants.ts`
- 애플리케이션 전역 상수
- 검증 규칙 및 기본값
- 에러/성공 메시지
- 라우트 경로 및 API 엔드포인트

### 🎨 컴포넌트 (`src/components/`)

#### UI 컴포넌트 (`ui/`)
- `Button.tsx`: 재사용 가능한 버튼 컴포넌트
- `Card.tsx`: 카드 레이아웃 컴포넌트
- (추후 추가: Input, Modal, Toast 등)

#### 레이아웃 (`layout/`)
- `MainLayout.tsx`: 사이드바와 헤더를 포함한 메인 레이아웃

## 🚀 기술 스택

### 프론트엔드
- **Next.js 15**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안정성
- **Tailwind CSS**: 유틸리티 퍼스트 CSS
- **Lucide React**: 아이콘 라이브러리

### 백엔드 & 데이터베이스
- **Supabase**: PostgreSQL + 실시간 기능 + 인증
- **Row Level Security**: 세밀한 데이터 접근 제어

### UI & 폼
- **Radix UI**: 접근성이 좋은 기본 컴포넌트
- **Class Variance Authority**: 컴포넌트 변형 관리
- **React Hook Form**: 폼 상태 관리
- **Zod**: 스키마 검증

### 유틸리티
- **date-fns**: 날짜 처리
- **QRCode**: QR 코드 생성
- **clsx + tailwind-merge**: 클래스 병합

## 📊 데이터베이스 스키마

### 주요 테이블
- `users`: 사용자 기본 정보
- `profiles`: 사용자 프로필 확장 정보
- `semesters`: 학기 관리
- `seminars`: 세미나 정보
- `sessions`: 세미나 회차
- `enrollments`: 세미나 신청
- `attendances`: 출석 기록
- `announcements`: 공지사항
- `comments`: 댓글
- `notifications`: 알림

### 권한 체계
- `admin`: 전체 시스템 관리
- `seminar_leader`: 세미나 생성 및 관리
- `member`: 일반 사용자 (세미나 신청, 출석)

## 🔐 인증 및 보안

### 인증 흐름
1. Supabase Auth를 통한 이메일/비밀번호 인증
2. JWT 토큰 기반 세션 관리
3. 자동 토큰 갱신
4. 보호된 라우트 및 API 엔드포인트

### 데이터 보안
- Supabase Row Level Security (RLS) 정책
- 역할 기반 접근 제어
- API 라우트에서 서버사이드 검증

## 🎯 핵심 기능

### 1. 사용자 관리
- 회원가입/로그인
- 프로필 관리
- 역할 기반 권한 시스템

### 2. 세미나 관리
- 세미나 생성/수정/삭제
- 학기별 관리
- 태그 기반 분류
- 신청 기간 설정

### 3. 출석 관리
- QR 코드 기반 출석 체크
- 수동 출석 처리
- 출석률 통계
- 회차별 출석 현황

### 4. 대시보드
- 개인별 참여 현황
- 세미나장용 관리 도구
- 관리자용 전체 통계

## 🛣️ 다음 개발 단계

### Phase 1: 기본 페이지 구현
- [ ] 로그인/회원가입 페이지
- [ ] 대시보드 페이지
- [ ] 세미나 목록 페이지

### Phase 2: 핵심 기능 구현
- [ ] 세미나 생성/관리 기능
- [ ] 신청 시스템
- [ ] 출석 관리 시스템

### Phase 3: 고급 기능
- [ ] QR 코드 출석
- [ ] 실시간 알림
- [ ] 통계 대시보드

### Phase 4: 최적화
- [ ] 성능 최적화
- [ ] SEO 개선
- [ ] 접근성 개선

## 📝 개발 가이드

### 환경 설정
1. 의존성 설치: `npm install`
2. 환경 변수 설정: `.env.local` 파일 생성
3. Supabase 프로젝트 연결
4. 개발 서버 실행: `npm run dev`

### 코딩 규칙
- TypeScript strict mode 사용
- 컴포넌트는 PascalCase
- 파일명은 컴포넌트명과 동일
- 훅은 `use` 접두사 사용
- 유틸리티 함수는 camelCase 