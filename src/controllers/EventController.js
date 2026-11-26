import { persistEventCreate, persistEventUpdate } from '../utils/mediaWorkflow.js';
import { validateEventStatusPayload } from '../validators/domainValidator.js';

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
      const created = await persistEventCreate({
        body: req.body,
        uploadedMedia: req.uploadedMedia || null,
        adminId: req.user.id,
        eventService: this.#eventService
      });
      res.status(201).json({
        success: true,
        message: 'Evento / promoción registrado por el administrador.',
        data: { event: created }
      });
    } catch (err) {
      next(err);
    }
  };

  updateEvent = async (req, res, next) => {
    try {
      const updated = await persistEventUpdate({
        id: req.params.id,
        body: req.body,
        uploadedMedia: req.uploadedMedia || null,
        eventService: this.#eventService
      });
      res.status(200).json({
        success: true,
        message: 'Evento / promoción actualizado correctamente.',
        data: { event: updated }
      });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const { estado } = validateEventStatusPayload(req.body);
      const updated = await this.#eventService.updateEventStatus(req.params.id, estado);
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
