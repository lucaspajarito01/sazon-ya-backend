import { validateOrderPayload } from '../validators/domainValidator.js';

export class OrderController {
  #orderService;

  constructor({ orderService }) {
    this.#orderService = orderService;
  }

  listMyOrders = async (req, res, next) => {
    try {
      const orders = await this.#orderService.listUserOrders(req.user.id);
      res.status(200).json({
        success: true,
        data: { orders }
      });
    } catch (err) {
      next(err);
    }
  };

  createOrder = async (req, res, next) => {
    try {
      const clean = validateOrderPayload(req.body);
      const order = await this.#orderService.createOrder({
        usuarioId: req.user.id,
        items: clean.items,
        notasEntrega: clean.notasEntrega
      });
      res.status(201).json({
        success: true,
        message: `¡Pedido #${order.id} confirmado y en preparación! Stock e insumos actualizados.`,
        data: { order }
      });
    } catch (err) {
      next(err);
    }
  };
}
