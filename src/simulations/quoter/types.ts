import { OperationTypes } from '@ensofinance/shortcuts-builder/types';

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
