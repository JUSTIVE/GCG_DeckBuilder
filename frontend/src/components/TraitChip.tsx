import { renderTrait } from "@/render/trait";

export const TraitChip = ({ trait }: { trait: string }) => {
  return <span>{renderTrait(trait)}</span>;
};
