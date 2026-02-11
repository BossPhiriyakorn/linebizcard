'use client';

/**
 * จับ error ระดับ root — แทนที่การหา 500.html ที่ไม่มีอยู่
 * ต้องมี <html> และ <body> เอง เพราะแทนที่ root layout ตอน error
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="th">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ color: '#b91c1c', marginBottom: '1rem' }}>เกิดข้อผิดพลาด</h1>
        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
          ระบบเกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งหรือรีเฟรชหน้า
        </p>
        <button
          type="button"
          onClick={() => reset && reset()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1DB446',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ลองอีกครั้ง
        </button>
      </body>
    </html>
  );
}
