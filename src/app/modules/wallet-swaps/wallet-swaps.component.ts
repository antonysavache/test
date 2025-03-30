// wallet-swaps.component.ts
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Connection, PublicKey } from '@solana/web3.js';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

// Определяем интерфейс, соответствующий реальной структуре TokenAmount из Solana Web3.js
interface TokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString?: string;
}

// Интерфейс для токен-баланса
interface WalletTokenBalance {
  mint: string;
  owner: string;
  uiTokenAmount: TokenAmount;
}

// Структура изменения токена
interface TokenChange {
  mint: string;
  symbol: string;
  name: string;
  change: number;
  preAmount: number;
  postAmount: number;
  logoURI?: string;
}

interface SwapTransaction {
  signature: string;
  blockTime: number;
  timestamp: Date;
  tokenChanges: TokenChange[];
  type: 'swap' | 'unknown';
}

// Helius Enhanced API интерфейсы
interface EnrichedTransaction {
  description: string;
  type: string;
  source: string;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  nativeTransfers: any[];
  tokenTransfers: TokenTransfer[];
  accountData: any[];
  events: any;
  transaction?: any;
  meta?: any;
}

interface TokenTransfer {
  fromTokenAccount: string;
  toTokenAccount: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

@Component({
  selector: 'app-wallet-swaps',
  templateUrl: './wallet-swaps.component.html',
  // Используем встроенные стили вместо внешнего файла
  styles: [`
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 20px;
    }

    .wallet-form {
      margin-bottom: 20px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 16px;
    }

    .invalid-feedback {
      color: #dc3545;
      margin-top: 5px;
      font-size: 14px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background-color: #0069d9;
    }

    .btn-primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
    }

    .spinner-border {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 0.2em solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spinner-border .75s linear infinite;
      margin-right: 10px;
    }

    @keyframes spinner-border {
      to { transform: rotate(360deg); }
    }

    .swaps-container h3 {
      margin-bottom: 20px;
    }

    .card {
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      background-color: #f8f9fa;
      padding: 15px;
      border-bottom: 1px solid #eee;
    }

    .badge {
      padding: 5px 10px;
      border-radius: 4px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .badge-primary {
      background-color: #007bff;
      color: white;
    }

    .card-body {
      padding: 20px;
    }

    .card-title {
      margin-bottom: 15px;
      font-size: 18px;
    }

    .token-change {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }

    .token-change:last-child {
      border-bottom: none;
    }

    .token-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      margin-right: 15px;
    }

    .token-logo-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #495057;
      font-weight: bold;
      margin-right: 15px;
    }

    .text-success {
      color: #28a745;
    }

    .text-danger {
      color: #dc3545;
    }

    .token-amount-change {
      margin-top: 5px;
      margin-left: 47px;
    }

    .token-mint {
      font-size: 12px;
      color: #6c757d;
      word-break: break-all;
      max-width: 200px;
      display: inline-block;
    }

    .token-mint:hover {
      text-decoration: underline;
    }

    .alert {
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .alert-danger {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .alert-info {
      background-color: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .mr-2 {
      margin-right: 8px;
    }

    .ml-auto {
      margin-left: auto;
    }

    .d-flex {
      display: flex;
    }

    .justify-content-between {
      justify-content: space-between;
    }

    .align-items-center {
      align-items: center;
    }

    .text-muted {
      color: #6c757d;
    }

    .mt-3 {
      margin-top: 1rem;
    }

    .mb-3 {
      margin-bottom: 1rem;
    }

    .mb-0 {
      margin-bottom: 0;
    }

    .text-center {
      text-align: center;
    }
  `],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class WalletSwapsComponent implements OnInit {
  walletForm = new FormGroup({
    address: new FormControl('', [Validators.required])
  });

  loading = false;
  loadingMore = false;
  error: string | null = null;
  swapTransactions: SwapTransaction[] = [];
  tokenMetadata: { [key: string]: any } = {};
  hasMoreTransactions = false;
  lastSignature: string | null = null;

  // API ключ Helius
  private apiKey = '06e50104-3d11-4ace-9a62-ef5d938f38e4';
  private heliusBaseUrl = 'https://api.helius.xyz/v0';

  // Создание соединения с Solana
  private connection = new Connection(`https://rpc.helius.xyz/?api-key=${this.apiKey}`);

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Загрузка метаданных токенов при инициализации
    this.loadTokenMetadata();
  }

  /**
   * Загружает метаданные токенов из SPL Token Registry
   */
  private async loadTokenMetadata(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<any>('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json')
      );

      // Создаем объект для быстрого поиска по mint адресу
      if (response && response.tokens) {
        response.tokens.forEach((token: any) => {
          this.tokenMetadata[token.address] = {
            symbol: token.symbol,
            name: token.name,
            logoURI: token.logoURI,
            decimals: token.decimals
          };
        });
      }
    } catch (error) {
      console.error('Error loading token metadata:', error);
    }
  }

  /**
   * Обработчик события отправки формы
   */
  async onSubmit(): Promise<void> {
    if (this.walletForm.invalid) return;

    this.loading = true;
    this.error = null;
    this.swapTransactions = [];
    this.lastSignature = null;
    this.hasMoreTransactions = false;

    const address = this.walletForm.get('address')?.value;

    try {
      // Используем Jupiter API для получения свопов
      await this.getWalletSwapsViaJupiter(address!);

      // Если транзакций не нашлось, выводим сообщение
      if (this.swapTransactions.length === 0 && !this.error) {
        this.error = 'Свопы не найдены для этого адреса. Возможно, этот кошелек не совершал обменов через Jupiter.';
      }
    } catch (error: any) {
      this.error = `Ошибка загрузки свопов: ${error.message}`;
      console.error('Error fetching swaps:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Загружает дополнительные транзакции
   */
  async loadMoreTransactions(): Promise<void> {
    if (!this.walletForm.valid || this.loadingMore || !this.lastSignature) return;

    this.loadingMore = true;

    try {
      const address = this.walletForm.get('address')?.value;
      await this.getWalletTransactions(address!, this.lastSignature);
    } catch (error: any) {
      this.error = `Ошибка загрузки дополнительных транзакций: ${error.message}`;
      console.error('Error fetching more swaps:', error);
    } finally {
      this.loadingMore = false;
    }
  }

  /**
   * Получает данные о транзакциях используя Helius API (не Enhanced API)
   */
  private async getWalletTransactions(walletAddress: string, beforeSignature?: string): Promise<void> {
    try {
      // Проверка валидности адреса
      const pubkey = new PublicKey(walletAddress);

      // Прямой запрос транзакций через стандартный API Helius
      let apiUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${this.apiKey}`;

      // Добавляем параметры для запроса
      const params = new URLSearchParams();
      params.append('limit', '100'); // Увеличенный лимит для лучшего охвата

      if (beforeSignature) {
        params.append('before', beforeSignature);
      }

      apiUrl += `&${params.toString()}`;
      console.log('Requesting transactions from:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data length:', data.length);

      if (!Array.isArray(data)) {
        console.error('Unexpected response format, expected array but got:', typeof data);
        this.error = 'Неожиданный формат ответа от API';
        return;
      }

      if (data.length === 0) {
        if (!beforeSignature) {
          this.error = 'Транзакции не найдены для этого адреса';
        }
        this.hasMoreTransactions = false;
        return;
      }

      // Фильтруем только транзакции свопов с использованием нового метода определения
      const swapTransactions = data.filter(tx => this.isSwapTransaction(tx, walletAddress));

      console.log(`Найдено ${swapTransactions.length} свопов из ${data.length} транзакций`);

      if (swapTransactions.length > 0) {
        const newTransactions = await this.processRawTransactions(swapTransactions, walletAddress);

        // Добавляем новые транзакции к существующим
        this.swapTransactions = [...this.swapTransactions, ...newTransactions];

        // Сохраняем последнюю сигнатуру для пагинации
        this.lastSignature = data[data.length - 1].signature;

        // Определяем, есть ли еще транзакции для загрузки
        this.hasMoreTransactions = data.length === 50;
      } else {
        if (!beforeSignature) {
          this.error = 'Транзакции свопов не найдены для этого адреса';
        }
        this.hasMoreTransactions = data.length === 50;
      }

    } catch (error: any) {
      console.error('Error processing transactions:', error);
      this.error = `Ошибка обработки транзакций: ${error.message}`;
      throw error;
    }
  }


  /**
   * Обрабатывает сырые данные транзакций
   */
  private async processRawTransactions(transactions: any[], walletAddress: string): Promise<SwapTransaction[]> {
    const result: SwapTransaction[] = [];

    for (const tx of transactions) {
      try {
        const signature = tx.transaction?.signatures?.[0] || tx.signature;
        console.log('Processing transaction:', signature);

        const timestamp = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();

        // Анализируем токен-трансферы
        const tokenChanges: TokenChange[] = [];

        if (tx.meta && tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
          const preBalances = tx.meta.preTokenBalances.filter((b: any) => b.owner === walletAddress);
          const postBalances = tx.meta.postTokenBalances.filter((b: any) => b.owner === walletAddress);

          // Создаем карту пре-балансов
          const preBalanceMap: {[key: string]: any} = {};
          preBalances.forEach((balance: any) => {
            preBalanceMap[balance.mint] = balance;
          });

          // Создаем карту пост-балансов
          const postBalanceMap: {[key: string]: any} = {};
          postBalances.forEach((balance: any) => {
            postBalanceMap[balance.mint] = balance;
          });

          // Собираем все уникальные токены
          const allMints = new Set([
            ...preBalances.map((b: any) => b.mint),
            ...postBalances.map((b: any) => b.mint)
          ]);

          // Для каждого токена вычисляем изменение
          for (const mint of allMints) {
            const preBalance = preBalanceMap[mint];
            const postBalance = postBalanceMap[mint];

            // Получаем информацию о токене
            const tokenInfo = this.tokenMetadata[mint] || {
              symbol: 'UNKNOWN',
              name: `Unknown (${mint.slice(0, 4)}...${mint.slice(-4)})`,
              decimals: 0
            };

            // Вычисляем значения с учетом decimals
            const decimals = tokenInfo.decimals ||
              (preBalance?.tokenAmount?.decimals ||
                postBalance?.tokenAmount?.decimals || 0);

            const getUIAmount = (balance: any) => {
              if (!balance) return 0;

              if (balance.tokenAmount?.uiAmount !== undefined) {
                return balance.tokenAmount.uiAmount;
              }

              if (balance.tokenAmount?.amount) {
                const amount = Number(balance.tokenAmount.amount);
                return amount / Math.pow(10, decimals);
              }

              return 0;
            };

            const preAmount = getUIAmount(preBalance);
            const postAmount = getUIAmount(postBalance);
            const change = postAmount - preAmount;

            // Если было изменение баланса, добавляем его
            if (Math.abs(change) > 0.000001) {
              tokenChanges.push({
                mint,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                logoURI: tokenInfo.logoURI,
                change,
                preAmount,
                postAmount
              });
            }
          }
        }

        // Добавляем транзакцию, только если есть изменения токенов
        if (tokenChanges.length >= 2) { // Минимум 2 токена должны участвовать в свопе
          result.push({
            signature,
            blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
            timestamp,
            tokenChanges,
            type: 'swap'
          });
        }

      } catch (err) {
        console.error('Error processing transaction:', err);
      }
    }

    return result;
  }

  /**
   * Форматирует сумму с правильным количеством знаков
   */
  formatAmount(amount: number): string {
    if (Math.abs(amount) < 0.001) {
      return amount.toFixed(6);
    } else if (Math.abs(amount) < 1) {
      return amount.toFixed(4);
    } else {
      return amount.toFixed(2);
    }
  }

  private getTokenAmount(balance: any): number {
    if (!balance) return 0;

    if (balance.tokenAmount?.uiAmount !== undefined) {
      return balance.tokenAmount.uiAmount;
    }

    if (balance.tokenAmount?.amount) {
      const amount = Number(balance.tokenAmount.amount);
      const decimals = balance.tokenAmount.decimals || 0;
      return amount / Math.pow(10, decimals);
    }

    return 0;
  }

  private async getWalletSwapsViaEnhancedApi(walletAddress: string, beforeSignature?: string): Promise<void> {
    try {
      // Проверка валидности адреса
      const pubkey = new PublicKey(walletAddress);

      // Используем Enhanced API для точной фильтрации по типу транзакции
      const requestBody = {
        query: {
          accounts: [walletAddress],
          transactionTypes: ['SWAP', 'DEX', 'SWAP_AMM'], // Добавляем несколько типов для надежности
        },
        options: {
          limit: 50
        }
      };

      // Добавляем параметр для пагинации, если указана предыдущая сигнатура
      if (beforeSignature) {
        requestBody.options['before'] = beforeSignature;
      }

      console.log('Отправка запроса на получение свопов через Enhanced API:', JSON.stringify(requestBody));

      // Используем правильный URL для Enhanced API
      const enhancedApiUrl = 'https://api.helius.xyz/v0/transactions';
      const fullUrl = `${enhancedApiUrl}?api-key=${this.apiKey}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Для отладки выводим полный текст ответа
      const responseText = await response.text();
      console.log('Полный ответ API:', responseText);

      if (!response.ok) {
        console.error('Ошибка ответа API:', responseText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Преобразуем текст ответа в JSON
      const data = responseText ? JSON.parse(responseText) : [];
      console.log(`Получено ${data.length} свопов через Enhanced API`);

      // Остальной код метода...
    } catch (error) {
      // Обработка ошибок...
    }
  }
  /**
   * Получает транзакции кошелька и фильтрует свопы
   */
  private async getWalletSwapsViaHistory(walletAddress: string, beforeSignature?: string): Promise<void> {
    try {
      // Проверка валидности адреса
      const pubkey = new PublicKey(walletAddress);

      // Формируем URL для получения истории транзакций
      let apiUrl = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${this.apiKey}`;

      // Добавляем параметры запроса
      const params = new URLSearchParams();
      params.append('limit', '50');

      if (beforeSignature) {
        params.append('before', beforeSignature);
      }

      apiUrl += `&${params.toString()}`;
      console.log('Запрос истории транзакций:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка ответа API:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Получено ${data.length} транзакций`);

      // Фильтруем только транзакции свопов
      const swapTransactions = data.filter(tx => this.isSwapTransaction(tx, walletAddress));
      console.log(`Из них ${swapTransactions.length} свопов`);

      if (swapTransactions.length > 0) {
        const newTransactions = await this.processRawTransactions(swapTransactions, walletAddress);

        // Добавляем новые транзакции к существующим
        this.swapTransactions = [...this.swapTransactions, ...newTransactions];

        // Сохраняем последнюю сигнатуру для пагинации
        this.lastSignature = data[data.length - 1].signature;

        // Определяем, есть ли еще транзакции для загрузки
        this.hasMoreTransactions = data.length === 50;
      } else {
        if (!beforeSignature) {
          this.error = 'Свопы не найдены для этого адреса';
        }
        this.hasMoreTransactions = data.length === 50;
      }
    } catch (error: any) {
      console.error('Ошибка обработки транзакций:', error);
      this.error = `Ошибка обработки транзакций: ${error.message}`;
      throw error;
    }
  }


  private processEnhancedTransactions(data: EnrichedTransaction[], walletAddress: string): SwapTransaction[] {
    const transactions: SwapTransaction[] = [];

    for (const tx of data) {
      try {
        console.log('Processing transaction:', tx.signature);
        console.log('Transaction type:', tx.type);
        console.log('Transaction description:', tx.description);

        // Проверяем, что это транзакция свопа
        // Helius может использовать различные маркеры для свопов
        const isSwap =
          (tx.type && tx.type.toLowerCase().includes('swap')) ||
          (tx.description && tx.description.toLowerCase().includes('swap'));

        if (!isSwap) {
          console.log('Skipping non-swap transaction');
          continue;
        }

        // Получаем изменения токенов из tokenTransfers
        const tokenChanges: TokenChange[] = [];
        const processedMints = new Set<string>();

        // Логируем события для отладки
        console.log('Transaction events:', tx.events);

        // Если есть события SWAP, используем их
        if (tx.events && tx.events.swap) {
          console.log('Found swap event');
          const swap = tx.events.swap;

          // Добавляем токены, участвующие в свопе
          if (swap.tokenInputs) {
            for (const input of swap.tokenInputs) {
              if (input.userAccount === walletAddress) {
                const tokenMeta = this.tokenMetadata[input.mint] || {
                  symbol: input.symbol || 'UNKNOWN',
                  name: input.name || `Unknown (${input.mint.slice(0, 4)}...${input.mint.slice(-4)})`,
                  decimals: input.decimals || 0
                };

                tokenChanges.push({
                  mint: input.mint,
                  symbol: tokenMeta.symbol,
                  name: tokenMeta.name,
                  logoURI: tokenMeta.logoURI,
                  change: -input.amount,
                  preAmount: input.amount,
                  postAmount: 0
                });

                processedMints.add(input.mint);
              }
            }
          }

          if (swap.tokenOutputs) {
            for (const output of swap.tokenOutputs) {
              if (output.userAccount === walletAddress) {
                const tokenMeta = this.tokenMetadata[output.mint] || {
                  symbol: output.symbol || 'UNKNOWN',
                  name: output.name || `Unknown (${output.mint.slice(0, 4)}...${output.mint.slice(-4)})`,
                  decimals: output.decimals || 0
                };

                tokenChanges.push({
                  mint: output.mint,
                  symbol: tokenMeta.symbol,
                  name: tokenMeta.name,
                  logoURI: tokenMeta.logoURI,
                  change: output.amount,
                  preAmount: 0,
                  postAmount: output.amount
                });

                processedMints.add(output.mint);
              }
            }
          }
        } else if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          console.log('Processing token transfers:', tx.tokenTransfers.length);
          // Если нет событий SWAP, обрабатываем tokenTransfers
          for (const transfer of tx.tokenTransfers) {
            if (processedMints.has(transfer.mint)) continue;

            let change = 0;

            // Если кошелек отправил токены
            if (transfer.fromUserAccount === walletAddress) {
              change -= transfer.tokenAmount;
            }

            // Если кошелек получил токены
            if (transfer.toUserAccount === walletAddress) {
              change += transfer.tokenAmount;
            }

            if (change !== 0) {
              const tokenMeta = this.tokenMetadata[transfer.mint] || {
                symbol: 'UNKNOWN',
                name: `Unknown (${transfer.mint.slice(0, 4)}...${transfer.mint.slice(-4)})`,
                decimals: 0
              };

              const preAmount = change < 0 ? Math.abs(change) : 0;
              const postAmount = change > 0 ? change : 0;

              tokenChanges.push({
                mint: transfer.mint,
                symbol: tokenMeta.symbol,
                name: tokenMeta.name,
                logoURI: tokenMeta.logoURI,
                change,
                preAmount,
                postAmount
              });

              processedMints.add(transfer.mint);
            }
          }
        } else {
          console.log('No token transfers or swap events found in transaction');
        }

        if (tokenChanges.length > 0) {
          transactions.push({
            signature: tx.signature,
            blockTime: tx.timestamp, // Helius уже даёт timestamp в секундах
            timestamp: new Date(tx.timestamp * 1000),
            tokenChanges,
            type: 'swap'
          });
          console.log('Added transaction with', tokenChanges.length, 'token changes');
        } else {
          console.log('No token changes found for wallet', walletAddress);
        }
      } catch (err) {
        console.error('Error processing transaction:', err, tx);
      }
    }

    return transactions;
  }

  /**
   * Проверяет, содержит ли транзакция взаимодействие с DEX
   */
  private hasDexInteraction(tx: any, walletAddress: string): boolean {
    // Известные программы DEX
    const dexProgramIds = [
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter Aggregator
      'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo',  // Jupiter v2
      'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph',  // Jupiter v3
      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',  // Orca v2
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',   // Orca Whirlpools
      'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',   // Serum
      'EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o',  // Raydium
      'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',  // Raydium CL
      'BNvJuX3hHwd6nEKqTVrJRr7FvMt73EvitPzgVxtJxfiP',  // Meteora
      'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',   // Meteora program
    ];

    // Проверка программ в аккаунтах
    if (tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) {
      const programIds = tx.transaction.message.accountKeys
        .filter((acc: any) => acc.signer === false)
        .map((acc: any) => acc.pubkey);

      if (programIds.some(id => dexProgramIds.includes(id))) {
        return true;
      }
    }

    // Проверка инструкций
    if (tx.instructions) {
      for (const instruction of tx.instructions) {
        if (instruction.programId && dexProgramIds.includes(instruction.programId)) {
          return true;
        }

        // Проверка внутренних инструкций
        if (instruction.innerInstructions && instruction.innerInstructions.length > 0) {
          for (const innerIx of instruction.innerInstructions) {
            if (innerIx.programId && dexProgramIds.includes(innerIx.programId)) {
              return true;
            }
          }
        }
      }
    }

    // Проверка токен-трансферов
    if (tx.tokenTransfers && tx.tokenTransfers.length >= 2) {
      const uniqueTokens = new Set();
      let incomingTokenCount = 0;
      let outgoingTokenCount = 0;

      for (const transfer of tx.tokenTransfers) {
        uniqueTokens.add(transfer.mint);

        if (transfer.toUserAccount === walletAddress) {
          incomingTokenCount++;
        }
        if (transfer.fromUserAccount === walletAddress) {
          outgoingTokenCount++;
        }
      }

      // Для свопа характерно получение одного токена и отправка другого
      if (uniqueTokens.size >= 2 && incomingTokenCount > 0 && outgoingTokenCount > 0) {
        return true;
      }
    }

    return false;
  }
  private async getWalletSwapsViaSolscan(walletAddress: string, beforeHash?: string): Promise<void> {
    try {
      // Проверка валидности адреса
      const pubkey = new PublicKey(walletAddress);

      // Формируем URL для получения транзакций через Solscan
      let apiUrl = `https://api-v2.solscan.io/v2/account/activity/dextrading?address=te2PsdoQJHSweqAjfqBNynWJD5rdHhA3q2nKaGCPJLh&page=1&page_size=10`;

      if (beforeHash) {
        apiUrl += `&beforeHash=${beforeHash}`;
      }

      console.log('Запрос транзакций через Solscan:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка ответа Solscan API:', errorText);
        throw new Error(`Solscan API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Получено ${data.length} транзакций через Solscan`);

      const swapTransactions = [];

      // Solscan не предоставляет полную информацию о транзакции в списке,
      // поэтому для каждой транзакции нужно получить детальную информацию
      for (const tx of data) {
        try {
          const txDetails = await this.getSolscanTransactionDetails(tx.txHash);

          // Проверяем, является ли транзакция свопом
          if (this.isSolscanSwap(txDetails, walletAddress)) {
            swapTransactions.push(txDetails);
          }
        } catch (error) {
          console.error(`Ошибка получения деталей транзакции ${tx.txHash}:`, error);
        }
      }

      console.log(`Найдено ${swapTransactions.length} свопов`);

      if (swapTransactions.length > 0) {
        const processedSwaps = this.processSolscanSwaps(swapTransactions, walletAddress);

        // Добавляем новые транзакции к существующим
        this.swapTransactions = [...this.swapTransactions, ...processedSwaps];

        // Сохраняем последнюю сигнатуру для пагинации
        this.lastSignature = data[data.length - 1].txHash;

        // Проверяем, есть ли еще транзакции
        this.hasMoreTransactions = data.length === 20;
      } else {
        if (!beforeHash) {
          this.error = 'Свопы не найдены для этого адреса';
        }
        this.hasMoreTransactions = data.length === 20;
      }
    } catch (error: any) {
      console.error('Ошибка получения транзакций:', error);
      this.error = `Ошибка получения транзакций: ${error.message}`;
      throw error;
    }
  }

  private async getSolscanTransactionDetails(txHash: string): Promise<any> {
    const url = `https://public-api.solscan.io/transaction/${txHash}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения деталей транзакции: ${response.status}`);
    }

    return await response.json();
  }

  private isSolscanSwap(txDetails: any, walletAddress: string): boolean {
    // Solscan помечает свопы как 'Swap' в поле parsedInstruction
    if (txDetails.parsedInstruction) {
      const hasSwapInstruction = txDetails.parsedInstruction.some((instruction: any) =>
        instruction.type && instruction.type.toLowerCase().includes('swap')
      );

      if (hasSwapInstruction) {
        return true;
      }
    }

    // Проверка наличия токен-трансферов в транзакции
    if (txDetails.tokenBalanes && txDetails.tokenBalanes.length >= 2) {
      // Проверяем, есть ли изменения баланса токенов
      const accountTokenChanges = txDetails.tokenBalanes.filter((change: any) =>
        change.owner === walletAddress && Math.abs(change.changeAmount) > 0
      );

      // Если есть изменения по двум или более токенам, это может быть своп
      if (accountTokenChanges.length >= 2) {
        return true;
      }
    }

    // Проверка программ DEX
    if (txDetails.instructions) {
      const knownDexPrograms = [
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter
        'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo',  // Jupiter v2
        '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',  // Orca
        'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',   // Serum
        'EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o',  // Raydium
        'BNvJuX3hHwd6nEKqTVrJRr7FvMt73EvitPzgVxtJxfiP',  // Meteora
      ];

      const hasDexProgram = txDetails.instructions.some((ix: any) =>
        ix.programId && knownDexPrograms.includes(ix.programId)
      );

      if (hasDexProgram) {
        return true;
      }
    }

    return false;
  }

  private processSolscanSwaps(swapTransactions: any[], walletAddress: string): SwapTransaction[] {
    return swapTransactions.map(tx => {
      const tokenChanges: TokenChange[] = [];

      // Обработка изменений токенов
      if (tx.tokenBalanes) {
        for (const tokenChange of tx.tokenBalanes) {
          if (tokenChange.owner === walletAddress && Math.abs(tokenChange.changeAmount) > 0) {
            // Получаем информацию о токене
            const tokenInfo = this.tokenMetadata[tokenChange.mint] || {
              symbol: tokenChange.symbol || 'UNKNOWN',
              name: tokenChange.name || `Unknown (${tokenChange.mint.slice(0, 4)}...${tokenChange.mint.slice(-4)})`,
              decimals: tokenChange.decimals || 0
            };

            const change = tokenChange.changeAmount;
            const preAmount = change < 0 ? Math.abs(change) : 0;
            const postAmount = change > 0 ? change : 0;

            tokenChanges.push({
              mint: tokenChange.mint,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              logoURI: tokenInfo.logoURI,
              change,
              preAmount,
              postAmount
            });
          }
        }
      }

      return {
        signature: tx.txHash,
        blockTime: tx.blockTime,
        timestamp: new Date(tx.blockTime * 1000),
        tokenChanges,
        type: 'swap'
      };
    });
  }

  /**
   * Получает свопы с использованием Jupiter API и Solana RPC
   */
  private async getWalletSwapsViaJupiter(walletAddress: string, beforeSignature?: string): Promise<void> {
    try {
      // Проверка валидности адреса
      const pubkey = new PublicKey(walletAddress);

      // Получение списка последних транзакций адреса через Solana RPC
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(walletAddress),
        // @ts-ignore
        { limit: 50, before: beforeSignature ? new PublicKey(beforeSignature) : undefined }
      );

      console.log(`Получено ${signatures.length} подписей транзакций`);

      if (signatures.length === 0) {
        if (!beforeSignature) {
          this.error = 'Транзакции не найдены для этого адреса';
        }
        this.hasMoreTransactions = false;
        return;
      }

      // Получаем детали каждой транзакции
      const swapTransactions = [];

      for (const sigInfo of signatures) {
        try {
          // Получаем полные данные транзакции
          const txDetails = await this.connection.getParsedTransaction(
            sigInfo.signature,
            { maxSupportedTransactionVersion: 0 }
          );

          if (!txDetails) continue;

          // Проверяем, является ли транзакция свопом
          if (this.isSwapTransaction(txDetails, walletAddress)) {
            swapTransactions.push({
              signature: sigInfo.signature,
              txDetails,
              blockTime: sigInfo.blockTime || 0
            });
          }
        } catch (error) {
          console.error(`Ошибка получения деталей транзакции ${sigInfo.signature}:`, error);
        }
      }

      console.log(`Найдено ${swapTransactions.length} свопов`);

      if (swapTransactions.length > 0) {
        const processedSwaps = await this.processJupiterSwaps(swapTransactions, walletAddress);

        // Добавляем новые транзакции к существующим
        this.swapTransactions = [...this.swapTransactions, ...processedSwaps];

        // Сохраняем последнюю сигнатуру для пагинации
        this.lastSignature = signatures[signatures.length - 1].signature;

        // Определяем, есть ли еще транзакции
        this.hasMoreTransactions = signatures.length === 50;
      } else {
        if (!beforeSignature) {
          this.error = 'Свопы не найдены для этого адреса';
        }
        this.hasMoreTransactions = signatures.length === 50;
      }
    } catch (error: any) {
      console.error('Ошибка получения свопов:', error);
      this.error = `Ошибка получения свопов: ${error.message}`;
      throw error;
    }
  }

  /**
   * Проверяет, является ли транзакция свопом
   */
  private isSwapTransaction(txDetails: any, walletAddress: string): boolean {
    // Проверяем программы в транзакции
    if (txDetails.transaction && txDetails.transaction.message) {
      const programIds = txDetails.transaction.message.accountKeys
        .filter((acc: any) => !acc.signer && acc.writable)
        .map((acc: any) => acc.pubkey.toString());

      // Известные программы DEX и Jupiter на Solana
      const knownJupiterPrograms = [
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  // Jupiter Aggregator
        'JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo',  // Jupiter v2
        'JUP3c2Uh3WA4Ng34tw6kPd2G4C5BB21Xo36Je1s32Ph',  // Jupiter v3
        'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'   // Jupiter v4
      ];

      // Проверяем есть ли среди программ Jupiter
      if (programIds.some(id => knownJupiterPrograms.includes(id))) {
        return true;
      }
    }

    // Проверяем изменения токенов
    if (txDetails.meta && txDetails.meta.postTokenBalances && txDetails.meta.preTokenBalances) {
      const preBalances = txDetails.meta.preTokenBalances.filter((b: any) => b.owner === walletAddress);
      const postBalances = txDetails.meta.postTokenBalances.filter((b: any) => b.owner === walletAddress);

      // Если есть изменения по крайней мере в 2 токенах
      if (preBalances.length >= 1 && postBalances.length >= 1) {
        // Создаем карты балансов
        const preBalanceMap = new Map();
        preBalances.forEach((balance: any) => {
          preBalanceMap.set(balance.mint, balance);
        });

        const postBalanceMap = new Map();
        postBalances.forEach((balance: any) => {
          postBalanceMap.set(balance.mint, balance);
        });

        // Все токены
        const allMints = new Set([
          ...preBalanceMap.keys(),
          ...postBalanceMap.keys()
        ]);

        let increased = 0;
        let decreased = 0;

        for (const mint of allMints) {
          const preBal = preBalanceMap.get(mint);
          const postBal = postBalanceMap.get(mint);

          const preAmount = this.getTokenAmountFromBalance(preBal);
          const postAmount = this.getTokenAmountFromBalance(postBal);

          if (postAmount > preAmount) {
            increased++;
          } else if (preAmount > postAmount) {
            decreased++;
          }
        }

        // Если один токен уменьшился, а другой увеличился - это признак свопа
        if (increased > 0 && decreased > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Извлекает сумму токена из баланса
   */
  private getTokenAmountFromBalance(balance: any): number {
    if (!balance) return 0;

    if (balance.uiTokenAmount) {
      return Number(balance.uiTokenAmount.uiAmount || 0);
    }

    return 0;
  }

  /**
   * Обрабатывает свопы для отображения
   */
  private async processJupiterSwaps(swapTransactions: any[], walletAddress: string): Promise<SwapTransaction[]> {
    const processedSwaps: SwapTransaction[] = [];

    for (const tx of swapTransactions) {
      try {
        const tokenChanges: TokenChange[] = [];

        // Обработка токен-балансов
        if (tx.txDetails.meta && tx.txDetails.meta.preTokenBalances && tx.txDetails.meta.postTokenBalances) {
          const preBalances = tx.txDetails.meta.preTokenBalances.filter((b: any) => b.owner === walletAddress);
          const postBalances = tx.txDetails.meta.postTokenBalances.filter((b: any) => b.owner === walletAddress);

          // Создаем карты балансов
          const preBalanceMap = new Map();
          preBalances.forEach((balance: any) => {
            preBalanceMap.set(balance.mint, balance);
          });

          const postBalanceMap = new Map();
          postBalances.forEach((balance: any) => {
            postBalanceMap.set(balance.mint, balance);
          });

          // Все токены
          const allMints = new Set([
            ...preBalanceMap.keys(),
            ...postBalanceMap.keys()
          ]);

          for (const mint of allMints) {
            const preBal = preBalanceMap.get(mint);
            const postBal = postBalanceMap.get(mint);

            const preAmount = this.getTokenAmountFromBalance(preBal);
            const postAmount = this.getTokenAmountFromBalance(postBal);

            // Если есть изменение баланса
            if (Math.abs(postAmount - preAmount) > 0.000001) {
              // Получаем информацию о токене
              const tokenInfo = await this.getTokenInfo(mint);

              const change = postAmount - preAmount;

              tokenChanges.push({
                mint,
                symbol: tokenInfo.symbol,
                name: tokenInfo.name,
                logoURI: tokenInfo.logoURI,
                change,
                preAmount,
                postAmount
              });
            }
          }
        }

        if (tokenChanges.length > 0) {
          processedSwaps.push({
            signature: tx.signature,
            blockTime: tx.blockTime,
            timestamp: new Date(tx.blockTime * 1000),
            tokenChanges,
            type: 'swap'
          });
        }
      } catch (error) {
        console.error(`Ошибка обработки свопа ${tx.signature}:`, error);
      }
    }

    return processedSwaps;
  }

  /**
   * Получает информацию о токене
   */
  private async getTokenInfo(mint: string): Promise<any> {
    // Сначала проверяем локальный кэш
    if (this.tokenMetadata[mint]) {
      return this.tokenMetadata[mint];
    }

    try {
      // Запрашиваем информацию через Jupiter API
      const response = await fetch(`https://token.jup.ag/token/${mint}`);

      if (response.ok) {
        const tokenInfo = await response.json();

        // Сохраняем в кэш
        this.tokenMetadata[mint] = {
          symbol: tokenInfo.symbol || 'UNKNOWN',
          name: tokenInfo.name || `Unknown (${mint.slice(0, 4)}...${mint.slice(-4)})`,
          logoURI: tokenInfo.logoURI || null,
          decimals: tokenInfo.decimals || 0
        };

        return this.tokenMetadata[mint];
      }
    } catch (error) {
      console.error(`Ошибка получения информации о токене ${mint}:`, error);
    }

    // Если не удалось получить информацию, возвращаем заполнитель
    return {
      symbol: mint.slice(0, 4) + '...',
      name: `Unknown (${mint.slice(0, 4)}...${mint.slice(-4)})`,
      logoURI: null,
      decimals: 0
    };
  }


  /**
   * Обновленный метод получения транзакций кошелька с лучшей фильтрацией свопов
   */
}

