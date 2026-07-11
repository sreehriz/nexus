import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Video, Shield, Smartphone, Zap, Users, Cloud } from "lucide-react";

interface FeatureItem {
  id: number;
  title: string;
  description: string;
  image: string;
}

interface TestimonialsCardProps {
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showNavigation?: boolean;
  showCounter?: boolean;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: 1,
    title: "Crystal-Clear Video",
    description: "Experience ultra-smooth HD meetings with adaptive video quality for every network.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    title: "Secure by Design",
    description: "Enterprise-grade encryption keeps every conversation private and protected.",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    title: "Meet Anywhere",
    description: "Join meetings seamlessly from desktop, tablet, or mobile with a consistent experience.",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 4,
    title: "Lightning Fast",
    description: "Low-latency infrastructure ensures smooth communication even on slower networks.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 5,
    title: "Effortless Collaboration",
    description: "Share screens, collaborate live, and stay connected without interruptions.",
    image: "https://images.unsplash.com/photo-1581291518655-9523c932dedf?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 6,
    title: "Reliable Infrastructure",
    description: "Cloud-powered architecture built for stability, scalability, and high availability.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80"
  }
];

// Helper to get matching premium icon for each feature
const getFeatureIcon = (id: number) => {
  switch (id) {
    case 1:
      return <Video className="w-12 h-12 text-theme-text-primary" />;
    case 2:
      return <Shield className="w-12 h-12 text-theme-text-primary" />;
    case 3:
      return <Smartphone className="w-12 h-12 text-theme-text-primary" />;
    case 4:
      return <Zap className="w-12 h-12 text-theme-text-primary" />;
    case 5:
      return <Users className="w-12 h-12 text-theme-text-primary" />;
    case 6:
      return <Cloud className="w-12 h-12 text-theme-text-primary" />;
    default:
      return <Video className="w-12 h-12 text-theme-text-primary" />;
  }
};

export default function TestimonialsCard({
  autoPlay = true,
  autoPlayInterval = 4000,
  showNavigation = true,
  showCounter = true
}: TestimonialsCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % DEFAULT_FEATURES.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + DEFAULT_FEATURES.length) % DEFAULT_FEATURES.length);
  };

  const handleSelect = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Setup autoplay timer
  useEffect(() => {
    if (autoPlay) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, autoPlayInterval);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, currentIndex]);

  // Reset timer on manual navigation
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      if (autoPlay) {
        timerRef.current = setInterval(() => {
          handleNext();
        }, autoPlayInterval);
      }
    }
  };

  const currentFeature = DEFAULT_FEATURES[currentIndex];

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0
    })
  };

  return (
    <div id="testimonials-carousel" className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <div className="relative glass-panel-heavy border border-theme-border/60 dark:border-theme-border/40 rounded-3xl p-6 md:p-10 shadow-xl shadow-black/[0.04] dark:shadow-black/40 overflow-hidden min-h-[380px] md:min-h-[320px] flex flex-col justify-between group">
        
        {/* Subtle background glow effect inside the card */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-theme-text-primary/5 rounded-full blur-3xl pointer-events-none translate-x-12 -translate-y-12" />
        
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentFeature.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
          >
            {/* Visual Column */}
            <div className="md:col-span-5 flex justify-center items-center h-full">
              <div className="relative w-full aspect-[4/3] rounded-2xl border border-theme-border/50 dark:border-theme-border/30 overflow-hidden bg-theme-secondary/25 flex items-center justify-center group-hover:border-theme-border/80 transition-all duration-300 shadow-inner">
                
                {/* High-quality feature image */}
                {currentFeature.image && (
                  <img
                    src={currentFeature.image}
                    alt={currentFeature.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover opacity-75 dark:opacity-60 grayscale contrast-125 mix-blend-luminosity hover:scale-105 transition-all duration-700 ease-out-expo"
                  />
                )}
                
                {/* Modern Saas Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-theme-bg/95 via-theme-bg/35 to-transparent pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                
                <motion.div 
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex flex-col items-center gap-4 z-10"
                >
                  <div className="w-16 h-16 rounded-2xl bg-theme-bg/80 backdrop-blur-md border border-theme-border/50 flex items-center justify-center shadow-2xl">
                    {getFeatureIcon(currentFeature.id)}
                  </div>
                </motion.div>

                {/* Subtly animated flowing elements */}
                <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-theme-text-primary/5 blur-xl" />
                <div className="absolute -top-2 -right-2 w-20 h-20 rounded-full bg-theme-text-primary/5 blur-xl" />
              </div>
            </div>

            {/* Content Column */}
            <div className="md:col-span-7 flex flex-col justify-center text-left">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-theme-text-primary/5 border border-theme-text-primary/10 text-theme-text-secondary">
                  Feature 0{currentFeature.id}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-display font-bold text-theme-text-primary tracking-tight mb-4">
                {currentFeature.title}
              </h3>
              <p className="text-sm md:text-base text-theme-text-secondary leading-relaxed font-normal">
                {currentFeature.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation & Controls Section */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-theme-border/30">
          
          {/* Index Counter */}
          {showCounter && (
            <div className="text-xs font-mono tracking-widest text-theme-text-muted">
              <span className="text-theme-text-primary font-bold">0{currentIndex + 1}</span>
              <span className="mx-1 opacity-40">/</span>
              <span>0{DEFAULT_FEATURES.length}</span>
            </div>
          )}

          {/* Bullet Indicators */}
          <div className="flex items-center gap-2">
            {DEFAULT_FEATURES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  handleSelect(idx);
                  resetTimer();
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex 
                    ? "w-6 bg-theme-text-primary" 
                    : "w-1.5 bg-theme-text-muted/30 hover:bg-theme-text-muted/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Next / Prev Buttons */}
          {showNavigation && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handlePrev();
                  resetTimer();
                }}
                className="p-2 rounded-lg border border-theme-border/50 dark:border-theme-border/30 hover:border-theme-text-primary/50 text-theme-text-secondary hover:text-theme-text-primary transition-all active:scale-95 hover:bg-theme-text-secondary/5 cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  handleNext();
                  resetTimer();
                }}
                className="p-2 rounded-lg border border-theme-border/50 dark:border-theme-border/30 hover:border-theme-text-primary/50 text-theme-text-secondary hover:text-theme-text-primary transition-all active:scale-95 hover:bg-theme-text-secondary/5 cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
