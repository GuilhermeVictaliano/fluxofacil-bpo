# FluxoFácil BPO

Ideia e protótipo de um painel de BPO financeiro para pequenas empresas: cadastro de receitas e despesas, controle de pagamentos e análises num só lugar.

![Status: ideia / protótipo](https://img.shields.io/badge/status-ideia_%2F_prot%C3%B3tipo-lightgrey)

> Este repositório guarda a ideia e um protótipo funcional. Não está em produção.

## A ideia

Pequenas empresas que terceirizam ou fazem o próprio financeiro precisam registrar entradas e saídas, saber o que está pendente, pago ou vencido e enxergar para onde vai o dinheiro, sem uma planilha diferente para cada coisa.

## O que o protótipo faz

- Login por CPF ou CNPJ.
- Cadastro de transações: receita ou despesa, categoria, valor, vencimento, método de pagamento (à vista ou parcelado, com parcelas).
- Status de cada transação: pendente, pago ou vencido.
- Padrões de descrição e de categoria, para cadastrar mais rápido.
- Dashboard financeiro, histórico de transações e aba de análises.

## Stack

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Supabase (autenticação e banco). Protótipo gerado com Lovable.

## Rodar localmente

```sh
npm install
cp .env.example .env   # preencha com os dados do seu projeto Supabase
npm run dev
```

## Contato

[guilhermesint.gerencia@gmail.com](mailto:guilhermesint.gerencia@gmail.com) · portfólio [guilhermevictaliano.github.io](https://guilhermevictaliano.github.io) · LinkedIn [linkedin.com/in/guilherme-victaliano-de-meira-b73933343](https://www.linkedin.com/in/guilherme-victaliano-de-meira-b73933343)
