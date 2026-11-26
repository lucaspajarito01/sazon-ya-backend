import { validateContactPayload } from '../validators/domainValidator.js';

export class ContactController {
  #contactService;

  constructor({ contactService }) {
    this.#contactService = contactService;
  }

  submitContact = async (req, res, next) => {
    try {
      const clean = validateContactPayload(req.body);
      const created = await this.#contactService.submitContact(clean);
      res.status(201).json({
        success: true,
        message: 'Mensaje de contacto enviado correctamente. Pronto nos comunicaremos contigo.',
        data: {
          id: created.id,
          nombre: created.nombre,
          correo: created.correo,
          asunto: created.asunto,
          estado: created.estado,
          creado_en: created.creado_en,
          contact: created
        }
      });
    } catch (err) {
      next(err);
    }
  };

  listContacts = async (_req, res, next) => {
    try {
      const contacts = await this.#contactService.listContacts();
      res.status(200).json({
        success: true,
        data: { contacts }
      });
    } catch (err) {
      next(err);
    }
  };
}
