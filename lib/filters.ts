export interface Filter {
  id: string;
  name: string;
  css: string;
}

export const filters: Filter[] = [
  { id: "normal", name: "Оригинал", css: "none" },
  { id: "clarendon", name: "Clarendon", css: "contrast(1.2) saturate(1.35)" },
  { id: "gingham", name: "Gingham", css: "brightness(1.05) hue-rotate(-10deg)" },
  { id: "moon", name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { id: "lark", name: "Lark", css: "contrast(0.9) brightness(1.15) saturate(0.85)" },
  { id: "reyes", name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)" },
  { id: "juno", name: "Juno", css: "contrast(1.15) saturate(1.8) sepia(0.05)" },
  { id: "slumber", name: "Slumber", css: "saturate(0.66) brightness(1.05) sepia(0.15)" },
  { id: "crema", name: "Crema", css: "sepia(0.5) contrast(0.9) brightness(1.15) saturate(0.6)" },
  { id: "ludwig", name: "Ludwig", css: "contrast(1.05) saturate(1.5) sepia(0.08)" },
  { id: "aden", name: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)" },
];
