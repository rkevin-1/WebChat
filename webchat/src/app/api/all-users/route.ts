import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

export async function GET() {
  if (!uri || !dbName) return NextResponse.json({ error: 'Missing DB config' }, { status: 500 });
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = await db.collection('users').find({}, { projection: { name: 1, online: 1, _id: 0 } }).toArray();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
