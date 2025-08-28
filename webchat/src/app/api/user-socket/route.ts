import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'webchat';

export async function POST(request: Request) {
  const { token, socketId } = await request.json();
  if (!token || !socketId) {
    return NextResponse.json({ error: 'Missing token or socketId' }, { status: 400 });
  }
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    const userId = typeof payload.userId === 'string' ? payload.userId : payload.userId?.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { socketId } }
    );
    await client.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    const userId = typeof payload.userId === 'string' ? payload.userId : payload.userId?.toString();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $unset: { socketId: '' } }
    );
    await client.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
