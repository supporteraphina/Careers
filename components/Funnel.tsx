'use client';

// One-question-per-view funnel renderer. Navigation decisions live in
// lib/engine/runner.ts; this component only renders pages, collects
// answers, and submits the finished run to /api/apply.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nextPageId, pipe, progress, validateFieldValue } from '../lib/engine/runner';
import type { Answers, AnswerValue, Field, FormDefinition } from '../lib/engine/types';

interface FunnelProps {
  form: FormDefinition;
}

interface SavedState {
  pageId: string;
  history: string[];
  answers: Answers;
}

const AUTO_ADVANCE_MS = 220;

function storageKey(slug: string) {
  return `halevora-apply:${slug}`;
}

export default function Funnel({ form }: FunnelProps) {
  const firstPageId = form.pages[0].id;
  const [pageId, setPageId] = useState(firstPageId);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const meta = useRef<{ utm: Record<string, string>; referrerUrl: string }>({
    utm: {},
    referrerUrl: '',
  });
  const autoAdvance = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = useMemo(
    () => form.pages.find((p) => p.id === pageId) ?? form.pages[0],
    [form, pageId],
  );
  const { index, total } = progress(form, page.id);

  // Restore a draft, capture UTM parameters and the referrer once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const [key, value] of params) {
      if (key.startsWith('utm_') || key === 'ref') utm[key] = value;
    }
    meta.current = { utm, referrerUrl: document.referrer };

    try {
      const raw = window.localStorage.getItem(storageKey(form.slug));
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedState;
      if (form.pages.some((p) => p.id === saved.pageId)) {
        setAnswers(saved.answers ?? {});
        setHistory(saved.history ?? []);
        setPageId(saved.pageId);
      }
    } catch {
      window.localStorage.removeItem(storageKey(form.slug));
    }
  }, [form]);

  // Autosave the draft after every change until the run is submitted.
  useEffect(() => {
    if (submitted) return;
    const state: SavedState = { pageId, history, answers };
    window.localStorage.setItem(storageKey(form.slug), JSON.stringify(state));
  }, [form.slug, pageId, history, answers, submitted]);

  const setAnswer = useCallback((fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const submitRun = useCallback(
    async (finalAnswers: Answers, endingId: string) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const response = await fetch('/api/apply', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            slug: form.slug,
            answers: finalAnswers,
            utm: meta.current.utm,
            referrerUrl: meta.current.referrerUrl,
            website: honeypot,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? 'Submission failed');
        }
        setSubmitted(true);
        window.localStorage.removeItem(storageKey(form.slug));
        setHistory((prev) => [...prev, pageId]);
        setPageId(endingId);
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'Submission failed. Try again.',
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form.slug, honeypot, pageId],
  );

  const advance = useCallback(
    (answersNow: Answers) => {
      if (submitting) return;
      const fieldErrors: Record<string, string> = {};
      for (const field of page.fields ?? []) {
        const error = validateFieldValue(field, answersNow[field.id]);
        if (error) fieldErrors[field.id] = error;
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return;
      }

      const nextId = nextPageId(form, page.id, answersNow);
      if (!nextId) return;
      const nextPage = form.pages.find((p) => p.id === nextId);
      if (nextPage?.kind === 'ending') {
        void submitRun(answersNow, nextId);
        return;
      }
      setHistory((prev) => [...prev, page.id]);
      setPageId(nextId);
    },
    [form, page, submitRun, submitting],
  );

  const goBack = useCallback(() => {
    if (history.length === 0 || submitting) return;
    setErrors({});
    setSubmitError(null);
    setPageId(history[history.length - 1]);
    setHistory((prev) => prev.slice(0, -1));
  }, [history, submitting]);

  const selectAndMaybeAdvance = useCallback(
    (field: Field, value: AnswerValue) => {
      const answersNow = { ...answers, [field.id]: value };
      setAnswer(field.id, value);
      const soloChoice =
        (page.fields ?? []).length === 1 &&
        (field.type === 'single_choice' ||
          field.type === 'legal_gate' ||
          field.type === 'linear_scale');
      if (soloChoice) {
        if (autoAdvance.current) clearTimeout(autoAdvance.current);
        autoAdvance.current = setTimeout(() => advance(answersNow), AUTO_ADVANCE_MS);
      }
    },
    [advance, answers, page.fields, setAnswer],
  );

  useEffect(
    () => () => {
      if (autoAdvance.current) clearTimeout(autoAdvance.current);
    },
    [],
  );

  const isEnding = page.kind === 'ending';
  const hasFields = (page.fields ?? []).length > 0;

  return (
    <div className="funnel-shell">
      <div className="funnel-progress" aria-hidden="true">
        <div
          className="funnel-progress__bar"
          style={{ transform: `scaleX(${index / total})` }}
        />
      </div>

      <main className="funnel-main">
        <div className="funnel-card" key={page.id}>
          <h1 className="funnel-title">{pipe(page.title, answers)}</h1>
          {page.description && (
            <p className="funnel-desc">{pipe(page.description, answers)}</p>
          )}

          {hasFields && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                advance(answers);
              }}
            >
              <input
                type="text"
                name="website"
                className="hp-field"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />

              {(page.fields ?? []).map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  error={errors[field.id]}
                  onChange={(value) => setAnswer(field.id, value)}
                  onSelect={(value) => selectAndMaybeAdvance(field, value)}
                />
              ))}

              <p className="funnel-error" role="alert">
                {Object.values(errors)[0] ?? submitError ?? ''}
              </p>

              <div className="funnel-nav">
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Sending…' : (page.cta ?? 'Continue')}
                </button>
                {history.length > 0 && (
                  <button type="button" className="funnel-back" onClick={goBack}>
                    Back
                  </button>
                )}
              </div>
            </form>
          )}

          {!hasFields && !isEnding && (
            <div className="funnel-nav">
              <button
                type="button"
                className="btn"
                disabled={submitting}
                onClick={() => advance(answers)}
              >
                {submitting ? 'Sending…' : (page.cta ?? 'Continue')}
              </button>
              {history.length > 0 && (
                <button type="button" className="funnel-back" onClick={goBack}>
                  Back
                </button>
              )}
            </div>
          )}

          {!hasFields && !isEnding && submitError && (
            <p className="funnel-error" role="alert">
              {submitError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
  onSelect,
}: {
  field: Field;
  value: AnswerValue | undefined;
  error: string | undefined;
  onChange: (value: AnswerValue) => void;
  onSelect: (value: AnswerValue) => void;
}) {
  const inputId = `field-${field.id}`;

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="funnel-label" htmlFor={inputId}>
          {field.label}
        </label>
        <textarea
          id={inputId}
          className="funnel-textarea"
          placeholder={field.placeholder}
          value={String(value ?? '')}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.help && <p className="funnel-help">{field.help}</p>}
      </div>
    );
  }

  if (field.type === 'single_choice' || field.type === 'legal_gate') {
    return (
      <div>
        <span className="funnel-label">{field.label}</span>
        <div className="choice-list" role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option, i) => {
            const selected = value === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`choice${selected ? ' choice--selected' : ''}`}
                onClick={() => onSelect(option)}
              >
                <span className="choice__key">{String.fromCharCode(65 + i)}</span>
                {option}
              </button>
            );
          })}
        </div>
        {field.help && <p className="funnel-help">{field.help}</p>}
      </div>
    );
  }

  if (field.type === 'multi_choice') {
    const values = Array.isArray(value) ? value : [];
    return (
      <div>
        <span className="funnel-label">{field.label}</span>
        <div className="choice-list">
          {(field.options ?? []).map((option, i) => {
            const selected = values.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                className={`choice${selected ? ' choice--selected' : ''}`}
                onClick={() =>
                  onChange(
                    selected
                      ? values.filter((v) => v !== option)
                      : [...values, option],
                  )
                }
              >
                <span className="choice__key">{String.fromCharCode(65 + i)}</span>
                {option}
              </button>
            );
          })}
        </div>
        {field.help && <p className="funnel-help">{field.help}</p>}
      </div>
    );
  }

  if (field.type === 'linear_scale') {
    const min = field.min ?? 1;
    const max = field.max ?? 10;
    const dots = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div>
        <span className="funnel-label">{field.label}</span>
        <div className="scale-row" role="radiogroup" aria-label={field.label}>
          {dots.map((dot) => {
            const selected = Number(value) === dot;
            return (
              <button
                key={dot}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`scale-dot${selected ? ' scale-dot--selected' : ''}`}
                onClick={() => onSelect(dot)}
              >
                {dot}
              </button>
            );
          })}
        </div>
        {field.help && <p className="funnel-help">{field.help}</p>}
      </div>
    );
  }

  const inputType =
    field.type === 'email'
      ? 'email'
      : field.type === 'phone'
        ? 'tel'
        : field.type === 'number'
          ? 'number'
          : field.type === 'url'
            ? 'url'
            : 'text';

  return (
    <div>
      <label className="funnel-label" htmlFor={inputId}>
        {field.label}
      </label>
      <input
        id={inputId}
        className="funnel-input"
        type={inputType}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        placeholder={field.placeholder}
        value={String(value ?? '')}
        aria-invalid={Boolean(error)}
        onChange={(event) =>
          onChange(
            field.type === 'number' && event.target.value !== ''
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
      {field.help && <p className="funnel-help">{field.help}</p>}
    </div>
  );
}
