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
        let formData;
        
        // 检查请求类型
        const contentType = request.headers.get('Content-Type');
        
        if (contentType && contentType.includes('multipart/form-data')) {
          // 处理 FormData 格式的请求
          formData = await request.formData();
          // 检查是否有 image 字段（前端使用）或 image_file 字段（API 要求）
          let imageFile = formData.get('image');
          if (!imageFile) {
            imageFile = formData.get('image_file');
          }
          
          if (!imageFile) {
            return new Response(JSON.stringify({ error: 'No image provided' }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        } else {
          // 处理直接上传的文件
          const blob = await request.blob();
          formData = new FormData();
          formData.append('image_file', blob, 'image.png');
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
          try {
            const errorData = await removeBgResponse.json();
            return new Response(JSON.stringify(errorData), {
              status: removeBgResponse.status,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            });
          } catch (e) {
            // 如果无法解析 JSON 错误，返回原始错误信息
            const errorText = await removeBgResponse.text();
            return new Response(JSON.stringify({ error: errorText }), {
              status: removeBgResponse.status,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
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