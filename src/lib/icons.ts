import {
  CreditCard,
  Heart,
  Home,
  Monitor,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  type LucideIcon
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  Dress: Sparkles,
  Shirt,
  Monitor,
  Home,
  Heart,
  Dumbbell: ShieldCheck,
  Gamepad2: CreditCard,
  ShoppingBasket,
  Sparkles
};

export const fallbackCategoryIcon = ShoppingBag;
