export async function probeTvChannel(channelId: string): Promise<{
  channelId: string;
  name: string;
  streamStatus: 'online' | 'offline';
  lastStreamError?: string;
}> {
  const response = await fetch(`/api/admin/tv/probe/${channelId}`, {
    method: 'POST',
    credentials: 'include',
  });

  const data = (await response.json()) as {
    error?: string;
    channelId?: string;
    name?: string;
    streamStatus?: 'online' | 'offline';
    lastStreamError?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? `Error ${response.status}`);
  }

  return {
    channelId: data.channelId ?? channelId,
    name: data.name ?? channelId,
    streamStatus: data.streamStatus ?? 'offline',
    lastStreamError: data.lastStreamError,
  };
}
