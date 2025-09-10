-- Create Mock Seminar with 5 Sessions for jaeyoungshin03@gmail.com
-- This script creates test data for development purposes

-- Step 1: Get the user ID for jaeyoungshin03@gmail.com
DO $$
DECLARE
  target_user_id uuid;
  seminar_id uuid;
  session_ids uuid[];
  semester_id uuid;
BEGIN
  -- Find the user ID
  SELECT id INTO target_user_id 
  FROM public.users 
  WHERE email = 'jaeyoungshin03@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email jaeyoungshin03@gmail.com not found!';
  END IF;
  
  RAISE NOTICE 'Found user ID: %', target_user_id;
  
  -- Get an active semester (or use the first available one)
  SELECT id INTO semester_id 
  FROM public.semesters 
  WHERE is_active = true 
  LIMIT 1;
  
  IF semester_id IS NULL THEN
    -- If no active semester, get any semester
    SELECT id INTO semester_id 
    FROM public.semesters 
    LIMIT 1;
  END IF;
  
  IF semester_id IS NULL THEN
    RAISE EXCEPTION 'No semester found! Please create a semester first.';
  END IF;
  
  RAISE NOTICE 'Using semester ID: %', semester_id;
  
  -- Generate UUIDs for seminar and sessions
  seminar_id := gen_random_uuid();
  session_ids := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
  
  -- Step 2: Create the mock seminar
  INSERT INTO public.seminars (
    id,
    title,
    description,
    capacity,
    semester_id,
    owner_id,
    start_date,
    end_date,
    location,
    tags,
    status,
    application_start,
    application_end,
    created_at,
    updated_at
  ) VALUES (
    seminar_id,
    'Full-Stack 웹 개발 심화 과정',
    '프론트엔드부터 백엔드까지, 현대적인 웹 개발 기술 스택을 배우는 종합 과정입니다. React, Next.js, Node.js, PostgreSQL 등을 다룹니다.',
    20,
    semester_id,
    target_user_id,
    CURRENT_DATE + INTERVAL '1 week',
    CURRENT_DATE + INTERVAL '6 weeks',
    'ICT융합관 403호',
    ARRAY['웹개발', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'TypeScript'],
    'recruiting',
    CURRENT_DATE - INTERVAL '1 week',
    CURRENT_DATE + INTERVAL '3 days',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Created seminar with ID: %', seminar_id;
  
  -- Step 3: Create 5 sessions
  INSERT INTO public.sessions (
    id,
    seminar_id,
    session_number,
    title,
    description,
    date,
    duration_minutes,
    location,
    materials_url,
    status,
    created_at,
    updated_at
  ) VALUES 
  -- Session 1: Introduction
  (
    session_ids[1],
    seminar_id,
    1,
    '1주차: 웹 개발 환경 설정 및 React 기초',
    '개발 환경 설정, Git 기초, React 컴포넌트 개념 학습',
    (CURRENT_DATE + INTERVAL '1 week')::date + TIME '14:00:00',
    120,
    'ICT융합관 403호',
    NULL,
    'scheduled',
    NOW(),
    NOW()
  ),
  -- Session 2: React Advanced
  (
    session_ids[2],
    seminar_id,
    2,
    '2주차: React Hooks와 상태 관리',
    'useState, useEffect, 커스텀 훅, Context API를 활용한 상태 관리',
    (CURRENT_DATE + INTERVAL '2 weeks')::date + TIME '14:00:00',
    120,
    'ICT융합관 403호',
    NULL,
    'scheduled',
    NOW(),
    NOW()
  ),
  -- Session 3: Next.js
  (
    session_ids[3],
    seminar_id,
    3,
    '3주차: Next.js 프레임워크',
    'SSR, SSG, API Routes, 라우팅 시스템 학습',
    (CURRENT_DATE + INTERVAL '3 weeks')::date + TIME '14:00:00',
    120,
    'ICT융합관 403호',
    NULL,
    'scheduled',
    NOW(),
    NOW()
  ),
  -- Session 4: Backend
  (
    session_ids[4],
    seminar_id,
    4,
    '4주차: 백엔드 개발과 데이터베이스',
    'Node.js API 개발, PostgreSQL 데이터베이스 설계 및 연동',
    (CURRENT_DATE + INTERVAL '4 weeks')::date + TIME '14:00:00',
    120,
    'ICT융합관 403호',
    NULL,
    'scheduled',
    NOW(),
    NOW()
  ),
  -- Session 5: Deployment
  (
    session_ids[5],
    seminar_id,
    5,
    '5주차: 배포 및 프로덕션 운영',
    'Vercel, Supabase를 활용한 풀스택 앱 배포, 모니터링과 최적화',
    (CURRENT_DATE + INTERVAL '5 weeks')::date + TIME '14:00:00',
    120,
    'ICT융합관 403호',
    NULL,
    'scheduled',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Created 5 sessions for seminar';
  RAISE NOTICE 'Session IDs: %', session_ids;
  
  -- Step 4: Show summary
  RAISE NOTICE '=== MOCK DATA CREATION COMPLETE ===';
  RAISE NOTICE 'Seminar: "Full-Stack 웹 개발 심화 과정"';
  RAISE NOTICE 'Owner: jaeyoungshin03@gmail.com (ID: %)', target_user_id;
  RAISE NOTICE 'Seminar ID: %', seminar_id;
  RAISE NOTICE 'Capacity: 20 participants';
  RAISE NOTICE 'Sessions: 5 weekly sessions (120 minutes each)';
  RAISE NOTICE 'Status: Recruiting and ready for enrollments';
  
END $$;

-- Step 5: Verify the created data
SELECT 
  '=== CREATED SEMINAR ===' as info;

SELECT 
  s.id,
  s.title,
  s.status,
  s.capacity,
  u.name as owner_name,
  u.email as owner_email,
  sem.name as semester_name,
  s.start_date,
  s.end_date,
  s.location
FROM public.seminars s
JOIN public.users u ON s.owner_id = u.id
JOIN public.semesters sem ON s.semester_id = sem.id
WHERE u.email = 'jaeyoungshin03@gmail.com'
ORDER BY s.created_at DESC
LIMIT 1;

SELECT 
  '=== CREATED SESSIONS ===' as info;

SELECT 
  sess.session_number,
  sess.title,
  sess.date,
  sess.duration_minutes,
  sess.location,
  sess.status
FROM public.sessions sess
JOIN public.seminars s ON sess.seminar_id = s.id
JOIN public.users u ON s.owner_id = u.id
WHERE u.email = 'jaeyoungshin03@gmail.com'
ORDER BY sess.session_number;

-- Optional: Show seminar tags
SELECT 
  '=== SEMINAR TAGS ===' as info;
  
SELECT 
  s.title,
  unnest(s.tags) as tag
FROM public.seminars s
JOIN public.users u ON s.owner_id = u.id
WHERE u.email = 'jaeyoungshin03@gmail.com'
ORDER BY tag; 