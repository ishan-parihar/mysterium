<script lang="ts">
  /**
   * Input — text input with label, error, and Veil-compliant styling.
   * Replaces 12 hand-rolled inputs in /recover.
   */
  interface Props {
    value: string;
    oninput: (value: string) => void;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea';
    label?: string;
    error?: string;
    placeholder?: string;
    maxlength?: number;
    disabled?: boolean;
    required?: boolean;
    id?: string;
    autocomplete?: 'on' | 'off' | 'name' | 'email' | 'one-time-code' | 'current-password' | 'new-password';
    ariaInvalid?: boolean;
  }

  let {
    value,
    oninput,
    type = 'text',
    label,
    error,
    placeholder,
    maxlength,
    disabled = false,
    required = false,
    id,
    autocomplete,
    ariaInvalid,
  }: Props = $props();

  const inputId = $derived(id ?? `input-${Math.random().toString(36).slice(2, 9)}`);
  const errorId = $derived(`${inputId}-error`);
  const isInvalid = $derived(ariaInvalid ?? (error !== undefined && error.length > 0));
</script>

{#if type === 'textarea'}
  {#if label}<label class="input-label" for={inputId}>{label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</label>{/if}
  <textarea
    class="input"
    id={inputId}
    {placeholder}
    {maxlength}
    {disabled}
    {required}
    autocomplete={autocomplete}
    aria-invalid={isInvalid}
    aria-describedby={error ? errorId : undefined}
    oninput={(e) => oninput(e.currentTarget.value)}
  >{value}</textarea>
  {#if error}<p class="input-error" id={errorId} role="alert">{error}</p>{/if}
{:else}
  {#if label}<label class="input-label" for={inputId}>{label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</label>{/if}
  <input
    class="input"
    id={inputId}
    type={type}
    value={value}
    {placeholder}
    {maxlength}
    {disabled}
    {required}
    autocomplete={autocomplete}
    aria-invalid={isInvalid}
    aria-describedby={error ? errorId : undefined}
    oninput={(e) => oninput(e.currentTarget.value)}
  />
  {#if error}<p class="input-error" id={errorId} role="alert">{error}</p>{/if}
{/if}

<style>
  .input-label {
    display: block;
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    font-weight: 500;
    color: var(--mysterium-fg);
    margin-bottom: var(--mysterium-space-2);
    letter-spacing: var(--mysterium-tracking-wide);
  }

  .required {
    color: var(--mysterium-danger);
    margin-left: var(--mysterium-space-1);
  }

  .input {
    width: 100%;
    padding: var(--mysterium-space-3) var(--mysterium-space-4);
    background: var(--mysterium-surface);
    border: 1px solid var(--mysterium-border);
    border-radius: var(--mysterium-radius);
    color: var(--mysterium-fg);
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-base);
    transition: border-color var(--mysterium-duration-fast) var(--mysterium-ease),
                box-shadow var(--mysterium-duration-fast) var(--mysterium-ease);
    -webkit-tap-highlight-color: transparent;
  }

  .input::placeholder {
    color: var(--mysterium-fg-muted);
    opacity: 0.7;
  }

  .input:focus {
    outline: none;
    border-color: var(--mysterium-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mysterium-accent) 20%, transparent);
  }

  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input[aria-invalid='true'] {
    border-color: var(--mysterium-danger);
  }

  textarea.input {
    min-height: 6rem;
    resize: vertical;
    line-height: var(--mysterium-leading-normal);
  }

  .input-error {
    font-family: var(--mysterium-font-body);
    font-size: var(--mysterium-text-sm);
    color: var(--mysterium-danger);
    margin-top: var(--mysterium-space-1);
  }
</style>
