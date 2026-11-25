export class OrderService {
  #orderRepository;
  #withTransaction;

  constructor({ orderRepository, withTransaction }) {
    this.#orderRepository = orderRepository;
    this.#withTransaction = withTransaction;
  }

  async listUserOrders(usuarioId) {
    return this.#orderRepository.findByUserId(usuarioId);
  }

  async createOrder({ usuarioId, items, notasEntrega }) {
    return this.#withTransaction(async (conn) => {
      return this.#orderRepository.createTransactionalOrder(
        {
          usuarioId,
          items,
          notasEntrega
        },
        conn
      );
    });
  }
}
