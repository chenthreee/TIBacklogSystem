import User from '../../../models/User';

// 定义 User 接口
interface User {
  username: string;
  password: string;
}

// 模拟用户数据库
const users: User[] = [
  { username: 'admin', password: 'admin123' },
  { username: 'user', password: 'user123' },
];

export async function login(username: string, password: string): Promise<User | null> {
  // 模拟API调用延迟
  await new Promise(resolve => setTimeout(resolve, 500));

  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // 返回用户信息,但不包括密码
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  return null;
}