import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from '../api/client';

// Loads data from an API call, reloads whenever the screen regains focus,
// and exposes pull-to-refresh state. `select` picks the payload out of the
// axios response (defaults to res.data.data ?? res.data).
export const useApi = (fetcher, deps = [], { select, focus = true } = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const selectRef = useRef(select);
  selectRef.current = select;

  const load = useCallback(async (mode = 'load') => {
    const id = ++requestId.current;
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await fetcherRef.current();
      if (id !== requestId.current) return;
      const payload = selectRef.current ? selectRef.current(res) : res?.data?.data ?? res?.data;
      setData(payload);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(errorMessage(err));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const firstFocus = useRef(true);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (focus) load('silent');
    }, [load, focus]),
  );

  return {
    data,
    setData,
    error,
    loading: loading && data === null,
    refreshing,
    reload: () => load('silent'),
    refresh: () => load('refresh'),
  };
};
