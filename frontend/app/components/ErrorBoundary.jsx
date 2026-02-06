'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            fontFamily: "'Segoe UI', sans-serif",
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 12,
              maxWidth: 400,
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <h2 style={{ color: '#333', marginBottom: 12 }}>เกิดข้อผิดพลาด</h2>
            <p style={{ color: '#666', marginBottom: 20 }}>
              กรุณารีเฟรชหน้าหรือกลับไปหน้าหลัก ถ้าคุณสร้างการ์ดสำเร็จสามารถไปที่การ์ดของฉันได้
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <a
                href="/home"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#1DB446',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                ไปการ์ดของฉัน
              </a>
              <a
                href="/"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#6B46C1',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                กลับหน้าหลัก
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
