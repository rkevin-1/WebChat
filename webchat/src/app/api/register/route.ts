import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'webchat';

export async function POST(request: Request) {
  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  // Validate password
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (!/[A-Z]/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
  }
  if (!/\d/.test(password)) {
    return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
  }
  if (/([\w\W])\1\1/.test(password)) {
    return NextResponse.json({ error: 'Password cannot contain the same character three times in a row' }, { status: 400 });
  }
  if (/\s/.test(password)) {
    return NextResponse.json({ error: 'Password cannot contain spaces' }, { status: 400 });
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const existingEmail = await db.collection('users').findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    const existingName = await db.collection('users').findOne({ name });
    if (existingName) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 409 });
    }
    await db.collection('users').insertOne({ name, email, password });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
