import { validateCondimentPayload } from '../validators/domainValidator.js';
import { persistProductCreate, persistProductUpdate } from '../utils/mediaWorkflow.js';

export class InventoryController {
  #inventoryService;

  constructor({ inventoryService }) {
    this.#inventoryService = inventoryService;
  }

  listProducts = async (req, res, next) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categoriaId = req.query.categoria_id || null;
      const estado = req.query.estado || null;
      const products = await this.#inventoryService.listProducts({ includeInactive, categoriaId, estado });
      const categories = await this.#inventoryService.listCategories();
      res.status(200).json({
        success: true,
        data: { products, categories }
      });
    } catch (err) {
      next(err);
    }
  };

  createProduct = async (req, res, next) => {
    try {
      const created = await persistProductCreate({
        body: req.body,
        uploadedMedia: req.uploadedMedia || null,
        inventoryService: this.#inventoryService
      });
      res.status(201).json({
        success: true,
        message: 'Producto registrado exitosamente en el inventario.',
        data: { product: created }
      });
    } catch (err) {
      next(err);
    }
  };

  updateProduct = async (req, res, next) => {
    try {
      const updated = await persistProductUpdate({
        id: req.params.id,
        body: req.body,
        uploadedMedia: req.uploadedMedia || null,
        inventoryService: this.#inventoryService
      });
      res.status(200).json({
        success: true,
        message: 'Producto actualizado correctamente.',
        data: { product: updated }
      });
    } catch (err) {
      next(err);
    }
  };

  deleteProduct = async (req, res, next) => {
    try {
      const result = await this.#inventoryService.deleteProduct(req.params.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  listCondiments = async (_req, res, next) => {
    try {
      const condiments = await this.#inventoryService.listCondiments();
      res.status(200).json({
        success: true,
        data: { condiments }
      });
    } catch (err) {
      next(err);
    }
  };

  createCondiment = async (req, res, next) => {
    try {
      const clean = validateCondimentPayload(req.body, false);
      const condiment = await this.#inventoryService.createCondiment(clean);
      res.status(201).json({
        success: true,
        message: 'Condimento/insumo registrado en inventario.',
        data: { condiment }
      });
    } catch (err) {
      next(err);
    }
  };

  updateCondiment = async (req, res, next) => {
    try {
      const clean = validateCondimentPayload(req.body, true);
      const condiment = await this.#inventoryService.updateCondiment(req.params.id, clean);
      res.status(200).json({
        success: true,
        message: 'Estado y stock de condimento actualizado.',
        data: { condiment }
      });
    } catch (err) {
      next(err);
    }
  };
}
