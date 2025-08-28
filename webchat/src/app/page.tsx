
  "use client";
  import { useEffect, useState, useRef } from 'react';
  import { getSocket } from '@/utils/socket-client';
  import { useRouter } from 'next/navigation';

  // Logout function: remove token, set user offline, update lastActive
  const handleLogout = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      localStorage.removeItem('token');
    }
    window.location.href = '/login';
  };

  // Idle detection: set user offline after 1 minute of inactivity
  function useIdleSetOffline() {
    useEffect(() => {
      let idleTimeout: NodeJS.Timeout | null = null;
      let lastToken: string | null = null;
      const setOffline = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token && token !== lastToken) lastToken = token;
        if (token) {
          await fetch('/api/set-offline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
        }
      };
      const resetTimer = () => {
        if (idleTimeout) clearTimeout(idleTimeout);
        idleTimeout = setTimeout(setOffline, 60000); // 1 minute
      };
      // Listen for user activity
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('touchstart', resetTimer);
      resetTimer();
      return () => {
        if (idleTimeout) clearTimeout(idleTimeout);
        window.removeEventListener('mousemove', resetTimer);
        window.removeEventListener('keydown', resetTimer);
        window.removeEventListener('scroll', resetTimer);
        window.removeEventListener('touchstart', resetTimer);
      };
    }, []);
  }

export default function Home() {
  useIdleSetOffline();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<{ name: string; online?: boolean }[]>([]);
  const [messages, setMessages] = useState<{ name: string; message: string; createdAt?: string }[]>([]);
  const [input, setInput] = useState('');
  // Remove sending lock for input/button, but keep for retry
  const [sending, setSending] = useState(false);
  // Track multiple pending messages with sendingAt
  type PendingMsg = { name: string; message: string; status: 'sending' | 'failed'; sendingAt: number };
  type DbMsg = { name: string; message: string; createdAt?: string; sendingAt: number };
  const [pendingMsgs, setPendingMsgs] = useState<PendingMsg[]>([]);
  // Store last failed message for retry (per message)
  const lastFailedMsgRef = useRef<{ name: string; message: string; sendingAt: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const [showNewMsgBtn, setShowNewMsgBtn] = useState(false);
  useEffect(() => {
  // eslint-disable-next-line prefer-const
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
    const interval = setInterval(validateAndPing, 30000); // every 30s
    return () => clearInterval(interval);
  }, [router]);

  // Use a ref to allow handleSend to call fetchMessages
  const fetchMessagesRef = useRef<() => Promise<void>>(async () => {});
  // Keep socket in a ref for use in handleSend
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  // Always keep socket connected after login
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
  // let mounted = true; // removed unused variable
    // Get my name and token from localStorage
    let myName = '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        myName = payload.name || '';
      } catch {}
    }
    // Save socket id to DB on connect
    const saveSocketId = async (id: string) => {
      if (token) {
        await fetch('/api/user-socket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, socketId: id })
        });
      }
    };
    // Remove socket id from DB on disconnect
    const removeSocketId = async () => {
      if (token) {
        await fetch('/api/user-socket', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
      }
    };
    socket = getSocket(saveSocketId, removeSocketId);
    socketRef.current = socket;
    // Only fetch if another user sent a message
    const handleRefresh = (senderName?: string) => {
      if (senderName && senderName !== myName) fetchMessagesRef.current();
    };
    socket.on('refresh-messages', handleRefresh);
    return () => {
      if (socket) {
        socket.off('refresh-messages', handleRefresh);
      }
    };
  }, []);

  // Fetch general chat messages initially and when needed
  useEffect(() => {
    let mounted = true;
    const fetchMessages = async () => {
      const res = await fetch('/api/generalchat');
      if (res.ok) {
        const data = await res.json();
        if (mounted) setMessages(data.messages || []);
      }
    };
    fetchMessagesRef.current = fetchMessages;
    fetchMessages();
    return () => {
      mounted = false;
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
    // Only scroll to bottom if not showing any pending message
    if (pendingMsgs.length === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    return () => body.removeEventListener('scroll', handle);
  }, [messages, pendingMsgs]);

  // Send or retry message
  const handleSend = async (retryMsg?: { name: string; message: string; sendingAt?: number }) => {
    if ((!input.trim() && !retryMsg) || (retryMsg && sending)) return;
    if (retryMsg) setSending(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    let name = 'Anonymous';
    let message = '';
    let sendingAt = Date.now();
    if (retryMsg) {
      name = retryMsg.name;
      message = retryMsg.message;
      sendingAt = retryMsg.sendingAt || Date.now();
    } else {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          name = payload.name || 'Anonymous';
        } catch {}
      }
      message = input;
    }
    // Add to pendingMsgs
    setPendingMsgs(prev => [...prev, { name, message, status: 'sending', sendingAt }]);
    if (!retryMsg) setInput('');
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
    try {
      const res = await fetch('/api/generalchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });
      if (!res.ok) throw new Error('Failed');
      // Remove this pendingMsg
      setPendingMsgs(prev => prev.filter(m => m.sendingAt !== sendingAt));
      lastFailedMsgRef.current = null;
      await fetchMessagesRef.current();
      if (socketRef.current) {
        socketRef.current.emit('new-message', name);
      }
    } catch {
      setPendingMsgs(prev => prev.map(m => m.sendingAt === sendingAt ? { ...m, status: 'failed' } : m));
      lastFailedMsgRef.current = { name, message, sendingAt };
    }
    if (retryMsg) setSending(false);
  };

  // Get last message for General Chat preview
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
  {/* Logout button inside sidebar bottom right */}
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
        {/* Logout button bottom right inside sidebar */}
        <div className="p-4 flex justify-end">
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg">Logout</button>
        </div>
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
          {/* Merge and sort messages and pendingMsgs by sendingAt/createdAt */}
          {(() => {
            // Get my name for alignment
            let myName = '';
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                myName = payload.name || '';
              } catch {}
            }
            // Map messages to have sendingAt = new Date(createdAt).getTime()
            const dbMsgs: DbMsg[] = messages.map(m => ({
              ...m,
              sendingAt: m.createdAt ? new Date(m.createdAt).getTime() : 0
            }));
            // pendingMsgs: status, sendingAt, name, message
            const allMsgs: (DbMsg | PendingMsg)[] = [...dbMsgs, ...pendingMsgs];
            allMsgs.sort((a, b) => a.sendingAt - b.sendingAt);
            return allMsgs.map((msg, idx) => {
              const isPending = 'status' in msg;
              const isMe = msg.name === myName;
              // Format timestamp
              let time = '';
              if (!isPending && msg.createdAt) {
                const d = new Date(msg.createdAt);
                const h = d.getHours().toString().padStart(2, '0');
                const m = d.getMinutes().toString().padStart(2, '0');
                time = `${h}:${m}`;
              } else if (isPending && msg.sendingAt) {
                const d = new Date(msg.sendingAt);
                const h = d.getHours().toString().padStart(2, '0');
                const m = d.getMinutes().toString().padStart(2, '0');
                time = `${h}:${m}`;
              }
              return (
                <div
                  key={isPending ? `pending-${msg.sendingAt}` : `db-${idx}-${msg.sendingAt}`}
                  className={
                    (isMe
                      ? 'self-end bg-blue-500 text-white'
                      : 'self-start bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white') +
                    ' max-w-[80%] break-words rounded-lg px-4 py-2 relative'
                  }
                >
                  <span className="block text-xs font-semibold mb-1 truncate max-w-[8rem]">{msg.name}</span>
                  {msg.message}
                  <div className="flex items-center justify-end mt-1 gap-2">
                    <span className="text-xs text-white/80 dark:text-gray-500">{time}</span>
                    {isPending && (
                      <span className="text-xs text-white/80">
                        {msg.status === 'sending' ? 'Sending...' : (
                          <>
                            Failed to send.
                            <button
                              className="ml-2 underline text-white/80 hover:text-white font-semibold text-xs"
                              onClick={() => handleSend({ name: msg.name, message: msg.message, sendingAt: msg.sendingAt })}
                              disabled={sending}
                            >
                              Retry
                            </button>
                          </>
                        )}
                      </span>
                    )}
                    {isPending && (
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            });
          })()}
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
      </main>
    </div>
  );
}

