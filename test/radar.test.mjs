import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { analisar, gramas, itens, embalagens } from '../src/produto.js';
import { registrar, resumo } from '../src/historico.js';
import { ehOfertaReal } from '../src/oferta.js';
import { criarShopee, assinatura } from '../src/shopee.js';
import { rodar, carregarNichos } from '../src/rodar.js';

const N = Object.fromEntries(carregarNichos('nichos').map((n) => [n.id, n]));
const sup = N.suplementos, pet = N.pet, fr = N.fraldas;

test('nichos carregam em ordem de prioridade', () => {
  assert.deepEqual(carregarNichos('nichos').map((n) => n.id), ['suplementos', 'pet', 'fraldas']);
});

test('suplementos: creatina e whey, preço por 100 g', () => {
  const c = analisar({ titulo: 'Creatina Monohidratada 300g Max Titanium', preco: 69.9 }, sup);
  assert.equal(c.categoria, 'creatina');
  assert.equal(c.quantidade, 300);
  assert.equal(c.pu, 23.3);
  const k = analisar({ titulo: 'Kit 2 Creatina Pura 1kg Growth', preco: 260 }, sup);
  assert.equal(k.quantidade, 2000);
  assert.equal(k.pu, 13);
  const w = analisar({ titulo: 'Whey Protein Isolado 900g Baunilha', preco: 189.9 }, sup);
  assert.equal(w.subtipo, 'isolado');
  const lb = analisar({ titulo: 'Whey Protein Concentrado 2 lbs Chocolate', preco: 150 }, sup);
  assert.equal(lb.quantidade, 907);
});

test('suplementos: descarta o que não dá para comparar', () => {
  assert.equal(analisar({ titulo: 'Creatina 120 cápsulas', preco: 50 }, sup), null);
  assert.equal(analisar({ titulo: 'Creatina 100g 300g 1kg escolha', preco: 30 }, sup), null);
  assert.equal(analisar({ titulo: 'Kit Whey 900g + Creatina 300g', preco: 200 }, sup), null);
  assert.equal(analisar({ titulo: 'Coqueteleira para whey 600ml', preco: 20 }, sup), null);
  assert.equal(analisar({ titulo: 'Creatina 300g', preco: 2 }, sup), null); // preço absurdo
});

test('pet: ração por kg, separa cães e gatos, ignora sachê', () => {
  const r = analisar({ titulo: 'Ração Golden Cães Adultos Frango 15kg', preco: 189.9 }, pet);
  assert.equal(r.categoria, 'racao-caes');
  assert.equal(r.pu, 12.66);
  const g = analisar({ titulo: 'Ração Premier Gatos Castrados 10,1 kg', preco: 299 }, pet);
  assert.equal(g.categoria, 'racao-gatos');
  assert.equal(g.quantidade, 10100);
  const a = analisar({ titulo: 'Areia Sílica para Gatos 1,6kg', preco: 39.9 }, pet);
  assert.equal(a.categoria, 'areia-gatos');
  assert.equal(a.subtipo, 'sílica');
  assert.equal(analisar({ titulo: 'Ração úmida sachê gatos 85g', preco: 3 }, pet), null);
  assert.equal(analisar({ titulo: 'Ração 15kg sabor carne', preco: 150 }, pet), null); // não diz se é cão ou gato
});

test('fraldas: preço por fralda e tamanho obrigatório', () => {
  const f = analisar({ titulo: 'Fralda Pampers Confort Sec G 80 Unidades', preco: 99.9 }, fr);
  assert.equal(f.subtipo, 'G');
  assert.equal(f.quantidade, 80);
  assert.equal(f.pu, 1.25);
  const k = analisar({ titulo: 'Kit 4 Pacotes Fralda Huggies Supreme Care XG 30 unidades', preco: 200 }, fr);
  assert.equal(k.quantidade, 120);
  assert.equal(k.subtipo, 'XG');
  assert.equal(analisar({ titulo: 'Fralda Pampers 80 Unidades', preco: 99 }, fr), null); // sem tamanho
  assert.equal(analisar({ titulo: 'Fralda Geriátrica Bigfral G 8 unidades', preco: 30 }, fr), null);
});

test('leitura de quantidades', () => {
  assert.equal(gramas('Ração 10,1kg'), 10100);
  assert.equal(gramas('creatina 250 gr'), 250);
  assert.equal(itens('Fralda c/ 46'), 46);
  assert.equal(itens('Fralda 48 fraldas 48 un'), 48);
  assert.equal(embalagens('2 pacotes fralda', 'unidade'), 2);
  assert.equal(embalagens('Kit 3 Creatina 300g', 'peso'), 3);
});

const dia = (d) => new Date(`2026-11-${String(d).padStart(2, '0')}T12:00:00Z`);
const prod = (pu) => ({ id: 'x', titulo: 't', categoria: 'creatina', loja: 'Shopee', quantidade: 300, link: 'l', pu, preco: pu * 3 });

test('oferta real: precisa de histórico, 10% abaixo da mediana e menor de 30 dias', () => {
  const hist = {};
  for (let d = 1; d <= 8; d++) registrar(hist, prod(d === 3 ? 18 : 20), dia(d));
  const regra = { diasMinimosDeHistorico: 7, quedaMinima: 0.1 };
  assert.equal(ehOfertaReal(prod(17.5), hist.x, dia(9), regra).queda, 13);
  assert.equal(ehOfertaReal(prod(18.5), hist.x, dia(9), regra), null); // não bate o mínimo de 30 dias (18)
  const curto = {};
  for (let d = 1; d <= 3; d++) registrar(curto, prod(20), dia(d));
  assert.equal(ehOfertaReal(prod(10), curto.x, dia(4), regra), null); // pouco histórico
  // "desconto de mentira": sobe o preço e depois "baixa" para o normal
  const truque = {};
  for (let d = 1; d <= 8; d++) registrar(truque, prod(d >= 6 ? 30 : 20), dia(d));
  assert.equal(ehOfertaReal(prod(20), truque.x, dia(9), regra), null);
});

test('histórico guarda o menor preço do dia', () => {
  const h = {};
  registrar(h, prod(20), dia(1));
  registrar(h, prod(19), new Date('2026-11-01T18:00:00Z'));
  registrar(h, prod(21), new Date('2026-11-01T20:00:00Z'));
  assert.equal(h.x.pontos.length, 1);
  assert.equal(h.x.pontos[0].pu, 19);
  assert.equal(resumo(h.x, dia(2)).dias, 1);
});

test('Shopee: assinatura e leitura da resposta', async () => {
  assert.equal(assinatura({ appId: 'A', segredo: 'S', timestamp: 1, corpo: '{}' }), createHash('sha256').update('A1{}S').digest('hex'));
  let chamada;
  const fetchFn = async (url, opt) => {
    chamada = opt;
    return { ok: true, status: 200, json: async () => ({ data: { productOfferV2: { nodes: [
      { itemId: 1, productName: 'Creatina 300g', price: '59.90', priceMin: '59.90', priceMax: '59.90', sales: 900, ratingStar: '4.8', shopName: 'Loja', offerLink: 'https://s.shopee.com.br/abc' },
      { itemId: 2, productName: 'Creatina 100g 300g', price: '19.90', priceMin: '19.90', priceMax: '59.90' },
    ], pageInfo: { hasNextPage: false } } } }) };
  };
  const s = criarShopee({ appId: 'A', segredo: 'S', fetchFn, agora: () => 1000 });
  const r = await s.buscar('creatina');
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'shopee:1');
  assert.equal(r[0].link, 'https://s.shopee.com.br/abc');
  assert.match(chamada.headers.Authorization, /^SHA256 Credential=A, Timestamp=1, Signature=[0-9a-f]{64}$/);
});

test('rodada completa: 3 nichos, posta só queda real, respeita limite por nicho e gera página', async () => {
  const pasta = mkdtempSync(`${tmpdir()}/radar-`);
  cpSync('nichos', `${pasta}/nichos`, { recursive: true });
  const precos = { 1: 69.9, 2: 89.9, 3: 99.9 };
  let rodada = 0;
  const fonte = {
    async buscar(termo) {
      const base = [
        { id: 'shopee:1', loja: 'Shopee', titulo: 'Creatina Monohidratada 300g', preco: precos[1], vendas: 500, nota: 4.9, vendedor: 'A', link: 'https://s.shopee.com.br/1' },
        { id: 'shopee:2', loja: 'Shopee', titulo: 'Ração Golden Cães Adultos 15kg', preco: 189.9, vendas: 500, nota: 4.9, vendedor: 'B', link: 'https://s.shopee.com.br/2' },
        { id: 'shopee:3', loja: 'Shopee', titulo: 'Fralda Pampers G 80 unidades', preco: 99.9, vendas: 500, nota: 4.9, vendedor: 'C', link: 'https://s.shopee.com.br/3' },
        { id: 'shopee:4', loja: 'Shopee', titulo: 'Creatina 300g loja nova', preco: 10.9, vendas: 2, nota: 5, vendedor: 'D', link: 'x' },
      ];
      if (rodada === 9) base[0] = { ...base[0], preco: 49.9 }; // queda real no dia 9
      return base;
    },
  };
  const env = { TELEGRAM_CANAL_SUPLEMENTOS: '@sup' };
  const enviados = [];
  const telegram = { async enviar(canal, t) { enviados.push({ canal, t }); } };
  for (rodada = 1; rodada <= 9; rodada++) {
    await rodar({ nichosDir: `${pasta}/nichos`, dadosDir: `${pasta}/dados`, siteDir: `${pasta}/site`, env, fontes: [fonte], telegram, agora: dia(rodada), log: () => {} });
  }
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].canal, '@sup');
  assert.match(enviados[0].t, /16,63 por 100 g/);
  assert.match(enviados[0].t, /Link de afiliado/);
  const hist = JSON.parse(readFileSync(`${pasta}/dados/suplementos-historico.json`, 'utf8'));
  assert.equal(hist['shopee:4'], undefined); // loja com poucas vendas fica de fora
  assert.ok(existsSync(`${pasta}/dados/pet-historico.json`));
  const html = readFileSync(`${pasta}/site/index.html`, 'utf8');
  assert.ok(html.indexOf('id="suplementos"') < html.indexOf('id="pet"'));
  assert.ok(html.indexOf('id="pet"') < html.indexOf('id="fraldas"'));
  assert.match(html, /R\$\s?1,25/);
  // rodar de novo no mesmo dia não repete o post
  await rodar({ nichosDir: `${pasta}/nichos`, dadosDir: `${pasta}/dados`, siteDir: `${pasta}/site`, env, fontes: [fonte], telegram, agora: new Date('2026-11-09T18:00:00Z'), log: () => {} });
  assert.equal(enviados.length, 1);
});
