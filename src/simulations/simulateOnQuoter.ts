import { OperationTypes } from '@ensofinance/shortcuts-builder/types';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const QUOTER_URL = process.env.QUOTER_URL as string;

export type APITransaction = {
  data: string;
  value: string;
  to: string;
  from: string;
  operationType?: OperationTypes;
  spender?: string;
  receiver?: string;
  executor?: string;
};

export interface QuoteRequest {
  chainId: number;
  transactions: APITransaction[];
  tokenIn: string[];
  tokenOut: string[];
  amountIn: string[];
}

export interface QuoteResult {
  amountOut: string[];
  gas: string;
}

export type QuoteErrorResponse = {
  status: 'Error';
  error: string;
};

export type QuoteSuccessResponse<T> = {
  status: 'Success';
} & T;

export type QuoteResponse<T = QuoteResult> = QuoteSuccessResponse<T> | QuoteErrorResponse;

export async function simulateTransactionOnQuoter(request: QuoteRequest): Promise<QuoteResponse[]> {
  console.warn(JSON.stringify(request, null, 2));

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
