import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

import User from '../../../models/User';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 连接到数据库
    await dbConnect();

    // 在数据库中查找用户
    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 比较密码
    const isMatch = user.password === password;

    if (!isMatch) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 返回用户信息,但不包括密码
    const userWithoutPassword = {
      _id: user._id,
      username: user.username
    };

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}