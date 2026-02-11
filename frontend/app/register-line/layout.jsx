// บังคับ segment นี้เป็น dynamic — แก้ InvariantError client reference manifest สำหรับ /register-line
export const dynamic = 'force-dynamic';

export default function RegisterLineLayout({ children }) {
  return children;
}
