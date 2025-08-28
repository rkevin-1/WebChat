
"use client";
import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
// Helper to check if JWT is valid (not expired)
function isTokenValid(token: string) {
  try {
    const decoded: any = jwtDecode(token);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [checkingToken, setCheckingToken] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && isTokenValid(token)) {
      router.push('/');
    } else {
      setCheckingToken(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/\s/.test(email) || /\s/.test(password)) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Email and password cannot contain spaces' });
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        router.push('/');
      } else {
        setLoggingIn(false);
        Swal.fire({ icon: 'error', title: 'Oops...', text: data.error || 'Invalid credentials' });
      }
    } catch (err) {
      setLoggingIn(false);
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Server error' });
    }
  };

  if (checkingToken) {
    return null;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-300 to-blue-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <form onSubmit={handleLogin} className="max-w-sm w-full bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-lg">
        <div className="mb-5">
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your email</label>
          <input
            type="email"
            id="email"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
            placeholder="name@flowbite.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
            disabled={loggingIn}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your password</label>
          <input
            type="password"
            id="password"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light"
            required
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
            disabled={loggingIn}
          />
        </div>
        <div className="mt-4 text-center">
          <span className="text-gray-700 dark:text-gray-300">Don't have an account? </span>
          <Link href="/register" className="text-blue-700 hover:underline dark:text-blue-400">Register</Link>
        </div>
        <button type="submit" className="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" disabled={loggingIn}>
          {loggingIn ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

