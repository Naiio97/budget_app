export type TxRow = {
  id: string;
  ts: string;
  rawDescription: string;
  category: string;
  categoryId?: string | null;
  amountCZK: number;
  accountName?: string;
  accountProvider?: string;
  accountDisplayName?: string;
};
