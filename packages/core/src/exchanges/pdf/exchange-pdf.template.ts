import MarkdownIt from 'markdown-it';
import { Exchange } from '../entities/exchange.entity';
import { ExchangeFlow } from '../entities/exchange-flow.entity';
import { Tension } from '../../tensions/entities/tension.entity';

const markdownIt = new MarkdownIt({ html: false, linkify: true, breaks: false });

const md = (input: string | null | undefined): string =>
  input ? markdownIt.render(input) : '';

const escape = (input: string | null | undefined): string => {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export interface ExchangePdfData {
  exchange: Exchange;
  flows: ExchangeFlow[];
  tension: Tension | null;
}

export function renderExchangePdfHtml(data: ExchangePdfData): string {
  const { exchange, flows, tension } = data;
  const today = new Date().toISOString().slice(0, 10);

  const tensionSection = tension
    ? `
      <section class="card">
        <h2>Tension</h2>
        <div class="row">
          <div class="title">${escape(tension.name)}</div>
        </div>
        ${tension.agent ? `<div class="meta">Agent: ${escape(tension.agent.name)}</div>` : ''}
        ${
          tension.currentContext
            ? `<div class="subhead">Current Context</div><div class="markdown">${md(tension.currentContext)}</div>`
            : ''
        }
        ${
          tension.potentialFuture
            ? `<div class="subhead">Potential Future</div><div class="markdown">${md(tension.potentialFuture)}</div>`
            : ''
        }
      </section>
    `
    : '';

  const partiesRows = (exchange.parties ?? [])
    .map(
      (p) => `
        <tr>
          <td>${escape(p.agent?.name ?? '')}</td>
          <td>${escape(p.role ?? '')}</td>
        </tr>
      `,
    )
    .join('');

  const flowsRows = flows
    .map((f) => {
      const valueName = f.value?.name ?? f.valueInstance?.name ?? '—';
      return `
        <tr>
          <td>${escape(f.fromAgent?.name ?? '')}</td>
          <td class="arrow">→</td>
          <td>${escape(f.toAgent?.name ?? '')}</td>
          <td>${escape(valueName)}</td>
          <td class="num">${escape(f.quantity)}</td>
        </tr>
      `;
    })
    .join('');

  const seenValueIds = new Set<string>();
  const valueReferenceRows = flows
    .flatMap((f) => {
      const ref = f.value ?? f.valueInstance;
      if (!ref || seenValueIds.has(ref.id)) return [];
      seenValueIds.add(ref.id);
      return [{ name: ref.name, purpose: ref.purpose ?? '' }];
    })
    .map(
      (v) => `
        <tr>
          <td>${escape(v.name)}</td>
          <td>${escape(v.purpose)}</td>
        </tr>
      `,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Exchange Proposal — ${escape(exchange.name)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    font-size: 11pt;
    line-height: 1.5;
  }
  .gradient-bar {
    height: 8px;
    background: linear-gradient(90deg, #4ade80, #2dd4bf, #a855f7);
  }
  .header {
    padding: 24px 32px 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 1px solid #e5e7eb;
  }
  .brand {
    background: linear-gradient(90deg, #4ade80, #2dd4bf, #a855f7);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 800;
    font-size: 14pt;
    letter-spacing: 0.02em;
  }
  .kicker {
    font-size: 9pt;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .title-main {
    font-size: 22pt;
    font-weight: 700;
    margin: 4px 0 0;
  }
  .header-right {
    text-align: right;
    color: #64748b;
    font-size: 9pt;
  }
  .content { padding: 24px 32px; }
  section.card {
    margin-bottom: 20px;
    padding: 16px 18px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    page-break-inside: avoid;
  }
  section.card h2 {
    margin: 0 0 12px;
    font-size: 13pt;
    color: #0f172a;
  }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .title { font-size: 12pt; font-weight: 600; }
  .meta { color: #64748b; font-size: 10pt; margin: 4px 0 8px; }
  .subhead {
    margin: 12px 0 4px;
    font-size: 10pt;
    font-weight: 600;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 9pt;
    font-weight: 600;
    background: #e2e8f0;
    color: #0f172a;
  }
  .markdown p { margin: 6px 0; }
  .markdown ul, .markdown ol { margin: 6px 0; padding-left: 22px; }
  .markdown h1 { font-size: 14pt; margin: 12px 0 6px; }
  .markdown h2 { font-size: 12pt; margin: 10px 0 6px; }
  .markdown h3 { font-size: 11pt; margin: 8px 0 4px; }
  .markdown code {
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9.5pt;
  }
  .markdown pre {
    background: #f1f5f9;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
  }
  .grid {
    display: grid;
    grid-template-columns: 160px 1fr;
    row-gap: 6px;
    column-gap: 12px;
    font-size: 10pt;
  }
  .grid .k { color: #64748b; }
  .grid .v { color: #0f172a; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  thead tr { background: #f8fafc; }
  th, td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    vertical-align: top;
  }
  th { font-weight: 600; color: #475569; }
  td.num { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; }
  td.arrow { color: #94a3b8; text-align: center; width: 16px; }
  a { color: #0f172a; text-decoration: underline; }
</style>
</head>
<body>
  <div class="gradient-bar"></div>
  <div class="header">
    <div>
      <div class="brand">Marketlum</div>
      <div class="kicker">Exchange Proposal</div>
      <h1 class="title-main">${escape(exchange.name)}</h1>
    </div>
    <div class="header-right">
      <div>${today}</div>
    </div>
  </div>

  <div class="content">
    ${tensionSection}

    <section class="card">
      <h2>Exchange</h2>
      <div class="grid">
        ${exchange.purpose ? `<div class="k">Purpose</div><div class="v">${escape(exchange.purpose)}</div>` : ''}
        ${exchange.valueStream ? `<div class="k">Value stream</div><div class="v">${escape(exchange.valueStream.name)}</div>` : ''}
        ${exchange.lead ? `<div class="k">Lead</div><div class="v">${escape(exchange.lead.name)}</div>` : ''}
        ${exchange.link ? `<div class="k">Link</div><div class="v"><a href="${escape(exchange.link)}">${escape(exchange.link)}</a></div>` : ''}
      </div>
      ${
        exchange.description
          ? `<div class="subhead">Description</div><div class="markdown">${md(exchange.description)}</div>`
          : ''
      }
    </section>

    ${
      partiesRows
        ? `
      <section class="card">
        <h2>Parties</h2>
        <table>
          <thead><tr><th>Agent</th><th>Role</th></tr></thead>
          <tbody>${partiesRows}</tbody>
        </table>
      </section>
    `
        : ''
    }

    <section class="card">
      <h2>Flows</h2>
      ${
        flowsRows
          ? `<table>
        <thead>
          <tr>
            <th>From</th>
            <th></th>
            <th>To</th>
            <th>Value</th>
            <th class="num">Quantity</th>
          </tr>
        </thead>
        <tbody>${flowsRows}</tbody>
      </table>`
          : `<div class="meta">No flows</div>`
      }
    </section>

    ${
      valueReferenceRows
        ? `
      <section class="card">
        <h2>Value Reference</h2>
        <table>
          <thead>
            <tr>
              <th>Value</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>${valueReferenceRows}</tbody>
        </table>
      </section>
    `
        : ''
    }
  </div>
</body>
</html>`;
}

export function slugifyExchangeName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'exchange'
  );
}
