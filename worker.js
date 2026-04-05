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
        // If new user, set free trial (3 credits, claimed now)
        const existing = await env.ibr2_users
          .prepare('SELECT * FROM users WHERE google_id = ?1')
          .bind(google_id)
          .first();

        let stmt, result;
        
        if (!existing) {
          // New user - claim free trial (3 credits, valid for 5 days)
          stmt = `
            INSERT INTO users (id, google_id, email, name, picture, access_token, refresh_token, 
              free_credits, free_credits_used, free_trial_claimed_at,
              created_at, updated_at)
            VALUES (
              lower(hex(randomblob(16))),
              ?1, ?2, ?3, ?4, ?5, ?6,
              3, 0, unixepoch(),
              unixepoch(), unixepoch()
            )
          `;
        } else {
          // Existing user - just update info
          stmt = `
            UPDATE users SET
              email = ?2,
              name = ?3,
              picture = ?4,
              access_token = ?5,
              refresh_token = ?6,
              updated_at = unixepoch()
            WHERE google_id = ?1
          `;
        }

        result = await env.ibr2_users
          .prepare(stmt)
          .bind(google_id, email, name || null, picture || null, access_token || null, refresh_token || null)
          .run();

        return Response.json(
          { success: true, changes: result.meta.changes, isNewUser: !existing },
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

    // ========== /api/deduct-credit ==========
    // Deduct 1 credit from user based on priority (shortest validity first)
    if (url.pathname === '/api/deduct-credit' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
          return Response.json(
            { error: 'Missing email parameter' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Get user
        const user = await env.ibr2_users
          .prepare('SELECT * FROM users WHERE email = ?1')
          .bind(email)
          .first();

        if (!user) {
          return Response.json(
            { error: 'User not found' },
            { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const now = Math.floor(Date.now() / 1000);
        
        // Calculate available credits and their expiry
        const sources = [];
        
        // 1. Free trial credits (5 days from claim)
        if (user.free_trial_claimed_at) {
          const freeExpiry = user.free_trial_claimed_at + (5 * 24 * 60 * 60);
          const freeRemaining = (user.free_credits || 3) - (user.free_credits_used || 0);
          if (freeRemaining > 0 && now < freeExpiry) {
            sources.push({ type: 'free', remaining: freeRemaining, expiresAt: freeExpiry });
          }
        }
        
        // 2. Subscription credits (monthly, 30 days from start)
        if (user.plan_expires_at) {
          const planRemaining = (user.plan_credits || 0) - (user.plan_credits_used || 0);
          if (planRemaining > 0 && now < user.plan_expires_at) {
            sources.push({ type: 'plan', remaining: planRemaining, expiresAt: user.plan_expires_at });
          }
        }
        
        // 3. Add-on A credits (2 months = 60 days from purchase)
        if (user.addon_a_expires_at) {
          const addonRemaining = (user.addon_a_credits || 0) - (user.addon_a_credits_used || 0);
          if (addonRemaining > 0 && now < user.addon_a_expires_at) {
            sources.push({ type: 'addon_a', remaining: addonRemaining, expiresAt: user.addon_a_expires_at });
          }
        }
        
        // 4. Add-on B credits (2 months = 60 days from purchase)
        if (user.addon_b_expires_at) {
          const addonRemaining = (user.addon_b_credits || 0) - (user.addon_b_credits_used || 0);
          if (addonRemaining > 0 && now < user.addon_b_expires_at) {
            sources.push({ type: 'addon_b', remaining: addonRemaining, expiresAt: user.addon_b_expires_at });
          }
        }

        if (sources.length === 0) {
          return Response.json(
            { error: 'No credits available', success: false },
            { status: 402, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Sort by expiry (shortest first) - this is our consumption priority
        sources.sort((a, b) => a.expiresAt - b.expiresAt);
        
        // Deduct from the source with shortest validity
        const source = sources[0];
        
        let updateStmt;
        switch (source.type) {
          case 'free':
            updateStmt = `UPDATE users SET free_credits_used = free_credits_used + 1, updated_at = unixepoch() WHERE email = ?1`;
            break;
          case 'plan':
            updateStmt = `UPDATE users SET plan_credits_used = plan_credits_used + 1, updated_at = unixepoch() WHERE email = ?1`;
            break;
          case 'addon_a':
            updateStmt = `UPDATE users SET addon_a_credits_used = addon_a_credits_used + 1, updated_at = unixepoch() WHERE email = ?1`;
            break;
          case 'addon_b':
            updateStmt = `UPDATE users SET addon_b_credits_used = addon_b_credits_used + 1, updated_at = unixepoch() WHERE email = ?1`;
            break;
        }

        await env.ibr2_users
          .prepare(updateStmt)
          .bind(email)
          .run();

        return Response.json(
          { success: true, deductedFrom: source.type },
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err) {
        return Response.json(
          { error: err.message || 'Internal Server Error' },
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // ========== /api/refund-credit ==========
    // Refund 1 credit to user (used when API call fails)
    if (url.pathname === '/api/refund-credit' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, source } = body;

        if (!email) {
          return Response.json(
            { error: 'Missing email parameter' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Get user to determine which source to refund
        const user = await env.ibr2_users
          .prepare('SELECT * FROM users WHERE email = ?1')
          .bind(email)
          .first();

        if (!user) {
          return Response.json(
            { error: 'User not found' },
            { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // If source specified, refund to that source
        // Otherwise, refund to the source that was just deducted (last one)
        const now = Math.floor(Date.now() / 1000);
        
        // Find the source with the shortest expiry to refund to
        // (reverse priority - refund to source with shortest validity first)
        const sources = [];
        
        if (user.free_trial_claimed_at) {
          const freeExpiry = user.free_trial_claimed_at + (5 * 24 * 60 * 60);
          const freeUsed = user.free_credits_used || 0;
          if (freeUsed > 0 && now < freeExpiry) {
            sources.push({ type: 'free', used: freeUsed, expiresAt: freeExpiry });
          }
        }
        
        if (user.plan_expires_at) {
          const planUsed = user.plan_credits_used || 0;
          if (planUsed > 0 && now < user.plan_expires_at) {
            sources.push({ type: 'plan', used: planUsed, expiresAt: user.plan_expires_at });
          }
        }
        
        if (user.addon_a_expires_at) {
          const addonUsed = user.addon_a_credits_used || 0;
          if (addonUsed > 0 && now < user.addon_a_expires_at) {
            sources.push({ type: 'addon_a', used: addonUsed, expiresAt: user.addon_a_expires_at });
          }
        }
        
        if (user.addon_b_expires_at) {
          const addonUsed = user.addon_b_credits_used || 0;
          if (addonUsed > 0 && now < user.addon_b_expires_at) {
            sources.push({ type: 'addon_b', used: addonUsed, expiresAt: user.addon_b_expires_at });
          }
        }

        if (sources.length === 0) {
          return Response.json(
            { error: 'No credits to refund' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Sort by expiry (shortest first) - refund to source with shortest validity
        sources.sort((a, b) => a.expiresAt - b.expiresAt);
        
        const refundSource = source || sources[0].type;
        let updateStmt;
        
        switch (refundSource) {
          case 'free':
            updateStmt = `UPDATE users SET free_credits_used = free_credits_used - 1, updated_at = unixepoch() WHERE email = ?1 AND free_credits_used > 0`;
            break;
          case 'plan':
            updateStmt = `UPDATE users SET plan_credits_used = plan_credits_used - 1, updated_at = unixepoch() WHERE email = ?1 AND plan_credits_used > 0`;
            break;
          case 'addon_a':
            updateStmt = `UPDATE users SET addon_a_credits_used = addon_a_credits_used - 1, updated_at = unixepoch() WHERE email = ?1 AND addon_a_credits_used > 0`;
            break;
          case 'addon_b':
            updateStmt = `UPDATE users SET addon_b_credits_used = addon_b_credits_used - 1, updated_at = unixepoch() WHERE email = ?1 AND addon_b_credits_used > 0`;
            break;
        }

        await env.ibr2_users
          .prepare(updateStmt)
          .bind(email)
          .run();

        return Response.json(
          { success: true, refundedTo: refundSource },
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } catch (err) {
        return Response.json(
          { error: err.message || 'Internal Server Error' },
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // ========== /api/set-plan ==========
    // Set user's subscription plan after successful payment
    if (url.pathname === '/api/set-plan' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, planType, planCredits, isSubscription, subscriptionId, orderId } = body;

        if (!email) {
          return Response.json(
            { error: 'Missing email parameter' },
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const now = Math.floor(Date.now() / 1000);
        
        // Handle subscription plans
        if (isSubscription && planType && planCredits) {
          // Monthly subscription (resets monthly)
          const expiresAt = now + (30 * 24 * 60 * 60); // 30 days
          
          const stmt = `
            UPDATE users SET
              plan_type = ?2,
              plan_credits = ?3,
              plan_credits_used = 0,
              plan_expires_at = ?4,
              updated_at = unixepoch()
            WHERE email = ?1
          `;
          
          await env.ibr2_users
            .prepare(stmt)
            .bind(email, planType, planCredits, expiresAt)
            .run();
        }
        
        // Handle add-on purchases (one-time payments)
        if (!isSubscription && planType) {
          const expiresAt = now + (60 * 24 * 60 * 60); // 60 days (2 months)
          
          let stmt;
          if (planType === 'add-on-a') {
            stmt = `
              UPDATE users SET
                addon_a_credits = addon_a_credits + 70,
                addon_a_expires_at = ?2,
                updated_at = unixepoch()
              WHERE email = ?1
            `;
            await env.ibr2_users
              .prepare(stmt)
              .bind(email, expiresAt)
              .run();
          } else if (planType === 'add-on-b') {
            stmt = `
              UPDATE users SET
                addon_b_credits = addon_b_credits + 110,
                addon_b_expires_at = ?2,
                updated_at = unixepoch()
              WHERE email = ?1
            `;
            await env.ibr2_users
              .prepare(stmt)
              .bind(email, expiresAt)
              .run();
          }
        }

        return Response.json(
          { success: true },
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
