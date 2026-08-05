# Posto Gestão V2

Sistema web para posto de combustível, criado em React + TypeScript + Vite.

## O que já funciona nesta versão

- Login demonstrativo
- Dashboard calculado pelos dados reais da aplicação
- Abertura e fechamento de caixa
- Entrada, saída, sangria e suprimento de caixa
- Vendas/abastecimentos
- Baixa automática do combustível ao vender
- Bloqueio de venda quando não há estoque suficiente
- Venda a prazo / fiado
- Limite de crédito por cliente
- Contas a receber
- Pagamentos totais e parciais
- Pagamento refletido no caixa aberto
- Cancelamento de venda com devolução de combustível ao tanque
- Clientes
- Combustíveis e preços
- Tanques e estoque em litros
- Entrada de combustível
- Ajuste de estoque
- Histórico de movimentações de estoque
- Despesas vinculadas ao caixa
- Fornecedores
- Funcionários / frentistas
- Usuários e perfis
- Auditoria
- Relatórios/resumo financeiro
- Configurações do posto
- Persistência local via localStorage

## Login

- E-mail: `admin@postogestao.com`
- Senha: `123456`

Também aceita `gerente@postogestao.com` com a mesma senha na demonstração.

## Rodar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Importante

A V2 salva os dados no navegador (localStorage), então ela é funcional para desenvolvimento e demonstração em um computador.

Para produção, multiusuário, segurança real, backup e acesso de vários dispositivos, o próximo passo é conectar esta mesma interface ao Supabase/PostgreSQL com autenticação e RLS. A estrutura foi deixada preparada para essa evolução.
