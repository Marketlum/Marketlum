import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Browser } from 'puppeteer';
import { ExchangesService } from '../exchanges.service';
import { ExchangeFlowsService } from '../exchange-flows.service';
import { Tension } from '../../tensions/entities/tension.entity';
import { renderExchangePdfHtml, slugifyExchangeName } from './exchange-pdf.template';

@Injectable()
export class ExchangePdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;

  constructor(
    private readonly exchangesService: ExchangesService,
    private readonly flowsService: ExchangeFlowsService,
    @InjectRepository(Tension)
    private readonly tensionRepository: Repository<Tension>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const puppeteer = await import('puppeteer');
      this.browserPromise = puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browserPromise;
  }

  async generate(exchangeId: string): Promise<{ buffer: Buffer; filename: string }> {
    const exchange = await this.exchangesService.findOne(exchangeId);
    const flows = await this.flowsService.findAll(exchangeId);

    let tension: Tension | null = null;
    if (exchange.tensionId) {
      tension = await this.tensionRepository.findOne({
        where: { id: exchange.tensionId },
        relations: ['agent'],
      });
    }

    const html = renderExchangePdfHtml({ exchange, flows, tension });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '12mm', bottom: '16mm', left: '12mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size:8pt; color:#94a3b8; width:100%; padding:0 12mm; display:flex; justify-content:space-between;">
            <span>Generated ${new Date().toISOString().slice(0, 10)}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });
      const buffer = Buffer.from(pdfData);
      return {
        buffer,
        filename: `exchange-${slugifyExchangeName(exchange.name)}.pdf`,
      };
    } finally {
      await page.close();
    }
  }
}
