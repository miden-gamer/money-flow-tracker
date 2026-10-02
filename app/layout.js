import './globals.css';

export const metadata = {
  title: 'Money Flow Tracker',
  description: 'Full-suite personal finance and account reconciliation app',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-900 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}