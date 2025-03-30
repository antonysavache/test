import { Injectable } from '@angular/core';

export interface Transaction {
  block_id: number;
  trans_id: string;
  block_time: number;
  activity_type: string;
  from_address: string;
  sources: string[];
  platform: string[];
  amount_info: {
    token1: string;
    token1_decimals: number;
    amount1: number;
    token2: string;
    token2_decimals: number;
    amount2: number;
    routers: any[];
  };
  value: number;
}

export interface TokenInfo {
  token_address: string;
  token_name: string;
  token_symbol: string;
  token_icon?: string;
  token_decimals: number;
  price_usdt?: number;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  balance: number;
  normalizedBalance: number;
  avgBuyPrice?: number;
  totalBought: number;
  totalSold: number;
  totalBuyValue: number;
  totalSellValue: number;
  currentPriceUSD?: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
}

export interface Trade {
  id: string;
  buyTimestamp: number;
  sellTimestamp?: number;
  buyDate: string;
  sellDate?: string;
  token: string;
  tokenSymbol: string;
  boughtAmount: number;
  soldAmount?: number;
  buyPrice: number;
  sellPrice?: number;
  buyValueUSD: number;
  sellValueUSD?: number;
  pnl?: number;
  pnlPercentage?: number;
  isComplete: boolean;
  platform: string;
}

export interface TradingReport {
  summary: {
    totalTradeCount: number;
    completedTradeCount: number;
    openTradeCount: number;
    winningTradeCount: number;
    losingTradeCount: number;
    totalBuyVolumeUSD: number;
    totalSellVolumeUSD: number;
    realizedPnL: number;
    unrealizedPnL: number;
    totalPnL: number;
    profitFactor: number;
    winRate: number;
    startDate: string;
    endDate: string;
  };
  tokenBalances: TokenBalance[];
  trades: Trade[];
}

@Injectable({
  providedIn: 'root'
})
export class TradingAnalysisService {
  private transactions: Transaction[] = [];
  private tokenInfo: Map<string, TokenInfo> = new Map();
  private tokenBalances: Map<string, TokenBalance> = new Map();
  private trades: Trade[] = [];

  constructor() { }

  /**
   * Analyze trading transactions and generate a comprehensive report
   * @param data Array of transactions or object with transactions in data property
   * @returns Trading report with PnL calculations and trade history
   */
  analyzeTradingData(data: any): TradingReport {
    // Сбрасываем состояние
    this.transactions = [];
    this.tokenInfo = new Map();
    this.tokenBalances = new Map();
    this.trades = [];

    console.log('Анализ данных, тип:', typeof data);

    try {
      // Извлекаем транзакции из данных
      if (Array.isArray(data)) {
        // Если данные уже являются массивом транзакций
        this.transactions = data;
        console.log(`Получен массив из ${this.transactions.length} транзакций`);
      } else if (data.data && Array.isArray(data.data)) {
        // Если данные содержат поле data с массивом транзакций
        this.transactions = data.data;
        console.log(`Получен объект с массивом data из ${this.transactions.length} транзакций`);
      } else if (data.success !== undefined && data.data && Array.isArray(data.data)) {
        // Формат API-ответа с полями success и data
        this.transactions = data.data;
        console.log(`Получен API-ответ с ${this.transactions.length} транзакциями`);
      } else {
        // Если данные в неизвестном формате, пробуем парсить как строку JSON
        if (typeof data === 'string') {
          try {
            const parsedData = JSON.parse(data);
            return this.analyzeTradingData(parsedData);
          } catch (e) {
            console.error('Ошибка при парсинге JSON строки:', e);
            throw new Error('Неверный формат данных: не удалось распарсить JSON');
          }
        } else {
          console.error('Неверный формат данных:', data);
          throw new Error('Неверный формат данных: ожидается массив транзакций или объект с полем data');
        }
      }

      // Проверяем, что у нас есть хотя бы одна транзакция
      if (this.transactions.length === 0) {
        throw new Error('Массив транзакций пуст');
      }

      // Сортируем транзакции по времени
      this.transactions.sort((a, b) => a.block_time - b.block_time);

      // Извлекаем информацию о токенах из транзакций
      this.extractTokenInfo();

      // Обрабатываем транзакции
      this.processTransactions();

      // Генерируем отчет
      return this.generateReport();
    } catch (error) {
      console.error('Ошибка при анализе данных:', error);
      throw error;
    }
  }

  /**
   * Обрабатывает транзакции для формирования торговой истории
   */
  private processTransactions(): void {
    console.log(`Обработка ${this.transactions.length} транзакций...`);

    let processedCount = 0;

    for (const tx of this.transactions) {
      try {
        // Проверяем, что транзакция имеет тип SWAP
        if (tx.activity_type === 'ACTIVITY_TOKEN_SWAP') {
          this.processSwap(tx);
          processedCount++;
        }
      } catch (error) {
        console.warn(`Ошибка при обработке транзакции ${tx.trans_id}:`, error);
        // Продолжаем обработку остальных транзакций
      }
    }

    console.log(`Успешно обработано ${processedCount} из ${this.transactions.length} транзакций`);

    // Вычисляем общий PnL
    this.calculateTokenPnL();
  }

  /**
   * Process a single swap transaction
   */
  private processSwap(tx: Transaction): void {
    const { amount_info, block_time, trans_id, value, platform } = tx;
    const { token1, token1_decimals, amount1, token2, token2_decimals, amount2 } = amount_info;

    // Store token info if not already available
    this.ensureTokenInfo(token1, token1_decimals);
    this.ensureTokenInfo(token2, token2_decimals);

    // Create normalized amounts (accounting for decimals)
    const normalizedAmount1 = amount1 / Math.pow(10, token1_decimals);
    const normalizedAmount2 = amount2 / Math.pow(10, token2_decimals);

    // Calculate price in USD terms
    const token1PriceUSD = this.getTokenPriceUSD(token1);
    const token2PriceUSD = this.getTokenPriceUSD(token2);

    const token1ValueUSD = normalizedAmount1 * token1PriceUSD;
    const token2ValueUSD = normalizedAmount2 * token2PriceUSD;

    // This is a swap where token1 is being sold for token2
    this.updateTokenBalance(token1, -normalizedAmount1, token1ValueUSD);
    this.updateTokenBalance(token2, normalizedAmount2, token2ValueUSD);

    // This is either a buy of token2 (using token1) or a sell of token1 (for token2)
    // We need to determine which one is SOL/USDT to decide how to track the trade
    const isSol1 = this.isSOLorStablecoin(token1);
    const isSol2 = this.isSOLorStablecoin(token2);

    if (isSol1 && !isSol2) {
      // This is a purchase of token2 using SOL/stablecoin
      this.recordBuy({
        id: trans_id,
        buyTimestamp: block_time,
        buyDate: new Date(block_time * 1000).toISOString(),
        token: token2,
        tokenSymbol: this.getTokenSymbol(token2),
        boughtAmount: normalizedAmount2,
        buyPrice: token1ValueUSD / normalizedAmount2, // Calculate price per token
        buyValueUSD: token1ValueUSD, // Using the token1 value as the trade cost
        isComplete: false,
        platform: platform && platform.length > 0 ? platform[0] : 'unknown'
      });
    } else if (!isSol1 && isSol2) {
      // This is a sale of token1 for SOL/stablecoin
      this.recordSell({
        token: token1,
        soldAmount: normalizedAmount1,
        sellTimestamp: block_time,
        sellDate: new Date(block_time * 1000).toISOString(),
        sellPrice: token2ValueUSD / normalizedAmount1, // Calculate price per token
        sellValueUSD: token2ValueUSD,
        transId: trans_id,
        platform: platform && platform.length > 0 ? platform[0] : 'unknown'
      });
    }
    // If both or neither are SOL/stablecoins, we don't track as a trade
    // This would be token-to-token swaps which are harder to value
  }

  /**
   * Ensure token info exists in our map, create basic entry if not
   */
  private ensureTokenInfo(tokenAddress: string, decimals: number): void {
    if (!this.tokenInfo.has(tokenAddress)) {
      // If token info is not available, create a basic entry
      const symbol = tokenAddress.substring(0, 6) + '...';

      this.tokenInfo.set(tokenAddress, {
        token_address: tokenAddress,
        token_name: tokenAddress,
        token_symbol: symbol,
        token_decimals: decimals,
        price_usdt: 0 // Default price, will be estimated from swaps if possible
      });
    }
  }

  /**
   * Get token price in USD
   */
  private getTokenPriceUSD(tokenAddress: string): number {
    const info = this.tokenInfo.get(tokenAddress);
    return info?.price_usdt || 0;
  }

  /**
   * Get token symbol
   */
  private getTokenSymbol(tokenAddress: string): string {
    const info = this.tokenInfo.get(tokenAddress);
    return info?.token_symbol || tokenAddress.substring(0, 6) + '...';
  }

  /**
   * Check if token is SOL or a stablecoin (used to determine buy/sell direction)
   */
  private isSOLorStablecoin(tokenAddress: string): boolean {
    // List of common SOL and stablecoin addresses
    const solAddresses = [
      'So11111111111111111111111111111111111111111',
      'So11111111111111111111111111111111111111112',
      // Add other SOL wrapped addresses if needed
    ];

    const stablecoinSymbols = ['USDC', 'USDT', 'BUSD', 'DAI', 'TUSD', 'USDH'];

    // Check if token is in SOL addresses list
    if (solAddresses.includes(tokenAddress)) {
      return true;
    }

    // Check if token symbol matches a stablecoin
    const info = this.tokenInfo.get(tokenAddress);
    if (info && stablecoinSymbols.includes(info.token_symbol)) {
      return true;
    }

    return false;
  }

  /**
   * Update token balance
   */
  private updateTokenBalance(tokenAddress: string, amount: number, valueUSD: number): void {
    if (!this.tokenBalances.has(tokenAddress)) {
      this.tokenBalances.set(tokenAddress, {
        token: tokenAddress,
        symbol: this.getTokenSymbol(tokenAddress),
        balance: 0,
        normalizedBalance: 0,
        avgBuyPrice: 0,
        totalBought: 0,
        totalSold: 0,
        totalBuyValue: 0,
        totalSellValue: 0,
        currentPriceUSD: this.getTokenPriceUSD(tokenAddress),
        realizedPnL: 0,
        unrealizedPnL: 0,
        totalPnL: 0
      });
    }

    const balance = this.tokenBalances.get(tokenAddress);

    // Update balance
    const newBalance = balance.balance + amount;

    // If this is a buy (positive amount)
    if (amount > 0) {
      // Update totals
      balance.totalBought += amount;
      balance.totalBuyValue += valueUSD;

      // Calculate new average buy price
      balance.avgBuyPrice = balance.totalBuyValue / balance.totalBought;
    }
    // If this is a sell (negative amount)
    else if (amount < 0) {
      const absAmount = Math.abs(amount);
      balance.totalSold += absAmount;
      balance.totalSellValue += valueUSD;

      // Calculate realized PnL only if we have bought before
      if (balance.totalBought > 0) {
        // Compare sell value to what it would have cost at average buy price
        const costBasis = absAmount * balance.avgBuyPrice;
        balance.realizedPnL += (valueUSD - costBasis);
      }
    }

    // Update final balance
    balance.balance = newBalance;

    // Calculate unrealized PnL
    if (balance.balance > 0 && balance.currentPriceUSD > 0) {
      const currentValue = balance.balance * balance.currentPriceUSD;
      const costBasis = balance.balance * balance.avgBuyPrice;
      balance.unrealizedPnL = currentValue - costBasis;
    } else {
      balance.unrealizedPnL = 0;
    }

    // Calculate total PnL
    balance.totalPnL = balance.realizedPnL + balance.unrealizedPnL;

    // Save updated balance
    this.tokenBalances.set(tokenAddress, balance);
  }

  /**
   * Record a buy transaction
   */
  private recordBuy(trade: Trade): void {
    this.trades.push(trade);
  }

  /**
   * Record a sell transaction by matching with previous buys
   */
  private recordSell(sellInfo: {
    token: string,
    soldAmount: number,
    sellTimestamp: number,
    sellDate: string,
    sellPrice: number,
    sellValueUSD: number,
    transId: string,
    platform: string
  }): void {
    // Find open trades (buys) for this token
    const openTrades = this.trades.filter(t =>
      t.token === sellInfo.token &&
      !t.isComplete &&
      t.buyTimestamp < sellInfo.sellTimestamp
    );

    if (openTrades.length === 0) {
      // No matching buys found, this could be an error or selling tokens acquired elsewhere
      // We could create a "virtual buy" here or just ignore
      console.warn(`Sell without matching buy: ${sellInfo.token} - ${sellInfo.soldAmount}`);
      return;
    }

    // Sort open trades by timestamp (FIFO - First In, First Out)
    openTrades.sort((a, b) => a.buyTimestamp - b.buyTimestamp);

    let remainingSellAmount = sellInfo.soldAmount;

    // Match sell with buys until the full sell amount is accounted for
    for (const trade of openTrades) {
      if (remainingSellAmount <= 0) break;

      // Calculate how much we can sell from this trade
      const availableToSell = trade.boughtAmount - (trade.soldAmount || 0);

      if (availableToSell <= 0) continue;

      // Calculate how much to sell from this trade
      const sellFromTrade = Math.min(availableToSell, remainingSellAmount);

      // Update the trade with sell info
      const sellRatio = sellFromTrade / trade.boughtAmount;
      const buyValueForSold = trade.buyValueUSD * sellRatio;
      const sellValueForSold = sellInfo.sellValueUSD * (sellFromTrade / sellInfo.soldAmount);

      // Update the trade
      const tradeIndex = this.trades.findIndex(t => t.id === trade.id);
      if (tradeIndex >= 0) {
        const updatedTrade = { ...this.trades[tradeIndex] };

        updatedTrade.soldAmount = (updatedTrade.soldAmount || 0) + sellFromTrade;
        updatedTrade.sellTimestamp = sellInfo.sellTimestamp;
        updatedTrade.sellDate = sellInfo.sellDate;
        updatedTrade.sellPrice = sellInfo.sellPrice;
        updatedTrade.sellValueUSD = sellValueForSold;
        updatedTrade.isComplete = (updatedTrade.soldAmount >= updatedTrade.boughtAmount);

        // Calculate PnL
        updatedTrade.pnl = sellValueForSold - buyValueForSold;
        updatedTrade.pnlPercentage = (updatedTrade.pnl / buyValueForSold) * 100;

        this.trades[tradeIndex] = updatedTrade;
      }

      // Reduce remaining sell amount
      remainingSellAmount -= sellFromTrade;
    }

    // If we still have unsold amount, it means we're trying to sell more than we bought
    if (remainingSellAmount > 0) {
      console.warn(`Trying to sell more than available: ${sellInfo.token} - Excess: ${remainingSellAmount}`);
    }
  }

  /**
   * Calculate token PnL across all balances
   */
  private calculateTokenPnL(): void {
    for (const [tokenAddress, balance] of this.tokenBalances.entries()) {
      // Ensure token price is set
      const currentPrice = this.getTokenPriceUSD(tokenAddress);
      balance.currentPriceUSD = currentPrice;

      // Calculate unrealized PnL
      if (balance.balance > 0 && currentPrice > 0) {
        const currentValue = balance.balance * currentPrice;
        const costBasis = balance.balance * balance.avgBuyPrice;
        balance.unrealizedPnL = currentValue - costBasis;
      } else {
        balance.unrealizedPnL = 0;
      }

      // Calculate total PnL
      balance.totalPnL = balance.realizedPnL + balance.unrealizedPnL;

      // Update the map
      this.tokenBalances.set(tokenAddress, balance);
    }
  }

  /**
   * Generate the final trading report
   */
  private generateReport(): TradingReport {
    // Calculate summary statistics
    const completedTrades = this.trades.filter(t => t.isComplete);
    const openTrades = this.trades.filter(t => !t.isComplete);
    const winningTrades = completedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = completedTrades.filter(t => (t.pnl || 0) <= 0);

    // Calculate P&L stats
    const realizedPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const unrealizedPnL = Array.from(this.tokenBalances.values())
      .reduce((sum, b) => sum + b.unrealizedPnL, 0);

    // Calculate total volumes
    const totalBuyVolume = this.trades.reduce((sum, t) => sum + t.buyValueUSD, 0);
    const totalSellVolume = completedTrades.reduce((sum, t) => sum + (t.sellValueUSD || 0), 0);

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Calculate win rate
    const winRate = completedTrades.length ? (winningTrades.length / completedTrades.length) * 100 : 0;

    // Create the report
    return {
      summary: {
        totalTradeCount: this.trades.length,
        completedTradeCount: completedTrades.length,
        openTradeCount: openTrades.length,
        winningTradeCount: winningTrades.length,
        losingTradeCount: losingTrades.length,
        totalBuyVolumeUSD: totalBuyVolume,
        totalSellVolumeUSD: totalSellVolume,
        realizedPnL,
        unrealizedPnL,
        totalPnL: realizedPnL + unrealizedPnL,
        profitFactor,
        winRate,
        startDate: this.transactions.length ? new Date(this.transactions[0].block_time * 1000).toISOString() : '',
        endDate: this.transactions.length ?
          new Date(this.transactions[this.transactions.length-1].block_time * 1000).toISOString() : ''
      },
      tokenBalances: Array.from(this.tokenBalances.values()),
      trades: this.trades
    };
  }


  /**
   * Исправленный метод извлечения информации о токенах
   */
  private extractTokenInfo(): void {
    // Создаем базовые записи для SOL токенов, которые часто встречаются
    this.tokenInfo.set('So11111111111111111111111111111111111111111', {
      token_address: 'So11111111111111111111111111111111111111111',
      token_name: 'Solana',
      token_symbol: 'SOL',
      token_decimals: 9,
      price_usdt: 100.0 // Примерная оценка
    });

    this.tokenInfo.set('So11111111111111111111111111111111111111112', {
      token_address: 'So11111111111111111111111111111111111111112',
      token_name: 'Wrapped SOL',
      token_symbol: 'WSOL',
      token_decimals: 9,
      price_usdt: 100.0 // Примерная оценка
    });

    // Первый проход: собираем информацию обо всех токенах из транзакций
    console.log('Извлекаем информацию о токенах из транзакций...');
    for (const tx of this.transactions) {
      if (tx.activity_type === 'ACTIVITY_TOKEN_SWAP' && tx.amount_info) {
        const { token1, token1_decimals, token2, token2_decimals } = tx.amount_info;

        // Добавляем токен 1, если его нет
        if (!this.tokenInfo.has(token1)) {
          this.tokenInfo.set(token1, {
            token_address: token1,
            token_name: this.getTokenNameFromAddress(token1),
            token_symbol: this.getTokenSymbolFromAddress(token1),
            token_decimals: token1_decimals,
            price_usdt: 0 // Будет оценено во втором проходе
          });
        }

        // Добавляем токен 2, если его нет
        if (!this.tokenInfo.has(token2)) {
          this.tokenInfo.set(token2, {
            token_address: token2,
            token_name: this.getTokenNameFromAddress(token2),
            token_symbol: this.getTokenSymbolFromAddress(token2),
            token_decimals: token2_decimals,
            price_usdt: 0 // Будет оценено во втором проходе
          });
        }
      }
    }

    // Второй проход: оцениваем цены токенов на основе транзакций
    for (const tx of this.transactions) {
      if (tx.activity_type === 'ACTIVITY_TOKEN_SWAP' && tx.amount_info && tx.value) {
        this.estimateTokenPricesFromTransaction(tx);
      }
    }

    console.log(`Извлечена информация о ${this.tokenInfo.size} токенах`);
  }

  /**
   * Получить имя токена из адреса
   */
  private getTokenNameFromAddress(address: string): string {
    // Для SOL-токенов возвращаем известные имена
    if (address === 'So11111111111111111111111111111111111111111') return 'Solana';
    if (address === 'So11111111111111111111111111111111111111112') return 'Wrapped SOL';

    // Для прочих токенов получаем короткое имя из адреса
    // Проверяем, есть ли в адресе слово 'pump' (характерно для токенов в вашем примере)
    if (address.includes('pump')) {
      // Получаем часть до 'pump'
      const parts = address.split('pump');
      if (parts.length > 0) {
        // Берем последние 5 символов перед 'pump'
        const namePart = parts[0];
        if (namePart.length > 5) {
          return namePart.substring(namePart.length - 5);
        }
        return namePart;
      }
    }

    // Если ничего не подошло, возвращаем короткую версию адреса
    return address.substring(0, 6) + '...';
  }

  /**
   * Получить символ токена из адреса
   */
  private getTokenSymbolFromAddress(address: string): string {
    // Для SOL-токенов возвращаем известные символы
    if (address === 'So11111111111111111111111111111111111111111') return 'SOL';
    if (address === 'So11111111111111111111111111111111111111112') return 'WSOL';

    // Для прочих токенов получаем короткий символ из адреса
    if (address.includes('pump')) {
      // Получаем часть до 'pump'
      const parts = address.split('pump');
      if (parts.length > 0) {
        // Берем последние 3-4 символа перед 'pump'
        const symbolPart = parts[0];
        if (symbolPart.length > 4) {
          return symbolPart.substring(symbolPart.length - 4).toUpperCase();
        }
        return symbolPart.toUpperCase();
      }
    }

    // Если ничего не подошло, возвращаем первые 4 символа адреса
    return address.substring(0, 4).toUpperCase();
  }

  /**
   * Оценить цены токенов на основе транзакции
   */
  private estimateTokenPricesFromTransaction(tx: Transaction): void {
    const { token1, token1_decimals, amount1, token2, token2_decimals, amount2 } = tx.amount_info;

    // Нормализуем суммы с учетом десятичных знаков
    const normalizedAmount1 = amount1 / Math.pow(10, token1_decimals);
    const normalizedAmount2 = amount2 / Math.pow(10, token2_decimals);

    // Получаем текущую информацию о токенах
    const token1Info = this.tokenInfo.get(token1);
    const token2Info = this.tokenInfo.get(token2);

    if (!token1Info || !token2Info) return;

    // Если один из токенов - SOL или WSOL, используем его для оценки другого
    if (token1 === 'So11111111111111111111111111111111111111111' ||
      token1 === 'So11111111111111111111111111111111111111112') {
      // SOL продается за другой токен, оцениваем другой токен
      if (token2Info.price_usdt === 0) {
        // Цена SOL * количество SOL / количество другого токена
        const estimatedPrice = (100 * normalizedAmount1) / normalizedAmount2;
        token2Info.price_usdt = estimatedPrice;
        this.tokenInfo.set(token2, token2Info);
      }
    } else if (token2 === 'So11111111111111111111111111111111111111111' ||
      token2 === 'So11111111111111111111111111111111111111112') {
      // SOL покупается за другой токен, оцениваем другой токен
      if (token1Info.price_usdt === 0) {
        // Цена SOL * количество SOL / количество другого токена
        const estimatedPrice = (100 * normalizedAmount2) / normalizedAmount1;
        token1Info.price_usdt = estimatedPrice;
        this.tokenInfo.set(token1, token1Info);
      }
    } else if (tx.value && tx.value > 0) {
      // Если есть значение транзакции в USD, используем его для оценки
      // Предполагаем, что value - это стоимость всей транзакции в USD

      // Для token1 (продаваемый токен)
      if (token1Info.price_usdt === 0) {
        token1Info.price_usdt = tx.value / normalizedAmount1;
        this.tokenInfo.set(token1, token1Info);
      }

      // Для token2 (покупаемый токен)
      if (token2Info.price_usdt === 0) {
        token2Info.price_usdt = tx.value / normalizedAmount2;
        this.tokenInfo.set(token2, token2Info);
      }
    }
  }
}
