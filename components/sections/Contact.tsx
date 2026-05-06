"use client";

import { useFormState, useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { submitContactForm } from "@/app/actions";
import portfolioData from "@/data/portfolio.json";
import { Section } from "@/components/editorial/Section";
import { Reveal } from "@/components/editorial/Reveal";
import { useEffect, useRef, useState } from "react";

const initialState = {
  message: "",
  errors: undefined as Record<string, string[] | undefined> | undefined,
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-foreground text-background text-[0.9rem] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <span className="font-mono">sending</span>
          <span className="font-mono animate-caret-blink">_</span>
        </>
      ) : (
        <>
          Send message <span aria-hidden>→</span>
        </>
      )}
    </button>
  );
}

export function Contact() {
  const { personal } = portfolioData;
  const [state, formAction] = useFormState(submitContactForm, initialState);
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setMessage("");
    }
  }, [state.success]);

  return (
    <Section id="contact" index="06" eyebrow="Contact · let's build something hard">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
        {/* Left: invitation */}
        <div className="md:col-span-5">
          <Reveal>
            <h2 className="font-display text-display text-foreground text-balance leading-[1] tracking-[-0.03em]">
              You don&apos;t ship by <span className="font-display-soft italic text-accent">accident</span>.
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[44ch] text-body-lg text-muted-foreground text-pretty">
              If you&apos;re hiring a senior full-stack engineer, looking for someone who can own a feature end-to-end, or building a product that needs both depth and delivery — I&apos;d like to hear about it.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <dl className="mt-10 space-y-5 font-mono text-[0.85rem]">
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">email</dt>
                <dd>
                  <a href={`mailto:${personal.email}`} className="text-foreground hover:text-accent transition-colors">
                    {personal.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">linkedin</dt>
                <dd>
                  <a href={personal.linkedin} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">
                    /in/kishore-kumar-sharma
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">github</dt>
                <dd>
                  <a href={personal.github} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-accent transition-colors">
                    /kishore-kumar-sharma
                  </a>
                </dd>
              </div>
              <div className="flex items-baseline gap-3">
                <dt className="text-muted-foreground w-24 shrink-0">based</dt>
                <dd className="text-foreground">{personal.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        {/* Right: form */}
        <div className="md:col-span-7 md:pl-10 md:border-l md:border-subtle/60">
          <Reveal>
            <p className="eyebrow mb-6">Or write — I read everything</p>
          </Reveal>

          <form ref={formRef} action={formAction} className="space-y-6" noValidate>
            <Field
              label="Your name"
              name="name"
              type="text"
              required
              error={state.errors?.name?.[0]}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              error={state.errors?.email?.[0]}
            />
            <div>
              <label htmlFor="message" className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[0.78rem] text-muted-foreground">Message</span>
                <span className="font-mono text-[0.7rem] text-muted-foreground num">{message.length} chars</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-transparent border-b border-subtle focus:border-foreground transition-colors py-2 text-[0.95rem] outline-none resize-none placeholder:text-muted-foreground/50"
                placeholder="What are you building?"
              />
              {state.errors?.message?.[0] && (
                <p className="mt-2 font-mono text-[0.75rem] text-destructive">{state.errors.message[0]}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <SubmitButton />
              <AnimatePresence mode="wait">
                {state.message && (
                  <motion.p
                    key={state.message}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`font-mono text-[0.78rem] ${
                      state.success ? "text-edtech" : "text-destructive"
                    }`}
                  >
                    {state.success ? "✓ " : "× "}
                    {state.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>
    </Section>
  );
}

function Field({
  label,
  name,
  type,
  required,
  error,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-mono text-[0.78rem] text-muted-foreground mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full bg-transparent border-b border-subtle focus:border-foreground transition-colors py-2 text-[0.95rem] outline-none placeholder:text-muted-foreground/50"
      />
      {error && <p className="mt-2 font-mono text-[0.75rem] text-destructive">{error}</p>}
    </div>
  );
}
