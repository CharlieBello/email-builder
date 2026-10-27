import { variables, hasVariable, VAR } from '../variables.js';

// Propiedades que contienen URLs (no se les aplica la regla de espacios)
const URL_PROPS = ['url', 'link', 'src'];

const entries = (blocks) =>
  blocks.flatMap((b, i) =>
    Object.entries(b?.props ?? {})
      .filter(([, v]) => typeof v === 'string')
      .map(([prop, value]) => ({ block: i + 1, prop, value }))
  );

// Advertencias no bloqueantes sobre el uso de cadenas de personalización
export function checkVariables(blocks) {
  const warnings = [];
  const seen = new Set();
  const warn = (msg) => {
    if (!seen.has(msg)) {
      seen.add(msg);
      warnings.push(msg);
    }
  };

  for (const { block, prop, value } of entries(blocks)) {
    for (const m of value.matchAll(VAR)) {
      const key = m[1];

      if (!hasVariable(key)) {
        // Las cadenas distinguen mayúsculas: sugerir la forma exacta si solo cambia eso
        const near = Object.keys(variables).find((k) => k.toLowerCase() === key.toLowerCase());
        warn(
          near
            ? `Las cadenas distinguen mayúsculas: {{${key}}} no coincide con {{${near}}}. Se enviará como %%${key}%%.`
            : `La variable {{${key}}} no está en el catálogo; se enviará como %%${key}%%. Verifica que exista como campo en el envío.`
        );
      } else if (URL_PROPS.includes(prop) && variables[key].pii) {
        warn(
          `Bloque ${block}: {{${key}}} es un dato personal dentro de un enlace. Marketing Cloud recomienda no incluir datos personales en los vínculos.`
        );
      }
    }

    // Recomendación de la documentación: espacio antes y después de la cadena si va junto a otro texto
    if (!URL_PROPS.includes(prop) && /[\p{L}\p{N}]\{\{|\}\}[\p{L}\p{N}]/u.test(value)) {
      warn(`Bloque ${block}: deja un espacio antes y después de las variables que van junto a otro texto (campo "${prop}").`);
    }
  }
  return warnings;
}
