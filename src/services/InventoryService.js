import { ProductEntity } from '../entities/ProductEntity.js';
import { CondimentEntity } from '../entities/CondimentEntity.js';
import { deleteLocalUpload } from '../utils/imageStorage.js';

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
    const existing = await this.#productRepository.findById(id);
    const updated = await this.#productRepository.update(id, payload);
    if (
      existing?.imagen_url &&
      existing.imagen_url.startsWith('/uploads/products/') &&
      updated.imagen_url !== existing.imagen_url
    ) {
      await deleteLocalUpload(existing.imagen_url);
    }
    return updated;
  }

  async deleteProduct(id) {
    const result = await this.#productRepository.deleteOrDeactivate(id);
    if (result.action === 'DELETED' && result.product?.imagen_url?.startsWith('/uploads/products/')) {
      await deleteLocalUpload(result.product.imagen_url);
    }
    return result;
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
