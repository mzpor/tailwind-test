// 🔗 کلاینت SSE برای اتصال به سرور ربات و دریافت تغییرات
// Server-Sent Events بدون polling - فقط با درخواست کاربر

class SSEClient {
  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 ثانیه
    
    this.eventHandlers = new Map();
    this.connectionHandlers = new Map();
    
    console.log('🔗 [SSE] Client initialized for:', serverUrl);
  }

  // 🔗 اتصال به سرور SSE
  connect() {
    if (this.isConnected) {
      console.log('🔗 [SSE] Already connected');
      return;
    }

    try {
      console.log('🔗 [SSE] Connecting to server...');
      
      this.eventSource = new EventSource(`${this.serverUrl}/api/sse`);
      
      this.eventSource.onopen = () => {
        console.log('✅ [SSE] Connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 [SSE] Received message:', data);
          this.handleEvent(data);
        } catch (error) {
          console.error('❌ [SSE] Error parsing message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ [SSE] Connection error:', error);
        this.isConnected = false;
        this.notifyConnectionHandlers('error', error);
        
        // تلاش برای اتصال مجدد
        this.scheduleReconnect();
      };

      this.eventSource.addEventListener('user_updated', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyEventHandlers('user_updated', data);
        } catch (error) {
          console.error('❌ [SSE] Error parsing user_updated event:', error);
        }
      });

      this.eventSource.addEventListener('user_created', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyEventHandlers('user_created', data);
        } catch (error) {
          console.error('❌ [SSE] Error parsing user_created event:', error);
        }
      });

    } catch (error) {
      console.error('❌ [SSE] Error creating EventSource:', error);
      this.scheduleReconnect();
    }
  }

  // 🔌 قطع اتصال
  disconnect() {
    if (this.eventSource) {
      console.log('🔌 [SSE] Disconnecting...');
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.notifyConnectionHandlers('disconnected');
    }
  }

  // 🔄 تلاش برای اتصال مجدد
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [SSE] Max reconnection attempts reached');
      this.notifyConnectionHandlers('max_reconnect_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [SSE] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        console.log(`🔄 [SSE] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }
    }, this.reconnectDelay);
  }

  // 📨 پردازش رویدادها
  handleEvent(data) {
    switch (data.type) {
      case 'connected':
        console.log('✅ [SSE] Server connection confirmed:', data.message);
        this.notifyConnectionHandlers('connected', data);
        break;
        
      case 'user_updated':
        console.log('🔄 [SSE] User updated:', data.data);
        this.notifyEventHandlers('user_updated', data.data);
        break;
        
      case 'user_created':
        console.log('🆕 [SSE] User created:', data.data);
        this.notifyEventHandlers('user_created', data.data);
        break;
        
      default:
        console.log('📨 [SSE] Unknown event type:', data.type);
        this.notifyEventHandlers(data.type, data);
    }
  }

  // 📢 ثبت handler برای رویدادها
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  // 📢 ثبت handler برای تغییرات اتصال
  onConnectionChange(handler) {
    this.connectionHandlers.set(Date.now(), handler);
  }

  // 🔔 اطلاع‌رسانی به event handlers
  notifyEventHandlers(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ [SSE] Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  // 🔔 اطلاع‌رسانی به connection handlers
  notifyConnectionHandlers(status, data = null) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(status, data);
      } catch (error) {
        console.error('❌ [SSE] Error in connection handler:', error);
      }
    });
  }

  // 📊 دریافت آمار از سرور
  async getStats() {
    try {
      const response = await fetch(`${this.serverUrl}/api/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error fetching stats:', error);
      throw error;
    }
  }

  // 🔍 جستجوی کاربران
  async searchUsers(query) {
    try {
      const response = await fetch(`${this.serverUrl}/api/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error searching users:', error);
      throw error;
    }
  }

  // 📋 دریافت لیست کاربران
  async getUsers(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.source) params.append('source', filters.source);
      
      const url = `${this.serverUrl}/api/users${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error fetching users:', error);
      throw error;
    }
  }

  // 🔄 به‌روزرسانی کاربر
  async updateUser(userId, updates) {
    try {
      const response = await fetch(`${this.serverUrl}/api/users/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error updating user:', error);
      throw error;
    }
  }

  // 🆕 ایجاد کاربر جدید
  async createUser(userData) {
    try {
      const response = await fetch(`${this.serverUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error creating user:', error);
      throw error;
    }
  }

  // 🧹 پاک‌سازی رکوردهای تکراری
  async cleanupDuplicates() {
    try {
      const response = await fetch(`${this.serverUrl}/api/cleanup`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ [SSE] Error cleaning up duplicates:', error);
      throw error;
    }
  }

  // 📊 وضعیت اتصال
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

export default SSEClient;
