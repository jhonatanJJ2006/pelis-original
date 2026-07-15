# Convex Backend

## Setup

1. Instalar dependencias:
   ```bash
   pnpm install
   ```

2. Configurar variables de entorno:
   ```bash
   cp .env.local .env  # Editar con tus valores
   ```

3. Deploy a Convex:
   ```bash
   npx convex deploy
   ```

## Schema

### Tables

- **users** - Usuarios autenticados (Better Auth)
- **movies** - Catálogo de películas
- **plans** - Planes de suscripción
- **subscriptions** - Suscripciones activas
- **favorites** - Películas favoritas
- **history** - Historial de reproducciones

## Modules

### Movies
- `movies/list` - Lista todas las películas con filtros
- `movies/getById` - Obtiene una película por ID
- `movies/getFeatured` - Obtiene películas destacadas
- `movies/getGenres` - Lista géneros únicos
- `movies/create` - Crea película (admin)

### Subscriptions
- `subscriptions/list` - Lista planes
- `subscriptions/subscribe` - Suscribe usuario a plan
- `subscriptions/cancel` - Cancela suscripción

### Favorites
- `favorites/listByUser` - Lista favoritos del usuario
- `favorites/add` - Agrega a favoritos
- `favorites/remove` - Elimina de favoritos

### History
- `history/listByUser` - Lista historial del usuario
- `history/upsert` - Actualiza progreso
