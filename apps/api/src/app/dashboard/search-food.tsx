'use client';

import type React from 'react';

import {useState} from 'react';
import {Input} from '~/components/ui/input';
import {Button} from '~/components/ui/button';
import {Search} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {FoodDetails} from './food-details';
import type {Food} from '@suna/db/schema';

export function SearchFood() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  console.log('selectedFood', selectedFood);

  async function searchFood(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.foods);
  }

  return (
    <div className='space-y-4'>
      <form onSubmit={searchFood} className='flex gap-2'>
        <Input
          placeholder='Search for food...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type='submit'>
          <Search className='w-4 h-4 mr-2' />
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className='grid gap-2'>
          {results.map((food) => (
            <Dialog key={food.food_id}>
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  className='w-full justify-start'
                  onClick={() => setSelectedFood(food)}
                >
                  <div className='flex flex-col items-start'>
                    <span>{food.food_name}</span>
                    {food.brand_name && (
                      <span className='text-sm text-muted-foreground'>
                        {food.brand_name}
                      </span>
                    )}
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{food.food_name}</DialogTitle>
                </DialogHeader>
                {selectedFood && <FoodDetails food={selectedFood} />}
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
