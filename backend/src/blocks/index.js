import { toMc } from '../variables.js';

export class BlockError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// --- Helpers de seguridad y formato -----------------------------------------
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Texto del usuario: escapa HTML, traduce variables y respeta saltos de línea
const txt = (s) => toMc(esc(s)).replace(/\r?\n/g, '<br/>');

// URLs: solo protocolos permitidos (evita javascript:) y admite variables
const url = (u = '') => {
  const v = String(u).trim();
  if (!/^(https?:\/\/|mailto:|tel:|%%|\{\{)/i.test(v)) {
    throw new BlockError(`URL no permitida: "${v}"`);
  }
  return toMc(esc(v));
};

// Imágenes: solo https y, si IMAGE_HOSTS está definido (separado por comas),
// solo desde esos dominios. Se lee en cada llamada para poder configurarlo por entorno.
const imgSrc = (u = '') => {
  const v = String(u).trim();
  let parsed = null;
  try {
    parsed = new URL(v);
  } catch {
    /* puede ser una variable {{...}} o %%...%%, se valida abajo */
  }
  if (parsed) {
    if (parsed.protocol !== 'https:') throw new BlockError('Las imágenes deben usar https');
    const hosts = (process.env.IMAGE_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    if (hosts.length && !hosts.includes(parsed.hostname.toLowerCase())) {
      throw new BlockError(`La imagen debe estar alojada en: ${hosts.join(', ')}`);
    }
    return url(v);
  }
  if (!/^(%%|\{\{)/.test(v)) throw new BlockError(`URL de imagen no válida: "${v}"`);
  return url(v);
};

const required = (props, fields, type) => {
  for (const f of fields) {
    if (!props[f]) throw new BlockError(`El bloque "${type}" requiere el campo "${f}"`);
  }
};

// Atributos de seguimiento que usa la plantilla actual en sus enlaces de imagen.
// PENDIENTE: confirmar con el equipo de Marketing Cloud si son necesarios.
const LINK_ATTRS = 'alias="" conversion="true"';

// Imagen (con enlace opcional) como fila de tabla.
// Va dentro de <mj-raw>, que MJML no envuelve en <tr><td>, por eso se incluyen aquí.
const trackedImage = ({ src, alt = '', link }) => {
  const img = `<img src="${imgSrc(src)}" alt="${esc(alt)}" width="100%" style="display:block;width:100%;height:auto;border:0;">`;
  const inner = link
    ? `<a href="${url(link)}" title="${esc(alt)}" ${LINK_ATTRS}>${img}</a>`
    : img;
  return `<tr><td align="center" style="font-size:0;padding:0;">${inner}</td></tr>`;
};

// --- Bloques ----------------------------------------------------------------
export const renderers = {
  // Replica el correo actual: una imagen con enlace
  image: (props) => {
    required(props, ['src'], 'image');
    return `
    <mj-section padding="0">
      <mj-column padding="0"><mj-raw>${trackedImage(props)}</mj-raw></mj-column>
    </mj-section>`;
  },

  text: (props, theme) => {
    required(props, ['content'], 'text');
    return `
    <mj-section padding="8px 16px">
      <mj-column>
        <mj-text css-class="txt" color="${theme.text}" font-size="16px" line-height="1.5">${txt(props.content)}</mj-text>
      </mj-column>
    </mj-section>`;
  },

  button: (props, theme) => {
    required(props, ['label', 'url'], 'button');
    return `
    <mj-section padding="8px 16px">
      <mj-column>
        <mj-button href="${url(props.url)}" background-color="${theme.accent}" color="${theme.buttonText}" border-radius="6px" font-size="16px">${txt(props.label)}</mj-button>
      </mj-column>
    </mj-section>`;
  },

  // Imagen y texto lado a lado (se apilan solos en móvil). reverse: texto a la izquierda
  columns: (props, theme) => {
    required(props, ['src', 'content'], 'columns');
    const image = `<mj-column vertical-align="middle" padding="0"><mj-raw>${trackedImage(props)}</mj-raw></mj-column>`;
    const body = `<mj-column vertical-align="middle"><mj-text css-class="txt" color="${theme.text}" font-size="16px" line-height="1.5">${txt(props.content)}</mj-text></mj-column>`;
    return `
    <mj-section padding="8px 0">
      ${props.reverse ? body + image : image + body}
    </mj-section>`;
  },

  spacer: (props) => {
    const h = Math.min(Math.max(parseInt(props.height, 10) || 24, 4), 120);
    return `<mj-section padding="0"><mj-column><mj-spacer height="${h}px" /></mj-column></mj-section>`;
  },
};
