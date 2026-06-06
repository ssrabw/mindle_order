const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .dev.vars 파일 파싱
const devVarsPath = path.join(__dirname, '../.dev.vars');
let supabaseUrl = '';
let supabaseAnonKey = '';
let adminEmail = '';
let adminPassword = '';

try {
  const fileContent = fs.readFileSync(devVarsPath, 'utf8');
  const lines = fileContent.split('\n');
  lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'SUPABASE_URL') supabaseUrl = val;
      if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY') supabaseAnonKey = val;
      if (key === 'ADMIN_EMAIL') adminEmail = val;
      if (key === 'ADMIN_PASSWORD') adminPassword = val;
    }
  });
} catch (e) {
  console.error('.dev.vars 읽기 실패, .env에서 대체 시도');
}

// .env 백업 파싱
if (!supabaseUrl || !supabaseAnonKey) {
  const envPath = path.join(__dirname, '../.env');
  try {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    const lines = fileContent.split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
        if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY') supabaseAnonKey = val;
      }
    });
  } catch (e) {
    console.error('.env 읽기 실패');
  }
}

if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
  console.error('필요한 환경 변수가 누락되었습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function migrate() {
  console.log('관리자 로그인 진행 중...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError) {
    console.error('관리자 로그인 실패:', authError.message);
    process.exit(1);
  }

  console.log('로그인 성공! 세션 주입 중...');
  // RLS 우회를 위해 클라이언트 세션 설정
  const { error: sessionError } = await supabase.auth.setSession(authData.session);
  if (sessionError) {
    console.error('세션 설정 실패:', sessionError.message);
    process.exit(1);
  }

  console.log('1. "주문 미확인" -> "주문" 변경 중...');
  const { error: error1 } = await supabase
    .from('orders')
    .update({ status: '주문' })
    .eq('status', '주문 미확인');

  if (error1) {
    console.error('"주문 미확인" 업데이트 오류:', error1.message);
  } else {
    console.log('"주문 미확인" -> "주문" 완료');
  }

  console.log('2. "주문 확인" -> "입금 대기중" 변경 중...');
  const { error: error2 } = await supabase
    .from('orders')
    .update({ status: '입금 대기중' })
    .eq('status', '주문 확인');

  if (error2) {
    console.error('"주문 확인" 업데이트 오류:', error2.message);
  } else {
    console.log('"주문 확인" -> "입금 대기중" 완료');
  }

  console.log('마이그레이션이 성공적으로 수행되었습니다.');
}

migrate();
