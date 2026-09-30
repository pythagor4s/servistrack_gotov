"use client";

import type { FaultCategoryIcon } from "@servis-track/shared";

import {
  AlertTriangle,
  Bug,
  Building2,
  Droplet,
  Fan,
  Flash,
  Forklift,
  Gauge,
  Gears,
  Magnet,
  Monitor,
  Package,
  PaintBoard,
  Radar,
  Router,
  Scissors,
  Scroll,
  Shapes,
  Shield,
  Software,
  Thermometer,
  Tools,
  Uv,
  type IconComponent,
} from "@/components/icons";
import type { FaultCategory, FaultCategoryRef } from "./types";
import { useApi } from "./useApi";

export const FAULT_ICON: Record<FaultCategoryIcon, IconComponent> = {
  droplet: Droplet,
  palette: PaintBoard,
  scissors: Scissors,
  fan: Fan,
  gears: Gears,
  flash: Flash,
  thermometer: Thermometer,
  scroll: Scroll,
  software: Software,
  router: Router,
  building: Building2,
  tools: Tools,
  shield: Shield,
  package: Package,
  monitor: Monitor,
  gauge: Gauge,
  radar: Radar,
  magnet: Magnet,
  forklift: Forklift,
  uv: Uv,
  bug: Bug,
  alert: AlertTriangle,
};

export const NO_CATEGORY_ICON: IconComponent = Shapes;

export function categoryIcon(category: FaultCategoryRef | null | undefined): IconComponent {
  return category ? (FAULT_ICON[category.icon] ?? NO_CATEGORY_ICON) : NO_CATEGORY_ICON;
}

export const FAULT_CATEGORIES_PATH = "/fault-categories";

export function useFaultCategories() {
  return useApi<FaultCategory[]>(FAULT_CATEGORIES_PATH);
}
