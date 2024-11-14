import React, { useState } from 'react';
import { searchService } from '../../services/searchService';
import { Search } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';

export default function SearchOptimizer() {
  const [indexing, setIndexing] = useState(false);  
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const reindexAll = async () => {
    setIndexing(true);
    setError('');
    setSuccess('');
    setProgress(0);
    
    try {
      const restaurants = await restaurantService.getAllRestaurants();
      const total = restaurants.length;
      
      if (total === 0) {
        throw new Error('No restaurants found to index');
      }
      
      for (let i = 0; i < restaurants.length; i++) {
        try {
          await searchService.indexRestaurant(restaurants[i].id, restaurants[i]);
          setProgress(((i + 1) / total) * 100);
        } catch (err) {
          console.error(`Failed to index restaurant ${restaurants[i].id}:`, err);
          // Continue with next restaurant instead of stopping completely
        }
      }
      
      setSuccess(`Successfully indexed ${total} restaurants`);
    } catch (err) {
      console.error('Error during indexing:', err);
      setError(err instanceof Error ? err.message : 'Failed to index restaurants');
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Search Index</h3>
        <button
          onClick={reindexAll}
          disabled={indexing}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {indexing ? 'Indexing...' : 'Reindex All'}
          </div>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-500 p-4 rounded-lg">
          {success}
        </div>
      )}

      {indexing && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-black h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-500 text-center">
            {Math.round(progress)}% complete
          </div>
        </div>
      )}
    </div>
  );
}