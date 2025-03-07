export enum TenderlySimulationType {
  ABI = 'abi',
  FULL = 'full',
  QUICK = 'quick',
}

export enum TxToSimulationDataType {
  CALL_BALANCE_PRE = 'call_balance_pre',
  CALL_BALANCE_POST = 'call_balance_post',
  TX_FUNDING = 'tx_funding',
  TX_SHORTCUT = 'tx_shortcut',
  REPORT = 'report',
}

export const BALANCE_SIMS_POSITION_TOKENS_IN = 0;
export const BALANCE_SIMS_POSITION_TOKENS_OUT = 1;
export const BALANCE_SIMS_POSITION_TOKENS_DUST = 2;
export const BALANCE_SIMS_OFFSET = 3; // 3 tokens: tokensIn, tokensOut, tokensDust. This order is constant
export const DEFAULT_AMOUNT_FAILED_SIMULATION = '0';
