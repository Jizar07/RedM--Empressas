import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle auth routes - force correct host for Cloudflare Tunnel
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    console.log('Auth middleware - original host:', request.headers.get('host'));
    
    // Clone the request headers
    const requestHeaders = new Headers(request.headers);
    
    // Force the host to be our domain for NextAuth
    requestHeaders.set('host', 'fazenda.stoffeltech.com');
    requestHeaders.set('x-forwarded-host', 'fazenda.stoffeltech.com');
    requestHeaders.set('x-forwarded-proto', 'https');
    requestHeaders.set('x-forwarded-port', '443');
    
    console.log('Auth middleware - setting host to:', 'fazenda.stoffeltech.com');
    
    // Create response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Handle CORS for webhook endpoint
  if (request.nextUrl.pathname.startsWith('/api/webhook/channel-messages')) {
    const response = NextResponse.next();
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Origin, Accept');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/auth/:path*', '/api/webhook/:path*']
};