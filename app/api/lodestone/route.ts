import { NextRequest, NextResponse } from 'next/server';
import { fetchLodestoneProfile } from '@/lib/lodestone';

// ブラウザから直接ロドストは読めない（CORS）ので、ここ（サーバー）が代わりに読んで JSON で返す
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('url') ?? request.nextUrl.searchParams.get('id');
  if (!input) {
    return NextResponse.json(
      { success: false, message: 'ロドストのURLかキャラクターIDを入力してください。' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchLodestoneProfile(input);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ロドストからの取得に失敗しました。';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
