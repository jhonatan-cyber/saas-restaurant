import {
  type CreatePreparationAreaInput,
  type PreparationAreaFiltersInput,
  type ReorderPreparationAreasInput,
  type UpdatePreparationAreaInput,
} from '@saas/shared';

export type CreatePreparationAreaDto = CreatePreparationAreaInput;
export type UpdatePreparationAreaDto = UpdatePreparationAreaInput;
export type ReorderPreparationAreasDto = ReorderPreparationAreasInput;
export type PreparationAreaFiltersDto = PreparationAreaFiltersInput;

export interface ReorderPreparationAreaItemDto {
  id: string;
  displayOrder: number;
}
