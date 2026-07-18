import type { Variants } from "motion";

const fadeInOutSpring = (duration: number, y: number, scale: number): Variants => ({
  hidden: {
    y: y,
    opacity: 0,
    scale: scale,
  },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      default: {
        duration: duration,
        ease: [0.6, -0.05, 0.01, 0.99],
        type: "spring",
        stiffness: 100,
      },
      opacity: {
        ease: "linear",
      },
    },
  },
  exit: {
    y: 0,
    opacity: 0,
    scale: scale - 0.1,
    transition: {
      duration: 0.18,
      ease: "easeInOut",
    },
  },
});

export { fadeInOutSpring };
