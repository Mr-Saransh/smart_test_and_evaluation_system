import { useState, useEffect } from 'react';
import { GET } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * Fetches and caches the institute for the logged-in admin/teacher.
 * Returns { institute, loading, error, reload, setInstitute }
 */
export function useInstitute() {
  const { user } = useAuth();
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!user || (user.role !== 'institute_admin' && user.role !== 'teacher')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const inst = await GET('/institutes/mine');
      setInstitute(inst);
    } catch (err) {
      setError(err.message);
      setInstitute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  return { institute, loading, error, reload: load, setInstitute };
}
