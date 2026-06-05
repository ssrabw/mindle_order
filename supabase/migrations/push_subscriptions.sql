-- push_subscriptions 테이블 생성 (기기별 브라우저 푸시 토큰 저장용)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint text NOT NULL, -- 브라우저 푸시 엔드포인트 URL (PK)
  customer_phone text, -- 고객인 경우 매핑할 전화번호 (관리자는 null)
  role text NOT NULL DEFAULT 'customer'::text, -- 'customer' 또는 'admin'
  keys_p256dh text NOT NULL, -- 암호화용 p256dh 키 문자열
  keys_auth text NOT NULL, -- 인증용 auth 키 문자열
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()), -- 생성 일시
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (endpoint)
);

-- RLS 정책 설정
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 실시간 알림 등록/갱신/수정을 수월하게 할 수 있도록 전원 접근 허용
DROP POLICY IF EXISTS "Allow public all access on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Allow public all access on push_subscriptions" ON public.push_subscriptions 
FOR ALL USING (true) WITH CHECK (true);
