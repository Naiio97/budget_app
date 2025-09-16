export type Institution = {
  id: string;
  name: string;
  country: string;
  logo?: string;
  website?: string;
};

export type ExternalAccount = {
  id: string;
  name: string;
  iban?: string;
  currency?: string;
};

export type ExternalTransaction = {
  id: string;
  ts: string;
  amount: number;
  currency?: string;
  description?: string;
  balanceAfter?: number;
};

export interface BankAdapter {
  getInstitutions(): Promise<Institution[]>;
  startConnection(
    institutionId: string,
    redirectUrl: string
  ): Promise<{ redirect: string; requisitionId: string }>;
  finalizeConnection(
    requisitionId: string
  ): Promise<{ status: string }>;
  listAccounts(
    requisitionId: string
  ): Promise<ExternalAccount[]>;
  fetchTransactions(
    accountId: string,
    since?: string
  ): Promise<ExternalTransaction[]>;
}

export class GoCardlessAdapter implements BankAdapter {
  private secretId: string;
  private secretKey: string;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(opts?: { secretId?: string; secretKey?: string; sandbox?: boolean }) {
    this.secretId = opts?.secretId || process.env.GC_SECRET_ID || "";
    this.secretKey = opts?.secretKey || process.env.GC_SECRET_KEY || "";
    
    // Default to production unless explicitly set to sandbox
    const useSandbox = opts?.sandbox ?? (process.env.GC_SANDBOX === "true");
    
    // GoCardless uses the same base URL for both sandbox and production
    // The difference is in the credentials (secret_id and secret_key)
    this.baseUrl = "https://bankaccountdata.gocardless.com/api/v2";
    
    if (useSandbox) {
      console.log("🧪 Using GoCardless SANDBOX environment");
    } else {
      console.log("🏦 Using GoCardless PRODUCTION environment");
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;
    const response = await fetch(this.baseUrl + "/token/new/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret_id: this.secretId,
        secret_key: this.secretKey,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Failed to get access token: " + response.status + " - " + errorText);
    }
    const data = await response.json();
    this.accessToken = data.access;
    return this.accessToken!;
  }

  async getInstitutions(): Promise<Institution[]> {
    const token = await this.getAccessToken();
    const response = await fetch(
      this.baseUrl + "/institutions/?country=CZ",
      {
        headers: { Authorization: "Bearer " + token },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Failed to fetch institutions: " + response.status + " - " + errorText);
    }
    const data = await response.json();
    return data.map((inst: any) => ({
      id: inst.id,
      name: inst.name,
      country: inst.country,
      logo: inst.logo,
      website: inst.website,
    }));
  }

  async startConnection(
    institutionId: string,
    redirectUrl: string
  ): Promise<{ redirect: string; requisitionId: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(this.baseUrl + "/requisitions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        redirect: redirectUrl,
        institution_id: institutionId,
        user_language: "EN",
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Failed to create requisition: " + response.status + " - " + errorText);
    }
    const data = await response.json();
    return {
      redirect: data.link,
      requisitionId: data.id,
    };
  }

  async finalizeConnection(
    requisitionId: string
  ): Promise<{ status: string }> {
    const token = await this.getAccessToken();
    const response = await fetch(this.baseUrl + "/requisitions/" + requisitionId + "/", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("Failed to fetch requisition: " + response.status + " - " + errorText);
    }
    const data = await response.json();
    return { status: data.status || "LINKED" };
  }

  async listAccounts(requisitionId: string): Promise<ExternalAccount[]> {
    const token = await this.getAccessToken();

    // Fetch requisition to get linked account IDs
    const reqRes = await fetch(this.baseUrl + "/requisitions/" + requisitionId + "/", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!reqRes.ok) {
      const errorText = await reqRes.text();
      throw new Error("Failed to fetch requisition accounts: " + reqRes.status + " - " + errorText);
    }
    const reqData = await reqRes.json();
    const accountIds: string[] = reqData.accounts || [];

    const results: ExternalAccount[] = [];
    for (const accountId of accountIds) {
      try {
        // Fetch account details to get IBAN/currency/name
        const detailsRes = await fetch(this.baseUrl + "/accounts/" + accountId + "/details/", {
          headers: { Authorization: "Bearer " + token },
        });
        
        if (detailsRes.ok) {
          const details = await detailsRes.json();
          const account = details.account || {};
          const name: string = (account.name && Array.isArray(account.name) ? account.name[0] : account.name) || account.iban || account.resourceId || accountId;
          const currency: string | undefined = account.currency;
          const iban: string | undefined = account.iban;

          results.push({
            id: accountId,
            name,
            iban,
            currency,
          });
        } else {
          // If details fetch fails (e.g. rate limit), create basic account
          console.warn(`Failed to fetch details for account ${accountId}: ${detailsRes.status}`);
          results.push({
            id: accountId,
            name: `Account ${accountId.slice(-8)}`, // Use last 8 chars as fallback name
            iban: undefined,
            currency: "CZK", // Default to CZK for Czech banks
          });
        }
      } catch (e) {
        // If any error occurs, still create basic account
        console.warn(`Error fetching account ${accountId}:`, e);
        results.push({
          id: accountId,
          name: `Account ${accountId.slice(-8)}`,
          iban: undefined,
          currency: "CZK",
        });
      }
    }

    return results;
  }

  async fetchTransactions(
    accountId: string,
    since?: string
  ): Promise<ExternalTransaction[]> {
    const token = await this.getAccessToken();

    const params: string[] = [];
    if (since) {
      // Expect since as ISO string; API expects YYYY-MM-DD
      const dateFrom = since.slice(0, 10);
      params.push("date_from=" + encodeURIComponent(dateFrom));
    }
    const qs = params.length ? "?" + params.join("&") : "";

    const txRes = await fetch(this.baseUrl + "/accounts/" + accountId + "/transactions/" + qs, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!txRes.ok) {
      const errorText = await txRes.text();
      
      // Handle rate limits gracefully - return empty transactions instead of throwing
      if (txRes.status === 429) {
        console.warn(`Rate limit reached for transactions on account ${accountId}`);
        return []; // Return empty array instead of throwing
      }
      
      throw new Error("Failed to fetch transactions: " + txRes.status + " - " + errorText);
    }
    const txData = await txRes.json();

    const mapTx = (t: any): ExternalTransaction => {
      const amountStr = t.transactionAmount?.amount ?? t.amount?.amount ?? t.amount;
      const currency = t.transactionAmount?.currency ?? t.amount?.currency;
      const id = t.transactionId || t.internalTransactionId || t.entryReference || t.endToEndId || t.paymentInformationId || t.debtorAccount?.iban || t.creditorAccount?.iban || Math.random().toString(36).slice(2);
      const ts = t.bookingDateTime || t.valueDateTime || t.bookingDate || t.valueDate || new Date().toISOString();
      const description = t.remittanceInformationUnstructured || t.remittanceInformationStructured || t.remittanceInformation || t.additionalInformation || t.debtorName || t.creditorName || "";
      const amount = typeof amountStr === "string" ? parseFloat(amountStr) : Number(amountStr);
      return {
        id,
        ts,
        amount: isNaN(amount) ? 0 : amount,
        currency,
        description,
      };
    };

    const booked: any[] = txData.transactions?.booked || txData.booked || [];
    const pending: any[] = txData.transactions?.pending || txData.pending || [];

    return [...booked.map(mapTx), ...pending.map(mapTx)];
  }
}
