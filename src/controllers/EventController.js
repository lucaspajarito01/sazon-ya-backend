import { validateEventPayload } from '../validators/domainValidator.js';

export class EventController {
  #eventService;

  constructor({ eventService }) {
    this.#eventService = eventService;
  }

  listEvents = async (req, res, next) => {
    try {
      const onlyActive = req.query.onlyActive === 'true';
      const userId = req.user ? req.user.id : null;
      const events = await this.#eventService.listEvents({ onlyActive, userId });
      res.status(200).json({
        success: true,
        data: { events }
      });
    } catch (err) {
      next(err);
    }
  };

  createEvent = async (req, res, next) => {
    try {
      const clean = validateEventPayload(req.body);
      const created = await this.#eventService.createEvent(clean, req.user.id);
      res.status(201).json({
        success: true,
        message: 'Evento / promoción registrado por el administrador.',
        data: { event: created }
      });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const updated = await this.#eventService.updateEventStatus(req.params.id, req.body.estado);
      res.status(200).json({
        success: true,
        message: 'Estado del evento actualizado.',
        data: { event: updated }
      });
    } catch (err) {
      next(err);
    }
  };

  participate = async (req, res, next) => {
    try {
      const participation = await this.#eventService.participateInEvent({
        eventoId: Number(req.params.id),
        usuarioId: req.user.id
      });
      res.status(201).json({
        success: true,
        message: `¡Inscripción confirmada! Tu código de participación es ${participation.codigo_boleto}.`,
        data: { participation }
      });
    } catch (err) {
      next(err);
    }
  };
}
