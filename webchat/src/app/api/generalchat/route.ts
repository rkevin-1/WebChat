import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
// import { emitNewMessage } from '@/utils/socket-emit';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

export async function GET() {
  if (!uri || !dbName) return NextResponse.json({ error: 'Missing DB config' }, { status: 500 });
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const messages = await db.collection('generalchat').find({}).sort({ createdAt: 1 }).toArray();
    return NextResponse.json({ messages });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(req: Request) {
  if (!uri || !dbName) return NextResponse.json({ error: 'Missing DB config' }, { status: 500 });
  const client = new MongoClient(uri);
  try {
    const { name, message } = await req.json();
    if (!name || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await client.connect();
    const db = client.db(dbName);
    const doc = { name, message, createdAt: new Date() };
  await db.collection('generalchat').insertOne(doc);
  return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
