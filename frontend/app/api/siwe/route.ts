import { NextRequest, NextResponse } from 'next/server';
import { generateNonce, SiweMessage } from 'siwe';
import { getIronSession } from 'iron-session';
import { sessionOptions, defaultSession, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (action === 'nonce') {
    session.nonce = generateNonce();
    await session.save();
    return NextResponse.json({ nonce: session.nonce });
  }

  if (action === 'me') {
    return NextResponse.json({
      address: session.address,
      isLoggedIn: session.isLoggedIn,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (action === 'verify') {
    try {
      const { message, signature } = await req.json();
      const siweMessage = new SiweMessage(message);
      
      const { data: fields } = await siweMessage.verify({
        signature,
        nonce: session.nonce,
      });

      if (fields.nonce !== session.nonce) {
        return NextResponse.json({ ok: false, message: 'Invalid nonce.' }, { status: 422 });
      }

      session.address = fields.address;
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({ ok: true });
    } catch (error: any) {
      console.error(error);
      return NextResponse.json({ ok: false, message: error.message || 'SIWE verification failed' }, { status: 400 });
    }
  }

  if (action === 'logout') {
    session.destroy();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
