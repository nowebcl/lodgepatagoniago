/**
 * Cliente REST ligero para Firebase Firestore en el servidor.
 * Evita los problemas de cuelgue de GRPC/WebChannel del SDK de cliente corriendo en Node.js.
 */

export async function updateBookingStatusREST(
  bookingId: string, 
  status: string, 
  flowStatus?: number, 
  paymentDate?: string
) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'lodgepatagonia-595d4';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  
  // Construir la URL con el updateMask para actualizar solo los campos especificados
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bookings/${bookingId}?key=${apiKey}&updateMask.fieldPaths=status`;
  
  const fields: Record<string, any> = {
    status: { stringValue: status }
  };

  if (flowStatus !== undefined) {
    url += `&updateMask.fieldPaths=flowStatus`;
    fields.flowStatus = { integerValue: String(flowStatus) };
  }

  if (paymentDate !== undefined) {
    url += `&updateMask.fieldPaths=paymentDate`;
    fields.paymentDate = { stringValue: paymentDate };
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore REST Patch error: ${response.status} - ${text}`);
  }

  return response.json();
}

export async function getBookingREST(bookingId: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'lodgepatagonia-595d4';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/bookings/${bookingId}?key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const text = await response.text();
    throw new Error(`Firestore REST Get error: ${response.status} - ${text}`);
  }

  const doc = await response.json();
  const fields = doc.fields || {};
  const data: Record<string, any> = { id: bookingId };
  
  for (const key in fields) {
    const valObj = fields[key];
    if (valObj.stringValue !== undefined) {
      data[key] = valObj.stringValue;
    } else if (valObj.integerValue !== undefined) {
      data[key] = parseInt(valObj.integerValue, 10);
    } else if (valObj.doubleValue !== undefined) {
      data[key] = parseFloat(valObj.doubleValue);
    } else if (valObj.booleanValue !== undefined) {
      data[key] = valObj.booleanValue;
    } else if (valObj.arrayValue !== undefined) {
      data[key] = (valObj.arrayValue.values || []).map((v: any) => v.stringValue || v.integerValue || v);
    }
  }

  return data;
}
