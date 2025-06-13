import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Mail, 
  BarChart3, 
  Settings, 
  FileText, 
  Zap,
  Home,
  Send
} from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Campaigns', href: '/campaigns', icon: Send },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Sequences', href: '/sequences', icon: Zap },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OV</span>
              </div>
              <div className="ml-3">
                <div className="text-lg font-semibold text-gray-900">OpsVantage</div>
                <div className="text-xs text-gray-500">CRM & Email Marketing</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-blue-50 border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 h-5 w-5`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              OpsVantage Digital CRM v1.0
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                {navigation.find(item => 
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href))
                )?.name || 'Dashboard'}
              </h1>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
