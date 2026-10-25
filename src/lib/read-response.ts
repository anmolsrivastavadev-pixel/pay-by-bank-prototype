// Reads our server's JSON reply. If the server crashed it may send back an
// empty or HTML page instead, so turn that into a readable error message.
export async function readResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? `Server error (${res.status}). Check the terminal running npm run dev.`);
  }
  if (data === null) throw new Error("The server sent an empty reply.");
  return data as T;
}
