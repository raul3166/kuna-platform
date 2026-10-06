import { SetMetadata } from '@nestjs/common';

export const REQUIRES_VERTICAL_KEY = 'requires_vertical';

/**
 * Decorador para proteger endpoints que pertenecen a uno o más verticales específicos.
 * Ejemplo de uso en controlador o método:
 *   @RequiresVertical('HOTEL')
 *   @RequiresVertical('AUTOMOTIVE', 'SERVICES')
 */
export const RequiresVertical = (...verticals: string[]) =>
  SetMetadata(REQUIRES_VERTICAL_KEY, verticals);

