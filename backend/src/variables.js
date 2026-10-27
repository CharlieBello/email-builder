// Catálogo de cadenas de personalización de Marketing Cloud.
// El usuario escribe {{Nombre exacto}} y el compilador entrega %%Nombre exacto%%.
// IMPORTANTE: las cadenas distinguen mayúsculas/minúsculas y el nombre puede llevar espacios
// (p. ej. "Primer nombre"). La clave debe ser EXACTAMENTE la que muestra la vista de código.
// pii: dato personal; Marketing Cloud recomienda no incluirlo en enlaces.
// Las variables fuera del catálogo (campos propios) también funcionan, pero generan advertencia.
export const variables = {
  // Atributos de perfil (nombres tal como se ven en la cuenta)
  'Primer nombre': { label: 'Primer nombre del suscriptor', pii: true }, // confirmado en la vista de código
  'Email Address': { label: 'Email del suscriptor', pii: true }, // PENDIENTE: confirmar el texto exacto
  // Cadenas del sistema
  emailaddr: { label: 'Dirección de email del suscriptor (sistema)', pii: true },
  subscriberid: { label: 'Id del suscriptor', pii: false },
  _subscriberkey: { label: 'Clave única del suscriptor', pii: false },
  member_addr: { label: 'Dirección física de la compañía', pii: false },
  member_busname: { label: 'Nombre de la compañía', pii: false },
  xtshortdate: { label: 'Fecha actual (formato corto)', pii: false },
  emailname_: { label: 'Nombre del email', pii: false },
  unsub_center_url: { label: 'Enlace para cancelar la suscripción', pii: false },
};

export const hasVariable = (key) => Object.hasOwn(variables, key);

// {{ nombre }} -> nombre (sin espacios sobrantes en los extremos, admite espacios y tildes dentro)
export const VAR = /\{\{\s*([^{}\s][^{}\r\n]*?)\s*\}\}/g;

// ÚNICO lugar donde se traduce la sintaxis. Si cambia, se cambia aquí.
export const toMc = (s) => s.replace(VAR, '%%$1%%');
