import {
  Backpack,
  Ellipsis,
  GlassWater,
  Headphones,
  IdCard,
  Laptop,
  Package,
  PlugZap,
  Shirt,
  Smartphone,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ícones permitidos para categorias. A tabela `categorias` guarda o nome do ícone (coluna `icone`),
 * e só os nomes desta lista são aceitos. Importar um a um mantém o bundle pequeno.
 */
export const CATEGORY_ICONS = {
  smartphone: Smartphone,
  headphones: Headphones,
  laptop: Laptop,
  "plug-zap": PlugZap,
  "glass-water": GlassWater,
  shirt: Shirt,
  backpack: Backpack,
  "id-card": IdCard,
  umbrella: Umbrella,
  ellipsis: Ellipsis,
  package: Package,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

function isCategoryIconName(nome: string): nome is CategoryIconName {
  return nome in CATEGORY_ICONS;
}

type CategoryIconProps = {
  /** Nome do ícone salvo na categoria. Nomes desconhecidos caem no ícone genérico. */
  icon: string;
  /** Cor da categoria (hex). Sem cor, usa o texto secundário. */
  color?: string;
  /** "plain" = só o ícone; "tile" = ícone dentro de um quadrado, como no canto das fotos. */
  variant?: "plain" | "tile";
  className?: string;
  label?: string;
};

export function CategoryIcon({ icon, color, variant = "plain", className, label }: CategoryIconProps) {
  const Icon = isCategoryIconName(icon) ? CATEGORY_ICONS[icon] : Package;
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  if (variant === "tile") {
    return (
      <span
        className={cn("grid size-8 place-items-center rounded-lg bg-black/60 text-foreground", className)}
        {...a11y}
      >
        <Icon className="size-4" style={color ? { color } : undefined} strokeWidth={1.5} />
      </span>
    );
  }

  return (
    <Icon
      className={cn("size-5 shrink-0 text-muted", className)}
      style={color ? { color } : undefined}
      strokeWidth={1.5}
      {...a11y}
    />
  );
}
