import React, { useState, useEffect } from 'react';
import LoginForm from '../../components/login-form';
// 移除这行: import { login } from '../../api/auth/route';
import User from '../../../models/User';
import { Menu, Search, FileText, Package, Truck, DollarSign, ChevronDown, CreditCard } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import QuotationManagement from '../quotation-management/quotation-management'
import OrderPage from '../order-page/order-page'
import Logistics from '../logistics-page/logistics'
import InvoicePage from '../invoice-page/invoice'
import RemittanceNotification from '../remittanceNotification-page/remittanceNotification'

interface User {
  username: string;
  password: string;
}
const OrderManagement: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('quotation');

  useEffect(() => {
    // 在组件加载时从 localStorage 获取用户信息
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const loggedInUser = await response.json();
        setIsLoggedIn(true);
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
      } else {
        const errorData = await response.json();
        alert(errorData.error || '用户名或密码错误');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败,请稍后再试');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('user');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'quotation':
        return <QuotationManagement />
      case 'order':
        return <OrderPage />
      case 'logistics':
        return <Logistics />
      case 'finance':
        return <InvoicePage />
      case 'remittance':
        return <RemittanceNotification />
      default:
        return <div>请选择一个选项</div>
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`bg-white w-64 min-h-screen p-4 ${isSidebarOpen ? 'block' : 'hidden'} md:block`}>
        <nav className="mt-8">
          <a 
            className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 hover:text-gray-900 ${activeTab === 'quotation' ? 'bg-gray-200 text-gray-900' : ''}`}
            href="#"
            onClick={() => setActiveTab('quotation')}
          >
            <FileText className="inline-block mr-2" size={20} />
            询价管理
          </a>
          <a 
            className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 hover:text-gray-900 ${activeTab === 'order' ? 'bg-gray-200 text-gray-900' : ''}`}
            href="#"
            onClick={() => setActiveTab('order')}
          >
            <Package className="inline-block mr-2" size={20} />
            订单管理
          </a>
          <a 
            className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 hover:text-gray-900 ${activeTab === 'logistics' ? 'bg-gray-200 text-gray-900' : ''}`}
            href="#"
            onClick={() => setActiveTab('logistics')}
          >
            <Truck className="inline-block mr-2" size={20} />
            物流信息
          </a>
          <a 
            className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 hover:text-gray-900 ${activeTab === 'finance' ? 'bg-gray-200 text-gray-900' : ''}`}
            href="#"
            onClick={() => setActiveTab('finance')}
          >
            <DollarSign className="inline-block mr-2" size={20} />
            财务票据
          </a>
          <a 
            className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 hover:text-gray-900 ${activeTab === 'remittance' ? 'bg-gray-200 text-gray-900' : ''}`}
            href="#"
            onClick={() => setActiveTab('remittance')}
          >
            <CreditCard className="inline-block mr-2" size={20} />
            汇款通知
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-md">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-500 focus:outline-none focus:text-gray-700 md:hidden">
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-semibold ml-2">TI备货系统</h1>
            </div>
            <div className="flex items-center">
              <div className="relative mr-4">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-500" />
                </span>
                <Input
                  type="search"
                  placeholder="搜索..."
                  className="pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center">

                    <span className="ml-2 mr-1">{user?.username}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default OrderManagement;