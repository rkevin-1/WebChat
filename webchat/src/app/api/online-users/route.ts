import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB || 'webchat';

export async function GET() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    // Find all users with online true
    const users = await db.collection('users').find({ online: true }).project({ name: 1, email: 1, _id: 0 }).toArray();
    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await client.close();
  }
}
