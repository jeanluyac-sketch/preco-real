# Preço Real: plano

## O que é
Três robôs (suplementos, pet e fraldas) que rodam no mesmo código, quatro vezes por dia, no GitHub Actions (grátis). Cada um:
1. busca anúncios na Shopee pela API oficial de afiliado (o link já vem com a sua comissão);
2. lê o título e calcula o preço por 100 g, por kg ou por fralda, descartando o que for ambíguo (cápsulas, combos, anúncio com vários tamanhos, loja com nota < 4,5 ou menos de 50 vendas);
3. guarda o histórico de preço de cada anúncio;
4. só posta quando a queda é real: ≥ 10% abaixo da média de 90 dias **e** menor preço dos últimos 30 dias, com pelo menos 7 dias de histórico;
5. envia para o canal do Telegram do nicho e atualiza a página com os rankings.

## Hierarquia
| Prioridade | Nicho | Categorias | Posts por rodada (máx.) |
|---|---|---|---|
| 1 | Suplementos | creatina, whey (isolado, concentrado, blend) | 3 |
| 2 | Pet | ração cães, ração gatos, areia (sílica, madeira, bentonita) | 2 |
| 3 | Fraldas | fralda infantil por tamanho (RN a XXXG) | 2 |

Trocar a ordem, o limite de posts ou criar um 4º nicho é editar um arquivo em `nichos/`. Quando houver números reais (cliques e vendas por nicho), a gente reordena com base neles.

## O que você precisa fazer (uma vez, ~40 min)
1. **Shopee Afiliados:** cadastrar em affiliate.shopee.com.br com CPF e conta bancária. Depois, no painel, pedir acesso à **Open API** e me passar que saiu (o AppID e o Secret vão direto nos "Secrets" do GitHub, não no chat). A aprovação pode levar alguns dias.
2. **Telegram:** falar com o @BotFather e criar um bot (ele dá um token). Criar 3 canais públicos (ex.: "Preço Real Suplementos", "Preço Real Pet", "Preço Real Fraldas") e adicionar o bot como administrador em cada um.
3. **GitHub:** criar um repositório vazio chamado `preco-real` e me avisar. Eu subo o código; você só cola os segredos em Settings > Secrets and variables > Actions e ativa o Pages (Source: GitHub Actions).

## Primeiras semanas (expectativa honesta)
- Dias 1–7: o robô só coleta e monta histórico; a página já mostra o ranking de preço por grama/kg/fralda, mas ainda não há "oferta real".
- A partir do dia 8: começam os posts. O canal precisa de gente: divulgar o link do canal nos vídeos curtos e no Pinterest é o que traz público.
- Não testei contra a API real daqui (a nuvem bloqueia Shopee e Mercado Livre). A primeira rodada no GitHub vai confirmar os nomes dos campos; se algo vier diferente, o ajuste é pequeno.

## Depois (não é preciso agora)
- Mercado Livre e Amazon como fontes (a Amazon só libera a API depois das primeiras vendas; o Mercado Livre não tem API pública confirmada para gerar link de afiliado).
- Lista de marcas de creatina com laudo aprovado (`marcasConfiaveis` no nicho), assim que tivermos uma fonte confiável.
- Postagem automática no Pinterest pela integração Shopee x Pinterest.
