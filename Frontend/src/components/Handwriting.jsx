import React from "react"
import { motion } from "framer-motion"

// Animated Hand-drawn Underline SVG
export const UnderlineDraw = ({ color = "#E06D53", className = "", delay = 0.2 }) => {
  return (
    <svg
      className={`inline-block absolute bottom-0 left-0 w-full overflow-visible pointer-events-none ${className}`}
      viewBox="0 0 200 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d="M2 9C50 3 150 2 198 8M10 11C70 6 130 5 190 10"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
      />
    </svg>
  )
}

// Animated Hand-drawn Circle Loop SVG
export const CircleDraw = ({ color = "#8B5CF6", className = "", delay = 0.3 }) => {
  return (
    <svg
      className={`absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] overflow-visible pointer-events-none ${className}`}
      viewBox="0 0 120 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M6 30C5 12 25 4 60 4C100 4 116 16 114 32C112 48 88 56 50 56C18 56 4 44 8 28C10 18 25 10 45 8"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 2"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, delay, ease: "easeInOut" }}
      />
    </svg>
  )
}

// Animated Highlight Brush Stroke
export const HighlightBrush = ({ color = "#E06D5322", children, className = "" }) => {
  return (
    <span className={`relative inline-block px-2 py-0.5 ${className}`}>
      <motion.span
        className="absolute inset-0 rounded-sm -z-10"
        style={{ backgroundColor: color }}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {children}
    </span>
  )
}

// Sketched Floating Paper Crane Illustration SVG
export const DoodleCrane = ({ className = "" }) => {
  return (
    <motion.svg
      className={`w-12 h-12 text-zinc-400 stroke-current ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{
        y: [0, -12, 0],
        rotate: [0, 5, -3, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <path d="M10 50 L50 20 L90 50 L50 80 Z" />
      <path d="M50 20 L50 80" />
      <path d="M10 50 L50 40 L90 50" />
      <path d="M30 35 L15 15 L35 25" />
      <path d="M70 35 L85 15 L65 25" />
    </motion.svg>
  )
}

// Sketched Floating Book Stack Illustration SVG
export const DoodleBooks = ({ className = "" }) => {
  return (
    <motion.svg
      className={`w-16 h-16 text-amber-700/60 stroke-current ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{
        y: [0, -8, 0],
        rotate: [0, -4, 0],
      }}
      transition={{
        duration: 5.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Book 1 */}
      <rect x="20" y="65" width="60" height="15" rx="3" />
      <line x1="28" y1="65" x2="28" y2="80" />
      {/* Book 2 */}
      <rect x="15" y="45" width="70" height="16" rx="3" />
      <line x1="23" y1="45" x2="23" y2="61" />
      {/* Book 3 */}
      <rect x="25" y="25" width="50" height="16" rx="3" />
      <line x1="33" y1="25" x2="33" y2="41" />
      {/* Bookmark */}
      <path d="M60 25 L60 38 L65 34 L70 38 L70 25" fill="currentColor" opacity="0.3" />
    </motion.svg>
  )
}

// Sketched AI Evaluator Robot Doodle SVG
export const DoodleRobot = ({ className = "" }) => {
  return (
    <motion.svg
      className={`w-14 h-14 text-purple-400/70 stroke-current ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{
        y: [0, -10, 0],
        rotate: [0, 3, -3, 0],
      }}
      transition={{
        duration: 7,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Head */}
      <rect x="30" y="30" width="40" height="35" rx="6" />
      {/* Antenna */}
      <line x1="50" y1="30" x2="50" y2="15" />
      <circle cx="50" cy="12" r="4" fill="currentColor" />
      {/* Eyes */}
      <circle cx="42" cy="45" r="4" />
      <circle cx="58" cy="45" r="4" />
      {/* Mouth */}
      <path d="M42 58 Q50 64 58 58" />
      {/* Ears */}
      <path d="M22 42 L30 42" />
      <path d="M70 42 L78 42" />
    </motion.svg>
  )
}

// Sketched Arrow Pointer Doodle SVG
export const DoodleArrow = ({ className = "", color = "#E06D53" }) => {
  return (
    <svg
      className={`w-12 h-12 ${className}`}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        d="M10 15 C 25 10, 45 25, 45 45 M 35 38 L 46 47 L 48 34"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  )
}
