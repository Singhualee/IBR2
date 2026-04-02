export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ========== /api/sync-user ==========
    if (url.pathname === '/api/sync-user' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { google_id, email, name, picture, access_token, refresh_token } = body;

        if (!google_id || !email) {
          return Response.json(
            { error: 'Missing required fields: google_id, email' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Upsert user (insert or update if exists)
        const stmt = `
          INSERT INTO users (id, google_id, email, name, picture, access_token, refresh_token, created_at, updated_at)
          VALUES (
            lower(hex(randomblob(16))),
            ?1, ?2, ?3, ?4, ?5, ?6,
            unixepoch(), unixepoch()
          )
          ON CONFLICT(google_id) DO UPDATE SET
            email = excluded.email,
            name = excluded.name,
            picture = excluded.picture,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            updated_at = unixepoch()
        `;

        const result = await env.ibr2_users
          .prepare(stmt)
          .bind(google_id, email, name || null, picture || null, access_token || null, refresh_token || null)
          .run();

        return Response.json(
          { success: true, changes: result.meta.changes },
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err) {
        return Response.json(
          { error: err.message || 'Internal Server Error' },
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // ========== /api/get-user ==========
    if (url.pathname === '/api/get-user' && request.method === 'GET') {
      try {
        const email = url.searchParams.get('email');
        if (!email) {
          return Response.json(
            { error: 'Missing email parameter' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const user = await env.ibr2_users
          .prepare('SELECT * FROM users WHERE email = ?1')
          .bind(email)
          .first();

        return Response.json(
          { user },
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err) {
        return Response.json(
          { error: err.message || 'Internal Server Error' },
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // ========== 处理 OPTIONS（CORS 预检）==========
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // ========== POST：上传图片（remove.bg）==========
    if (request.method === 'POST') {
      try {
        let formData;

        const contentType = request.headers.get('Content-Type');

        if (contentType && contentType.includes('multipart/form-data')) {
          formData = await request.formData();
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
          const blob = await request.blob();
          formData = new FormData();
          formData.append('image_file', blob, 'image.png');
        }

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

    // 其他请求返回 405
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
