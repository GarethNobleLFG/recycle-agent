import { useState } from 'react';
import { API_BASE_URL } from '../constants/api';

export const useClassify = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const classify = async (file) => {
    if (!file) {
      setError('No file provided');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/v1/classify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data.predictions);
    } 
    catch (err) {
      setError(err.message);
      console.error('Classification error:', err);
    } 
    finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    classify,
    isLoading,
    error,
    result, // Array of predictions: [{ label, prob, color }, ...]
    reset,
  };
};