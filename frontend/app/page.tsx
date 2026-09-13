import { ChatWindow } from '@/components/chat/ChatWindow';

// Server components run inside the Next.js container and can't resolve a
// relative "/api" path (there's no browser origin), so they talk to the
// backend directly over the Docker network. The browser-side API client
// (lib/api.ts) still uses NEXT_PUBLIC_API_URL ("/api") proxied by nginx.
const INTERNAL_API_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:4000/api';

async function getAgentName(): Promise<string> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/profile`, { cache: 'no-store' });
    const json = await res.json();
    return json?.data?.name || '';
  } catch {
    return '';
  }
}

export default async function HomePage() {
  const agentName = await getAgentName();
  return <ChatWindow agentName={agentName} />;
}
