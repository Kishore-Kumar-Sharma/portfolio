'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useTransition } from 'react';
import { submitContactForm } from '@/app/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertCircle, User, Mail, MessageSquare } from 'lucide-react';
import { sectionVariants, cardVariants } from "@/styles/animations";

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be under 2000 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

// ── Field wrapper with label, icon, error ──────────────────────────────────
function Field({
  label, icon: Icon, error, children, charCount, maxChars,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
  charCount?: number;
  maxChars?: number;
}) {
  return (
    <motion.div className="mb-5" variants={cardVariants}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icon className="w-3.5 h-3.5 text-primary" />
          {label}
        </label>
        {charCount !== undefined && maxChars && (
          <span className={`text-xs tabular-nums ${charCount > maxChars * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {charCount}/{maxChars}
          </span>
        )}
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1 text-destructive text-xs mt-1.5 font-medium"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Contact() {
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, dirtyFields },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',       // ← validates on every keystroke
    criteriaMode: 'all',
  });

  const messageValue = watch('message', '');

  const onSubmit = (data: ContactFormData) => {
    setSubmitResult(null);
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('message', data.message);

    startTransition(async () => {
      const result = await submitContactForm(null, formData);
      setSubmitResult({ success: result.success, message: result.message });
      if (result.success) reset();
    });
  };

  return (
    <motion.section
      id="contact"
      className="py-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.1 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mb-16 mx-auto text-center">
          <h2 className="text-sm font-bold tracking-widest text-primary uppercase mb-3">Get in Touch</h2>
          <h3 className="text-3xl md:text-5xl font-bold font-space-grotesk text-foreground mb-6 tracking-tight">
            Let's Build Something Great
          </h3>
          <p className="text-muted-foreground text-lg leading-relaxed">
            I'm currently open for new opportunities and consulting. Whether you have a question or just want to engineer a solution, I'll try my best to get back to you.
          </p>
        </div>

        <motion.div
          className="max-w-xl mx-auto"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.div
            className="bg-card/50 border border-border/40 backdrop-blur-sm rounded-xl p-8 shadow-sm"
            variants={cardVariants}
          >
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Name */}
              <Field label="Full Name" icon={User} error={errors.name?.message}>
                <input
                  {...register('name')}
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 rounded-md bg-secondary/50 border transition-all duration-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2
                    ${errors.name
                      ? 'border-destructive focus:ring-destructive/20'
                      : dirtyFields.name
                        ? 'border-emerald-500/60 focus:ring-emerald-500/20'
                        : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                    }`}
                />
              </Field>

              {/* Email */}
              <Field label="Email Address" icon={Mail} error={errors.email?.message}>
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className={`w-full px-4 py-3 rounded-md bg-secondary/50 border transition-all duration-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2
                    ${errors.email
                      ? 'border-destructive focus:ring-destructive/20'
                      : dirtyFields.email
                        ? 'border-emerald-500/60 focus:ring-emerald-500/20'
                        : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                    }`}
                />
              </Field>

              {/* Message */}
              <Field
                label="Message"
                icon={MessageSquare}
                error={errors.message?.message}
                charCount={messageValue.length}
                maxChars={2000}
              >
                <textarea
                  {...register('message')}
                  id="message"
                  rows={5}
                  placeholder="Tell me about your project..."
                  className={`w-full px-4 py-3 rounded-md bg-secondary/50 border transition-all duration-200 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none
                    ${errors.message
                      ? 'border-destructive focus:ring-destructive/20'
                      : dirtyFields.message && !errors.message
                        ? 'border-emerald-500/60 focus:ring-emerald-500/20'
                        : 'border-border/60 focus:ring-primary/20 focus:border-primary'
                    }`}
                />
              </Field>

              {/* Submit + Result */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between mt-2">
                <motion.button
                  type="submit"
                  disabled={isPending || !isValid}
                  whileHover={{ y: !isPending && isValid ? -1 : 0 }}
                  whileTap={{ y: !isPending && isValid ? 1 : 0 }}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </motion.button>

                <AnimatePresence>
                  {submitResult && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-center gap-1.5 text-sm font-medium ${submitResult.success ? 'text-emerald-500' : 'text-destructive'}`}
                    >
                      {submitResult.success
                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                        : <AlertCircle className="w-4 h-4 shrink-0" />
                      }
                      {submitResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
