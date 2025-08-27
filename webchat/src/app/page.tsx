
"use client";
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/utils/socket-client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<{ name: string; online?: boolean }[]>([]);
  const [messages, setMessages] = useState<{ name: string; message: string; createdAt?: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingMsg, setPendingMsg] = useState<null | { name: string; message: string; status: 'sending' | 'failed' }>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const validateAndPing = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/login');
        return;
      }
      const res = await fetch('/api/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      // Fetch all users after validating token
      const usersRes = await fetch('/api/all-users');
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data.users || []);
      }
    };
    validateAndPing();
    interval = setInterval(validateAndPing, 30000); // every 30s
    return () => clearInterval(interval);
  }, [router]);

  // Fetch general chat messages initially and subscribe to real-time updates
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    let mounted = true;
    const fetchMessages = async () => {
      const res = await fetch('/api/generalchat');
      if (res.ok) {
        const data = await res.json();
        if (mounted) setMessages(data.messages || []);
      }
    };
    fetchMessages();
    socket = getSocket();
    socket.on('refresh-messages', fetchMessages);
    return () => {
      mounted = false;
      if (socket) {
        socket.off('refresh-messages', fetchMessages);
      }
    };
  }, []);


  // Show 'New message' button if not at bottom when new messages arrive
  useEffect(() => {
    const body = messagesBodyRef.current;
    if (!body) return;
    const handle = () => {
      // If user is within 40px of bottom, hide button
      if (body.scrollHeight - body.scrollTop - body.clientHeight < 40) {
        setShowNewMsgBtn(false);
      }
    };
    body.addEventListener('scroll', handle);
    // On new messages, check if user is at bottom
    handle();
    return () => body.removeEventListener('scroll', handle);
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    let name = 'Anonymous';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        name = payload.name || 'Anonymous';
      } catch {}
    }
    setPendingMsg({ name, message: input, status: 'sending' });
    setInput('');
    try {
      const res = await fetch('/api/generalchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message: input })
      });
      if (!res.ok) throw new Error('Failed');
      setPendingMsg(null); // will be replaced by polling
    } catch {
      setPendingMsg({ name, message: input, status: 'failed' });
    }
    setSending(false);
  };

  // Get last message for General Chat preview
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Left: Room List */}
      <aside
        className={
          'fixed z-50 top-0 left-0 h-full w-72 bg-white/90 dark:bg-gray-900/80 border-r border-gray-200 dark:border-gray-800 flex flex-col rounded-r-xl shadow-lg m-0 border transition-transform duration-200 md:static md:rounded-xl md:shadow-lg md:m-4 md:w-80 lg:w-96 xl:w-[28rem] ' +
          (sidebarOpen ? 'translate-x-0' : '-translate-x-full') +
          ' md:translate-x-0 h-[100vh] md:h-[96vh]'
        }
        style={{ maxWidth: '100vw' }}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 font-bold text-lg text-gray-800 dark:text-white flex items-center justify-between sticky top-0 z-10 bg-white/90 dark:bg-gray-900/80 rounded-t-xl">
          <span>Rooms</span>
          <span className="text-xs text-green-600 dark:text-green-400 font-normal">Online: {allUsers.filter(u => u.online).length}</span>
          {/* Close button for mobile */}
          <button className="md:hidden ml-2 text-gray-700 dark:text-gray-200" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {/* General Chat room - fixed at top */}
          <ul>
            <li className="px-4 py-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
              <div className="font-semibold text-gray-900 dark:text-white">General Chat</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate w-full max-w-full" style={{display:'block'}}>
                {lastMsg ? `${lastMsg.name}: ${lastMsg.message}` : 'No messages yet.'}
              </div>
            </li>
          </ul>
          {/* All users as rooms - scrollable */}
          <ul className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'none' }}>
            {(() => {
              let myName = '';
              const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
              if (token) {
                try {
                  const payload = JSON.parse(atob(token.split('.')[1]));
                  myName = payload.name || '';
                } catch {}
              }
              return allUsers.filter(user => user.name !== myName).map((user, idx) => (
                <li key={idx} className="px-4 py-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="font-semibold text-gray-900 dark:text-white flex-1 truncate max-w-[8rem]">{user.name}</div>
                  {user.online ? (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold dark:bg-green-900 dark:text-green-300">Online</span>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold dark:bg-gray-800 dark:text-gray-400">Offline</span>
                  )}
                </li>
              ));
            })()}
          </ul>
        </div>
        {/* No footer for sidebar, but you can add one here if needed */}
      </aside>
      {/* Right: Chat Preview */}
      <main className="flex-1 flex flex-col bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-lg m-4 border h-[96vh] min-w-0">
  <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 rounded-t-xl">
    {/* Sidebar toggle for mobile */}
    <button className="md:hidden mr-3 text-gray-700 dark:text-gray-200" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
          <div className="w-10 h-10 rounded-full bg-blue-300 dark:bg-gray-700" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">General Chat</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Online: {allUsers.filter(u => u.online).length}</div>
          </div>
        </header>
  <section ref={messagesBodyRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0 relative">
          {messages.map((msg, idx) => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            let myName = '';
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                myName = payload.name || '';
              } catch {}
            }
            const isMe = msg.name === myName;
            // Format timestamp
            let time = '';
            if (msg.createdAt) {
              const d = new Date(msg.createdAt);
              const h = d.getHours().toString().padStart(2, '0');
              const m = d.getMinutes().toString().padStart(2, '0');
              time = `${h}:${m}`;
            }
            return (
              <div
                key={idx}
                className={
                  (isMe
                    ? 'self-end bg-blue-500 text-white'
                    : 'self-start bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white') +
                  ' max-w-[80%] break-words rounded-lg px-4 py-2 relative'
                }
              >
                <span className="block text-xs font-semibold mb-1 truncate max-w-[8rem]">{msg.name}</span>
                {msg.message}
                <div className="flex items-center justify-end mt-1">
                  <span className="text-xs text-white/80 dark:text-gray-500">{time}</span>
                </div>
              </div>
            );
          })}
          {/* Pending message bubble */}
          {pendingMsg && (
            <div
              className={
                'self-end bg-blue-500 text-white max-w-[80%] break-words rounded-lg px-4 py-2 relative'
              }
            >
              <span className="block text-xs font-semibold mb-1 truncate max-w-[8rem]">{pendingMsg.name}</span>
              {pendingMsg.message}
              <div className="flex items-center justify-end mt-1 gap-2">
                <span className="text-xs text-white/80">
                  {(() => {
                    const d = new Date();
                    const h = d.getHours().toString().padStart(2, '0');
                    const m = d.getMinutes().toString().padStart(2, '0');
                    return `${h}:${m}`;
                  })()}
                </span>
                <span className="text-xs text-white/80">
                  {pendingMsg.status === 'sending' ? 'Sending...' : 'Failed to send.'}
                </span>
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
          {/* New message button */}
          {showNewMsgBtn && (
            <button
              className="fixed md:absolute bottom-24 right-8 md:bottom-8 md:right-8 z-30 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg font-semibold transition"
              onClick={() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                setShowNewMsgBtn(false);
              }}
            >
              New message
            </button>
          )}
        </section>
  <footer className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 sticky bottom-0 z-10 bg-white/80 dark:bg-gray-800/80 rounded-b-xl">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-900 dark:text-white"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            disabled={sending}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </footer>
      </main>
    </div>
  );
}

