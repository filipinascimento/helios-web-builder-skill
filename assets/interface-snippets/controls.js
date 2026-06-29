// Standalone Helios UI helpers.
//
// These helpers are intentionally framework-free. They mirror the control
// shapes used by funding_viz, luddy_viz, and multiplex_notable_viz: compact
// labeled fields, exact numeric inputs beside sliders, long checklist sections,
// quick icon controls, hover cards, and small help/info popovers.

export function clampNumber(value, min = -Infinity, max = Infinity) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, notation: number >= 10000 ? 'compact' : 'standard' }).format(number);
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = options.text;
  if (options.html != null) element.innerHTML = options.html;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value == null || value === false) continue;
      element.setAttribute(name, value === true ? '' : String(value));
    }
  }
  if (options.style) Object.assign(element.style, options.style);
  if (options.children) element.append(...options.children.filter(Boolean));
  return element;
}

export function createFieldShell(label, description) {
  const caption = createElement('div', { className: 'hwbs-field__caption' });
  caption.append(createElement('span', { className: 'hwbs-field__label', text: label }));
  if (description) caption.append(createElement('span', { className: 'hwbs-field__description', text: description }));
  const control = createElement('div', { className: 'hwbs-field__control' });
  const root = createElement('label', { className: 'hwbs-field', children: [caption, control] });
  return { root, control, caption };
}

export function createSliderField({
  label,
  description,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  decimals = 2,
  onInput,
  onChange = onInput,
}) {
  const { root, control } = createFieldShell(label, description);
  const slider = createElement('input', {
    className: 'hwbs-slider',
    attrs: { type: 'range', min, max, step, value },
  });
  const number = createElement('input', {
    className: 'hwbs-number',
    attrs: { type: 'number', min, max, step, value },
  });
  const row = createElement('div', { className: 'hwbs-slider-row', children: [slider, number] });
  control.append(row);

  const sync = (next, commit) => {
    const clamped = clampNumber(next, min, max);
    const display = Number.isInteger(decimals) ? clamped.toFixed(decimals) : String(clamped);
    slider.value = String(clamped);
    number.value = display;
    const callback = commit ? onChange : onInput;
    if (callback) callback(clamped);
  };

  slider.addEventListener('input', () => sync(slider.value, false));
  slider.addEventListener('change', () => sync(slider.value, true));
  number.addEventListener('change', () => sync(number.value, true));

  return { root, slider, number, setValue: (next) => sync(next, false) };
}

export function createLogSliderField({
  label,
  description,
  value,
  min = 0.001,
  max = 100,
  steps = 240,
  decimals = 3,
  onInput,
  onChange = onInput,
}) {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const toSlider = (actual) => {
    const clamped = clampNumber(actual, min, max);
    return ((Math.log10(clamped) - logMin) / (logMax - logMin)) * steps;
  };
  const toActual = (sliderValue) => 10 ** (logMin + (Number(sliderValue) / steps) * (logMax - logMin));
  const field = createSliderField({
    label,
    description,
    value: toSlider(value),
    min: 0,
    max: steps,
    step: 1,
    decimals: 0,
    onInput: (sliderValue) => onInput?.(Number(toActual(sliderValue).toFixed(decimals))),
    onChange: (sliderValue) => onChange?.(Number(toActual(sliderValue).toFixed(decimals))),
  });
  field.number.value = Number(value).toFixed(decimals);
  field.number.addEventListener('change', () => {
    const actual = clampNumber(field.number.value, min, max);
    field.slider.value = String(toSlider(actual));
    onChange?.(Number(actual.toFixed(decimals)));
  });
  return { ...field, setValue: (next) => field.setValue(toSlider(next)) };
}

export function createRangeField({
  label,
  description,
  min,
  max,
  value = [min, max],
  step = 1,
  onChange,
}) {
  const { root, control } = createFieldShell(label, description);
  const start = createElement('input', { className: 'hwbs-number', attrs: { type: 'number', min, max, step, value: value[0] } });
  const end = createElement('input', { className: 'hwbs-number', attrs: { type: 'number', min, max, step, value: value[1] } });
  control.append(createElement('div', {
    className: 'hwbs-range-row',
    children: [start, createElement('span', { className: 'hwbs-range-row__sep', text: 'to' }), end],
  }));

  const commit = () => {
    const low = clampNumber(start.value, min, max);
    const high = clampNumber(end.value, min, max);
    const next = low <= high ? [low, high] : [high, low];
    start.value = String(next[0]);
    end.value = String(next[1]);
    onChange?.(next);
  };
  start.addEventListener('change', commit);
  end.addEventListener('change', commit);
  return { root, start, end, setValue: (next) => { start.value = String(next[0]); end.value = String(next[1]); commit(); } };
}

export function createSelectField({ label, description, value, options, onChange }) {
  const { root, control } = createFieldShell(label, description);
  const select = createElement('select', { className: 'hwbs-select' });
  for (const option of options) {
    const optionValue = typeof option === 'object' ? option.value : option;
    const optionLabel = typeof option === 'object' ? option.label : option;
    select.append(createElement('option', { text: optionLabel, attrs: { value: optionValue } }));
  }
  select.value = value;
  select.addEventListener('change', () => onChange?.(select.value));
  control.append(select);
  return { root, select };
}

export function createSegmentedField({ label, description, value, options, onChange }) {
  const { root, control } = createFieldShell(label, description);
  const group = createElement('div', { className: 'hwbs-segmented', attrs: { role: 'group', 'aria-label': label } });
  const buttons = new Map();
  const selectValue = (next) => {
    for (const [optionValue, button] of buttons) button.dataset.active = String(optionValue === next);
    onChange?.(next);
  };
  for (const option of options) {
    const optionValue = typeof option === 'object' ? option.value : option;
    const optionLabel = typeof option === 'object' ? option.label : option;
    const button = createElement('button', { className: 'hwbs-segmented__button', text: optionLabel, attrs: { type: 'button' } });
    button.dataset.active = String(optionValue === value);
    button.addEventListener('click', () => selectValue(optionValue));
    buttons.set(optionValue, button);
    group.append(button);
  }
  control.append(group);
  return { root, group, setValue: selectValue };
}

export function createCheckboxField({ label, description, checked = false, onChange }) {
  const input = createElement('input', { attrs: { type: 'checkbox' } });
  input.checked = Boolean(checked);
  input.addEventListener('change', () => onChange?.(input.checked));
  const text = createElement('span', { className: 'hwbs-check__text', text: label });
  const detail = description ? createElement('span', { className: 'hwbs-check__description', text: description }) : null;
  const root = createElement('label', { className: 'hwbs-check', children: [input, createElement('span', { children: [text, detail] })] });
  return { root, input };
}

export function createChecklistField({ label, description, options, selected = new Set(), onChange }) {
  const { root, control } = createFieldShell(label, description);
  const list = createElement('div', { className: 'hwbs-checklist' });
  const selectedSet = selected instanceof Set ? new Set(selected) : new Set(selected ?? []);
  const commit = () => onChange?.(new Set(selectedSet));
  for (const option of options) {
    const value = typeof option === 'object' ? option.value : option;
    const optionLabel = typeof option === 'object' ? option.label : option;
    const count = typeof option === 'object' ? option.count : null;
    const item = createCheckboxField({
      label: count == null ? optionLabel : `${optionLabel} (${formatCount(count)})`,
      checked: selectedSet.has(value),
      onChange: (checked) => {
        if (checked) selectedSet.add(value);
        else selectedSet.delete(value);
        commit();
      },
    });
    list.append(item.root);
  }
  control.append(list);
  return { root, selected: selectedSet };
}

export function createCollapsedSection({ title, count, initiallyOpen = false, content }) {
  const button = createElement('button', {
    className: 'hwbs-section__toggle',
    attrs: { type: 'button', 'aria-expanded': initiallyOpen ? 'true' : 'false' },
    children: [
      createElement('span', { className: 'hwbs-section__title', text: title }),
      count == null ? null : createElement('span', { className: 'hwbs-section__count', text: formatCount(count) }),
    ],
  });
  const body = createElement('div', { className: 'hwbs-section__body', children: [content] });
  const root = createElement('section', { className: 'hwbs-section', children: [button, body] });
  root.dataset.open = initiallyOpen ? 'true' : 'false';
  button.addEventListener('click', () => {
    const open = root.dataset.open !== 'true';
    root.dataset.open = String(open);
    button.setAttribute('aria-expanded', String(open));
  });
  return { root, button, body };
}

export function createRelationshipChecklist({
  relationships,
  visible = new Set(relationships.map((item) => item.value)),
  emphasized = new Set(),
  onVisibleChange,
  onEmphasisChange,
}) {
  const root = createElement('div', { className: 'hwbs-rel-list' });
  const toolbar = createElement('div', { className: 'hwbs-rel-list__toolbar' });
  const all = createElement('button', { className: 'hwbs-mini-button', text: 'All', attrs: { type: 'button' } });
  const none = createElement('button', { className: 'hwbs-mini-button', text: 'None', attrs: { type: 'button' } });
  toolbar.append(all, none);
  root.append(toolbar);

  const visibleSet = new Set(visible);
  const emphasizedSet = new Set(emphasized);
  const rows = new Map();
  const syncRows = () => {
    for (const [value, row] of rows) {
      row.dataset.visible = String(visibleSet.has(value));
      row.dataset.emphasized = String(emphasizedSet.has(value));
    }
  };
  const commitVisible = () => {
    syncRows();
    onVisibleChange?.(new Set(visibleSet));
  };
  const commitEmphasis = () => {
    syncRows();
    onEmphasisChange?.(new Set(emphasizedSet));
  };

  all.addEventListener('click', () => {
    for (const item of relationships) visibleSet.add(item.value);
    commitVisible();
  });
  none.addEventListener('click', () => {
    visibleSet.clear();
    commitVisible();
  });

  for (const item of relationships) {
    const row = createElement('div', { className: 'hwbs-rel-row' });
    row.dataset.value = item.value;
    const swatch = createElement('span', { className: 'hwbs-rel-row__swatch', style: { background: item.color ?? '#8ab4f8' } });
    const label = createElement('button', { className: 'hwbs-rel-row__label', text: item.label ?? item.value, attrs: { type: 'button' } });
    const count = createElement('span', { className: 'hwbs-rel-row__count', text: formatCount(item.count ?? 0) });
    const eye = createElement('button', { className: 'hwbs-eye-button', text: 'Show', attrs: { type: 'button', 'aria-label': `Toggle ${item.label ?? item.value}` } });
    label.addEventListener('click', () => {
      if (emphasizedSet.has(item.value)) emphasizedSet.delete(item.value);
      else emphasizedSet.add(item.value);
      commitEmphasis();
    });
    eye.addEventListener('click', () => {
      if (visibleSet.has(item.value)) visibleSet.delete(item.value);
      else visibleSet.add(item.value);
      commitVisible();
    });
    row.append(swatch, label, count, eye);
    rows.set(item.value, row);
    root.append(row);
  }
  syncRows();
  return { root, visible: visibleSet, emphasized: emphasizedSet };
}

export function createSearchField({ label = 'Search', placeholder = 'Search', value = '', onInput, onSubmit }) {
  const form = createElement('form', { className: 'hwbs-search' });
  const input = createElement('input', { className: 'hwbs-search__input', attrs: { type: 'search', placeholder, value, 'aria-label': label } });
  const clear = createElement('button', { className: 'hwbs-search__clear', text: 'Clear', attrs: { type: 'button' } });
  form.append(input, clear);
  input.addEventListener('input', () => onInput?.(input.value));
  clear.addEventListener('click', () => {
    input.value = '';
    onInput?.('');
    input.focus();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSubmit?.(input.value);
  });
  return { root: form, input, clear };
}

export function createHoverCard({ emptyText = 'Hover a node' } = {}) {
  const title = createElement('div', { className: 'hwbs-hover-card__title', text: emptyText });
  const body = createElement('div', { className: 'hwbs-hover-card__body' });
  const root = createElement('aside', { className: 'hwbs-hover-card is-empty', attrs: { 'aria-live': 'polite' }, children: [title, body] });
  return {
    root,
    setEmpty() {
      root.classList.add('is-empty');
      title.textContent = emptyText;
      body.replaceChildren();
    },
    setContent(nextTitle, rows = []) {
      root.classList.remove('is-empty');
      title.textContent = nextTitle;
      body.replaceChildren(...rows.map(([key, value]) => createElement('div', {
        className: 'hwbs-hover-card__row',
        children: [
          createElement('span', { text: key }),
          createElement('strong', { text: value == null ? '' : String(value) }),
        ],
      })));
    },
  };
}

export function createQuickControls(actions) {
  const root = createElement('div', { className: 'hwbs-quick-controls' });
  for (const action of actions) {
    const button = createElement('button', {
      className: 'hwbs-quick-button',
      text: action.icon ?? action.label,
      attrs: { type: 'button', title: action.label, 'aria-label': action.label },
    });
    if (action.active) button.dataset.active = 'true';
    button.addEventListener('click', () => action.onClick?.(button));
    root.append(button);
  }
  return { root };
}

export function createInfoPanel({ title, rows }) {
  const root = createElement('aside', { className: 'hwbs-info-panel' });
  root.append(createElement('h2', { text: title }));
  const list = createElement('dl');
  for (const [key, value] of rows) {
    list.append(createElement('dt', { text: key }), createElement('dd', { text: value == null ? '' : String(value) }));
  }
  root.append(list);
  root.hidden = true;
  return {
    root,
    show() { root.hidden = false; },
    hide() { root.hidden = true; },
    toggle() { root.hidden = !root.hidden; },
  };
}
