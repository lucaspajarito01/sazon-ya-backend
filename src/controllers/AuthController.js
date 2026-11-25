import { validateRegisterInput, validateLoginInput } from '../validators/authValidator.js';

export class AuthController {
  #authService;

  constructor({ authService }) {
    this.#authService = authService;
  }

  register = async (req, res, next) => {
    try {
      const cleanInput = validateRegisterInput(req.body);
      const result = await this.#authService.register(cleanInput);
      res.status(201).json({
        success: true,
        message: 'Cuenta creada exitosamente en SazónYA.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  login = async (req, res, next) => {
    try {
      const cleanInput = validateLoginInput(req.body);
      const result = await this.#authService.login(cleanInput);
      res.status(200).json({
        success: true,
        message: `Bienvenido a SazónYA, ${result.user.nombre}.`,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  me = async (req, res, next) => {
    try {
      const profile = await this.#authService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: { user: profile }
      });
    } catch (err) {
      next(err);
    }
  };
}
