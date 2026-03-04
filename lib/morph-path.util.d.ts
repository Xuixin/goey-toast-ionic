/**
 * Pill height constant — matches the original goey-toast React library.
 */
export declare const PH = 34;
/**
 * Parametric morph path: pill lobe stays constant, body grows from underneath.
 * t=0 → pure pill, t=1 → full organic blob.
 */
export declare function morphPath(pw: number, bw: number, th: number, t: number): string;
/**
 * Centered morph path: pill centered on top, body grows symmetrically below.
 * t=0 → pure pill (centered), t=1 → full blob with pill centered on top.
 */
export declare function morphPathCenter(pw: number, bw: number, th: number, t: number): string;
