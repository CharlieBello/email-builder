import { useEffect, useState } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const THEME_STORAGE_KEY = 'theme-selection';
const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

// Cada tipo de bloque: etiqueta, campos del formulario y valores iniciales.
// vars: el campo admite el selector de variables de personalización.
const BLOCKS = {
  image: {
    label: 'Imagen',
    fields: [
      { k: 'src', label: 'URL de la imagen', type: 'url' },
      { k: 'alt', label: 'Texto alternativo' },
      { k: 'link', label: 'Enlace (opcional)', type: 'url' },
    ],
    defaults: { src: '', alt: '', link: '' },
  },
  text: {
    label: 'Texto',
    fields: [{ k: 'content', label: 'Contenido', type: 'area', vars: true }],
    defaults: { content: '' },
  },
  button: {
    label: 'Botón',
    fields: [
      { k: 'label', label: 'Texto del botón', vars: true },
      { k: 'url', label: 'URL del botón', type: 'url' },
    ],
    defaults: { label: '', url: '' },
  },
  columns: {
    label: 'Imagen y texto',
    fields: [
      { k: 'src', label: 'URL de la imagen', type: 'url' },
      { k: 'alt', label: 'Texto alternativo' },
      { k: 'link', label: 'Enlace de la imagen (opcional)', type: 'url' },
      { k: 'content', label: 'Contenido', type: 'area', vars: true },
      { k: 'reverse', label: 'Texto a la izquierda', type: 'check' },
    ],
    defaults: { src: '', alt: '', link: '', content: '', reverse: false },
  },
  spacer: {
    label: 'Espacio',
    fields: [{ k: 'height', label: 'Alto (px)', type: 'number' }],
    defaults: { height: 24 },
  },
};

const newBlock = (type) => ({ id: crypto.randomUUID(), type, props: { ...BLOCKS[type].defaults } });

function Field({ block, field, variables, onChange, onInsert }) {
  const id = `${block.id}-${field.k}`;
  const value = block.props[field.k];

  if (field.type === 'check') {
    return (
      <label className="check">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(block.id, { [field.k]: e.target.checked })} />
        {field.label}
      </label>
    );
  }

  const input =
    field.type === 'area' ? (
      <textarea id={id} rows={4} value={value} onChange={(e) => onChange(block.id, { [field.k]: e.target.value })} />
    ) : (
      <input
        id={id}
        type={field.type ?? 'text'}
        value={value}
        min={field.type === 'number' ? 4 : undefined}
        max={field.type === 'number' ? 120 : undefined}
        onChange={(e) =>
          onChange(block.id, { [field.k]: field.type === 'number' ? Number(e.target.value) : e.target.value })
        }
      />
    );

  return (
    <div className="field">
      <div className="field-label">
        <label htmlFor={id}>{field.label}</label>
        {field.vars && variables.length > 0 && (
          <select
            aria-label={`Insertar variable en ${field.label}`}
            value=""
            onChange={(e) => e.target.value && onInsert(block.id, field.k, `{{${e.target.value}}}`)}
          >
            <option value="">Insertar variable</option>
            {variables.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        )}
      </div>
      {input}
    </div>
  );
}

export default function App() {
  const [blocks, setBlocks] = useState(() => [newBlock('image'), newBlock('text')]);
  const [variables, setVariables] = useState([]);
  const [html, setHtml] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [copied, setCopied] = useState(false);
  const [width, setWidth] = useState(640); // 640 escritorio, 390 móvil
  const [themePreference, setThemePreference] = useState(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'system';
    } catch {
      return 'system';
    }
  });
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light',
  );

  const theme = themePreference === 'system' ? systemTheme : themePreference;

  useEffect(() => {
    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const updateSystemTheme = (event) => setSystemTheme(event.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (themePreference === 'system') return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Storage unavailable — theme still applies for this session
    }
  }, [themePreference]);

  useEffect(() => {
    fetch(`${API}/api/variables`)
      .then((r) => r.json())
      .then(setVariables)
      .catch(() => setVariables([])); // el editor funciona sin el selector
  }, []);

  const edit = (fn) => {
    setBlocks(fn);
    setStale(true);
  };
  const add = (type) => edit((bs) => [...bs, newBlock(type)]);
  const remove = (id) => edit((bs) => bs.filter((b) => b.id !== id));
  const update = (id, changes) =>
    edit((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...changes } } : b)));
  const move = (id, dir) =>
    edit((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  // Inserta la variable donde está el cursor del campo
  const insertVariable = (id, field, text) => {
    const el = document.getElementById(`${id}-${field}`);
    const current = blocks.find((b) => b.id === id)?.props[field] ?? '';
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? start;
    update(id, { [field]: current.slice(0, start) + text + current.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocks.map(({ type, props }) => ({ type, props })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo generar el correo.');
        return;
      }
      setHtml(data.html);
      setWarnings(data.warnings ?? []);
      setStale(false);
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('No se pudo copiar. Selecciona el HTML manualmente o usa HTTPS/localhost.');
    }
  }

  return (
    <div className="app">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'left' }}>
          <a href="" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="33 78 614 494" role="img" aria-label="Avión de papel" width="100" height="100">
                <polygon id="triangle-light" points="43,210 637,88 109,291" fill="#00A0E1"></polygon>
                <polygon id="triangle-dark" points="109,291 637,88 180,476" fill="#005283"></polygon>
                <polygon id="triangle-light" points="174,387 637,88 287,562" fill="#00A0E1"></polygon>
              </svg>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <text className="titulo">U</text>
                <text className="tituloB">-Mail</text>
              </div>
            </div>
          </a>
        </div>
        <h1>El generador de correos perzonalizados para Marketing Cloud</h1>
        <p>Arma el correo con bloques y copia el HTML para pegarlo en Marketing Cloud.</p>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
        >
          Cambiar a tema {theme === 'dark' ? 'claro' : 'oscuro'}
        </button>
      </header>

      <div className="layout">
        <section aria-label="Editor de bloques">
          <div className="add-bar">
            <span>Agregar</span>
            {Object.entries(BLOCKS).map(([type, b]) => (
              <button key={type} onClick={() => add(type)}>{b.label}</button>
            ))}
          </div>

          {blocks.length === 0 ? (
            <p className="empty">Aún no hay bloques. Agrega uno para empezar.</p>
          ) : (
            <ol className="blocks">
              {blocks.map((block, i) => (
                <li key={block.id} className="block">
                  <div className="block-head">
                    <strong>{BLOCKS[block.type].label}</strong>
                    <span>
                      <button className="link" onClick={() => move(block.id, -1)} disabled={i === 0}>Subir</button>
                      <button className="link" onClick={() => move(block.id, 1)} disabled={i === blocks.length - 1}>Bajar</button>
                      <button className="link danger" onClick={() => remove(block.id)}>Quitar</button>
                    </span>
                  </div>
                  {BLOCKS[block.type].fields.map((f) => (
                    <Field key={f.k} block={block} field={f} variables={variables} onChange={update} onInsert={insertVariable} />
                  ))}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="preview" aria-label="Vista previa">
          <div className="actions">
            <button className="primary" onClick={generate} disabled={loading || blocks.length === 0}>
              {loading ? 'Generando…' : 'Generar correo'}
            </button>
            <button onClick={copy} disabled={!html}>{copied ? 'Copiado' : 'Copiar HTML'}</button>
            <span className="spacer" />
            <div className="segmented" role="group" aria-label="Ancho de la vista previa">
              <button aria-pressed={width === 640} onClick={() => setWidth(640)}>Escritorio</button>
              <button aria-pressed={width === 390} onClick={() => setWidth(390)}>Móvil</button>
            </div>
          </div>

          {error && <p className="note error" role="alert">{error}</p>}
          {html && stale && <p className="note stale">Hay cambios sin generar. La vista previa muestra la versión anterior.</p>}
          {warnings.length > 0 && (
            <ul className="warnings">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}

          {html ? (
            <div className="frame-wrap">
              <iframe title="Vista previa del correo" srcDoc={html} sandbox="" style={{ width }} />
            </div>
          ) : (
            <p className="placeholder">Genera el correo para ver cómo queda. Las variables se muestran sin reemplazar.</p>
          )}
        </section>
      </div>
    </div>
  );
}
