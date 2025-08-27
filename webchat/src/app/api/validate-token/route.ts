import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { jwtVerify } from 'jose';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'webchat';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(request: Request) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    const userId = typeof payload.userId === 'string' ? payload.userId : payload.userId?.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    // Set online true and update lastActive to now
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { online: true, lastActive: new Date() } }
    );
    await client.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
