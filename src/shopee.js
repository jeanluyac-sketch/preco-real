// Cliente da API de afiliados da Shopee Brasil (GraphQL).
// Credenciais: painel de afiliado > Open API (AppID e Secret).
import { createHash } from 'node:crypto';

export const URL_SHOPEE = 'https://open-api.affiliate.shopee.com.br/graphql';

export function assinatura({ appId, segredo, timestamp, corpo }) {
  return createHash('sha256').update(`${appId}${timestamp}${corpo}${segredo}`).digest('hex');
}

const QUERY = `query ($keyword: String, $page: Int, $limit: Int) {
  productOfferV2(keyword: $keyword, sortType: 2, page: $page, limit: $limit) {
    nodes { itemId productName price priceMin priceMax commissionRate sales ratingStar shopName imageUrl offerLink productLink }
    pageInfo { page limit hasNextPage }
  }
}`;

export function criarShopee({ appId, segredo, fetchFn = fetch, log = () => {}, agora = () => Date.now() }) {
  async function chamar(variables) {
    const corpo = JSON.stringify({ query: QUERY, variables });
    const timestamp = Math.floor(agora() / 1000);
    const r = await fetchFn(URL_SHOPEE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${assinatura({ appId, segredo, timestamp, corpo })}`,
      },
      body: corpo,
    });
    const j = await r.json();
    if (!r.ok || j.errors?.length) throw new Error(`Shopee ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
    return j.data.productOfferV2;
  }

  return {
    async buscar(termo, paginas = 1) {
      const out = [];
      for (let page = 1; page <= paginas; page++) {
        const d = await chamar({ keyword: termo, page, limit: 50 });
        for (const n of d.nodes || []) {
          // Anúncio com faixa de preço = variações de tamanho/sabor: não dá para saber qual é qual.
          if (n.priceMin && n.priceMax && Number(n.priceMin) !== Number(n.priceMax)) continue;
          out.push({
            id: `shopee:${n.itemId}`,
            loja: 'Shopee',
            titulo: n.productName,
            preco: Number(n.price ?? n.priceMin),
            vendas: Number(n.sales || 0),
            nota: Number(n.ratingStar || 0),
            vendedor: n.shopName || '',
            imagem: n.imageUrl || '',
            link: n.offerLink || n.productLink,
            comissao: Number(n.commissionRate || 0),
          });
        }
        log(`shopee "${termo}" pág ${page}: ${d.nodes?.length || 0}`);
        if (!d.pageInfo?.hasNextPage) break;
      }
      return out;
    },
  };
}
