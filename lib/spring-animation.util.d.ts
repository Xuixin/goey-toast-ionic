/**
 * Spring animation utility using requestAnimationFrame.
 * Replicates framer-motion's spring physics for the goey-toast animations.
 */
export interface SpringConfig {
    stiffness: number;
    damping: number;
    mass: number;
}
export interface AnimationConfig {
    type: 'spring' | 'ease';
    stiffness?: number;
    damping?: number;
    mass?: number;
    duration?: number;
    bounce?: number;
    ease?: readonly [number, number, number, number] | number[];
}
export interface AnimationController {
    stop: () => void;
    finished: Promise<void>;
}
/**
 * Squish spring config — scales mass with morph duration so feel stays consistent.
 * bounce 0.0 = heavily damped (subtle), 0.8 = very bouncy (dramatic)
 */
export declare function squishSpring(durationSec: number, defaultDur: number, bounce?: number): SpringConfig;
export declare function squishSpringExpand(bounce?: number): SpringConfig;
export declare function squishSpringCollapse(bounce?: number): SpringConfig;
/**
 * Smooth easing curve for non-spring animations.
 */
export declare const SMOOTH_EASE: readonly [number, number, number, number];
/**
 * Animate a value from `from` to `to` using spring physics or easing.
 */
export declare function animateValue(from: number, to: number, config: AnimationConfig, onUpdate: (value: number) => void, onComplete?: () => void): AnimationController;
