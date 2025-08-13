import React, { useState, useEffect, useRef } from 'react';
import SSEClient from '../lib/sse-client';

const SSEConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const sseClientRef = useRef(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // ایجاد نمونه SSE Client
    sseClientRef.current = new SSEClient('http://localhost:3001');
    
    // ثبت event handlers
    sseClientRef.current.on('user_updated', handleUserUpdated);
    sseClientRef.current.on('user_created', handleUserCreated);
    
    // ثبت connection change handler
    sseClientRef.current.onConnectionChange(handleConnectionChange);
    
    // اتصال به سرور
    sseClientRef.current.connect();
    
    // دریافت آمار اولیه
    loadStats();
    loadUsers();
    
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
      }
    };
  }, []);

  // 🔗 مدیریت تغییرات اتصال
  const handleConnectionChange = (status, data) => {
    console.log('🔗 [SSE] Connection status changed:', status, data);
    setConnectionStatus(status);
    
    if (status === 'connected') {
      // اتصال برقرار شد - دریافت داده‌های جدید
      loadStats();
      loadUsers();
    }
  };

  // 🔄 مدیریت به‌روزرسانی کاربر
  const handleUserUpdated = (data) => {
    console.log('🔄 [SSE] User updated:', data);
    setLastUpdate(new Date());
    
    // به‌روزرسانی لیست کاربران
    loadUsers();
    
    // نمایش اعلان
    showNotification('کاربر به‌روزرسانی شد', 'success');
  };

  // 🆕 مدیریت ایجاد کاربر جدید
  const handleUserCreated = (data) => {
    console.log('🆕 [SSE] User created:', data);
    setLastUpdate(new Date());
    
    // به‌روزرسانی لیست کاربران
    loadUsers();
    
    // نمایش اعلان
    showNotification('کاربر جدید ایجاد شد', 'success');
  };

  // 📊 بارگذاری آمار
  const loadStats = async () => {
    try {
      setIsLoading(true);
      const statsData = await sseClientRef.current.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      showNotification('خطا در بارگذاری آمار', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 📋 بارگذاری کاربران
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await sseClientRef.current.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('❌ Error loading users:', error);
      showNotification('خطا در بارگذاری کاربران', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔍 جستجوی کاربران
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);
      const results = await sseClientRef.current.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      showNotification('خطا در جستجو', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 اتصال مجدد
  const handleReconnect = () => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
      setTimeout(() => {
        sseClientRef.current.connect();
      }, 1000);
    }
  };

  // 🧹 پاک‌سازی رکوردهای تکراری
  const handleCleanup = async () => {
    try {
      setIsLoading(true);
      const result = await sseClientRef.current.cleanupDuplicates();
      showNotification(result.message, 'success');
      
      // بارگذاری مجدد داده‌ها
      loadStats();
      loadUsers();
    } catch (error) {
      console.error('❌ Error cleaning up duplicates:', error);
      showNotification('خطا در پاک‌سازی', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔔 نمایش اعلان
  const showNotification = (message, type = 'info') => {
    // اینجا می‌توانید از toast library استفاده کنید
    console.log(`🔔 [${type.toUpperCase()}] ${message}`);
  };

  // 🎨 رنگ‌بندی وضعیت اتصال
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'disconnected': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 🎨 رنگ‌بندی وضعیت کاربر
  const getUserStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'incomplete': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 🔗 وضعیت اتصال SSE */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-700">وضعیت اتصال SSE</h2>
          <div className="flex gap-2">
            <button
              onClick={handleReconnect}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              🔄 اتصال مجدد
            </button>
            <button
              onClick={loadStats}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              📊 به‌روزرسانی
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${getStatusColor(connectionStatus)}`}>
            <h3 className="font-semibold mb-2">وضعیت اتصال</h3>
            <p className="capitalize">{connectionStatus}</p>
            {lastUpdate && (
              <p className="text-sm mt-2">آخرین به‌روزرسانی: {lastUpdate.toLocaleTimeString('fa-IR')}</p>
            )}
          </div>
          
          {stats && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-700 mb-2">آمار کلی</h3>
              <div className="space-y-1 text-sm">
                <p>کل کاربران: {stats.total}</p>
                <p>تکمیل شده: {stats.completed}</p>
                <p>ناقص: {stats.incomplete}</p>
                <p>ربات: {stats.botUsers}</p>
                <p>سایت: {stats.websiteUsers}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔍 جستجو */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-blue-700 mb-4">جستجوی کاربران</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، کد ملی یا شماره تلفن..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            🔍 جستجو
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">نتایج جستجو ({searchResults.length})</h3>
            <div className="space-y-2">
              {searchResults.map((user, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.fullName || 'نامشخص'}</p>
                      <p className="text-sm text-gray-600">
                        کد ملی: {user.nationalId || 'نامشخص'} | 
                        تلفن: {user.phone || 'نامشخص'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getUserStatusColor(user.status)}`}>
                      {user.status || 'جدید'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📋 لیست کاربران */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700">لیست کاربران</h2>
          <button
            onClick={handleCleanup}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            🧹 پاک‌سازی تکراری
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">در حال بارگذاری...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4 text-slate-600">نام</th>
                  <th className="text-right py-3 px-4 text-slate-600">کد ملی</th>
                  <th className="text-right py-3 px-4 text-slate-600">تلفن</th>
                  <th className="text-right py-3 px-4 text-slate-600">منبع</th>
                  <th className="text-right py-3 px-4 text-slate-600">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">{user.fullName || 'نامشخص'}</td>
                    <td className="py-3 px-4">{user.nationalId || 'نامشخص'}</td>
                    <td className="py-3 px-4">{user.phone || 'نامشخص'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.source === 'bot' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {user.source === 'bot' ? 'ربات' : 'سایت'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getUserStatusColor(user.status)}`}>
                        {user.status || 'جدید'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                هیچ کاربری یافت نشد
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SSEConnection;
