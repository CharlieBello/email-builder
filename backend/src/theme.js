// Tema único (todas las BUs comparten estructura).
export const defaultTheme = {
  bg: '#ffffff',
  text: '#222222',
  accent: '#c8102e',
  buttonText: '#ffffff',
  bgDark: '#121212',
  textDark: '#f2f2f2',

  // Marcadores de Marketing Cloud que el generador inserta en el HTML.
  // Con la opción de pegado "HTML", Marketing Cloud ya agrega el footer por su cuenta:
  // insertarlo aquí también lo duplica. Si al probar ves duplicado el header o el
  // tracking, pon el que corresponda en false.
  useDefaultHeader: true,
  useDefaultFooter: false,
  useTracking: true,
};
