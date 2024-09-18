import { NextRequest, NextResponse } from 'next/server';

export function basicAuthMiddleware(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return new NextResponse('认证失败', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
      });
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    // 这里使用环境变量存储用户名和密码
    if (user === process.env.AUTH_USER && pass === process.env.AUTH_PASS) {
      return handler(req);
    } else {
      return new NextResponse('认证失败', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
      });
    }
  };
}