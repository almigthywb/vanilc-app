import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CustomerShell } from "@/components/site/customer-shell";
import { ProductCard } from "@/components/site/product-card";
import { categoriesQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/cardapio/$slug")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(categoriesQuery);
    context.queryClient.ensureQueryData(productsQuery);
  },
  head: ({ params }) => ({
    meta: [
      { title: `${capitalize(params.slug)} — Vanilc Churrascaria` },
      {
        name: "description",
        content: `Veja todos os produtos da categoria ${params.slug} da Vanilc Churrascaria.`,
      },
      { property: "og:title", content: `${capitalize(params.slug)} — Vanilc Churrascaria` },
      { property: "og:description", content: `Veja todos os produtos da categoria ${params.slug} da Vanilc Churrascaria.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ErrorView,
  notFoundComponent: () => (
    <CustomerShell>
      <p className="p-8 text-center text-muted-foreground">Categoria não encontrada.</p>
    </CustomerShell>
  ),
  component: CategoryPage,
});

function ErrorView() {
  const router = useRouter();
  return (
    <CustomerShell>
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Erro ao carregar.</p>
        <button onClick={() => router.invalidate()} className="mt-2 text-primary underline">
          Tentar novamente
        </button>
      </div>
    </CustomerShell>
  );
}

function CategoryPage() {
  return (
    <CustomerShell>
      <CategoryContent />
    </CustomerShell>
  );
}

function CategoryContent() {
  const { slug } = Route.useParams();
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);

  const isPromoView = slug === "promocoes";
  const category = isPromoView
    ? { id: "__promo__", name: "Promoções", slug: "promocoes" }
    : categories.find((c) => c.slug === slug);
  if (!category) throw notFound();

  const items = isPromoView
    ? products.filter(
        (p) => p.is_promo && p.promo_price != null && p.promo_price < p.price && p.available,
      )
    : products.filter((p) => p.category_id === category.id);

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">{category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "produto" : "produtos"} disponíveis
        </p>
      </header>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Em breve novidades nesta categoria.
        </p>
      ) : (
        <div className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
