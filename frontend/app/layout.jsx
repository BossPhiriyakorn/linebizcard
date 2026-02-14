import './globals.css';
import ErrorBoundary from './components/ErrorBoundary';

export const metadata = {
  title: 'MagicBiz-Card',
  description: 'แพลตฟอร์มสร้างและแชร์นามบัตรดิจิทัลผ่าน LINE',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://static.line-scdn.net/liff/edge/2/sdk.js" async />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
