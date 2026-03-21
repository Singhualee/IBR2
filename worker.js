export default {
  async fetch(request, env) {
    // 处理 OPTIONS 请求（CORS 预检）
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 处理 POST 请求（上传图片）
    if (request.method === 'POST') {
      try {
        // 解析 FormData
        const formData = await request.formData();
        const imageFile = formData.get('image');
        
        if (!imageFile) {
          return new Response(JSON.stringify({ error: 'No image provided' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // 调用 Remove.bg API
        const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: {
            'X-Api-Key': env.REMOVE_BG_API_KEY,
          },
          body: formData,
        });

        if (!removeBgResponse.ok) {
          const errorData = await removeBgResponse.json();
          return new Response(JSON.stringify(errorData), {
            status: removeBgResponse.status,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // 返回处理后的图片
        return new Response(await removeBgResponse.blob(), {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 其他请求方法返回 405
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};