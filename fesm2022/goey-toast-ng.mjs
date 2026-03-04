import * as i0 from '@angular/core';
import { Input, Component, EventEmitter, ViewChild, Output, ChangeDetectionStrategy, Injectable, HostBinding, NgModule } from '@angular/core';
import * as i1 from '@angular/common';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

/**
 * Pill height constant — matches the original goey-toast React library.
 */
const PH = 34;
/**
 * Parametric morph path: pill lobe stays constant, body grows from underneath.
 * t=0 → pure pill, t=1 → full organic blob.
 */
function morphPath(pw, bw, th, t) {
    const pr = PH / 2;
    const pillW = Math.min(pw, bw);
    const bodyH = PH + (th - PH) * t;
    // Pure pill when t is zero or body too small for proper rounded corners
    if (t <= 0 || bodyH - PH < 8) {
        return [
            `M 0,${pr}`,
            `A ${pr},${pr} 0 0 1 ${pr},0`,
            `H ${pillW - pr}`,
            `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
            `A ${pr},${pr} 0 0 1 ${pillW - pr},${PH}`,
            `H ${pr}`,
            `A ${pr},${pr} 0 0 1 0,${pr}`,
            `Z`,
        ].join(' ');
    }
    const curve = 14 * t;
    const cr = Math.min(16, (bodyH - PH) * 0.45);
    const bodyW = pillW + (bw - pillW) * t;
    const bodyTop = PH - curve;
    const qEndX = Math.min(pillW + curve, bodyW - cr);
    return [
        `M 0,${pr}`,
        `A ${pr},${pr} 0 0 1 ${pr},0`,
        `H ${pillW - pr}`,
        `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
        `L ${pillW},${bodyTop}`,
        `Q ${pillW},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
        `H ${bodyW - cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyW},${bodyTop + curve + cr}`,
        `L ${bodyW},${bodyH - cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyW - cr},${bodyH}`,
        `H ${cr}`,
        `A ${cr},${cr} 0 0 1 0,${bodyH - cr}`,
        `Z`,
    ].join(' ');
}
/**
 * Centered morph path: pill centered on top, body grows symmetrically below.
 * t=0 → pure pill (centered), t=1 → full blob with pill centered on top.
 */
function morphPathCenter(pw, bw, th, t) {
    const pr = PH / 2;
    const pillW = Math.min(pw, bw);
    // Pill is ALWAYS centered at the final body width position
    const pillOffset = (bw - pillW) / 2;
    // Pure pill when t is zero or body too small
    if (t <= 0 || PH + (th - PH) * t - PH < 8) {
        return [
            `M ${pillOffset},${pr}`,
            `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
            `H ${pillOffset + pillW - pr}`,
            `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
            `A ${pr},${pr} 0 0 1 ${pillOffset + pillW - pr},${PH}`,
            `H ${pillOffset + pr}`,
            `A ${pr},${pr} 0 0 1 ${pillOffset},${pr}`,
            `Z`,
        ].join(' ');
    }
    const bodyH = PH + (th - PH) * t;
    const curve = 14 * t;
    const cr = Math.min(16, (bodyH - PH) * 0.45);
    const bodyTop = PH - curve;
    // Body grows symmetrically outward from pill center
    const bodyCenter = bw / 2;
    const halfBodyW = (pillW / 2) + ((bw - pillW) / 2) * t;
    const bodyLeft = bodyCenter - halfBodyW;
    const bodyRight = bodyCenter + halfBodyW;
    // Q curve endpoints
    const qLeftX = Math.max(bodyLeft + cr, pillOffset - curve);
    const qRightX = Math.min(bodyRight - cr, pillOffset + pillW + curve);
    return [
        `M ${pillOffset},${pr}`,
        `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
        `H ${pillOffset + pillW - pr}`,
        `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
        `L ${pillOffset + pillW},${bodyTop}`,
        `Q ${pillOffset + pillW},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
        `H ${bodyRight - cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyRight},${bodyTop + curve + cr}`,
        `L ${bodyRight},${bodyH - cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyRight - cr},${bodyH}`,
        `H ${bodyLeft + cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyLeft},${bodyH - cr}`,
        `L ${bodyLeft},${bodyTop + curve + cr}`,
        `A ${cr},${cr} 0 0 1 ${bodyLeft + cr},${bodyTop + curve}`,
        `H ${qLeftX}`,
        `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
        `Z`,
    ].join(' ');
}

/**
 * Spring animation utility using requestAnimationFrame.
 * Replicates framer-motion's spring physics for the goey-toast animations.
 */
const DEFAULT_EXPAND_DUR = 0.6;
const DEFAULT_COLLAPSE_DUR = 0.9;
/**
 * Squish spring config — scales mass with morph duration so feel stays consistent.
 * bounce 0.0 = heavily damped (subtle), 0.8 = very bouncy (dramatic)
 */
function squishSpring(durationSec, defaultDur, bounce = 0.4) {
    const scale = durationSec / defaultDur;
    const stiffness = 200 + bounce * 437.5;
    const damping = 24 - bounce * 20;
    const mass = 0.7 * scale;
    return { stiffness, damping, mass };
}
function squishSpringExpand(bounce = 0.4) {
    return squishSpring(DEFAULT_EXPAND_DUR, DEFAULT_EXPAND_DUR, bounce);
}
function squishSpringCollapse(bounce = 0.4) {
    return squishSpring(DEFAULT_COLLAPSE_DUR, DEFAULT_COLLAPSE_DUR, bounce);
}
/**
 * Smooth easing curve for non-spring animations.
 */
const SMOOTH_EASE = [0.4, 0, 0.2, 1];
/**
 * Cubic bezier interpolation.
 */
function cubicBezier(t, p1, p2, p3, p4) {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p3 + t * t * t;
}
function solveCubicBezierT(x, x1, x2) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const val = cubicBezier(mid, x1, x1, x2, x2);
        if (val < x)
            lo = mid;
        else
            hi = mid;
    }
    return (lo + hi) / 2;
}
function easeCubicBezier(progress, cp) {
    const t = solveCubicBezierT(progress, cp[0], cp[2]);
    return cubicBezier(t, cp[1], cp[1], cp[3], cp[3]);
}
/**
 * Animate a value from `from` to `to` using spring physics or easing.
 */
function animateValue(from, to, config, onUpdate, onComplete) {
    let stopped = false;
    let rafId = null;
    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const stop = () => {
        stopped = true;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        resolveFinished();
    };
    if (config.type === 'spring') {
        // Spring simulation
        const stiffness = config.stiffness ?? 200;
        const damping = config.damping ?? 24;
        const mass = config.mass ?? 0.7;
        let velocity = 0;
        let currentValue = from;
        const targetValue = to;
        let lastTime = performance.now();
        const step = (now) => {
            if (stopped)
                return;
            const dt = Math.min((now - lastTime) / 1000, 0.064); // cap at ~15fps min
            lastTime = now;
            const displacement = currentValue - targetValue;
            const springForce = -stiffness * displacement;
            const dampingForce = -damping * velocity;
            const acceleration = (springForce + dampingForce) / mass;
            velocity += acceleration * dt;
            currentValue += velocity * dt;
            onUpdate(currentValue);
            // Check if settled
            if (Math.abs(displacement) < 0.001 && Math.abs(velocity) < 0.001) {
                onUpdate(targetValue);
                onComplete?.();
                resolveFinished();
                return;
            }
            rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
    }
    else {
        // Easing-based animation
        const duration = (config.duration ?? 0.4) * 1000; // convert to ms
        const ease = config.ease ?? SMOOTH_EASE;
        const startTime = performance.now();
        const step = (now) => {
            if (stopped)
                return;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeCubicBezier(progress, ease);
            const value = from + (to - from) * easedProgress;
            onUpdate(value);
            if (progress >= 1) {
                onComplete?.();
                resolveFinished();
                return;
            }
            rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
    }
    return { stop, finished };
}

class GoeyIconDefaultComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconDefaultComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconDefaultComponent, isStandalone: true, selector: "goey-icon-default", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconDefaultComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-default', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });
class GoeyIconSuccessComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconSuccessComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconSuccessComponent, isStandalone: true, selector: "goey-icon-success", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconSuccessComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-success', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });
class GoeyIconErrorComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconErrorComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconErrorComponent, isStandalone: true, selector: "goey-icon-error", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconErrorComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-error', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });
class GoeyIconWarningComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconWarningComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconWarningComponent, isStandalone: true, selector: "goey-icon-warning", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconWarningComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-warning', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });
class GoeyIconInfoComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconInfoComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconInfoComponent, isStandalone: true, selector: "goey-icon-info", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconInfoComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-info', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });
class GoeyIconSpinnerComponent {
    size = 20;
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconSpinnerComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyIconSpinnerComponent, isStandalone: true, selector: "goey-icon-spinner", inputs: { size: "size" }, ngImport: i0, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="goey-spinnerSpin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  `, isInline: true, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}.goey-spinnerSpin{animation:goey-spin 1s linear infinite}@keyframes goey-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}\n"] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyIconSpinnerComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-icon-spinner', standalone: true, template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="goey-spinnerSpin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  `, styles: [":host{display:flex;align-items:center;justify-content:center;line-height:0}.goey-spinnerSpin{animation:goey-spin 1s linear infinite}@keyframes goey-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}\n"] }]
        }], propDecorators: { size: [{
                type: Input
            }] } });

const DEFAULT_DISPLAY_DURATION = 4000;
class GoeyToastComponent {
    ngZone;
    cdr;
    title = '';
    description;
    type = 'default';
    phase = 'default';
    action;
    icon;
    classNames;
    fillColor;
    borderColor;
    borderWidth;
    timing;
    duration;
    spring = true;
    bounce = 0.4;
    toastId;
    position = 'bottom-right';
    showClose = false;
    dismissed = new EventEmitter();
    actionClicked = new EventEmitter();
    wrapperRef;
    pathRef;
    headerRef;
    contentRef;
    // Computed state
    showBody = false;
    actionSuccess = null;
    dismissing = false;
    hovered = false;
    currentPath = '';
    svgWidth = 200;
    svgHeight = PH;
    // Animation controllers
    morphCtrl = null;
    pillResizeCtrl = null;
    blobSquishCtrl = null;
    shakeCtrl = null;
    // Animated state
    morphT = 0;
    aDims = { pw: 0, bw: 0, th: 0 };
    dimsRef = { pw: 0, bw: 0, th: 0 };
    expandedDimsRef = { pw: 0, bw: 0, th: 0 };
    collapsingRef = false;
    preDismissRef = false;
    collapseEndTime = 0;
    lastSquishTime = 0;
    mountSquished = false;
    prevShowBody = false;
    prevPhase = null;
    // Timer state
    dismissTimer = null;
    remainingTime = null;
    timerStart = 0;
    // Swipe to close state
    startX = 0;
    dragOffset = 0;
    isDragging = false;
    onMouseMoveBound = this.onMouseMove.bind(this);
    onMouseUpBound = this.onMouseUp.bind(this);
    resizeObserver;
    destroyed = false;
    get isRight() {
        return this.position?.includes('right') ?? false;
    }
    get isCenter() {
        return this.position?.includes('center') ?? false;
    }
    get effectiveTitle() {
        return this.actionSuccess ?? this.title;
    }
    get effectivePhase() {
        return this.actionSuccess ? 'success' : this.phase;
    }
    get effectiveDescription() {
        return this.actionSuccess ? undefined : this.description;
    }
    get effectiveAction() {
        return this.actionSuccess ? undefined : this.action;
    }
    get isExpanded() {
        return (!!this.effectiveDescription || !!this.effectiveAction) && !this.dismissing;
    }
    get effectiveFillColor() {
        return this.fillColor || '#ffffff';
    }
    get effectiveBorderColor() {
        return this.borderColor || 'rgba(0,0,0,0.08)';
    }
    get effectiveBorderWidth() {
        return this.borderWidth ?? 1.5;
    }
    get titleColorClass() {
        const map = {
            loading: 'goey-titleLoading',
            default: 'goey-titleDefault',
            success: 'goey-titleSuccess',
            error: 'goey-titleError',
            warning: 'goey-titleWarning',
            info: 'goey-titleInfo',
        };
        return map[this.effectivePhase] || 'goey-titleDefault';
    }
    get actionColorClass() {
        const map = {
            loading: 'goey-actionInfo',
            default: 'goey-actionDefault',
            success: 'goey-actionSuccess',
            error: 'goey-actionError',
            warning: 'goey-actionWarning',
            info: 'goey-actionInfo',
        };
        return map[this.effectivePhase] || 'goey-actionDefault';
    }
    constructor(ngZone, cdr) {
        this.ngZone = ngZone;
        this.cdr = cdr;
    }
    ngOnInit() {
        this.prevPhase = this.phase;
    }
    ngAfterViewInit() {
        // Initial measure
        setTimeout(() => {
            this.measure();
            this.flush();
            // Mount squish for simple (non-expanded) toasts
            if (this.aDims.pw > 0 && !this.isExpanded && !this.mountSquished) {
                this.mountSquished = true;
                setTimeout(() => this.triggerLandingSquish('mount'), 45);
            }
            // Start expand sequence if expanded
            if (this.isExpanded) {
                setTimeout(() => {
                    this.showBody = true;
                    this.cdr.detectChanges();
                    this.measure();
                    this.startExpandMorph();
                }, 330);
            }
            else {
                // Auto-dismiss simple (non-expanded) toasts
                const dur = this.timing?.displayDuration ?? this.duration ?? DEFAULT_DISPLAY_DURATION;
                this.dismissTimer = setTimeout(() => {
                    this.dismissed.emit();
                }, dur);
            }
        });
        // ResizeObserver for dynamic content
        if (this.contentRef?.nativeElement) {
            this.resizeObserver = new ResizeObserver(() => {
                if (!this.destroyed) {
                    this.measure();
                    this.flush();
                }
            });
            this.resizeObserver.observe(this.contentRef.nativeElement);
        }
    }
    ngOnChanges(changes) {
        // Handle phase changes (e.g., promise toast transitions)
        if (changes['phase'] && !changes['phase'].firstChange) {
            const newPhase = changes['phase'].currentValue;
            // Error shake
            if (newPhase === 'error' && this.prevPhase !== 'error' && !this.dismissing) {
                setTimeout(() => this.triggerErrorShake());
            }
            this.prevPhase = newPhase;
            // Re-measure and update
            setTimeout(() => {
                this.measure();
                // If newly expanded (e.g., promise resolved with description)
                if (this.isExpanded && !this.showBody) {
                    setTimeout(() => {
                        this.showBody = true;
                        this.cdr.detectChanges();
                        this.measure();
                        this.startExpandMorph();
                    }, 330);
                }
                this.flush();
                this.cdr.detectChanges();
            });
        }
        // Handle title/description changes
        if (changes['title'] || changes['description'] || changes['action']) {
            setTimeout(() => {
                this.measure();
                this.flush();
                this.cdr.detectChanges();
            });
        }
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.morphCtrl?.stop();
        this.pillResizeCtrl?.stop();
        this.blobSquishCtrl?.stop();
        this.shakeCtrl?.stop();
        this.resizeObserver?.disconnect();
        if (this.dismissTimer)
            clearTimeout(this.dismissTimer);
    }
    onMouseEnter() {
        this.hovered = true;
        // Pause dismiss timer
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            const elapsed = Date.now() - this.timerStart;
            const remaining = (this.remainingTime ?? this.getFullDelay()) - elapsed;
            if (remaining > 0) {
                this.remainingTime = remaining;
            }
        }
        // Re-expand on hover if dismissing
        if (this.dismissing && (!!this.description || !!this.action)) {
            this.morphCtrl?.stop();
            this.collapsingRef = false;
            this.preDismissRef = false;
            this.remainingTime = null;
            this.dismissing = false;
            this.showBody = true;
            this.cdr.detectChanges();
            setTimeout(() => {
                this.measure();
                this.startExpandMorph();
            });
        }
    }
    onMouseLeave() {
        this.hovered = false;
        // Restart dismiss timer if expanded
        if (this.showBody && !this.dismissing && !this.actionSuccess) {
            this.startDismissTimer();
        }
    }
    onActionClick() {
        if (!this.effectiveAction)
            return;
        this.effectiveAction.onClick();
        this.actionClicked.emit();
        // If success label provided, morph back to pill showing success
        if (this.effectiveAction.successLabel) {
            this.actionSuccess = this.effectiveAction.successLabel;
            this.cdr.detectChanges();
            setTimeout(() => {
                this.measure();
                this.startCollapseMorph();
                // Auto-dismiss after showing success label
                setTimeout(() => {
                    this.dismissed.emit();
                }, 2500);
            }, 100);
        }
    }
    // ==========================================
    // Swipe Handlers
    // ==========================================
    onTouchStart(e) {
        if (e.target.closest('.goey-close-btn') || e.target.closest('.goey-actionButton'))
            return;
        this.startDrag(e.touches[0].clientX);
    }
    onTouchMove(e) {
        if (!this.isDragging)
            return;
        this.moveDrag(e.touches[0].clientX);
    }
    onTouchEnd() {
        this.endDrag();
    }
    onMouseDown(e) {
        if (e.target.closest('.goey-close-btn') || e.target.closest('.goey-actionButton'))
            return;
        this.startDrag(e.clientX);
        document.addEventListener('mousemove', this.onMouseMoveBound);
        document.addEventListener('mouseup', this.onMouseUpBound);
    }
    onMouseMove(e) {
        this.moveDrag(e.clientX);
    }
    onMouseUp() {
        this.endDrag();
        document.removeEventListener('mousemove', this.onMouseMoveBound);
        document.removeEventListener('mouseup', this.onMouseUpBound);
    }
    startDrag(x) {
        this.isDragging = true;
        this.startX = x;
        this.dragOffset = 0;
        this.onMouseEnter();
    }
    moveDrag(x) {
        if (!this.isDragging || !this.wrapperRef?.nativeElement)
            return;
        this.dragOffset = x - this.startX;
        const wrapper = this.wrapperRef.nativeElement;
        wrapper.style.transform = (this.isRight ? 'scaleX(-1) ' : '') + `translateX(${this.dragOffset}px)`;
    }
    endDrag() {
        if (!this.isDragging)
            return;
        this.isDragging = false;
        this.onMouseLeave();
        const wrapper = this.wrapperRef?.nativeElement;
        if (!wrapper)
            return;
        if (Math.abs(this.dragOffset) > 80) {
            const throwOutX = this.dragOffset > 0 ? window.innerWidth : -window.innerWidth;
            wrapper.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 1, 1)';
            wrapper.style.transform = (this.isRight ? 'scaleX(-1) ' : '') + `translateX(${throwOutX}px)`;
            setTimeout(() => this.dismissed.emit(), 300);
        }
        else {
            wrapper.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            wrapper.style.transform = this.isRight ? 'scaleX(-1)' : '';
            setTimeout(() => {
                if (wrapper)
                    wrapper.style.transition = '';
            }, 300);
        }
    }
    onCloseClick(e) {
        e.stopPropagation();
        this.dismissed.emit();
    }
    // ==========================================
    // Animation Methods
    // ==========================================
    measure() {
        if (!this.headerRef?.nativeElement || !this.contentRef?.nativeElement)
            return;
        const content = this.contentRef.nativeElement;
        const header = this.headerRef.nativeElement;
        // Temporarily clear constraints for accurate measurement
        const savedW = content.style.width;
        const savedOv = content.style.overflow;
        const savedMH = content.style.maxHeight;
        const savedWrW = this.wrapperRef?.nativeElement?.style.width ?? '';
        if (this.wrapperRef?.nativeElement)
            this.wrapperRef.nativeElement.style.width = '';
        content.style.overflow = '';
        content.style.maxHeight = '';
        content.style.width = '';
        const cs = getComputedStyle(content);
        const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const pw = header.offsetWidth + paddingX;
        const bw = content.offsetWidth;
        const th = content.offsetHeight;
        // Restore constraints
        if (this.wrapperRef?.nativeElement)
            this.wrapperRef.nativeElement.style.width = savedWrW;
        content.style.overflow = savedOv;
        content.style.maxHeight = savedMH;
        content.style.width = savedW;
        this.dimsRef = { pw, bw, th };
        // First render
        if (this.aDims.bw <= 0) {
            this.aDims = { ...this.dimsRef };
        }
    }
    flush() {
        const { pw: p, bw: b, th: h } = this.aDims;
        if (p <= 0 || b <= 0 || h <= 0)
            return;
        const t = Math.max(0, Math.min(1, this.morphT));
        const isCenter = this.isCenter;
        const isRight = this.isRight;
        const pillW = Math.min(p, b);
        // Update SVG path
        if (isCenter) {
            const centerBw = Math.max(this.dimsRef.bw, this.expandedDimsRef.bw, p);
            this.currentPath = morphPathCenter(p, centerBw, h, t);
            this.svgWidth = centerBw + 10;
        }
        else {
            this.currentPath = morphPath(p, b, h, t);
            this.svgWidth = Math.max(p, b) + 10;
        }
        this.svgHeight = h + 10;
        const wrapper = this.wrapperRef?.nativeElement;
        const content = this.contentRef?.nativeElement;
        if (t >= 1) {
            // Fully expanded: clear all constraints
            if (wrapper)
                wrapper.style.width = '';
            if (content) {
                content.style.width = '';
                content.style.overflow = '';
                content.style.maxHeight = '';
                content.style.clipPath = '';
            }
        }
        else if (t > 0) {
            // Morphing: lock content + clip
            const targetBw = this.dimsRef.bw;
            const currentW = pillW + (b - pillW) * t;
            const currentH = PH + (this.dimsRef.th - PH) * t;
            const centerFullW = isCenter ? Math.max(this.dimsRef.bw, this.expandedDimsRef.bw, p) : 0;
            if (wrapper)
                wrapper.style.width = (isCenter ? centerFullW : currentW) + 'px';
            if (content) {
                content.style.width = (isCenter ? centerFullW : targetBw) + 'px';
                content.style.overflow = 'hidden';
                content.style.maxHeight = currentH + 'px';
                if (isCenter) {
                    const clip = (centerFullW - currentW) / 2;
                    content.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`;
                }
                else {
                    const clip = targetBw - currentW;
                    content.style.clipPath = isRight
                        ? `inset(0 0 0 ${clip}px)`
                        : `inset(0 ${clip}px 0 0)`;
                }
            }
        }
        else {
            // Compact: constrain to pill dimensions
            if (wrapper) {
                const centerBw = isCenter ? Math.max(this.dimsRef.bw, this.expandedDimsRef.bw, p) : pillW;
                wrapper.style.width = centerBw + 'px';
            }
            if (content) {
                if (isCenter) {
                    const centerBwVal = Math.max(this.dimsRef.bw, this.expandedDimsRef.bw, p);
                    content.style.width = centerBwVal + 'px';
                    const clip = (centerBwVal - pillW) / 2;
                    content.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`;
                }
                else {
                    content.style.width = '';
                    content.style.clipPath = '';
                }
                content.style.overflow = 'hidden';
                content.style.maxHeight = PH + 'px';
            }
        }
        this.cdr.detectChanges();
    }
    startExpandMorph() {
        this.morphCtrl?.stop();
        const startDims = { ...this.aDims };
        const targetDims = { ...this.dimsRef };
        const config = this.spring
            ? { type: 'spring', stiffness: 200 + this.bounce * 437.5, damping: 24 - this.bounce * 20, mass: 0.7 }
            : { type: 'ease', duration: 0.6, ease: SMOOTH_EASE };
        this.morphCtrl = animateValue(this.morphT, 1, config, (t) => {
            this.morphT = t;
            this.aDims = {
                pw: startDims.pw + (targetDims.pw - startDims.pw) * Math.max(0, Math.min(1, t)),
                bw: startDims.bw + (targetDims.bw - startDims.bw) * Math.max(0, Math.min(1, t)),
                th: startDims.th + (targetDims.th - startDims.th) * Math.max(0, Math.min(1, t)),
            };
            this.flush();
        }, () => {
            this.morphT = 1;
            this.aDims = { ...targetDims };
            this.flush();
            // Squish on expand settle
            if (!this.hovered) {
                setTimeout(() => this.triggerLandingSquish('expand'), 80);
            }
            // Start dismiss timer
            this.startDismissTimer();
        });
    }
    startCollapseMorph() {
        this.morphCtrl?.stop();
        this.pillResizeCtrl?.stop();
        if (this.morphT <= 0) {
            this.showBody = false;
            this.cdr.detectChanges();
            return;
        }
        this.expandedDimsRef = { ...this.aDims };
        this.collapsingRef = true;
        // Compute target compact pill
        const content = this.contentRef?.nativeElement;
        const header = this.headerRef?.nativeElement;
        const padX = content ? parseFloat(getComputedStyle(content).paddingLeft) + parseFloat(getComputedStyle(content).paddingRight) : 20;
        const targetPw = header ? header.offsetWidth + padX : this.aDims.pw;
        const targetDims = { pw: targetPw, bw: targetPw, th: PH };
        const savedDims = { ...this.aDims };
        const config = (this.preDismissRef || !this.spring)
            ? { type: 'ease', duration: 0.9, ease: SMOOTH_EASE }
            : { type: 'spring', stiffness: 200 + this.bounce * 437.5, damping: 24 - this.bounce * 20, mass: 0.7 * (0.9 / 0.9) };
        this.triggerLandingSquish('collapse');
        this.morphCtrl = animateValue(this.morphT, 0, config, (t) => {
            this.morphT = t;
            this.aDims = {
                pw: targetDims.pw + (savedDims.pw - targetDims.pw) * Math.max(0, t),
                bw: targetDims.bw + (savedDims.bw - targetDims.bw) * Math.max(0, t),
                th: targetDims.th + (savedDims.th - targetDims.th) * Math.max(0, t),
            };
            this.flush();
        }, () => {
            this.morphT = 0;
            this.collapsingRef = false;
            this.collapseEndTime = Date.now();
            this.aDims = { ...targetDims };
            this.flush();
            this.showBody = false;
            this.cdr.detectChanges();
            // If pre-dismiss, actually dismiss after collapse
            if (this.preDismissRef) {
                this.preDismissRef = false;
                setTimeout(() => this.dismissed.emit(), 200);
            }
        });
    }
    triggerLandingSquish(phase = 'mount') {
        if (!this.wrapperRef?.nativeElement || !this.spring)
            return;
        const now = Date.now();
        if (now - this.lastSquishTime < 300)
            return;
        this.lastSquishTime = now;
        this.blobSquishCtrl?.stop();
        const el = this.wrapperRef.nativeElement;
        const springConfig = phase === 'collapse'
            ? squishSpringCollapse(this.bounce)
            : squishSpringExpand(this.bounce);
        const bScale = this.bounce / 0.4;
        const compressY = (phase === 'collapse' ? 0.07 : 0.12) * bScale;
        const expandX = (phase === 'collapse' ? 0.035 : 0.06) * bScale;
        this.blobSquishCtrl = animateValue(0, 1, {
            type: 'spring',
            stiffness: springConfig.stiffness,
            damping: springConfig.damping,
            mass: springConfig.mass,
        }, (v) => {
            const intensity = Math.sin(v * Math.PI);
            const sy = 1 - compressY * intensity;
            const sx = 1 + expandX * intensity;
            const mirror = this.isRight ? 'scaleX(-1) ' : '';
            el.style.transformOrigin = 'center top';
            el.style.transform = mirror + `scaleX(${sx}) scaleY(${sy})`;
        }, () => {
            el.style.transform = this.isRight ? 'scaleX(-1)' : '';
            el.style.transformOrigin = '';
        });
    }
    triggerErrorShake() {
        if (!this.wrapperRef?.nativeElement)
            return;
        this.shakeCtrl?.stop();
        const el = this.wrapperRef.nativeElement;
        const mirror = this.isRight ? 'scaleX(-1) ' : '';
        this.shakeCtrl = animateValue(0, 1, {
            type: 'ease',
            duration: 0.4,
            ease: [0, 0, 0.2, 1],
        }, (v) => {
            const decay = 1 - v;
            const shake = Math.sin(v * Math.PI * 6) * decay * 3;
            el.style.transform = mirror + `translateX(${shake}px)`;
        }, () => {
            el.style.transform = mirror.trim() || '';
        });
    }
    startDismissTimer() {
        if (this.hovered || this.actionSuccess || this.dismissing)
            return;
        if (this.dismissTimer)
            clearTimeout(this.dismissTimer);
        const displayMs = this.timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION;
        const expandDelayMs = 330;
        const collapseMs = 900;
        const fullDelay = displayMs - expandDelayMs - collapseMs;
        if (fullDelay <= 0)
            return;
        const delay = this.remainingTime ?? fullDelay;
        this.timerStart = Date.now();
        this.dismissTimer = setTimeout(() => {
            this.remainingTime = null;
            this.preDismissRef = true;
            this.dismissing = true;
            this.cdr.detectChanges();
            this.startCollapseMorph();
        }, delay);
    }
    getFullDelay() {
        const displayMs = this.timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION;
        return displayMs - 330 - 900;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastComponent, deps: [{ token: i0.NgZone }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyToastComponent, isStandalone: true, selector: "goey-toast", inputs: { title: "title", description: "description", type: "type", phase: "phase", action: "action", icon: "icon", classNames: "classNames", fillColor: "fillColor", borderColor: "borderColor", borderWidth: "borderWidth", timing: "timing", duration: "duration", spring: "spring", bounce: "bounce", toastId: "toastId", position: "position", showClose: "showClose" }, outputs: { dismissed: "dismissed", actionClicked: "actionClicked" }, viewQueries: [{ propertyName: "wrapperRef", first: true, predicate: ["wrapperEl"], descendants: true }, { propertyName: "pathRef", first: true, predicate: ["blobPath"], descendants: true }, { propertyName: "headerRef", first: true, predicate: ["headerEl"], descendants: true }, { propertyName: "contentRef", first: true, predicate: ["contentEl"], descendants: true }], usesOnChanges: true, ngImport: i0, template: "<div\n  class=\"goey-wrapper\"\n  #wrapperEl\n  [class]=\"classNames?.wrapper || ''\"\n  [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  (mouseenter)=\"onMouseEnter()\"\n  (mouseleave)=\"onMouseLeave()\"\n  (touchstart)=\"onTouchStart($event)\"\n  (touchmove)=\"onTouchMove($event)\"\n  (touchend)=\"onTouchEnd()\"\n  (mousedown)=\"onMouseDown($event)\"\n>\n  <!-- SVG blob background -->\n  <svg\n    class=\"goey-blobSvg\"\n    [attr.width]=\"svgWidth\"\n    [attr.height]=\"svgHeight\"\n    [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  >\n    <path\n      #blobPath\n      [attr.d]=\"currentPath\"\n      [attr.fill]=\"effectiveFillColor\"\n      [attr.stroke]=\"effectiveBorderColor\"\n      [attr.stroke-width]=\"effectiveBorderWidth\"\n    />\n  </svg>\n\n  <!-- Content on top of SVG -->\n  <div\n    #contentEl\n    class=\"goey-content\"\n    [class.goey-contentCompact]=\"!showBody\"\n    [class.goey-contentExpanded]=\"showBody\"\n    [class]=\"classNames?.content || ''\"\n    [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  >\n    <!-- Header: icon + title -->\n    <div class=\"goey-header\" #headerEl [class]=\"classNames?.header || titleColorClass\">\n      <div class=\"goey-iconWrapper\" [class]=\"classNames?.icon || ''\">\n        <!-- Default icon -->\n        <ng-container *ngIf=\"effectivePhase === 'default'\">\n          <goey-icon-default [size]=\"18\"></goey-icon-default>\n        </ng-container>\n        <!-- Success icon -->\n        <ng-container *ngIf=\"effectivePhase === 'success'\">\n          <goey-icon-success [size]=\"18\"></goey-icon-success>\n        </ng-container>\n        <!-- Error icon -->\n        <ng-container *ngIf=\"effectivePhase === 'error'\">\n          <goey-icon-error [size]=\"18\"></goey-icon-error>\n        </ng-container>\n        <!-- Warning icon -->\n        <ng-container *ngIf=\"effectivePhase === 'warning'\">\n          <goey-icon-warning [size]=\"18\"></goey-icon-warning>\n        </ng-container>\n        <!-- Info icon -->\n        <ng-container *ngIf=\"effectivePhase === 'info'\">\n          <goey-icon-info [size]=\"18\"></goey-icon-info>\n        </ng-container>\n        <!-- Loading spinner -->\n        <ng-container *ngIf=\"effectivePhase === 'loading'\">\n          <goey-icon-spinner [size]=\"18\"></goey-icon-spinner>\n        </ng-container>\n      </div>\n      <span class=\"goey-title\">{{ effectiveTitle }}</span>\n      <button *ngIf=\"showClose && !actionSuccess\" (click)=\"onCloseClick($event)\" class=\"goey-close-btn\" aria-label=\"Close\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n\n    <!-- Description (visible when expanded) -->\n    <div\n      *ngIf=\"showBody && effectiveDescription\"\n      class=\"goey-description\"\n      [class]=\"classNames?.description || ''\"\n    >\n      {{ effectiveDescription }}\n    </div>\n\n    <!-- Action button (visible when expanded) -->\n    <div\n      *ngIf=\"showBody && effectiveAction\"\n      class=\"goey-actionWrapper\"\n      [class]=\"classNames?.actionWrapper || ''\"\n    >\n      <button\n        class=\"goey-actionButton\"\n        [class]=\"actionColorClass\"\n        [class.goey-actionButton]=\"true\"\n        (click)=\"onActionClick()\"\n      >\n        {{ effectiveAction.label }}\n      </button>\n    </div>\n  </div>\n</div>\n", styles: [".goey-spinnerSpin{animation:goey-spin 1s linear infinite}@keyframes goey-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.goey-wrapper{pointer-events:auto;cursor:default;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;position:relative;width:calc(fit-content + 20px)}.goey-blobSvg{position:absolute;top:0;left:0;overflow:visible;pointer-events:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.06)) drop-shadow(0 1px 4px rgba(0,0,0,.04))}.goey-content{position:relative;z-index:1}.goey-contentCompact{padding:8px 12px}.goey-contentExpanded{padding:8px 12px 16px}.goey-header{display:inline-flex;align-items:center;gap:8px;color:inherit}.goey-iconWrapper{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:18px;height:18px;line-height:0}.goey-title{font-size:13px;font-weight:700;line-height:1.2;white-space:normal;color:inherit;word-break:break-word}.goey-close-btn{background:transparent;border:none;cursor:pointer;padding:4px;margin-left:auto;display:flex;align-items:center;justify-content:center;color:inherit;opacity:.6;border-radius:50%;transition:opacity .2s,background .2s;outline:none;-webkit-tap-highlight-color:transparent}.goey-close-btn:hover{opacity:1;background:#0000000d}.goey-titleDefault{color:#555}.goey-titleSuccess{color:#4caf50}.goey-titleError{color:#e53935}.goey-titleWarning{color:#c49000}.goey-titleInfo{color:#1e88e5}.goey-titleLoading{color:#555}.goey-description{font-size:13px;font-weight:400;color:#444;line-height:1.55;margin-top:12px;overflow:hidden}.goey-actionWrapper{margin-top:12px;overflow:hidden}.goey-actionButton{display:block;box-sizing:border-box;width:100%;border:none;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center;outline:none;-webkit-tap-highlight-color:transparent;transition:background .15s ease}.goey-actionButton:focus:not(:focus-visible){outline:none}.goey-actionButton:focus-visible{outline:2px solid currentColor;outline-offset:2px}.goey-actionDefault{background:#e8e8e8;color:#555}.goey-actionDefault:hover{background:#dcdcdc}.goey-actionDefault:active{background:#d0d0d0}.goey-actionSuccess{background:#c8e6c9;color:#4caf50}.goey-actionSuccess:hover{background:#a5d6a7}.goey-actionSuccess:active{background:#81c784}.goey-actionError{background:#ffcdd2;color:#e53935}.goey-actionError:hover{background:#ef9a9a}.goey-actionError:active{background:#e57373}.goey-actionWarning{background:#ffecb3;color:#c49000}.goey-actionWarning:hover{background:#ffe082}.goey-actionWarning:active{background:#ffd54f}.goey-actionInfo{background:#bbdefb;color:#1e88e5}.goey-actionInfo:hover{background:#90caf9}.goey-actionInfo:active{background:#64b5f6}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }, { kind: "component", type: GoeyIconDefaultComponent, selector: "goey-icon-default", inputs: ["size"] }, { kind: "component", type: GoeyIconSuccessComponent, selector: "goey-icon-success", inputs: ["size"] }, { kind: "component", type: GoeyIconErrorComponent, selector: "goey-icon-error", inputs: ["size"] }, { kind: "component", type: GoeyIconWarningComponent, selector: "goey-icon-warning", inputs: ["size"] }, { kind: "component", type: GoeyIconInfoComponent, selector: "goey-icon-info", inputs: ["size"] }, { kind: "component", type: GoeyIconSpinnerComponent, selector: "goey-icon-spinner", inputs: ["size"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-toast', standalone: true, imports: [
                        CommonModule,
                        GoeyIconDefaultComponent, GoeyIconSuccessComponent, GoeyIconErrorComponent,
                        GoeyIconWarningComponent, GoeyIconInfoComponent, GoeyIconSpinnerComponent,
                    ], changeDetection: ChangeDetectionStrategy.OnPush, template: "<div\n  class=\"goey-wrapper\"\n  #wrapperEl\n  [class]=\"classNames?.wrapper || ''\"\n  [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  (mouseenter)=\"onMouseEnter()\"\n  (mouseleave)=\"onMouseLeave()\"\n  (touchstart)=\"onTouchStart($event)\"\n  (touchmove)=\"onTouchMove($event)\"\n  (touchend)=\"onTouchEnd()\"\n  (mousedown)=\"onMouseDown($event)\"\n>\n  <!-- SVG blob background -->\n  <svg\n    class=\"goey-blobSvg\"\n    [attr.width]=\"svgWidth\"\n    [attr.height]=\"svgHeight\"\n    [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  >\n    <path\n      #blobPath\n      [attr.d]=\"currentPath\"\n      [attr.fill]=\"effectiveFillColor\"\n      [attr.stroke]=\"effectiveBorderColor\"\n      [attr.stroke-width]=\"effectiveBorderWidth\"\n    />\n  </svg>\n\n  <!-- Content on top of SVG -->\n  <div\n    #contentEl\n    class=\"goey-content\"\n    [class.goey-contentCompact]=\"!showBody\"\n    [class.goey-contentExpanded]=\"showBody\"\n    [class]=\"classNames?.content || ''\"\n    [style.transform]=\"isRight ? 'scaleX(-1)' : ''\"\n  >\n    <!-- Header: icon + title -->\n    <div class=\"goey-header\" #headerEl [class]=\"classNames?.header || titleColorClass\">\n      <div class=\"goey-iconWrapper\" [class]=\"classNames?.icon || ''\">\n        <!-- Default icon -->\n        <ng-container *ngIf=\"effectivePhase === 'default'\">\n          <goey-icon-default [size]=\"18\"></goey-icon-default>\n        </ng-container>\n        <!-- Success icon -->\n        <ng-container *ngIf=\"effectivePhase === 'success'\">\n          <goey-icon-success [size]=\"18\"></goey-icon-success>\n        </ng-container>\n        <!-- Error icon -->\n        <ng-container *ngIf=\"effectivePhase === 'error'\">\n          <goey-icon-error [size]=\"18\"></goey-icon-error>\n        </ng-container>\n        <!-- Warning icon -->\n        <ng-container *ngIf=\"effectivePhase === 'warning'\">\n          <goey-icon-warning [size]=\"18\"></goey-icon-warning>\n        </ng-container>\n        <!-- Info icon -->\n        <ng-container *ngIf=\"effectivePhase === 'info'\">\n          <goey-icon-info [size]=\"18\"></goey-icon-info>\n        </ng-container>\n        <!-- Loading spinner -->\n        <ng-container *ngIf=\"effectivePhase === 'loading'\">\n          <goey-icon-spinner [size]=\"18\"></goey-icon-spinner>\n        </ng-container>\n      </div>\n      <span class=\"goey-title\">{{ effectiveTitle }}</span>\n      <button *ngIf=\"showClose && !actionSuccess\" (click)=\"onCloseClick($event)\" class=\"goey-close-btn\" aria-label=\"Close\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 6L6 18M6 6l12 12\"/></svg>\n      </button>\n    </div>\n\n    <!-- Description (visible when expanded) -->\n    <div\n      *ngIf=\"showBody && effectiveDescription\"\n      class=\"goey-description\"\n      [class]=\"classNames?.description || ''\"\n    >\n      {{ effectiveDescription }}\n    </div>\n\n    <!-- Action button (visible when expanded) -->\n    <div\n      *ngIf=\"showBody && effectiveAction\"\n      class=\"goey-actionWrapper\"\n      [class]=\"classNames?.actionWrapper || ''\"\n    >\n      <button\n        class=\"goey-actionButton\"\n        [class]=\"actionColorClass\"\n        [class.goey-actionButton]=\"true\"\n        (click)=\"onActionClick()\"\n      >\n        {{ effectiveAction.label }}\n      </button>\n    </div>\n  </div>\n</div>\n", styles: [".goey-spinnerSpin{animation:goey-spin 1s linear infinite}@keyframes goey-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.goey-wrapper{pointer-events:auto;cursor:default;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,sans-serif;position:relative;width:calc(fit-content + 20px)}.goey-blobSvg{position:absolute;top:0;left:0;overflow:visible;pointer-events:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.06)) drop-shadow(0 1px 4px rgba(0,0,0,.04))}.goey-content{position:relative;z-index:1}.goey-contentCompact{padding:8px 12px}.goey-contentExpanded{padding:8px 12px 16px}.goey-header{display:inline-flex;align-items:center;gap:8px;color:inherit}.goey-iconWrapper{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:18px;height:18px;line-height:0}.goey-title{font-size:13px;font-weight:700;line-height:1.2;white-space:normal;color:inherit;word-break:break-word}.goey-close-btn{background:transparent;border:none;cursor:pointer;padding:4px;margin-left:auto;display:flex;align-items:center;justify-content:center;color:inherit;opacity:.6;border-radius:50%;transition:opacity .2s,background .2s;outline:none;-webkit-tap-highlight-color:transparent}.goey-close-btn:hover{opacity:1;background:#0000000d}.goey-titleDefault{color:#555}.goey-titleSuccess{color:#4caf50}.goey-titleError{color:#e53935}.goey-titleWarning{color:#c49000}.goey-titleInfo{color:#1e88e5}.goey-titleLoading{color:#555}.goey-description{font-size:13px;font-weight:400;color:#444;line-height:1.55;margin-top:12px;overflow:hidden}.goey-actionWrapper{margin-top:12px;overflow:hidden}.goey-actionButton{display:block;box-sizing:border-box;width:100%;border:none;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;text-align:center;outline:none;-webkit-tap-highlight-color:transparent;transition:background .15s ease}.goey-actionButton:focus:not(:focus-visible){outline:none}.goey-actionButton:focus-visible{outline:2px solid currentColor;outline-offset:2px}.goey-actionDefault{background:#e8e8e8;color:#555}.goey-actionDefault:hover{background:#dcdcdc}.goey-actionDefault:active{background:#d0d0d0}.goey-actionSuccess{background:#c8e6c9;color:#4caf50}.goey-actionSuccess:hover{background:#a5d6a7}.goey-actionSuccess:active{background:#81c784}.goey-actionError{background:#ffcdd2;color:#e53935}.goey-actionError:hover{background:#ef9a9a}.goey-actionError:active{background:#e57373}.goey-actionWarning{background:#ffecb3;color:#c49000}.goey-actionWarning:hover{background:#ffe082}.goey-actionWarning:active{background:#ffd54f}.goey-actionInfo{background:#bbdefb;color:#1e88e5}.goey-actionInfo:hover{background:#90caf9}.goey-actionInfo:active{background:#64b5f6}\n"] }]
        }], ctorParameters: () => [{ type: i0.NgZone }, { type: i0.ChangeDetectorRef }], propDecorators: { title: [{
                type: Input
            }], description: [{
                type: Input
            }], type: [{
                type: Input
            }], phase: [{
                type: Input
            }], action: [{
                type: Input
            }], icon: [{
                type: Input
            }], classNames: [{
                type: Input
            }], fillColor: [{
                type: Input
            }], borderColor: [{
                type: Input
            }], borderWidth: [{
                type: Input
            }], timing: [{
                type: Input
            }], duration: [{
                type: Input
            }], spring: [{
                type: Input
            }], bounce: [{
                type: Input
            }], toastId: [{
                type: Input
            }], position: [{
                type: Input
            }], showClose: [{
                type: Input
            }], dismissed: [{
                type: Output
            }], actionClicked: [{
                type: Output
            }], wrapperRef: [{
                type: ViewChild,
                args: ['wrapperEl']
            }], pathRef: [{
                type: ViewChild,
                args: ['blobPath']
            }], headerRef: [{
                type: ViewChild,
                args: ['headerEl']
            }], contentRef: [{
                type: ViewChild,
                args: ['contentEl']
            }] } });

class GoeyToastService {
    toasts$ = new BehaviorSubject([]);
    _config = {
        position: 'bottom-right',
        duration: undefined,
        gap: 14,
        showClose: false,
        spring: true,
        bounce: 0.4,
        maxVisible: 5,
    };
    /** Observable of current toast stack */
    get toasts() {
        return this.toasts$.asObservable();
    }
    /** Current toast list snapshot */
    get currentToasts() {
        return this.toasts$.value;
    }
    /** Current global config */
    get config() {
        return this._config;
    }
    /** Update global configuration */
    setConfig(config) {
        this._config = { ...this._config, ...config };
    }
    /** Show a default toast */
    show(title, options) {
        return this.createToast(title, 'default', options);
    }
    /** Show a success toast */
    success(title, options) {
        return this.createToast(title, 'success', options);
    }
    /** Show an error toast */
    error(title, options) {
        return this.createToast(title, 'error', options);
    }
    /** Show a warning toast */
    warning(title, options) {
        return this.createToast(title, 'warning', options);
    }
    /** Show an info toast */
    info(title, options) {
        return this.createToast(title, 'info', options);
    }
    /** Show a promise toast: loading → success/error */
    promise(promise, data) {
        const id = this.generateId();
        const toastData = {
            id,
            title: data.loading,
            description: data.description?.loading,
            type: 'info',
            phase: 'loading',
            classNames: data.classNames,
            fillColor: data.fillColor,
            borderColor: data.borderColor,
            borderWidth: data.borderWidth,
            timing: data.timing,
            showClose: data.showClose,
            spring: data.spring,
            bounce: data.bounce,
            createdAt: Date.now(),
        };
        this.addToast(toastData);
        promise
            .then((result) => {
            const title = typeof data.success === 'function' ? data.success(result) : data.success;
            const desc = typeof data.description?.success === 'function'
                ? data.description.success(result)
                : data.description?.success;
            this.updateToast(id, {
                title,
                description: desc,
                type: 'success',
                phase: 'success',
                action: data.action?.success,
            });
        })
            .catch((err) => {
            const title = typeof data.error === 'function' ? data.error(err) : data.error;
            const desc = typeof data.description?.error === 'function'
                ? data.description.error(err)
                : data.description?.error;
            this.updateToast(id, {
                title,
                description: desc,
                type: 'error',
                phase: 'error',
                action: data.action?.error,
            });
        });
        return id;
    }
    /** Dismiss a specific toast or all toasts */
    dismiss(id) {
        const current = this.toasts$.value;
        if (id !== undefined) {
            const index = current.findIndex(t => t.id === id);
            if (index !== -1) {
                const toasts = [...current];
                toasts[index] = { ...toasts[index], dismissing: true };
                this.toasts$.next(toasts);
                setTimeout(() => {
                    this.toasts$.next(this.toasts$.value.filter((t) => t.id !== id));
                }, 300);
            }
        }
        else {
            const timeouts = current.map(t => {
                const toasts = [...this.toasts$.value];
                const i = toasts.findIndex(x => x.id === t.id);
                if (i !== -1) {
                    toasts[i] = { ...toasts[i], dismissing: true };
                    this.toasts$.next(toasts);
                }
                setTimeout(() => {
                    this.toasts$.next(this.toasts$.value.filter(x => x.id !== t.id));
                }, 300);
            });
        }
    }
    /** Update an existing toast's data */
    updateToast(id, partial) {
        const toasts = this.toasts$.value.map((t) => t.id === id ? { ...t, ...partial } : t);
        this.toasts$.next(toasts);
    }
    createToast(title, type, options) {
        const id = options?.id ?? this.generateId();
        const toastData = {
            id,
            title,
            type,
            phase: type,
            description: options?.description,
            action: options?.action,
            icon: options?.icon,
            classNames: options?.classNames,
            fillColor: options?.fillColor,
            borderColor: options?.borderColor,
            borderWidth: options?.borderWidth,
            timing: options?.timing,
            showClose: options?.showClose,
            spring: options?.spring,
            bounce: options?.bounce,
            duration: options?.duration,
            createdAt: Date.now(),
        };
        this.addToast(toastData);
        return id;
    }
    addToast(toast) {
        const current = this.toasts$.value;
        const maxVisible = this._config.maxVisible ?? 5;
        // Keep only the latest maxVisible toasts
        const updated = [...current, toast].slice(-maxVisible);
        this.toasts$.next(updated);
    }
    generateId() {
        return Math.random().toString(36).slice(2);
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastService, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

class GoeyToasterComponent {
    toastService;
    cdr;
    position = 'bottom-right';
    duration;
    gap = 14;
    offset = '24px';
    showClose = false;
    spring = true;
    bounce = 0.4;
    maxVisible = 5;
    toasts = [];
    sub;
    get positionClass() {
        return `goey-${this.position}`;
    }
    get offsetStyle() {
        const val = typeof this.offset === 'number' ? `${this.offset}px` : this.offset;
        return val;
    }
    get defaultFillColor() {
        return '#ffffff';
    }
    get defaultBorderColor() {
        return 'rgba(0,0,0,0.08)';
    }
    constructor(toastService, cdr) {
        this.toastService = toastService;
        this.cdr = cdr;
    }
    ngOnInit() {
        // Push config to service
        this.toastService.setConfig({
            position: this.position,
            duration: this.duration,
            gap: this.gap,
            offset: this.offset,
            showClose: this.showClose,
            spring: this.spring,
            bounce: this.bounce,
            maxVisible: this.maxVisible,
        });
        this.sub = this.toastService.toasts.subscribe((toasts) => {
            this.toasts = toasts;
            this.cdr.detectChanges();
        });
    }
    ngOnDestroy() {
        this.sub?.unsubscribe();
    }
    trackById(_index, toast) {
        return toast.id;
    }
    onToastDismissed(id) {
        this.toastService.dismiss(id);
    }
    onActionClicked(toast) {
        // Action handling is done in the toast component itself
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToasterComponent, deps: [{ token: GoeyToastService }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyToasterComponent, isStandalone: true, selector: "goey-toaster", inputs: { position: "position", duration: "duration", gap: "gap", offset: "offset", showClose: "showClose", spring: "spring", bounce: "bounce", maxVisible: "maxVisible" }, host: { properties: { "class": "this.positionClass", "style.padding": "this.offsetStyle" } }, ngImport: i0, template: "<div class=\"goey-toaster-container\">\n  <div\n    *ngFor=\"let toast of toasts; trackBy: trackById\"\n    class=\"goey-toast-item goey-toast-entering\"\n    [class.goey-toast-leaving]=\"toast.dismissing\"\n    [style.marginBottom.px]=\"gap\"\n  >\n    <goey-toast\n      [title]=\"toast.title\"\n      [description]=\"toast.description\"\n      [type]=\"toast.type\"\n      [phase]=\"toast.phase\"\n      [action]=\"toast.action\"\n      [icon]=\"toast.icon\"\n      [classNames]=\"toast.classNames\"\n      [fillColor]=\"toast.fillColor || defaultFillColor\"\n      [borderColor]=\"toast.borderColor || defaultBorderColor\"\n      [borderWidth]=\"toast.borderWidth\"\n      [timing]=\"toast.timing\"\n      [duration]=\"toast.duration\"\n      [showClose]=\"toast.showClose !== undefined ? toast.showClose : showClose\"\n      [spring]=\"toast.spring !== undefined ? toast.spring : spring\"\n      [bounce]=\"toast.bounce !== undefined ? toast.bounce : bounce\"\n      [toastId]=\"toast.id\"\n      [position]=\"position\"\n      (dismissed)=\"onToastDismissed(toast.id)\"\n      (actionClicked)=\"onActionClicked(toast)\"\n    ></goey-toast>\n  </div>\n</div>\n", styles: [":host{position:fixed;z-index:99999;pointer-events:none;display:flex;flex-direction:column}:host(.goey-bottom-right){bottom:0;right:0;align-items:flex-end}:host(.goey-bottom-left){bottom:0;left:0;align-items:flex-start}:host(.goey-bottom-center){bottom:0;left:50%;transform:translate(-50%);align-items:center}:host(.goey-top-right){top:0;right:0;align-items:flex-end;flex-direction:column-reverse}:host(.goey-top-left){top:0;left:0;align-items:flex-start;flex-direction:column-reverse}:host(.goey-top-center){top:0;left:50%;transform:translate(-50%);align-items:center;flex-direction:column-reverse}.goey-toaster-container{display:flex;flex-direction:column;pointer-events:none}.goey-toast-item{pointer-events:auto;transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s cubic-bezier(.4,0,.2,1)}.goey-toast-entering{animation:goey-toast-enter .4s cubic-bezier(.21,1.11,.81,.99)}@keyframes goey-toast-enter{0%{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}.goey-toast-leaving{animation:goey-toast-leave .3s cubic-bezier(.4,0,1,1) forwards}@keyframes goey-toast-leave{0%{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-10px) scale(.95)}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "component", type: GoeyToastComponent, selector: "goey-toast", inputs: ["title", "description", "type", "phase", "action", "icon", "classNames", "fillColor", "borderColor", "borderWidth", "timing", "duration", "spring", "bounce", "toastId", "position", "showClose"], outputs: ["dismissed", "actionClicked"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToasterComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-toaster', standalone: true, imports: [CommonModule, GoeyToastComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: "<div class=\"goey-toaster-container\">\n  <div\n    *ngFor=\"let toast of toasts; trackBy: trackById\"\n    class=\"goey-toast-item goey-toast-entering\"\n    [class.goey-toast-leaving]=\"toast.dismissing\"\n    [style.marginBottom.px]=\"gap\"\n  >\n    <goey-toast\n      [title]=\"toast.title\"\n      [description]=\"toast.description\"\n      [type]=\"toast.type\"\n      [phase]=\"toast.phase\"\n      [action]=\"toast.action\"\n      [icon]=\"toast.icon\"\n      [classNames]=\"toast.classNames\"\n      [fillColor]=\"toast.fillColor || defaultFillColor\"\n      [borderColor]=\"toast.borderColor || defaultBorderColor\"\n      [borderWidth]=\"toast.borderWidth\"\n      [timing]=\"toast.timing\"\n      [duration]=\"toast.duration\"\n      [showClose]=\"toast.showClose !== undefined ? toast.showClose : showClose\"\n      [spring]=\"toast.spring !== undefined ? toast.spring : spring\"\n      [bounce]=\"toast.bounce !== undefined ? toast.bounce : bounce\"\n      [toastId]=\"toast.id\"\n      [position]=\"position\"\n      (dismissed)=\"onToastDismissed(toast.id)\"\n      (actionClicked)=\"onActionClicked(toast)\"\n    ></goey-toast>\n  </div>\n</div>\n", styles: [":host{position:fixed;z-index:99999;pointer-events:none;display:flex;flex-direction:column}:host(.goey-bottom-right){bottom:0;right:0;align-items:flex-end}:host(.goey-bottom-left){bottom:0;left:0;align-items:flex-start}:host(.goey-bottom-center){bottom:0;left:50%;transform:translate(-50%);align-items:center}:host(.goey-top-right){top:0;right:0;align-items:flex-end;flex-direction:column-reverse}:host(.goey-top-left){top:0;left:0;align-items:flex-start;flex-direction:column-reverse}:host(.goey-top-center){top:0;left:50%;transform:translate(-50%);align-items:center;flex-direction:column-reverse}.goey-toaster-container{display:flex;flex-direction:column;pointer-events:none}.goey-toast-item{pointer-events:auto;transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s cubic-bezier(.4,0,.2,1)}.goey-toast-entering{animation:goey-toast-enter .4s cubic-bezier(.21,1.11,.81,.99)}@keyframes goey-toast-enter{0%{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}.goey-toast-leaving{animation:goey-toast-leave .3s cubic-bezier(.4,0,1,1) forwards}@keyframes goey-toast-leave{0%{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-10px) scale(.95)}}\n"] }]
        }], ctorParameters: () => [{ type: GoeyToastService }, { type: i0.ChangeDetectorRef }], propDecorators: { position: [{
                type: Input
            }], duration: [{
                type: Input
            }], gap: [{
                type: Input
            }], offset: [{
                type: Input
            }], showClose: [{
                type: Input
            }], spring: [{
                type: Input
            }], bounce: [{
                type: Input
            }], maxVisible: [{
                type: Input
            }], positionClass: [{
                type: HostBinding,
                args: ['class']
            }], offsetStyle: [{
                type: HostBinding,
                args: ['style.padding']
            }] } });

/**
 * GoeyToastModule — import this module in your AppModule or feature module.
 *
 * Usage:
 * ```ts
 * import { GoeyToastModule } from 'goey-toast-ionic';
 *
 * @NgModule({ imports: [GoeyToastModule] })
 * export class AppModule {}
 * ```
 *
 * Then in your template:
 * ```html
 * <goey-toaster position="bottom-right" theme="light"></goey-toaster>
 * ```
 *
 * And in your component:
 * ```ts
 * constructor(private toast: GoeyToastService) {}
 * showToast() { this.toast.success('Saved!'); }
 * ```
 */
class GoeyToastModule {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastModule, deps: [], target: i0.ɵɵFactoryTarget.NgModule });
    static ɵmod = i0.ɵɵngDeclareNgModule({ minVersion: "14.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastModule, imports: [CommonModule,
            GoeyToastComponent,
            GoeyToasterComponent,
            GoeyIconDefaultComponent,
            GoeyIconSuccessComponent,
            GoeyIconErrorComponent,
            GoeyIconWarningComponent,
            GoeyIconInfoComponent,
            GoeyIconSpinnerComponent], exports: [GoeyToasterComponent,
            GoeyToastComponent] });
    static ɵinj = i0.ɵɵngDeclareInjector({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastModule, imports: [CommonModule,
            GoeyToastComponent,
            GoeyToasterComponent] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToastModule, decorators: [{
            type: NgModule,
            args: [{
                    imports: [
                        CommonModule,
                        GoeyToastComponent,
                        GoeyToasterComponent,
                        GoeyIconDefaultComponent,
                        GoeyIconSuccessComponent,
                        GoeyIconErrorComponent,
                        GoeyIconWarningComponent,
                        GoeyIconInfoComponent,
                        GoeyIconSpinnerComponent,
                    ],
                    exports: [
                        GoeyToasterComponent,
                        GoeyToastComponent,
                    ],
                }]
        }] });

/*
 * goey-toast-ionic — Organic blob morph toast notifications for Ionic Angular
 *
 * Features:
 * - Organic blob morph animation (pill → blob → pill)
 * - Five toast types: default, success, error, warning, info
 * - Promise toasts with loading → success/error transitions
 * - Action buttons with optional success label morph-back
 * - Configurable display duration and bounce intensity
 * - Custom fill color, border color, and border width
 * - 6 positions with automatic mirroring for right-side positions
 * - Hover pause: hovering an expanded toast pauses the dismiss timer
 * - Hover re-expand: hovering a collapsed pill re-expands the toast
 * - Pre-dismiss collapse animation
 * - Light and dark theme support
 */
// Components

/**
 * Generated bundle index. Do not edit.
 */

export { GoeyIconDefaultComponent, GoeyIconErrorComponent, GoeyIconInfoComponent, GoeyIconSpinnerComponent, GoeyIconSuccessComponent, GoeyIconWarningComponent, GoeyToastComponent, GoeyToastModule, GoeyToastService, GoeyToasterComponent, morphPath, morphPathCenter };
//# sourceMappingURL=goey-toast-ng.mjs.map
