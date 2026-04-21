import { useState } from 'react';
import { API_BASE_URL } from '../constants/api';

export const useZipcodeRules = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rules, setRules] = useState(null);

  const fetchRules = async (zipCode, material) => {
    setIsLoading(true);
    setError(null);
    setRules(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/zipcode-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_code: zipCode, material })
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.status}`);
      }
      const data = await response.json();
      setRules(data.rules);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchRules, isLoading, error, rules };
};
