import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Trade, TradingAnalysisService, TradingReport} from './trading.service';
import {TokenBalance} from '@solana/web3.js';
import {CurrencyPipe, DatePipe, DecimalPipe, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-trading-history',
  templateUrl: './trading-history.component.html',
  imports: [
    DecimalPipe,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    NgForOf,
    NgIf
  ],
  standalone: true
})
export class TradingHistoryComponent implements OnInit {
  report: TradingReport | null = null;
  isLoading = false;
  error: string | null = null;
  selectedFile: File | null = null;
  dataSource: any = null;
  selectedView = 'summary';
  selectedToken: string | null = null;

  // Pagination for trades
  pageSize = 10;
  currentPage = 1;

  // Filters
  showOnlyCompleted = false;
  showOnlyWinning = false;
  dateRange: { start: Date | null, end: Date | null } = { start: null, end: null };

  // Sorting
  sortColumn = 'buyTimestamp';
  sortDirection = 'desc';

  constructor(
    private tradingService: TradingAnalysisService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // По умолчанию ничего не делаем
  }

  /**
   * Обработчик выбора файла
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.error = null; // Сбрасываем предыдущие ошибки

    if (!input.files || input.files.length === 0) {
      this.error = 'Файл не выбран';
      return;
    }

    this.selectedFile = input.files[0];
    console.log('Выбран файл:', this.selectedFile.name, 'размер:', this.selectedFile.size, 'байт');

    // Проверяем расширение файла
    if (!this.selectedFile.name.toLowerCase().endsWith('.json')) {
      this.error = 'Пожалуйста, выберите файл JSON';
      return;
    }

    // Начинаем обработку файла
    this.processSelectedFile();
  }

  /**
   * Обрабатывает выбранный файл
   */
  processSelectedFile(): void {
    if (!this.selectedFile) {
      this.error = 'Файл не выбран';
      return;
    }

    this.isLoading = true;
    this.error = null;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result as string;
        console.log('Файл успешно прочитан, размер:', result.length, 'байт');

        let jsonData;
        try {
          jsonData = JSON.parse(result);
          console.log('JSON успешно разобран');
        } catch (parseError) {
          throw new Error('Ошибка при разборе JSON: ' + (parseError as Error).message);
        }

        this.analyzeData(jsonData);
      } catch (e) {
        console.error('Ошибка при обработке файла:', e);
        this.error = 'Ошибка при обработке файла: ' + (e as Error).message;
        this.isLoading = false;
      }
    };

    reader.onerror = () => {
      console.error('Ошибка при чтении файла');
      this.error = 'Ошибка при чтении файла';
      this.isLoading = false;
    };

    reader.readAsText(this.selectedFile);
  }

  /**
   * Анализирует данные и генерирует отчет
   */
  analyzeData(data: any): void {
    this.isLoading = true;
    this.error = null;

    try {
      console.log('Начинаем анализ данных...');

      // Запускаем анализ данных
      this.report = this.tradingService.analyzeTradingData(data);

      console.log('Анализ данных завершен успешно:', this.report);
      this.isLoading = false;

      // Переключаемся на вкладку сводки
      this.selectedView = 'summary';
    } catch (e) {
      console.error('Ошибка при анализе данных:', e);
      this.error = 'Ошибка при анализе данных: ' + (e as Error).message;
      this.isLoading = false;
    }
  }

  /**
   * Fetches data from API
   */
  fetchData(address: string): void {
    if (!address) {
      this.error = 'Пожалуйста, введите адрес кошелька';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Replace with your actual API endpoint
    this.http.get(`https://your-api.com/transactions?address=${address}`)
      .subscribe({
        next: (data: any) => {
          this.analyzeData(data);
        },
        error: (err) => {
          this.error = 'Ошибка загрузки данных: ' + err.message;
          this.isLoading = false;
        }
      });
  }

  /**
   * Загружает тестовые данные
   */
  loadMockData(): void {
    console.log('Загрузка тестовых данных...');

    this.isLoading = true;
    this.error = null;

    // Создаем базовые тестовые данные
    const mockData = {
      success: true,
      data: [
        // SOL -> TOKEN
        {
          block_id: 12345,
          trans_id: "test-tx-1",
          block_time: Math.floor(Date.now() / 1000) - 86400, // 1 день назад
          activity_type: "ACTIVITY_TOKEN_SWAP",
          from_address: "test-wallet",
          sources: ["test-source"],
          platform: ["test-platform"],
          amount_info: {
            token1: "So11111111111111111111111111111111111111112", // WSOL
            token1_decimals: 9,
            amount1: 1000000000, // 1 SOL
            token2: "TestToken1pump",
            token2_decimals: 6,
            amount2: 10000000000, // 10,000 единиц токена
            routers: []
          },
          value: 100 // $100 USD
        },
        // Частичная продажа TOKEN -> SOL
        {
          block_id: 12346,
          trans_id: "test-tx-2",
          block_time: Math.floor(Date.now() / 1000) - 43200, // 12 часов назад
          activity_type: "ACTIVITY_TOKEN_SWAP",
          from_address: "test-wallet",
          sources: ["test-source"],
          platform: ["test-platform"],
          amount_info: {
            token1: "TestToken1pump",
            token1_decimals: 6,
            amount1: 5000000000, // 5,000 единиц токена
            token2: "So11111111111111111111111111111111111111112", // WSOL
            token2_decimals: 9,
            amount2: 600000000, // 0.6 SOL
            routers: []
          },
          value: 60 // $60 USD
        }
      ]
    };

    console.log('Тестовые данные созданы, начинаем анализ...');
    this.analyzeData(mockData);
  }

  /**
   * Экспортирует отчет в различных форматах
   */
  exportData(format: 'csv' | 'json'): void {
    if (!this.report) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(this.report, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      this.downloadFile(dataUri, 'trading_report.json');
    } else {
      // Генерация CSV
      let csv = 'ID,Buy Date,Sell Date,Token,Amount,Buy Price,Sell Price,P&L,P&L %,Status\n';

      this.report.trades.forEach(trade => {
        csv += `${trade.id},${trade.buyDate},${trade.sellDate || ''},${trade.tokenSymbol},` +
          `${trade.boughtAmount},${trade.buyPrice},${trade.sellPrice || ''},` +
          `${trade.pnl || ''},${trade.pnlPercentage?.toFixed(2) || ''},` +
          `${trade.isComplete ? 'Completed' : 'Open'}\n`;
      });

      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      this.downloadFile(dataUri, 'trading_report.csv');
    }
  }

  /**
   * Вспомогательная функция для скачивания файла
   */
  private downloadFile(dataUri: string, filename: string): void {
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Получить отфильтрованные сделки на основе текущих фильтров
   */
  getFilteredTrades(): Trade[] {
    if (!this.report) return [];

    let filtered = [...this.report.trades];

    // Применяем фильтры
    if (this.showOnlyCompleted) {
      filtered = filtered.filter(t => t.isComplete);
    }

    if (this.showOnlyWinning) {
      filtered = filtered.filter(t => (t.pnl || 0) > 0);
    }

    if (this.selectedToken) {
      filtered = filtered.filter(t => t.token === this.selectedToken);
    }

    if (this.dateRange.start) {
      const startTime = this.dateRange.start.getTime() / 1000;
      filtered = filtered.filter(t => t.buyTimestamp >= startTime);
    }

    if (this.dateRange.end) {
      const endTime = this.dateRange.end.getTime() / 1000;
      filtered = filtered.filter(t => t.buyTimestamp <= endTime);
    }

    // Применяем сортировку
    filtered.sort((a, b) => {
      const aValue = this.getValueForSorting(a, this.sortColumn);
      const bValue = this.getValueForSorting(b, this.sortColumn);

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  /**
   * Получить сделки для текущей страницы
   */
  getCurrentPageTrades(): Trade[] {
    const filtered = this.getFilteredTrades();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(startIndex, startIndex + this.pageSize);
  }

  /**
   * Получить значение для сортировки
   */
  private getValueForSorting(trade: Trade, column: string): any {
    switch (column) {
      case 'buyTimestamp': return trade.buyTimestamp;
      case 'sellTimestamp': return trade.sellTimestamp || 0;
      case 'token': return trade.tokenSymbol;
      case 'boughtAmount': return trade.boughtAmount;
      case 'buyPrice': return trade.buyPrice;
      case 'sellPrice': return trade.sellPrice || 0;
      case 'pnl': return trade.pnl || 0;
      case 'pnlPercentage': return trade.pnlPercentage || 0;
      default: return trade.buyTimestamp;
    }
  }

  /**
   * Сортировка сделок по колонке
   */
  sortTrades(column: string): void {
    if (this.sortColumn === column) {
      // Переключаем направление, если та же колонка
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc'; // По умолчанию сортируем по убыванию
    }
  }

  /**
   * Получить токены, отсортированные по общему PnL
   */
  getOrderedTokenBalances(): any {
    if (!this.report) return [];

    return [...this.report.tokenBalances]
      .sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL));
  }

  /**
   * Сбросить все фильтры
   */
  resetFilters(): void {
    this.showOnlyCompleted = false;
    this.showOnlyWinning = false;
    this.selectedToken = null;
    this.dateRange = { start: null, end: null };
    this.currentPage = 1;
  }

  /**
   * Получить общее количество страниц
   */
  get totalPages(): number {
    if (!this.report) return 1;
    return Math.ceil(this.getFilteredTrades().length / this.pageSize);
  }

  /**
   * Вспомогательный объект Math для использования в шаблоне
   */
  get Math(): any {
    return Math;
  }

  /**
   * Получить класс статуса сделки
   */
  getTradeStatusClass(trade: Trade): string {
    if (!trade.isComplete) return 'warning';
    return (trade.pnl || 0) > 0 ? 'success' : 'danger';
  }

  protected readonly Infinity = Infinity;
}
