export const onRequestPost: PagesFunction<{ IMGBB_API_KEY: string }> = async (context) => {
  try {
    const { request, env } = context;
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
};
