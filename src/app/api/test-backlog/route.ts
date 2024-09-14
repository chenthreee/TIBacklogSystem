import { NextResponse } from 'next/server';
import { runBacklogAPITest } from '../../../lib/external/testExample';

export async function GET() {
  try {
    await runBacklogAPITest();
    return NextResponse.json({ message: 'Backlog API test completed successfully' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Backlog API test failed', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 如果需要处理其他 HTTP 方法的请求，可以添加相应的函数
// 例如：
// export async function POST() { ... }
// export async function PUT() { ... }
// 等等
