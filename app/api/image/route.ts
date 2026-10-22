import { NextRequest, NextResponse } from 'next/server';

// ロドストのキャラ画像を中継する。
// 他サイトの画像をそのままカードに使うと、PNG書き出し時にブラウザが安全のため書き出しを止めてしまうので、
// 一度このサーバーを通して「自分のサイトの画像」として渡す。
// 悪用されないよう、ロドストの画像サーバー以外は通さない。
const ALLOWED = /^https:\/\/([a-z0-9-]+\.)*finalfantasyxiv\.com\//i;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') ?? '';
  if (!ALLOWED.test(url)) {
    return NextResponse.json({ message: 'この画像は取得できません。' }, { status: 400 });
  }

  const res = await fetch(url, { next: { revalidate: 3600 } });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) {
    return NextResponse.json({ message: '画像を取得できませんでした。' }, { status: 502 });
  }

  return new NextResponse(await res.arrayBuffer(), {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=3600' }
  });
}
