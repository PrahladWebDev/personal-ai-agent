import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ask About Me — Personal AI Agent',
  description: 'An AI agent that knows my skills, experience, and projects as a software developer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
