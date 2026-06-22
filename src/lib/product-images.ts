import picanha from "@/assets/product-picanha.jpg";
import costela from "@/assets/product-costela.jpg";
import linguica from "@/assets/product-linguica.jpg";
import alcatra from "@/assets/product-alcatra.jpg";
import frango from "@/assets/product-frango.jpg";
import comboFamilia from "@/assets/combo-familia.jpg";

const map: Record<string, string> = {
  picanha,
  costela,
  linguica,
  alcatra,
  frango,
  "combo-familia": comboFamilia,
};

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f4ede0"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" font-family="sans-serif" font-size="20" fill="#a07b48">Vanilc</text></svg>`,
  );

export function resolveProductImage(image_url: string | null | undefined): string {
  if (!image_url) return FALLBACK;
  if (image_url.startsWith("http") || image_url.startsWith("/") || image_url.startsWith("data:")) {
    return image_url;
  }
  return map[image_url] ?? FALLBACK;
}
