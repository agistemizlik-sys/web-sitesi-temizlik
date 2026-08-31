import { executeCyberLoopSentinel, getTrustedClientIp, sanitizeSafeString } from './_security.js';

function sanitizeStr(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim().substring(0, 150);
}

function getCorsHeaders(origin) {
  const allowed = (origin && (origin.endsWith('relaxax.com') || origin.endsWith('pages.dev') || origin.includes('localhost') || origin.includes('127.0.0.1')))
    ? origin
    : '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-RELAXAX-Signature',
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
}

// GET /api/orders?code=... OR ?email=...
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || url.searchParams.get('orderCode');
  const email = url.searchParams.get('email');
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (code) {
      const cleanCode = sanitizeStr(code, 40);
      let order = null;
      if (env && env.LEADS_KV) {
        try {
          order = await env.LEADS_KV.get('order:' + cleanCode, 'json');
        } catch (e) {}
      }

      if (order) {
        return new Response(JSON.stringify({ success: true, order }), {
          status: 200,
          headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({ success: false, message: 'Siparis bulunamadi.' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    if (email) {
      const cleanEmail = sanitizeEmail(email);
      let orders = [];
      if (env && env.LEADS_KV) {
        try {
          const userOrders = await env.LEADS_KV.get('user_orders:' + cleanEmail, 'json');
          if (Array.isArray(userOrders)) orders = userOrders;
        } catch (e) {}
      }
      return new Response(JSON.stringify({ success: true, orders }), {
        status: 200,
        headers: corsHeaders
      });
    }

    let recentOrders = [];
    if (env && env.LEADS_KV) {
      try {
        const globalList = await env.LEADS_KV.get('global_recent_orders', 'json');
        if (Array.isArray(globalList)) recentOrders = globalList;
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      orders: recentOrders,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: 'Siparisler getirilemedi.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// POST /api/orders
export async function onRequestPost(context) {
  const { request, env } = context;
  const waitUntil = context.waitUntil ? context.waitUntil.bind(context) : null;
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const cyberCheck = await executeCyberLoopSentinel(env, request, body, waitUntil);
    if (cyberCheck.blocked) return cyberCheck.response;

    const resCode = sanitizeStr(body.orderCode || body.resCode || ('RLX-' + Math.floor(100000 + Math.random() * 900000)), 30);
    const orderData = {
      id: resCode,
      orderCode: resCode,
      customerName: sanitizeStr(body.customerName || body.name || 'Musteri'),
      customerPhone: sanitizeStr(body.customerPhone || body.phone || ''),
      customerEmail: sanitizeEmail(body.customerEmail || body.email || ''),
      city: sanitizeStr(body.city || 'Istanbul'),
      district: sanitizeStr(body.district || ''),
      street: sanitizeStr(body.street || body.address || ''),
      serviceType: sanitizeStr(body.serviceType || body.service || 'Standart Temizlik'),
      rooms: sanitizeStr(body.rooms || '2+1 Daire'),
      date: sanitizeStr(body.date || 'Bugun'),
      time: sanitizeStr(body.time || '09:30'),
      totalPrice: Number(body.totalPrice || body.price || 0),
      currency: sanitizeStr(body.currency || 'TL'),
      status: 'Beklemede',
      assignedStaff: 'Atama Bekliyor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (env && env.LEADS_KV) {
      try {
        await env.LEADS_KV.put('order:' + resCode, JSON.stringify(orderData), { expirationTtl: 31536000 });

        if (orderData.customerEmail) {
          let userOrders = await env.LEADS_KV.get('user_orders:' + orderData.customerEmail, 'json') || [];
          userOrders.unshift(orderData);
          if (userOrders.length > 50) userOrders = userOrders.slice(0, 50);
          await env.LEADS_KV.put('user_orders:' + orderData.customerEmail, JSON.stringify(userOrders));
        }

        let globalList = await env.LEADS_KV.get('global_recent_orders', 'json') || [];
        globalList.unshift(orderData);
        if (globalList.length > 100) globalList = globalList.slice(0, 100);
        await env.LEADS_KV.put('global_recent_orders', JSON.stringify(globalList));
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      orderCode: resCode,
      order: orderData,
      message: 'Siparisiniz basariyla alindi ve yonetici onayina sunuldu.'
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: 'Siparis olusturulamadi.' }), {
      status: 400,
      headers: corsHeaders
    });
  }
}

// PATCH /api/orders
export async function onRequestPatch(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const orderId = sanitizeStr(body.orderId || body.orderCode || body.id, 40);
    const newStatus = sanitizeStr(body.status || 'Onaylandi', 30);
    const assignedStaff = body.assignedStaff || null;

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, message: 'Gecerli bir siparis kodu belirtiniz.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    let updatedOrder = null;

    if (env && env.LEADS_KV) {
      try {
        let order = await env.LEADS_KV.get('order:' + orderId, 'json');
        if (order) {
          order.status = newStatus;
          if (assignedStaff) order.assignedStaff = assignedStaff;
          order.updatedAt = new Date().toISOString();
          await env.LEADS_KV.put('order:' + orderId, JSON.stringify(order), { expirationTtl: 31536000 });
          updatedOrder = order;

          if (order.customerEmail) {
            let userOrders = await env.LEADS_KV.get('user_orders:' + order.customerEmail, 'json') || [];
            userOrders = userOrders.map(o => (o.orderCode === orderId || o.id === orderId) ? { ...o, status: newStatus, assignedStaff: assignedStaff || o.assignedStaff } : o);
            await env.LEADS_KV.put('user_orders:' + order.customerEmail, JSON.stringify(userOrders));
          }

          let globalList = await env.LEADS_KV.get('global_recent_orders', 'json') || [];
          globalList = globalList.map(o => (o.orderCode === orderId || o.id === orderId) ? { ...o, status: newStatus, assignedStaff: assignedStaff || o.assignedStaff } : o);
          await env.LEADS_KV.put('global_recent_orders', JSON.stringify(globalList));
        }
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: orderId,
      status: newStatus,
      assignedStaff: assignedStaff,
      order: updatedOrder,
      message: 'Siparis durumu guncellendi.'
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: 'Guncelleme basarisiz.' }), {
      status: 400,
      headers: corsHeaders
    });
  }
}
