export async function clientApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options); const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body.data as T;
}
