# Vanilc — Plataforma de Delivery para Churrasqueira

Plataforma completa de delivery inspirada em iFood/Uber Eats, com área pública para clientes (sem login) e painel administrativo protegido. Backend via Lovable Cloud (PostgreSQL + Auth + Storage).

## Identidade visual

- **Paleta**: preto profundo, vermelho escuro, laranja queimado (#E85D1C aprox.), creme/off-white, branco. Tipografia display com peso para títulos ("CHURRASCO"), sans humanista para corpo.
- **Estilo**: fotos grandes de comida, cards arredondados, sombras suaves, microinterações em hover/add-to-cart, ícones lucide, layout mobile-first.
- Logo "Vanilc" gerado em SVG/imagem (estilo da referência).

## Estrutura de rotas

### Área do cliente (pública, sem login)

- `/` — Home com hero, destaques, combos, categorias, badges de confiança
- `/cardapio` — Cardápio completo agrupado por categoria, com filtros
- `/cardapio/$categoria` — Categoria específica
- `/produto/$id` — Detalhe do produto com adicionais/opcionais
- `/carrinho` — Carrinho lateral (drawer no mobile, sidebar no desktop) + página dedicada
- `/checkout` — Dados, tipo de entrega, pagamento, resumo, confirmação → WhatsApp
- Banner global "Estamos fechados" quando loja fechada (bloqueia checkout, permite navegar)

### Painel admin (`/_authenticated/admin/*`)

- `/auth` — Login admin
- `/admin` — Dashboard (KPIs, toggle aberto/fechado, pedidos recentes)
- `/admin/pedidos` — Lista + filtros (hoje/semana/mês/status) + detalhe com mudança de status
- `/admin/produtos` — CRUD + upload de foto + opcionais
- `/admin/categorias` — CRUD + ordenação + imagem
- `/admin/clientes` — Lista agregada por telefone
- `/admin/relatorios` — Vendas por período, top produtos, clientes recorrentes
- `/admin/configuracoes` — Logo, banner, endereço, horário, WhatsApp, taxas (cidade/fora), tempo de preparo, status aberto/fechado

## Modelo de dados (Lovable Cloud)

```
categories(id, name, slug, image_url, sort_order, active)
products(id, category_id, name, description, price, image_url, is_promo, promo_price, available, sort_order)
product_options(id, product_id, name, type[single|multi], required, min, max)
product_option_items(id, option_id, name, extra_price)
customers(id, phone unique, first_name, last_name, total_orders, total_spent, last_order_at)
orders(id, customer_id, status, delivery_type[pickup|city|outside], address, payment_method, subtotal, delivery_fee, total, notes, created_at)
order_items(id, order_id, product_id, name_snapshot, qty, unit_price, options_snapshot jsonb, notes)
settings(id=1, store_open, whatsapp_number, delivery_fee_city, delivery_fee_outside, prep_time_min, prep_time_max, address, business_hours jsonb, logo_url, banner_url)
user_roles(user_id, role) — para gate admin
```

RLS: leituras públicas em `categories`, `products`, `product_options`, `settings`; escritas restritas a admins. Inserção de `orders/customers` permitida a anon (checkout sem login) com validação.

## Integração WhatsApp

No checkout, após "Confirmar Pedido":

1. Persistir pedido + cliente (upsert por telefone).
2. Montar mensagem formatada (modelo da spec).
3. Abrir `https://wa.me/<numero_do_settings>?text=<encoded>`.
4. Número lido dinamicamente de `settings.whatsapp_number` — alterável no admin sem deploy.

## Estado do carrinho

Zustand (ou Context) persistido em `localStorage`. Limpa após checkout confirmado.

## Plano de execução (faseado)

1. **Setup base**: ativar Lovable Cloud, migrations (tabelas + RLS + grants + seed inicial de categorias/configurações + admin role helper), design system (`styles.css` com tokens da paleta), layout cliente (header, sidebar de categorias, footer).
2. **Catálogo cliente**: Home, Cardápio, Produto (com opcionais), Carrinho.
3. **Checkout + WhatsApp**: formulário multi-step, cálculo de taxa, persistência de pedido, redirect WhatsApp, bloqueio quando fechado.
4. **Auth admin + Dashboard**: `_authenticated/admin`, KPIs, toggle aberto/fechado.
5. **CRUDs admin**: pedidos (com status), produtos (+upload+opcionais), categorias, clientes, relatórios.
6. **Configurações**: WhatsApp, taxas, horário, tempo de preparo, logo/banner.
7. **Polish**: responsivo, animações, SEO básico, sitemap.

## Notas técnicas

- TanStack Start + TanStack Query para data fetching (loaders + `useSuspenseQuery`).
- `createServerFn` para criação de pedidos e operações admin protegidas; rotas públicas usam cliente Supabase publishable.
- Upload de imagens via Supabase Storage (buckets `products`, `categories`, `branding`).
- Primeiro admin criado via migration manual (você fornece o email, eu insero o role após sign-up).

## Pendências para você decidir

Vou perguntar antes de começar a implementar.