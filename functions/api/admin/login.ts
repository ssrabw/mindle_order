import { createClient } from '@supabase/supabase-js';

export const onRequestPost: PagesFunction<{
  SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
}> = async (context) => {
  try {
    const { request, env } = context;
    const { password } = (await request.json()) as { password?: string };

    if (!password) {
      return new Response(JSON.stringify({ success: false, error: '비밀번호를 입력해야 합니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;

    if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ success: false, error: '서버 환경 변수가 누락되었습니다. 설정을 확인해주세요.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 서버사이드 Supabase 클라이언트를 일반 Anon Key로 생성 (클라이언트 세션 매칭 목적)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });

    // 1. verify_admin_password RPC를 수행하여 입력받은 임시 비밀번호 검증
    const { data: isValid, error: rpcError } = await supabase.rpc('verify_admin_password', {
      input_password: password,
    });

    if (rpcError) {
      return new Response(JSON.stringify({ success: false, error: `비밀번호 검증 오류: ${rpcError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isValid) {
      return new Response(JSON.stringify({ success: false, error: '비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. 검증 성공 시, 백엔드 은닉 정보로 관리자 로그인 수행
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

    if (authError) {
      return new Response(JSON.stringify({ success: false, error: `관리자 로그인 실패: ${authError.message}` }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. 클라이언트가 세션을 설정할 수 있도록 응답 반환
    return new Response(JSON.stringify({ success: true, session: authData.session }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || '서버 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
