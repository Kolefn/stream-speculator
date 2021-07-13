import { Expr } from 'faunadb';
import { useState, useEffect } from 'react';
import useDBClient from './useDBClient';

export default <T>(docRef?: Expr) : [T | null, Error | null] => {
  const [client, error] = useDBClient();
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (client && docRef) {
      const unsub = client.onChange(docRef, (latest) => {
        setData(latest.document.data as T);
      });
      return () => unsub();
    }
    return undefined;
  }, [client, docRef]);

  return [data, error];
};
