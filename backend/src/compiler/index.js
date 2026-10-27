import mjml2html from 'mjml';
import { renderers, BlockError } from '../blocks/index.js';
import { defaultTheme } from '../theme.js';
import { applyMarketingCloud } from './wrapper.js';
import { checkVariables } from './checks.js';

export async function compile(input, theme = defaultTheme) {
  const list = input?.blocks;
  if (!Array.isArray(list) || list.length === 0) {
    throw new BlockError('Se requiere al menos un bloque');
  }

  const body = list
    .map((b, i) => {
      const render = renderers[b?.type];
      if (!render) throw new BlockError(`Bloque ${i + 1}: tipo desconocido "${b?.type}"`);
      return render(b.props ?? {}, theme);
    })
    .join('');

  const source = `
  <mjml>
    <mj-head>
      <mj-raw>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </mj-raw>
      <mj-attributes>
        <mj-all font-family="Arial, Helvetica, sans-serif" />
      </mj-attributes>
      <mj-style>
        @media (prefers-color-scheme: dark) {
          body, .surface { background-color: ${theme.bgDark} !important; }
          .txt div, .txt p { color: ${theme.textDark} !important; }
        }
      </mj-style>
    </mj-head>
    <mj-body width="600px" background-color="${theme.bg}" css-class="surface">
      ${body}
    </mj-body>
  </mjml>`;

  // En MJML 5 mjml2html es asíncrono
  const { html, errors } = await mjml2html(source, { validationLevel: 'soft' });
  const warnings = errors.map((e) => e.formattedMessage ?? String(e));
  warnings.push(...checkVariables(list));
  return { html: applyMarketingCloud(html, theme), warnings };
}
