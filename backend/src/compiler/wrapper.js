// Inserta marcadores de Marketing Cloud DESPUÉS de compilar con MJML,
// para que queden fuera del contenedor de 600px.
// Copiar TRACKING exactamente como aparece en la plantilla de la empresa.
const TRACKING =
  '<div style="font-size:0; line-height:0;"><custom name="opencounter" type="tracking"><custom name="usermatch" type="tracking" /></div>';

export function applyMarketingCloud(html, theme) {
  const top =
    (theme.useTracking ? TRACKING : '') +
    (theme.useDefaultHeader ? '<custom type="header" />' : '');
  const bottom = theme.useDefaultFooter ? '<custom type="footer" />' : '';

  return html
    .replace(/<body[^>]*>/, (open) => open + top)
    .replace('</body>', () => bottom + '</body>');
}
