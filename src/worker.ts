import { createClient } from '@supabase/supabase-js';

// Cloudflare Workers Type Definitions
interface Fetcher {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  IMGBB_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight requests handling
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 1. Admin Login API
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      const response = await handleAdminLogin(request, env);
      return addCorsHeaders(response);
    }

    // 2. Image Upload API
    if (url.pathname === '/api/image/upload' && request.method === 'POST') {
      const response = await handleImageUpload(request, env);
      return addCorsHeaders(response);
    }

    // 3. Fallback to Frontend Static Assets
    try {
      return await env.ASSETS.fetch(request);
    } catch (err: any) {
      return new Response(err.message || 'Asset not found', { status: 404 });
    }
  },
};

function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return newResponse;
}

async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  try {
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
}

async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const customName = formData.get('name') as string;

    if (!imageFile) {
      return new Response(JSON.stringify({ success: false, error: '업로드할 이미지 파일이 없습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imgbbApiKey = env.IMGBB_API_KEY;
    if (!imgbbApiKey) {
      return new Response(JSON.stringify({ success: false, error: '서버에 IMGBB_API_KEY가 설정되지 않았습니다.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ImgBB 업로드 페이로드 준비
    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);
    if (customName) {
      uploadFormData.append('name', customName);
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: `ImgBB 업로드 실패: ${response.statusText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result: any = await response.json();
    if (result.success) {
      return new Response(JSON.stringify({ success: true, url: result.data.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: result.error?.message || 'ImgBB 업로드에 실패했습니다.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || '서버 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
