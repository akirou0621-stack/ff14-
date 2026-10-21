import { NextRequest, NextResponse } from 'next/server';
import { extractLodestoneProfile, resolveCharacterInput } from '@/lib/lodestone';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const characterId = searchParams.get('characterId');

  if (!rawUrl && !characterId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Lodestone の URL またはキャラクターIDを入力してください。'
      },
      { status: 400 }
    );
  }

  try {
    const target = resolveCharacterInput(rawUrl, characterId);
    const profile = await extractLodestoneProfile(target);

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Lodestone の公開プロフィールを取得できませんでした。URL を確認し、公開設定とアクセス制限を確認してください。';

    return NextResponse.json(
      {
        success: false,
        message
      },
      { status: 400 }
    );
  }
}
