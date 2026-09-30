"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { TargetAndTransition, Variants } from "motion/react";
import { LazyMotion, MotionConfig, m, useAnimation, useMotionValue, useReducedMotion } from "motion/react";
import { useDevicePrefs } from "@/lib/device-prefs";

import { useDeferred } from "@/lib/use-deferred";
import { CLIPBOARD_BOARD, CLIPBOARD_RING, CLIPBOARD_ROWS, CLIPBOARD_TAB, STROKE } from "@/components/icons";

const U = 1;
const DURATION = 0.45;
const HOVER_DELAY = 0.6;
const TIMING = { duration: DURATION, ease: "easeInOut" } as const;

const STEP_IN: Variants = {
  initial: { x: 0 },
  animate: { x: [0, 2.5 * U, 2.5 * U, 0], transition: TIMING },
};

const STEP_IN_FADING: Variants = {
  initial: { x: 0, opacity: 1 },
  animate: { x: [0, -2.5 * U, -2.5 * U, 0], opacity: [1, 0, 0, 1], transition: TIMING },
};

const TURN: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: [0, 20, 20, 0], transition: TIMING },
};

const SWING: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, -16, 10, -4, 0],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
};
const SWING_BACK: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, 9, -6, 2, 0],
    transition: { duration: 0.6, ease: "easeInOut", delay: 0.08 },
  },
};

const CORNER_STEP = 90;
const CORNER_DURATION = 0.35;
const CORNER_TURN: TargetAndTransition = {
  scale: [1, 1.05, 1.05, 1],
  transition: {
    duration: CORNER_DURATION,
    ease: "easeInOut",
    scale: { duration: CORNER_DURATION, ease: "easeInOut", times: [0, 0.3, 0.7, 1] },
  },
};

const DURATION_LONG = 0.6;
const BOOK_TIMING = { duration: DURATION_LONG, ease: "easeOut" } as const;

const BOOK_OPEN: Variants = {
  initial: { scaleX: 1, opacity: 1 },
  animate: { scaleX: [0, 1], opacity: [0, 1, 1, 1], transition: BOOK_TIMING },
};

const growLine = (delay: number): Variants => ({
  initial: { scaleX: 1, opacity: 1 },
  animate: {
    scaleX: [0, 1],
    opacity: [0, 1, 1],
    transition: { duration: DURATION_LONG / 2, ease: "easeOut", delay },
  },
});
const BOOK_LINES = [growLine(0.22), growLine(0.3), growLine(0.38)];

const CASE_SWING: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: [0, -8, 6, -2, 0], transition: { duration: 0.6, ease: "easeInOut" } },
};
const LATCH_CLICK: Variants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.35, 1], transition: { duration: 0.25, ease: "easeOut", delay: 0.3 } },
};

const BOARD_HOP: Variants = {
  initial: { y: 0 },
  animate: { y: [0, -1.5 * U, 0], transition: { duration: 0.35, ease: "easeInOut" } },
};
const CLIP_ROWS = [growLine(0.2), growLine(0.35)];

const NEEDLE_SWEEP: Variants = {
  initial: { rotate: 0 },
  animate: { rotate: [0, -70, 14, -4, 0], transition: { duration: DURATION_LONG, ease: "easeInOut" } },
};

export type NavIconProps = { className?: string; animate?: boolean };

const loadFeatures = () => import("@/components/motion-features").then((mod) => mod.default);

export function MotionFeatures({ children }: { children: ReactNode }) {
  const { reduceMotion } = useDevicePrefs();
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>
    </LazyMotion>
  );
}

function NavIcon({
  className,
  animate,
  defer,
  children,
}: NavIconProps & { defer?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const deferred = useDeferred(animate, HOVER_DELAY * 1000);
  const on = defer ? deferred : animate;
  return (
    <m.svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      initial="initial"
      animate={on && !reduced ? "animate" : "initial"}
    >
      {children}
    </m.svg>
  );
}

const at = (x: number, y: number) => ({ transformBox: "view-box", originX: `${x}px`, originY: `${y}px` }) as const;

const BOOK_LEFT =
  "M7.99978 3.5H6.60021C4.43183 3.5 3.34764 3.5 2.67399 4.17362C2.00034 4.84724 2.00029 5.93144 2.00021 8.09982L2 13.3998C1.99992 15.5684 1.99987 16.6526 2.67353 17.3263C3.34719 18 4.43146 18 6.6 18H8.95042C10.4329 18 11.7092 19.0464 11.9999 20.5V5.5C11.0556 4.24097 9.99989 3.5 7.99978 3.5Z";
const BOOK_RIGHT =
  "M16.0001 3.5H17.3997C19.5681 3.5 20.6523 3.5 21.3259 4.17362C21.9996 4.84724 21.9996 5.93144 21.9997 8.09982L21.9999 13.3998C22 15.5684 22 16.6526 21.3264 17.3263C20.6527 18 19.5684 18 17.3999 18H15.0495C13.567 18 12.2907 19.0464 12 20.5V5.5C12.9443 4.24097 14 3.5 16.0001 3.5Z";
const BOOK_LINES_LEFT = ["M5.49994 7.25H8.49994", "M5.49994 10.75H8.49994", "M5.49994 14.25H8.49994"];
const BOOK_LINES_RIGHT = ["M15.5 7.25H18.5", "M15.5 10.75H18.5", "M15.5 14.25H18.5"];

const TAG_FRONT =
  "M18.058 8.53645L17.058 7.92286C16.0553 7.30762 15.554 7 15 7C14.446 7 13.9447 7.30762 12.942 7.92286L11.942 8.53645C10.9935 9.11848 10.5192 9.40949 10.2596 9.87838C10 10.3473 10 10.9129 10 12.0442V17.9094C10 19.8377 10 20.8019 10.5858 21.4009C11.1716 22 12.1144 22 14 22H16C17.8856 22 18.8284 22 19.4142 21.4009C20 20.8019 20 19.8377 20 17.9094V12.0442C20 10.9129 20 10.3473 19.7404 9.87838C19.4808 9.40949 19.0065 9.11848 18.058 8.53645Z";
const TAG_BACK =
  "M14 7.10809C13.3612 6.4951 12.9791 6.17285 12.4974 6.05178C11.9374 5.91102 11.3491 6.06888 10.1725 6.3846L8.99908 6.69947C7.88602 6.99814 7.32949 7.14748 6.94287 7.5163C6.55624 7.88513 6.40642 8.40961 6.10679 9.45857L4.55327 14.8971C4.0425 16.6852 3.78712 17.5792 4.22063 18.2836C4.59336 18.8892 6.0835 19.6339 7.5 20";
const TAG_STRING =
  "M14.4947 10C15.336 9.44058 16.0828 8.54291 16.5468 7.42653C17.5048 5.12162 16.8944 2.75724 15.1836 2.14554C13.4727 1.53383 11.3091 2.90644 10.3512 5.21135C10.191 5.59667 10.0747 5.98366 10 6.36383";

const USERS_FRONT_HEAD = { cx: 10, cy: 7.5, r: 3.5 };
const USERS_FRONT_BODY =
  "M16.5 20V16.9852C16.5 16.364 16.2184 15.7658 15.6838 15.4494C14.1574 14.546 12.1714 14 10 14C7.82863 14 5.84261 14.546 4.31618 15.4494C3.78162 15.7658 3.5 16.364 3.5 16.9852V20";
const USERS_BACK_BODY = "M20.5 20.001V16.9862C20.5 16.365 20.2184 15.7667 19.6838 15.4504C19.171 15.1468 18.6062 14.8837 18 14.668";
const USERS_BACK_HEAD = "M15 4.14453C16.4457 4.57481 17.5 5.91408 17.5 7.49959C17.5 9.0851 16.4457 10.4244 15 10.8547";

const WRENCH_HEAD =
  "M20.3584 13.3567C19.1689 14.546 16.9308 14.4998 13.4992 14.4998C11.2914 14.4998 9.50138 12.7071 9.50024 10.4993C9.50024 7.07001 9.454 4.83065 10.6435 3.64138C11.8329 2.45212 12.3583 2.50027 17.6274 2.50027C18.1366 2.49809 18.3929 3.11389 18.0329 3.47394L15.3199 6.18714C14.6313 6.87582 14.6294 7.99233 15.3181 8.68092C16.0068 9.36952 17.1234 9.36959 17.8122 8.68109L20.5259 5.96855C20.886 5.60859 21.5019 5.86483 21.4997 6.37395C21.4997 11.6422 21.5479 12.1675 20.3584 13.3567Z";
const WRENCH_HANDLE = "M13.5 14.5L7.32842 20.6716C6.22386 21.7761 4.433 21.7761 3.32843 20.6716C2.22386 19.567 2.22386 17.7761 3.32843 16.6716L9.5 10.5";
const WRENCH_DOT = "M5.50896 18.5H5.5";

const SCAN_CORNERS =
  "M16.0042 2.5C17.9974 2.61348 19.2576 2.93381 20.1619 3.83811C21.0662 4.74243 21.3865 6.00268 21.5 7.99598M7.99582 2.5C6.00261 2.61348 4.74241 2.93381 3.83812 3.83811C2.9338 4.74243 2.61347 6.00268 2.5 7.99598M21.5 16.004C21.3865 17.9973 21.0662 19.2576 20.1619 20.1619C19.2576 21.0662 17.9973 21.3865 16.004 21.5M2.5 16.004C2.61347 17.9973 2.9338 19.2576 3.83812 20.1619C4.74244 21.0662 6.00268 21.3865 7.99597 21.5";
const SCAN_LINE = "M5 12H19";

const BRIEFCASE_BODY =
  "M2.00127 8.5L1.99911 13.997C1.99782 17.2979 1.99717 18.9484 3.02235 19.974C4.04754 20.9996 5.69801 20.9996 8.99895 20.9997L15 20.9998C18.2994 20.9999 19.949 21 20.9741 19.9751C21.9992 18.9502 21.9996 17.3005 22.0002 14.0012L22.0013 8.5";
const BRIEFCASE_HANDLE =
  "M8.49857 6.5C8.49857 5.09554 8.49857 4.39331 8.83563 3.88886C8.98154 3.67048 9.16904 3.48298 9.38743 3.33706C9.89187 3 10.5941 3 11.9986 3C13.403 3 14.1053 3 14.6097 3.33706C14.8281 3.48298 15.0156 3.67048 15.1615 3.88886C15.4986 4.39331 15.4986 5.09554 15.4986 6.5";
const BRIEFCASE_LID =
  "M19.998 6.50016L3.99885 6.5C2.8944 6.50007 1.99876 7.39568 1.99866 8.50013C1.99876 10.7091 3.79005 12.5004 5.99901 12.5006H17.9978C20.2068 12.5005 21.998 10.7093 21.9981 8.5003C21.998 7.39582 21.1024 6.50023 19.998 6.50016Z";
const BRIEFCASE_LATCH =
  "M9.99857 12.5V13.5C9.99857 13.965 9.99857 14.1975 10.0497 14.3882C10.1884 14.9059 10.5927 15.3102 11.1103 15.4489C11.3011 15.5 11.5336 15.5 11.9986 15.5C12.4636 15.5 12.696 15.5 12.8868 15.4489C13.4044 15.3102 13.8088 14.9059 13.9475 14.3882C13.9986 14.1975 13.9986 13.965 13.9986 13.5V12.5";

const GAUGE_FRAME =
  "M2.50006 12.0001C2.50006 7.52172 2.50006 5.28255 3.8913 3.8913C5.28255 2.50006 7.52172 2.50006 12.0001 2.50006C16.4784 2.50006 18.7176 2.50006 20.1088 3.8913C21.5001 5.28255 21.5001 7.52172 21.5001 12.0001C21.5001 16.4784 21.5001 18.7176 20.1088 20.1088C18.7176 21.5001 16.4784 21.5001 12.0001 21.5001C7.52172 21.5001 5.28255 21.5001 3.8913 20.1088C2.50006 18.7176 2.50006 16.4784 2.50006 12.0001Z";
const GAUGE_ARC = "M6 12C6 8.68629 8.68629 6 12 6C13.0929 6 14.1175 6.29218 15 6.80269";
const GAUGE_HUB =
  "M14 15C14 16.1046 13.1046 17 12 17C10.8954 17 10 16.1046 10 15C10 13.8954 10.8954 13 12 13C13.1046 13 14 13.8954 14 15Z";
const GAUGE_NEEDLE = "M13.5 13L17 9";

export function AnimatedDashboardIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <path d={GAUGE_FRAME} />
      <path d={GAUGE_ARC} />
      <path d={GAUGE_HUB} />
      <m.path d={GAUGE_NEEDLE} variants={NEEDLE_SWEEP} style={at(12, 15)} />
    </NavIcon>
  );
}

export function AnimatedBookOpenTextIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.path d={BOOK_LEFT} variants={BOOK_OPEN} style={at(12, 12)} />
      <m.path d={BOOK_RIGHT} variants={BOOK_OPEN} style={at(12, 12)} />
      {BOOK_LINES_LEFT.map((d, i) => (
        <m.path key={d} d={d} variants={BOOK_LINES[i]} style={at(8.5, 12)} />
      ))}
      {BOOK_LINES_RIGHT.map((d, i) => (
        <m.path key={d} d={d} variants={BOOK_LINES[i]} style={at(15.5, 12)} />
      ))}
    </NavIcon>
  );
}

export function AnimatedTagsIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.path d={TAG_BACK} variants={SWING_BACK} style={at(12.5, 6)} />
      <path d={TAG_STRING} />
      <m.path d={TAG_FRONT} variants={SWING} style={at(14.5, 10)} />
    </NavIcon>
  );
}

export function AnimatedUsersIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.g variants={STEP_IN}>
        <circle {...USERS_FRONT_HEAD} />
        <path d={USERS_FRONT_BODY} />
      </m.g>
      <m.g variants={STEP_IN_FADING}>
        <path d={USERS_BACK_HEAD} />
        <path d={USERS_BACK_BODY} />
      </m.g>
    </NavIcon>
  );
}

export function AnimatedWrenchIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.g variants={TURN} style={at(16.57, 7.43)}>
        <path d={WRENCH_HEAD} />
        <path d={WRENCH_HANDLE} />
        <path d={WRENCH_DOT} />
      </m.g>
    </NavIcon>
  );
}

export function AnimatedScanBoxIcon({ className, animate }: NavIconProps) {
  const rotate = useMotionValue(0);
  const controls = useAnimation();
  const reduced = useReducedMotion();
  const settled = useRef(0);

  useEffect(() => {
    if (!animate || reduced) return;
    const target = settled.current + CORNER_STEP;
    const id = setTimeout(() => {
      void controls.start({ ...CORNER_TURN, rotate: target });
    }, HOVER_DELAY * 1000);

    return () => {
      clearTimeout(id);
      controls.stop();
      if (Math.abs(rotate.get() - target) < 0.01) {
        settled.current = target;
      } else if (rotate.get() !== settled.current) {
        void controls.start({ rotate: settled.current, scale: 1 });
      }
    };
  }, [animate, reduced, controls, rotate]);

  return (
    <NavIcon className={className} animate={animate}>
      <m.path d={SCAN_CORNERS} animate={controls} style={{ rotate, ...at(12, 12) }} />
      <path d={SCAN_LINE} />
    </NavIcon>
  );
}

export function AnimatedBriefcaseIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.g variants={CASE_SWING} style={at(12, 3)}>
        <path d={BRIEFCASE_BODY} />
        <path d={BRIEFCASE_HANDLE} />
        <path d={BRIEFCASE_LID} />
        <m.path d={BRIEFCASE_LATCH} variants={LATCH_CLICK} style={at(12, 14)} />
      </m.g>
    </NavIcon>
  );
}

export function AnimatedClipboardListIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.g variants={BOARD_HOP}>
        <path d={CLIPBOARD_BOARD} />
        <path d={CLIPBOARD_RING} />
        <path d={CLIPBOARD_TAB} />
      </m.g>
      {CLIPBOARD_ROWS.map((r, i) => (
        <m.g key={r.line} variants={CLIP_ROWS[i]} style={at(8, i === 0 ? 12 : 17)}>
          <path d={r.dot} />
          <path d={r.line} />
        </m.g>
      ))}
    </NavIcon>
  );
}

const GEAR =
  "M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z";
const GEAR_HUB = "M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z";
const GEAR_TURN: Variants = {
  initial: { rotate: 0, transition: { duration: 0 } },
  animate: { rotate: 60, transition: { duration: DURATION_LONG, ease: "easeInOut" } },
};

export function AnimatedSettingsIcon({ className, animate }: NavIconProps) {
  return (
    <NavIcon className={className} animate={animate} defer>
      <m.path d={GEAR} variants={GEAR_TURN} style={at(12.06, 12.01)} />
      <path d={GEAR_HUB} />
    </NavIcon>
  );
}
