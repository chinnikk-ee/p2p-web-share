import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Lock, Network, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@p2p/ui';
import { Dropzone } from '@/components/upload/Dropzone';
import { SendPage } from './SendPage';

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Lock,
    title: 'End-to-end encrypted',
    description: 'AES-256-GCM in your browser. The key travels in the link, never to a server.',
  },
  {
    icon: Network,
    title: 'Truly peer-to-peer',
    description: 'WebRTC streams bytes browser-to-browser. The server only does the handshake.',
  },
  {
    icon: ShieldCheck,
    title: 'SHA-256 verified',
    description: 'Every chunk and the whole file are hash-checked, so corruption is impossible.',
  },
  {
    icon: Gauge,
    title: 'Any size',
    description: 'OPFS streaming + adaptive chunks move multi-gigabyte files without eating RAM.',
  },
  {
    icon: Zap,
    title: 'Resumable',
    description: 'Drops auto-recover with ICE restart and resume from the last verified chunk.',
  },
  {
    icon: Sparkles,
    title: 'No accounts',
    description: 'Drop a file, share a link. No sign-ups, no uploads, no storage limits.',
  },
];

const STEPS = ['Drop a file', 'Share the secret link', 'They download — direct & encrypted'];

export function LandingPage() {
  const [file, setFile] = useState<File | null>(null);

  if (file) {
    return <SendPage key={`${file.name}:${file.size}`} file={file} onReset={() => setFile(null)} />;
  }

  return (
    <div className="space-y-16">
      <section className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Direct, encrypted, browser-to-browser
          </span>
          <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Send files <span className="text-gradient">peer-to-peer</span>, with zero servers in the
            middle.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Drop a file to get a one-time share link. The recipient connects straight to your
            browser over an encrypted WebRTC channel. Your data never touches a server.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10"
        >
          <Card className="glass-strong p-2 shadow-2xl shadow-primary/10">
            <Dropzone onFile={setFile} />
          </Card>
          <ol className="mt-6 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </motion.div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Card className="h-full p-5 transition-colors hover:border-primary/40">
              <feature.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
