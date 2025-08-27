"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/\s/.test(name) || /\s/.test(email) || /\s/.test(password) || /\s/.test(repeatPassword)) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Name, email, and password cannot contain spaces' });
      return;
    }
    if (password !== repeatPassword) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Passwords do not match' });
      return;
    }
    if (password.length < 6) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Password must be at least 6 characters' });
      return;
    }
    if (!/[A-Z]/.test(password)) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Password must contain at least one uppercase letter' });
      return;
    }
    if (!/\d/.test(password)) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Password must contain at least one number' });
      return;
    }
    if (/([\w\W])\1\1/.test(password)) {
      Swal.fire({ icon: 'error', title: 'Oops...', text: 'Password cannot contain the same character three times in a row' });
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({ icon: 'success', title: 'Registration successful!', text: 'Please login.' });
        router.push('/login');
      } else {
        if (data.error === 'Name already taken') {
          Swal.fire({ icon: 'error', title: 'Oops...', text: 'Name already taken' });
        } else {
          Swal.fire({ icon: 'error', title: 'Oops...', text: data.error || 'Registration failed' });
        }
      }
    } catch (err) {
  Swal.fire({ icon: 'error', title: 'Oops...', text: 'Server error' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-green-300 to-green-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      <form onSubmit={handleRegister} className="max-w-sm w-full bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-lg">
        <div className="mb-5">
          <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name</label>
          <input
            type="text"
            id="name"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-500 dark:focus:border-green-500 dark:shadow-xs-light"
            placeholder="Your name"
            required
            value={name}
            onChange={e => setName(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email</label>
          <input
            type="email"
            id="email"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-500 dark:focus:border-green-500 dark:shadow-xs-light"
            placeholder="name@flowbite.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
          <input
            type="password"
            id="password"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-500 dark:focus:border-green-500 dark:shadow-xs-light"
            required
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
          />
        </div>
        <div className="mb-5">
          <label htmlFor="repeat-password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Repeat password</label>
          <input
            type="password"
            id="repeat-password"
            className="shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-green-500 dark:focus:border-green-500 dark:shadow-xs-light"
            required
            value={repeatPassword}
            onChange={e => setRepeatPassword(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ') e.preventDefault(); }}
          />
        </div>
        <div className="mt-4 text-center">
          <span className="text-gray-700 dark:text-gray-300">Already have an account? </span>
          <Link href="/login" className="text-blue-700 hover:underline dark:text-blue-400">Login</Link>
        </div>
        <button type="submit" className="w-full text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800">Register</button>
      </form>
    </div>
  );
}
