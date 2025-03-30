import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WalletSwapsComponent } from './modules/wallet-swaps/wallet-swaps.component';
import {TradingHistoryComponent} from './modules/trading-anasysis/trading-history.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TradingHistoryComponent],
  template: `
    <div class="container">
      <h1>Просмотр свопов Solana-кошелька</h1>
      <app-trading-history/>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }
  `]
})
export class AppComponent {
  title = 'Solana Wallet Swaps Viewer';
}
