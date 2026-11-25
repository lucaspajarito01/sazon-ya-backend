import { ENV } from './config/env.js';
import { createNativeHttpServer } from './nativeHttpServer.js';

async function bootstrap() {
  let server;
  try {
    const { createApp } = await import('./app.js');
    server = createApp();
  } catch {
    // Fallback automático Zero-Bloat cuando node_modules no está instalado localmente
    server = createNativeHttpServer();
  }

  server.listen(ENV.PORT, () => {
    console.log(`[SazónYA Backend] Servidor activo en http://localhost:${ENV.PORT}/api/v1 (v${ENV.API_VERSION})`);
  });
}

bootstrap();
