// Formata e envia os posts para o canal do Telegram de cada nicho.
import { rotuloUnidade, rotuloQuantidade } from './produto.js';

export const reais = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function montarPost({ produto, oferta, cat }) {
  const nome = `${cat.nome}${produto.subtipo ? ` (${produto.subtipo})` : ''}`;
  const un = rotuloUnidade(cat);
  return [
    `🔻 <b>${esc(nome)}, ${rotuloQuantidade(cat, produto.quantidade)}, abaixo do preço normal</b>`,
    esc(produto.titulo),
    '',
    `💰 ${reais(produto.preco)}, ou <b>${reais(produto.pu)} por ${un}</b>`,
    `📉 ${oferta.queda}% abaixo da média dos últimos 90 dias (${reais(oferta.mediana90)} por ${un}) e o menor preço em 30 dias`,
    `🛒 ${esc(produto.loja)}: ${esc(produto.link)}`,
    '',
    '<i>Link de afiliado: posso ganhar comissão, sem custo extra para você. Preços mudam rápido.</i>',
  ].join('\n');
}

export function criarTelegram({ token, fetchFn = fetch }) {
  return {
    async enviar(canal, texto) {
      const r = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: canal, text: texto, parse_mode: 'HTML' }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(`Telegram: ${j.description}`);
    },
  };
}
