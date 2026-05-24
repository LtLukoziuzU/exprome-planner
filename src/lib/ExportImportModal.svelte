<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { exportActiveBuild, importBuild } from './state/builds';

  export let mode: 'export' | 'import';

  const dispatch = createEventDispatcher();

  let exportString = '';
  let importString = '';
  let importError = '';
  let copied = false;
  let textareaEl: HTMLTextAreaElement;

  $: title = mode === 'export' ? 'Export Build' : 'Import Build';

  $: if (mode === 'export') {
    exportString = exportActiveBuild() ?? '(no active build)';
    copied = false;
  }

  // Select all the export text on mount so users can ⌘/Ctrl-C immediately.
  $: if (mode === 'export' && textareaEl && exportString) {
    tick().then(() => {
      textareaEl.focus();
      textareaEl.select();
    });
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(exportString);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // Fallback: select the text and ask user to Ctrl-C
      textareaEl?.focus();
      textareaEl?.select();
    }
  }

  function doImport() {
    importError = '';
    const result = importBuild(importString);
    if (result.ok) {
      dispatch('close');
    } else {
      importError = result.reason;
    }
  }

  function close() {
    dispatch('close');
  }
  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={onKeydown} />

<div class="backdrop" on:click={onBackdrop} role="presentation">
  <div class="modal" role="dialog" aria-label={title}>
    <header>
      <h3 class="flourish">{title}</h3>
      <button class="close" on:click={close} aria-label="Close">×</button>
    </header>

    {#if mode === 'export'}
      <p class="desc">Copy this string and paste it elsewhere (or import it into a different browser) to restore the active build, including every character's skills and the outpost state.</p>
      <textarea
        bind:this={textareaEl}
        readonly
        value={exportString}
        rows="6"
        spellcheck="false"
      ></textarea>
      <div class="actions">
        <button class="primary" on:click={copyToClipboard}>{copied ? '✓ Copied' : 'Copy to clipboard'}</button>
        <button on:click={close}>Close</button>
      </div>
    {:else}
      <p class="desc">Paste a build string here. It will be imported as a new build (your existing builds aren't touched).</p>
      <textarea
        bind:value={importString}
        rows="6"
        spellcheck="false"
        placeholder="exprome:eyJ2..."
        autofocus
      ></textarea>
      {#if importError}
        <div class="error">{importError}</div>
      {/if}
      <div class="actions">
        <button class="primary" on:click={doImport} disabled={!importString.trim()}>Import</button>
        <button on:click={close}>Cancel</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(2px);
  }
  .modal {
    width: min(620px, 92vw);
    background: var(--bg-elevated);
    border: 1px solid var(--gold);
    border-radius: 6px;
    padding: 1.2rem 1.4rem 1.4rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
  }
  h3 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--gold-bright);
  }
  .close {
    background: transparent;
    border: 1px solid var(--border);
    width: 30px; height: 30px;
    padding: 0;
    border-radius: 50%;
    font-size: 1.1rem;
    line-height: 1;
  }
  .desc {
    margin: 0 0 0.7rem;
    color: var(--text-dim);
    font-size: 0.9rem;
    line-height: 1.4;
  }
  textarea {
    width: 100%;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: 3px;
    padding: 0.5rem 0.6rem;
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.78rem;
    line-height: 1.4;
    resize: vertical;
    word-break: break-all;
  }
  textarea:focus {
    outline: none;
    border-color: var(--gold);
  }
  .error {
    margin-top: 0.5rem;
    padding: 0.5rem 0.7rem;
    background: rgba(160, 39, 54, 0.18);
    border-left: 3px solid var(--crimson);
    color: var(--crimson-bright);
    font-size: 0.85rem;
  }
  .actions {
    margin-top: 0.9rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .primary {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .primary:hover {
    background: rgba(214, 168, 90, 0.12);
  }
</style>
