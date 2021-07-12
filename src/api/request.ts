export default async <T>(method: string, path: string, body?: any) : Promise<T> => {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 200) {
    return (await res.json()) as T;
  }
  throw new Error(`${method} ${path} ${res.status} ${res.statusText}`);
};
