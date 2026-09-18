// netlify/functions/state.mjs
//
// GET  /api/state  -> { overrides, customFormations, freeformSnapshot, arrows, recordings } for the logged-in user
// PUT  /api/state  -> body is that same shape; overwrites the logged-in user's saved data
//
// Uses @netlify/identity's getUser(), which reads the session from the
// request's cookies automatically (the browser sends them because the
// front-end calls the same @netlify/identity login()/signup() functions).
// No manual Authorization header handling is needed on either side.
//
// Requires Netlify Identity to be enabled for this project
// (Netlify UI -> Identity -> Enable Identity).

import { getUser } from '@netlify/identity';
import { getStore } from '@netlify/blobs';

const EMPTY_STATE = { overrides: {}, customFormations: {}, freeformSnapshot: null, arrows: [], recordings: {} };

export default async (req, context) => {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'ログインが必要です。' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('rugby-board-user-data');
  const key = user.id;

  try {
    if (req.method === 'GET') {
      const data = await store.get(key, { type: 'json' });
      return Response.json(data || EMPTY_STATE);
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: '不正なデータです。' }), { status: 400 });
      }
      const toStore = {
        overrides: body.overrides && typeof body.overrides === 'object' ? body.overrides : {},
        customFormations: body.customFormations && typeof body.customFormations === 'object' ? body.customFormations : {},
        freeformSnapshot: body.freeformSnapshot || null,
        arrows: Array.isArray(body.arrows) ? body.arrows : [],
        recordings: body.recordings && typeof body.recordings === 'object' ? body.recordings : {},
      };
      await store.setJSON(key, toStore);
      return Response.json({ ok: true });
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err && err.message) || err) }), { status: 500 });
  }
};

export const config = {
  path: '/api/state',
};
