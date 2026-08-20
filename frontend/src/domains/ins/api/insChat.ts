import { apiFetch, readJson } from '../../../shared/api/http';
import type { ApiResponse } from '../types/prediction';

export type InsChatRole = 'user' | 'model' | 'assistant';

export type InsChatHistoryItem = {
  role: InsChatRole;
  text: string;
};

export type InsChatToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type InsChatData = {
  reply: string;
  toolCalls?: InsChatToolCall[];
};

export class InsChatError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'InsChatError';
  }
}

export async function sendInsChat(payload: {
  message: string;
  history?: InsChatHistoryItem[];
}): Promise<InsChatData> {
  const res = await apiFetch(
    '/api/insurance/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        history: payload.history?.slice(-16),
      }),
    },
    undefined,
    { logoutOn401: false },
  );
  const json = await readJson<ApiResponse<InsChatData>>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new InsChatError(
      json.message ?? '챗봇 요청에 실패했습니다.',
      res.status,
    );
  }

  return {
    reply: json.data.reply ?? '',
    toolCalls: json.data.toolCalls ?? [],
  };
}
