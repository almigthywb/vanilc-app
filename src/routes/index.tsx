import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Headphones, Award } from "lucide-react";
import { CustomerShell } from "@/components/site/customer-shell";
import { ProductCard } from "@/components/site/product-card";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import heroImg from "@/assets/hero-churrasco.jpg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(categoriesQuery);
    context.queryClient.ensureQueryData(productsQuery);
    context.queryClient.ensureQueryData(settingsQuery);
  },
  head: () => ({ meta: [
    { title: "Vanilc Churrascaria — Churrasco em Luanda" },
    { name: "description", content: "Peça picanha, costela, combos e bebidas com entrega em Luanda." },
    { property: "og:title", content: "Vanilc Churrascaria — Churrasco em Luanda" },
    { property: "og:description", content: "Peça picanha, costela, combos e bebidas com entrega em Luanda." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: HomePage,
});

function HomePage() {
  return (
    <CustomerShell>
      <HomeContent />
    </CustomerShell>
  );
}

function HomeContent() {
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const isMobile = useIsMobile();

  const heroSrc =
    (isMobile ? settings.banner_url_mobile : settings.banner_url_desktop) ??
    settings.banner_url_desktop ??
    settings.banner_url ??
    heroImg;

  const FEATURED_LIMIT = 5;
  const COMBOS_LIMIT = 3;
  const allFeatured = products.filter((p) => p.is_featured && p.available);
  const featured = allFeatured.slice(0, FEATURED_LIMIT);
  const allCombos = products.filter((p) => {
    const cat = categories.find((c) => c.id === p.category_id);
    return cat?.slug === "combos";
  });
  const combos = allCombos.slice(0, COMBOS_LIMIT);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-charcoal shadow-card">
        <img
          src={heroSrc}
          alt="Banner Vanilc"
          width={1536}
          height={896}
          className="h-[280px] w-full object-cover opacity-90 sm:h-[360px] md:h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-10 md:max-w-[55%]">
          <p className="text-sm font-semibold uppercase tracking-widest text-cream/80">
            O verdadeiro
          </p>
          <h1 className="font-display text-5xl leading-none text-cream sm:text-6xl md:text-7xl">
            CHURRASCO
          </h1>
          <p className="text-2xl font-light text-cream sm:text-3xl">na sua casa!</p>
          <Button asChild size="lg" className="mt-3 w-fit h-12 rounded-full px-6 text-base font-bold">
            <Link to="/cardapio/$slug" params={{ slug: "carnes" }}>
              Peça agora <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Destaques */}
      <section>
        <SectionHeader title="Destaques" linkTo="carnes" showLink={allFeatured.length > FEATURED_LIMIT} />
        <div className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Combos */}
      {combos.length > 0 && (
        <section>
          <SectionHeader title="Combos especiais" linkTo="combos" showLink={allCombos.length > COMBOS_LIMIT} />
          <div className="motion-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {combos.map((p) => (
              <ProductCard key={p.id} product={p} variant="wide" />
            ))}
          </div>
        </section>
      )}

      {/* Trust badges */}
      <section className="rounded-2xl bg-accent/60 p-4 sm:p-6">
        <div className="motion-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Award, title: "Carnes selecionadas", desc: "Qualidade premium" },
            { Icon: Truck, title: "Entrega rápida", desc: "No conforto da sua casa" },
            { Icon: ShieldCheck, title: "Pagamento seguro", desc: "Seus dados protegidos" },
            { Icon: Headphones, title: "Atendimento", desc: "Suporte dedicado" },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-card text-primary shadow-card">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{title}</p>
                <p className="truncate text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  linkTo,
  showLink = true,
}: {
  title: string;
  linkTo: string;
  showLink?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl text-foreground sm:text-3xl">{title}</h2>
      {showLink && (
        <Link
          to="/cardapio/$slug"
          params={{ slug: linkTo }}
          className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-flame"
        >
          Ver Todos
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
