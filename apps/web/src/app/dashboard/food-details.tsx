'use client';

import {useState} from 'react';
import {Button} from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {toast} from 'sonner';
import type {Food} from '@suna/db/schema';
import {Loader2} from 'lucide-react';
import {useServings, useLogFood} from '~/hooks/use-food';

// Helper function to extract numeric value from string with units
function extractNumber(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function FoodDetails({food}: {food: Food}) {
  const [quantity, setQuantity] = useState('1');
  const {data: servings, isLoading: loadingServings} = useServings(
    food.food_id
  );
  const {mutate: logFood, isPending: isLogging} = useLogFood();

  // Select first serving by default when servings load
  const [selectedServingId, setSelectedServingId] = useState<string>();
  const selectedServing = servings?.find(
    (s) => s.serving_id.toString() === selectedServingId
  );

  // Update selected serving when servings load
  if (servings?.length && !selectedServingId) {
    setSelectedServingId(servings[0].serving_id.toString());
  }

  async function handleLogFood() {
    if (!selectedServing) return;

    logFood(
      {
        foodId: food.food_id,
        servingId: selectedServing.serving_id,
        quantity: Number(quantity),
      },
      {
        onSuccess: () => {
          toast.success(
            `Added ${quantity} ${selectedServing.serving_description} of ${food.food_name}`
          );
          window.location.reload();
        },
        onError: () => {
          toast.error('Failed to log food. Please try again.');
        },
      }
    );
  }

  if (loadingServings) {
    return (
      <div className='flex justify-center p-4'>
        <Loader2 className='h-6 w-6 animate-spin' />
      </div>
    );
  }

  if (!servings?.length) {
    return (
      <div className='p-4 text-center text-muted-foreground'>
        No serving information available
      </div>
    );
  }

  const multiplier = Number(quantity) || 0;
  const calories = selectedServing
    ? Math.round(extractNumber(selectedServing.calories) * multiplier)
    : 0;
  const protein = selectedServing
    ? Math.round(extractNumber(selectedServing.protein) * multiplier * 10) / 10
    : 0;
  const carbs = selectedServing
    ? Math.round(
        extractNumber(selectedServing.carbohydrate) * multiplier * 10
      ) / 10
    : 0;
  const fat = selectedServing
    ? Math.round(extractNumber(selectedServing.fat) * multiplier * 10) / 10
    : 0;
  const fiber = selectedServing
    ? Math.round(extractNumber(selectedServing.fiber) * multiplier * 10) / 10
    : 0;
  const sugar = selectedServing
    ? Math.round(extractNumber(selectedServing.sugar) * multiplier * 10) / 10
    : 0;

  return (
    <div className='space-y-6'>
      {/* Nutrition Facts */}
      <Card>
        <CardHeader>
          <CardTitle>Nutrition Facts</CardTitle>
          <CardDescription>
            {selectedServing?.serving_description}
            {multiplier !== 1 && ` × ${quantity}`}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Calories</Label>
              <div className='text-2xl font-bold'>{calories} kcal</div>
            </div>
            <div>
              <Label>Protein</Label>
              <div className='text-2xl font-bold'>{protein}g</div>
            </div>
            <div>
              <Label>Carbohydrates</Label>
              <div className='text-2xl font-bold'>{carbs}g</div>
            </div>
            <div>
              <Label>Fat</Label>
              <div className='text-2xl font-bold'>{fat}g</div>
            </div>
            <div>
              <Label>Fiber</Label>
              <div className='text-2xl font-bold'>{fiber}g</div>
            </div>
            <div>
              <Label>Sugar</Label>
              <div className='text-2xl font-bold'>{sugar}g</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serving Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Log Food</CardTitle>
          <CardDescription>Select serving size and quantity</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4'>
          <div className='grid gap-2'>
            <Label htmlFor='serving'>Serving Size</Label>
            <Select
              value={selectedServingId}
              onValueChange={setSelectedServingId}
            >
              <SelectTrigger id='serving'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {servings.map((serving) => (
                  <SelectItem
                    key={serving.serving_id}
                    value={serving.serving_id.toString()}
                  >
                    {serving.serving_description} (
                    {extractNumber(serving.calories)} kcal)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='quantity'>Quantity</Label>
            <Input
              id='quantity'
              type='number'
              min='0.1'
              step='0.1'
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className='w-full'
            onClick={handleLogFood}
            disabled={isLogging || !selectedServing}
          >
            {isLogging && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Log Food
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
