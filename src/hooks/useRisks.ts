import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Risk, RiskCategory } from '@/types/risk';

export const useRisks = () => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase.from('risk_categories').select('*');
    if (error) setError(error.message);
    else setCategories(data || []);
  }, []);

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('risks')
      .select('*, category:risk_categories(*)');
    if (error) setError(error.message);
    else setRisks(data || []);
    setLoading(false);
  }, []);

  const addRisk = async (risk: Partial<Risk>) => {
    const { data, error } = await supabase.from('risks').insert([risk]).select();
    if (error) throw error;
    await fetchRisks();
    return data;
  };

  const updateRisk = async (id: string, updates: Partial<Risk>) => {
    const { error } = await supabase.from('risks').update(updates).eq('id', id);
    if (error) throw error;
    await fetchRisks();
  };

  const deleteRisk = async (id: string) => {
    const { error } = await supabase.from('risks').delete().eq('id', id);
    if (error) throw error;
    await fetchRisks();
  };

  useEffect(() => {
    fetchCategories();
    fetchRisks();
  }, [fetchCategories, fetchRisks]);

  return { risks, categories, loading, error, addRisk, updateRisk, deleteRisk, refetch: fetchRisks };
};
