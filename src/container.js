import { db, withTransaction } from './config/db.js';
import { UserRepository } from './repositories/UserRepository.js';
import { ProductRepository } from './repositories/ProductRepository.js';
import { CondimentRepository } from './repositories/CondimentRepository.js';
import { EventRepository } from './repositories/EventRepository.js';
import { OrderRepository } from './repositories/OrderRepository.js';
import { CommunityRepository } from './repositories/CommunityRepository.js';
import { AnalyticsRepository } from './repositories/AnalyticsRepository.js';
import { ContactRepository } from './repositories/ContactRepository.js';

import { AuthService } from './services/AuthService.js';
import { InventoryService } from './services/InventoryService.js';
import { EventService } from './services/EventService.js';
import { OrderService } from './services/OrderService.js';
import { CommunityService } from './services/CommunityService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { ContactService } from './services/ContactService.js';

import { AuthController } from './controllers/AuthController.js';
import { InventoryController } from './controllers/InventoryController.js';
import { EventController } from './controllers/EventController.js';
import { OrderController } from './controllers/OrderController.js';
import { CommunityController } from './controllers/CommunityController.js';
import { AnalyticsController } from './controllers/AnalyticsController.js';
import { ContactController } from './controllers/ContactController.js';

export function buildContainer(customDb = db) {
  // 1. Repositorios
  const userRepository = new UserRepository(customDb);
  const productRepository = new ProductRepository(customDb);
  const condimentRepository = new CondimentRepository(customDb);
  const eventRepository = new EventRepository(customDb);
  const orderRepository = new OrderRepository(customDb);
  const communityRepository = new CommunityRepository(customDb);
  const analyticsRepository = new AnalyticsRepository(customDb);
  const contactRepository = new ContactRepository(customDb);

  // 2. Servicios de Aplicación / Dominio
  const authService = new AuthService({ userRepository });
  const inventoryService = new InventoryService({ productRepository, condimentRepository });
  const eventService = new EventService({ eventRepository });
  const orderService = new OrderService({
    orderRepository,
    withTransaction: (fn) => customDb.withTransaction(fn)
  });
  const communityService = new CommunityService({ communityRepository });
  const analyticsService = new AnalyticsService({ analyticsRepository });
  const contactService = new ContactService({ contactRepository });

  // 3. Controladores HTTP
  const authController = new AuthController({ authService });
  const inventoryController = new InventoryController({ inventoryService });
  const eventController = new EventController({ eventService });
  const orderController = new OrderController({ orderService });
  const communityController = new CommunityController({ communityService });
  const analyticsController = new AnalyticsController({ analyticsService });
  const contactController = new ContactController({ contactService });

  return Object.freeze({
    db: customDb,
    withTransaction,
    repositories: {
      userRepository,
      productRepository,
      condimentRepository,
      eventRepository,
      orderRepository,
      communityRepository,
      analyticsRepository,
      contactRepository
    },
    services: {
      authService,
      inventoryService,
      eventService,
      orderService,
      communityService,
      analyticsService,
      contactService
    },
    controllers: {
      authController,
      inventoryController,
      eventController,
      orderController,
      communityController,
      analyticsController,
      contactController
    }
  });
}

export const container = buildContainer();
