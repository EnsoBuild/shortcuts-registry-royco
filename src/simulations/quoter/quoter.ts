import axios from 'axios';
import dotenv from 'dotenv';

import type { QuoteRequest, QuoteResponse } from './types';

dotenv.config();

const QUOTER_URL = process.env.QUOTER_URL as string;

export async function simulateTransactionOnQuoter(request: QuoteRequest): Promise<QuoteResponse[]> {
  const response = await axios.post(`${QUOTER_URL}/api/quote`, request, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (response.status !== 200) {
    throw 'Failed while trying to quote transactions';
  }
  return response.data;
}
