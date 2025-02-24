import FatSecret from 'fatsecret.js';
import {config} from 'dotenv';

config();
const {FATSECRET_CONSUMER_KEY, FATSECRET_CONSUMER_SECRET} = process.env;

export const fatSecretClient = new FatSecret.Client({
  credentials: {
    clientId: FATSECRET_CONSUMER_KEY ?? '',
    clientSecret: FATSECRET_CONSUMER_SECRET ?? '',
    scope: ['basic'],
  },
});

// Example type for the response shape (adapt to your actual FatSecret library response)
export interface FatSecretSearchResponse {
  foods: {
    id: string;
    name: string;
    brandName?: string;
    type?: string;
  }[];
}
