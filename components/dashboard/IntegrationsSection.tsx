"use client";

import Link from "next/link";
import { useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { Building2, MapPin, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TOP_SCHOOLS = [
  {
    name: "Harvard University",
    location: "Cambridge, MA",
    description: "Top faculty in medicine, economics, policy, and computer science.",
    logoUrl: "/schools/harvard.png",
    href: "/dashboard/professors?school=Harvard",
    gradient: "from-[#B8905A]/15 via-[#B86B42]/8 to-transparent",
  },
  {
    name: "Stanford University",
    location: "Stanford, CA",
    description: "Strong programs in AI, entrepreneurship, and engineering research.",
    logoUrl: "/schools/stanford.png",
    href: "/dashboard/professors?school=Stanford",
    gradient: "from-[#A8502D]/15 via-[#B86B42]/8 to-transparent",
  },
  {
    name: "MIT",
    location: "Cambridge, MA",
    description: "Research-heavy culture with world-class technical labs.",
    logoUrl: "/schools/mit.png",
    href: "/dashboard/professors?school=MIT",
    gradient: "from-[#B89E6E]/15 via-[#B8905A]/8 to-transparent",
  },
  {
    name: "UC Berkeley",
    location: "Berkeley, CA",
    description: "Great access to professors in CS, EECS, and data science.",
    logoUrl: "/schools/berkeley.png",
    href: "/dashboard/professors?school=UC%20Berkeley",
    gradient: "from-[#B86B42]/15 via-[#A8502D]/8 to-transparent",
  },
  {
    name: "Carnegie Mellon",
    location: "Pittsburgh, PA",
    description: "Renowned for robotics, machine learning, and HCI.",
    logoUrl: "/schools/carnegie.png",
    href: "/dashboard/professors?school=Carnegie%20Mellon",
    gradient: "from-[#A8502D]/15 via-[#B89E6E]/8 to-transparent",
  },
  {
    name: "Oxford University",
    location: "Oxford, UK",
    description: "Leading global research ecosystem across many disciplines.",
    logoUrl: "/schools/oxford.png",
    href: "/dashboard/professors?school=Oxford",
    gradient: "from-[#B8905A]/15 via-[#A8502D]/8 to-transparent",
  },
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.6, 0.05, 0.01, 0.9] },
  },
};

export default function IntegrationsSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden py-16 md:py-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1, 1.08, 1],
            rotate: shouldReduceMotion ? 0 : [0, 20, 0],
            opacity: [0.03, 0.07, 0.03],
          }}
          transition={{
            duration: shouldReduceMotion ? 0.5 : 14,
            repeat: shouldReduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
          className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-white/20 blur-[140px]"
        />
        <motion.div
          animate={{
            scale: shouldReduceMotion ? 1 : [1.06, 1, 1.06],
            rotate: shouldReduceMotion ? 0 : [0, -25, 0],
            opacity: [0.03, 0.07, 0.03],
          }}
          transition={{
            duration: shouldReduceMotion ? 0.5 : 13,
            repeat: shouldReduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
          className="absolute -left-24 -bottom-20 h-80 w-80 rounded-full bg-white/15 blur-[140px]"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: [0.6, 0.05, 0.01, 0.9] }}
          className="mb-12 text-center"
        >
          <Badge variant="secondary" className="mb-4 bg-white/10 text-white/70">
            <Sparkles className="h-3 w-3" />
            Top schools
          </Badge>
          <h2 className="bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
            Email professors at top schools
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/45 md:text-base">
            Choose a university and jump into a filtered professor directory.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TOP_SCHOOLS.map((school) => (
            <SchoolCard key={school.name} school={school} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.15, duration: 0.55 }}
          className="mt-12 text-center"
        >
          <Link href="/dashboard/professors">
            <Button className="rounded-full bg-white text-black hover:bg-white/90 px-7">
              Browse all schools
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function SchoolCard({ school }: { school: (typeof TOP_SCHOOLS)[number] }) {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 280,
    damping: 28,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 280,
    damping: 28,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = (e.clientX - rect.left - width / 2) / (width / 2);
    const y = (e.clientY - rect.top - height / 2) / (height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div variants={itemVariants} className="[perspective:1000px]">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        className="group relative"
      >
        <Link href={school.href}>
          <Card className="relative overflow-hidden rounded-3xl border-white/12 bg-white/[0.03] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_20px_60px_-35px_rgba(184,107,66,0.45)]">
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${school.gradient}`}
              animate={
                isHovered
                  ? { opacity: 1 }
                  : { opacity: shouldReduceMotion ? 0.1 : 0.25 }
              }
              transition={{ duration: 0.35 }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={isHovered ? { opacity: 1, scale: 1 } : { opacity: 0.55, scale: 1 }}
              className="absolute right-4 top-4 z-10"
            >
              <Sparkles className="h-4 w-4 text-[#B8905A]" />
            </motion.div>

            <div className="relative z-10 p-6">
              <div className="mb-5 flex items-center justify-center">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white/5 blur-xl" />
                  <img
                    src={school.logoUrl}
                    alt={`${school.name} logo`}
                    className="relative h-14 w-14 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="text-center">
                <h3 className="mb-2 text-xl font-semibold tracking-tight text-white">{school.name}</h3>
                <div className="mb-3 inline-flex items-center gap-1 text-xs text-white/45">
                  <MapPin className="h-3 w-3" />
                  <span>{school.location}</span>
                </div>
                <p className="text-sm text-white/50">{school.description}</p>

                <div className="mt-5 flex justify-center">
                  <Badge variant="outline" className="border-white/15 bg-white/5 text-white/65 gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Open directory
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
}
