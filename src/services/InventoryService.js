import { ProductEntity } from '../entities/ProductEntity.js';
import { CondimentEntity } from '../entities/CondimentEntity.js';

export class InventoryService {
  #productRepository;
  #condimentRepository;

  constructor({ productRepository, condimentRepository }) {
    this.#productRepository = productRepository;
    this.#condimentRepository = condimentRepository;
  }

  async listProducts(filters = {}) {
    return this.#productRepository.findAll(filters);
  }

  async getProductById(id) {
    return this.#productRepository.findById(id);
  }

  async listCategories() {
    return this.#productRepository.listCategories();
  }

  async createProduct(payload) {
    const entity = new ProductEntity(payload);
    return this.#productRepository.create(entity);
  }

  async updateProduct(id, payload) {
    return this.#productRepository.update(id, payload);
  }

  async deleteProduct(id) {
    return this.#productRepository.deleteOrDeactivate(id);
  }

  async listCondiments() {
    return this.#condimentRepository.findAll();
  }

  async createCondiment(payload) {
    const entity = new CondimentEntity(payload);
    return this.#condimentRepository.create(entity);
  }

  async updateCondiment(id, payload) {
    return this.#condimentRepository.update(id, payload);
  }
}
