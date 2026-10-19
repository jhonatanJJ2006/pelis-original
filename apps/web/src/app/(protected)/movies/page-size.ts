// Constante compartida por la página de servidor y el cliente. No va en el archivo 'use client':
// importada desde un componente de servidor llega como referencia de cliente (objeto), no como número.
export const MOVIES_PAGE_SIZE = 30;
