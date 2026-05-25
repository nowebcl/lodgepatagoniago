import { createHmac } from 'crypto';

interface FlowCreateParams {
  amount: number;
  email: string;
  subject: string;
  commerceOrder: string;
  urlConfirmation: string;
  urlReturn: string;
}

export class FlowService {
  private static apiKey = process.env.FLOW_API_KEY || '';
  private static secretKey = process.env.FLOW_SECRET_KEY || '';
  private static apiUrl = process.env.FLOW_API_URL || 'https://sandbox.flow.cl/api';

  /**
   * Genera la firma digital 's' requerida por la API de Flow.
   * Excluye la firma 's', ordena las claves alfabéticamente, concatena clave+valor y firma usando HMAC-SHA256.
   */
  public static sign(params: Record<string, any>): string {
    const keys = Object.keys(params)
      .filter((k) => k !== 's' && params[k] !== undefined && params[k] !== null)
      .sort();

    let toSign = '';
    for (const key of keys) {
      toSign += key + params[key];
    }

    return createHmac('sha256', this.secretKey)
      .update(toSign)
      .digest('hex');
  }

  /**
   * Crea un intento de pago en Flow.
   * Retorna la URL redireccionable, el token y el ID de orden interna de Flow.
   */
  public static async createPayment(params: FlowCreateParams): Promise<{ url: string; token: string; flowOrder: number }> {
    const allParams: Record<string, any> = {
      apiKey: this.apiKey,
      ...params,
    };

    allParams.s = this.sign(allParams);

    // Flow espera un formato URL encoded
    const formData = new URLSearchParams();
    for (const key in allParams) {
      formData.append(key, String(allParams[key]));
    }

    const response = await fetch(`${this.apiUrl}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    
    if (!response.ok || data.code) {
      throw new Error(`Error de Flow [${data.code || response.status}]: ${data.message || 'Error desconocido'}`);
    }

    return {
      url: `${data.url}?token=${data.token}`,
      token: data.token,
      flowOrder: data.flowOrder,
    };
  }

  /**
   * Consulta el estado de un pago usando su token único.
   * Estados de Flow:
   * 1 = Pendiente
   * 2 = Pagado
   * 3 = Rechazado / Anulado
   * 4 = Reembolsado
   */
  public static async getPaymentStatus(token: string): Promise<any> {
    const params: Record<string, any> = {
      apiKey: this.apiKey,
      token,
    };

    params.s = this.sign(params);

    const queryString = new URLSearchParams();
    for (const key in params) {
      queryString.append(key, String(params[key]));
    }

    const response = await fetch(`${this.apiUrl}/payment/getStatus?${queryString.toString()}`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok || data.code) {
      throw new Error(`Error de estado Flow [${data.code || response.status}]: ${data.message || 'Error desconocido'}`);
    }

    return data;
  }
}
