import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { morphPath, morphPathCenter, PH } from './morph-path.util';
import { animateValue, squishSpringExpand, squishSpringCollapse, SMOOTH_EASE, } from './spring-animation.util';
import { GoeyIconDefaultComponent, GoeyIconSuccessComponent, GoeyIconErrorComponent, GoeyIconWarningComponent, GoeyIconInfoComponent, GoeyIconSpinnerComponent, } from './icons';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
const DEFAULT_DISPLAY_DURATION = 4000;
export class GoeyToastComponent {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29leS10b2FzdC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9nb2V5LXRvYXN0LWlvbmljL3NyYy9saWIvZ29leS10b2FzdC5jb21wb25lbnQudHMiLCIuLi8uLi8uLi8uLi9wcm9qZWN0cy9nb2V5LXRvYXN0LWlvbmljL3NyYy9saWIvZ29leS10b2FzdC5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFjLFNBQVMsRUFFbEMsdUJBQXVCLEdBQ25ELE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUvQyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRSxPQUFPLEVBQ0wsWUFBWSxFQUF1QixrQkFBa0IsRUFBRSxvQkFBb0IsRUFDM0UsV0FBVyxHQUNaLE1BQU0seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUNMLHdCQUF3QixFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixFQUMxRSx3QkFBd0IsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsR0FDMUUsTUFBTSxTQUFTLENBQUM7OztBQUVqQixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQztBQWN0QyxNQUFNLE9BQU8sa0JBQWtCO0lBc0lUO0lBQXdCO0lBckluQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ1gsV0FBVyxDQUFVO0lBQ3JCLElBQUksR0FBa0IsU0FBUyxDQUFDO0lBQ2hDLEtBQUssR0FBbUIsU0FBUyxDQUFDO0lBQ2xDLE1BQU0sQ0FBbUI7SUFDekIsSUFBSSxDQUFVO0lBQ2QsVUFBVSxDQUF1QjtJQUNqQyxTQUFTLENBQVU7SUFDbkIsV0FBVyxDQUFVO0lBQ3JCLFdBQVcsQ0FBVTtJQUNyQixNQUFNLENBQW9CO0lBQzFCLFFBQVEsQ0FBVTtJQUNsQixNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2QsTUFBTSxHQUFHLEdBQUcsQ0FBQztJQUNiLE9BQU8sQ0FBbUI7SUFDMUIsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixTQUFTLEdBQUcsS0FBSyxDQUFDO0lBRWpCLFNBQVMsR0FBRyxJQUFJLFlBQVksRUFBUSxDQUFDO0lBQ3JDLGFBQWEsR0FBRyxJQUFJLFlBQVksRUFBUSxDQUFDO0lBRTNCLFVBQVUsQ0FBOEI7SUFDekMsT0FBTyxDQUE4QjtJQUNyQyxTQUFTLENBQThCO0lBQ3RDLFVBQVUsQ0FBOEI7SUFFaEUsaUJBQWlCO0lBQ2pCLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFDakIsYUFBYSxHQUFrQixJQUFJLENBQUM7SUFDcEMsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUNuQixPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ2hCLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFDakIsUUFBUSxHQUFHLEdBQUcsQ0FBQztJQUNmLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFFZix3QkFBd0I7SUFDaEIsU0FBUyxHQUErQixJQUFJLENBQUM7SUFDN0MsY0FBYyxHQUErQixJQUFJLENBQUM7SUFDbEQsY0FBYyxHQUErQixJQUFJLENBQUM7SUFDbEQsU0FBUyxHQUErQixJQUFJLENBQUM7SUFFckQsaUJBQWlCO0lBQ1QsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUNYLEtBQUssR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDaEMsT0FBTyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNsQyxlQUFlLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0lBQzFDLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDdEIsYUFBYSxHQUFHLEtBQUssQ0FBQztJQUN0QixlQUFlLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDbkIsYUFBYSxHQUFHLEtBQUssQ0FBQztJQUN0QixZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLFNBQVMsR0FBMEIsSUFBSSxDQUFDO0lBRWhELGNBQWM7SUFDTixZQUFZLEdBQXlDLElBQUksQ0FBQztJQUMxRCxhQUFhLEdBQWtCLElBQUksQ0FBQztJQUNwQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBRXZCLHVCQUF1QjtJQUNmLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDWCxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUNuQixnQkFBZ0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFM0MsY0FBYyxDQUFrQjtJQUNoQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBRTFCLElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDO0lBQ25ELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQztJQUNwRCxDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQzFDLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDaEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDckQsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDakIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDdEQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3JGLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNwQixPQUFPLElBQUksQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUN0QixPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksa0JBQWtCLENBQUM7SUFDaEQsQ0FBQztJQUVELElBQUksb0JBQW9CO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELElBQUksZUFBZTtRQUNqQixNQUFNLEdBQUcsR0FBbUM7WUFDMUMsT0FBTyxFQUFFLG1CQUFtQjtZQUM1QixPQUFPLEVBQUUsbUJBQW1CO1lBQzVCLE9BQU8sRUFBRSxtQkFBbUI7WUFDNUIsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixPQUFPLEVBQUUsbUJBQW1CO1lBQzVCLElBQUksRUFBRSxnQkFBZ0I7U0FDdkIsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxtQkFBbUIsQ0FBQztJQUN6RCxDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsTUFBTSxHQUFHLEdBQW1DO1lBQzFDLE9BQU8sRUFBRSxpQkFBaUI7WUFDMUIsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixJQUFJLEVBQUUsaUJBQWlCO1NBQ3hCLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksb0JBQW9CLENBQUM7SUFDMUQsQ0FBQztJQUVELFlBQW9CLE1BQWMsRUFBVSxHQUFzQjtRQUE5QyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVUsUUFBRyxHQUFILEdBQUcsQ0FBbUI7SUFBRyxDQUFDO0lBRXRFLFFBQVE7UUFDTixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDOUIsQ0FBQztJQUVELGVBQWU7UUFDYixrQkFBa0I7UUFDbEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUViLGdEQUFnRDtZQUNoRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2pFLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUMxQixVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzNELENBQUM7WUFFRCxvQ0FBb0M7WUFDcEMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3BCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7b0JBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDMUIsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ1YsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLDRDQUE0QztnQkFDNUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxlQUFlLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSx3QkFBd0IsQ0FBQztnQkFDdEYsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN4QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDVixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsR0FBRyxFQUFFO2dCQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNwQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2YsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNmLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNILENBQUM7SUFFRCxXQUFXLENBQUMsT0FBc0I7UUFDaEMseURBQXlEO1FBQ3pELElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3RELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUM7WUFFL0MsY0FBYztZQUNkLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDM0UsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1lBRTFCLHdCQUF3QjtZQUN4QixVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFZiw4REFBOEQ7Z0JBQzlELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDdEMsVUFBVSxDQUFDLEdBQUcsRUFBRTt3QkFDZCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzt3QkFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDekIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUNmLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUMxQixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMzQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3BFLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLElBQUksSUFBSSxDQUFDLFlBQVk7WUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxZQUFZO1FBQ1YsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDcEIsc0JBQXNCO1FBQ3RCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDN0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQztZQUN4RSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7WUFDakMsQ0FBQztRQUNILENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzdELElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFDM0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFDeEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUV6QixVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMxQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFBWTtRQUNWLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLG9DQUFvQztRQUNwQyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzdELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzNCLENBQUM7SUFDSCxDQUFDO0lBRUQsYUFBYTtRQUNYLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZTtZQUFFLE9BQU87UUFFbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTFCLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQztZQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRXpCLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUUxQiwyQ0FBMkM7Z0JBQzNDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7b0JBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ1gsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNILENBQUM7SUFFRCw2Q0FBNkM7SUFDN0MsaUJBQWlCO0lBQ2pCLDZDQUE2QztJQUU3QyxZQUFZLENBQUMsQ0FBYTtRQUN4QixJQUFLLENBQUMsQ0FBQyxNQUFzQixDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFLLENBQUMsQ0FBQyxNQUFzQixDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztZQUFFLE9BQU87UUFDNUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxXQUFXLENBQUMsQ0FBYTtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsVUFBVTtRQUNSLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0lBRUQsV0FBVyxDQUFDLENBQWE7UUFDdkIsSUFBSyxDQUFDLENBQUMsTUFBc0IsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSyxDQUFDLENBQUMsTUFBc0IsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7WUFBRSxPQUFPO1FBQzVILElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDOUQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVPLFdBQVcsQ0FBQyxDQUFhO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFTyxTQUFTO1FBQ2YsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRSxRQUFRLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRU8sU0FBUyxDQUFDLENBQVM7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7SUFFTyxRQUFRLENBQUMsQ0FBUztRQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYTtZQUFFLE9BQU87UUFDaEUsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQztRQUM5QyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxJQUFJLENBQUMsVUFBVSxLQUFLLENBQUM7SUFDckcsQ0FBQztJQUVPLE9BQU87UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQztRQUMvQyxJQUFJLENBQUMsT0FBTztZQUFFLE9BQU87UUFFckIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDO1lBQy9FLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLDJDQUEyQyxDQUFDO1lBQ3ZFLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLFNBQVMsS0FBSyxDQUFDO1lBQzdGLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsNkNBQTZDLENBQUM7WUFDekUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDM0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxJQUFJLE9BQU87b0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDO1lBQzdDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNWLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFBWSxDQUFDLENBQVE7UUFDbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVELDZDQUE2QztJQUM3QyxvQkFBb0I7SUFDcEIsNkNBQTZDO0lBRXJDLE9BQU87UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWE7WUFBRSxPQUFPO1FBRTlFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDO1FBRTVDLHlEQUF5RDtRQUN6RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNuQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztRQUN2QyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUVuRSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYTtZQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ25GLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUM1QixPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBRXpCLE1BQU0sRUFBRSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztRQUN6QyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQy9CLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFFaEMsc0JBQXNCO1FBQ3RCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhO1lBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7UUFDekYsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztRQUNsQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7UUFFN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFFOUIsZUFBZTtRQUNmLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25DLENBQUM7SUFDSCxDQUFDO0lBRU8sS0FBSztRQUNYLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFBRSxPQUFPO1FBRXZDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3QixrQkFBa0I7UUFDbEIsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLFdBQVcsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUV4QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQztRQUMvQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQztRQUUvQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNYLHdDQUF3QztZQUN4QyxJQUFJLE9BQU87Z0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3RDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUN6QixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQzlCLENBQUM7UUFDSCxDQUFDO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakIsZ0NBQWdDO1lBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDekMsTUFBTSxRQUFRLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpGLElBQUksT0FBTztnQkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDOUUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDWixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBQ2pFLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDMUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDYixNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFdBQVcsSUFBSSxRQUFRLElBQUksS0FBSyxDQUFDO2dCQUM1RCxDQUFDO3FCQUFNLENBQUM7b0JBQ04sTUFBTSxJQUFJLEdBQUcsUUFBUSxHQUFHLFFBQVEsQ0FBQztvQkFDakMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsT0FBTzt3QkFDOUIsQ0FBQyxDQUFDLGVBQWUsSUFBSSxLQUFLO3dCQUMxQixDQUFDLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQztnQkFDL0IsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLHdDQUF3QztZQUN4QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNaLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUMxRixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3hDLENBQUM7WUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNaLElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDekMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxXQUFXLElBQUksUUFBUSxJQUFJLEtBQUssQ0FBQztnQkFDNUQsQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztvQkFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO2dCQUM5QixDQUFDO2dCQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztZQUN0QyxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVPLGdCQUFnQjtRQUN0QixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sU0FBUyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsTUFBTSxVQUFVLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUV2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtZQUN4QixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBaUIsRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtZQUM5RyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBZSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO1FBRWhFLElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUc7Z0JBQ1gsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0UsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0UsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNoRixDQUFDO1lBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2YsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUViLDBCQUEwQjtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7WUFFRCxzQkFBc0I7WUFDdEIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sa0JBQWtCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUU1QixJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDdEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUUxQiw4QkFBOEI7UUFDOUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUM7UUFDL0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUM7UUFDN0MsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkksTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDcEUsTUFBTSxVQUFVLEdBQUcsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQzFELE1BQU0sU0FBUyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFcEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNqRCxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBZSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUM3RCxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBaUIsRUFBRSxTQUFTLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBRS9ILElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV0QyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUNYLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDcEUsQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNmLENBQUMsRUFBRSxHQUFHLEVBQUU7WUFDTixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztZQUMzQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRXpCLGtEQUFrRDtZQUNsRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7Z0JBQzNCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUF5QyxPQUFPO1FBQzNFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHO1lBQUUsT0FBTztRQUM1QyxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQztRQUUxQixJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzVCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBRXpDLE1BQU0sWUFBWSxHQUFHLEtBQUssS0FBSyxVQUFVO1lBQ3ZDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ25DLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFcEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUNoRSxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBRS9ELElBQUksQ0FBQyxjQUFjLEdBQUcsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDdkMsSUFBSSxFQUFFLFFBQVE7WUFDZCxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVM7WUFDakMsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1lBQzdCLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSTtTQUN4QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDUCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDckMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLE9BQU8sR0FBRyxTQUFTLENBQUM7WUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDakQsRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsWUFBWSxDQUFDO1lBQ3hDLEVBQUUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE1BQU0sR0FBRyxVQUFVLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQztRQUM5RCxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ04sRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdEQsRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGlCQUFpQjtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhO1lBQUUsT0FBTztRQUM1QyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRWpELElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDbEMsSUFBSSxFQUFFLE1BQU07WUFDWixRQUFRLEVBQUUsR0FBRztZQUNiLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztTQUNyQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDUCxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNwRCxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxNQUFNLEdBQUcsY0FBYyxLQUFLLEtBQUssQ0FBQztRQUN6RCxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ04sRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMzQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxpQkFBaUI7UUFDdkIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLFVBQVU7WUFBRSxPQUFPO1FBRWxFLElBQUksSUFBSSxDQUFDLFlBQVk7WUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXZELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsZUFBZSxJQUFJLHdCQUF3QixDQUFDO1FBQzNFLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQztRQUMxQixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsU0FBUyxHQUFHLGFBQWEsR0FBRyxVQUFVLENBQUM7UUFDekQsSUFBSSxTQUFTLElBQUksQ0FBQztZQUFFLE9BQU87UUFFM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsSUFBSSxTQUFTLENBQUM7UUFDOUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2xDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQzFCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDNUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ1osQ0FBQztJQUVPLFlBQVk7UUFDbEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxlQUFlLElBQUksd0JBQXdCLENBQUM7UUFDM0UsT0FBTyxTQUFTLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUMvQixDQUFDO3dHQTFvQlUsa0JBQWtCOzRGQUFsQixrQkFBa0IsKzNCQy9CL0IsZytHQWlHQSx1dUZEMUVJLFlBQVksbUlBQ1osd0JBQXdCLGdGQUFFLHdCQUF3QixnRkFBRSxzQkFBc0IsOEVBQzFFLHdCQUF3QixnRkFBRSxxQkFBcUIsNkVBQUUsd0JBQXdCOzs0RkFNaEUsa0JBQWtCO2tCQVo5QixTQUFTOytCQUNFLFlBQVksY0FDVixJQUFJLFdBQ1A7d0JBQ1AsWUFBWTt3QkFDWix3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0I7d0JBQzFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLHdCQUF3QjtxQkFDMUUsbUJBR2dCLHVCQUF1QixDQUFDLE1BQU07MkdBR3RDLEtBQUs7c0JBQWIsS0FBSztnQkFDRyxXQUFXO3NCQUFuQixLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxLQUFLO3NCQUFiLEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUNHLElBQUk7c0JBQVosS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBQ0csV0FBVztzQkFBbkIsS0FBSztnQkFDRyxXQUFXO3NCQUFuQixLQUFLO2dCQUNHLE1BQU07c0JBQWQsS0FBSztnQkFDRyxRQUFRO3NCQUFoQixLQUFLO2dCQUNHLE1BQU07c0JBQWQsS0FBSztnQkFDRyxNQUFNO3NCQUFkLEtBQUs7Z0JBQ0csT0FBTztzQkFBZixLQUFLO2dCQUNHLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csU0FBUztzQkFBakIsS0FBSztnQkFFSSxTQUFTO3NCQUFsQixNQUFNO2dCQUNHLGFBQWE7c0JBQXRCLE1BQU07Z0JBRWlCLFVBQVU7c0JBQWpDLFNBQVM7dUJBQUMsV0FBVztnQkFDQyxPQUFPO3NCQUE3QixTQUFTO3VCQUFDLFVBQVU7Z0JBQ0UsU0FBUztzQkFBL0IsU0FBUzt1QkFBQyxVQUFVO2dCQUNHLFVBQVU7c0JBQWpDLFNBQVM7dUJBQUMsV0FBVyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCwgSW5wdXQsIE91dHB1dCwgRXZlbnRFbWl0dGVyLCBFbGVtZW50UmVmLCBWaWV3Q2hpbGQsXG4gIE9uSW5pdCwgT25EZXN0cm95LCBPbkNoYW5nZXMsIFNpbXBsZUNoYW5nZXMsIEFmdGVyVmlld0luaXQsXG4gIE5nWm9uZSwgQ2hhbmdlRGV0ZWN0b3JSZWYsIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBHb2V5VG9hc3RQaGFzZSwgR29leVRvYXN0VHlwZSwgR29leVRvYXN0QWN0aW9uLCBHb2V5VG9hc3RDbGFzc05hbWVzLCBHb2V5VG9hc3RUaW1pbmdzIH0gZnJvbSAnLi9nb2V5LXRvYXN0LnR5cGVzJztcbmltcG9ydCB7IG1vcnBoUGF0aCwgbW9ycGhQYXRoQ2VudGVyLCBQSCB9IGZyb20gJy4vbW9ycGgtcGF0aC51dGlsJztcbmltcG9ydCB7XG4gIGFuaW1hdGVWYWx1ZSwgQW5pbWF0aW9uQ29udHJvbGxlciwgc3F1aXNoU3ByaW5nRXhwYW5kLCBzcXVpc2hTcHJpbmdDb2xsYXBzZSxcbiAgU01PT1RIX0VBU0UsXG59IGZyb20gJy4vc3ByaW5nLWFuaW1hdGlvbi51dGlsJztcbmltcG9ydCB7XG4gIEdvZXlJY29uRGVmYXVsdENvbXBvbmVudCwgR29leUljb25TdWNjZXNzQ29tcG9uZW50LCBHb2V5SWNvbkVycm9yQ29tcG9uZW50LFxuICBHb2V5SWNvbldhcm5pbmdDb21wb25lbnQsIEdvZXlJY29uSW5mb0NvbXBvbmVudCwgR29leUljb25TcGlubmVyQ29tcG9uZW50LFxufSBmcm9tICcuL2ljb25zJztcblxuY29uc3QgREVGQVVMVF9ESVNQTEFZX0RVUkFUSU9OID0gNDAwMDtcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnZ29leS10b2FzdCcsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG4gIGltcG9ydHM6IFtcbiAgICBDb21tb25Nb2R1bGUsXG4gICAgR29leUljb25EZWZhdWx0Q29tcG9uZW50LCBHb2V5SWNvblN1Y2Nlc3NDb21wb25lbnQsIEdvZXlJY29uRXJyb3JDb21wb25lbnQsXG4gICAgR29leUljb25XYXJuaW5nQ29tcG9uZW50LCBHb2V5SWNvbkluZm9Db21wb25lbnQsIEdvZXlJY29uU3Bpbm5lckNvbXBvbmVudCxcbiAgXSxcbiAgdGVtcGxhdGVVcmw6ICcuL2dvZXktdG9hc3QuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9nb2V5LXRvYXN0LmNvbXBvbmVudC5jc3MnXSxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG59KVxuZXhwb3J0IGNsYXNzIEdvZXlUb2FzdENvbXBvbmVudCBpbXBsZW1lbnRzIE9uSW5pdCwgT25EZXN0cm95LCBBZnRlclZpZXdJbml0LCBPbkNoYW5nZXMge1xuICBASW5wdXQoKSB0aXRsZSA9ICcnO1xuICBASW5wdXQoKSBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgQElucHV0KCkgdHlwZTogR29leVRvYXN0VHlwZSA9ICdkZWZhdWx0JztcbiAgQElucHV0KCkgcGhhc2U6IEdvZXlUb2FzdFBoYXNlID0gJ2RlZmF1bHQnO1xuICBASW5wdXQoKSBhY3Rpb24/OiBHb2V5VG9hc3RBY3Rpb247XG4gIEBJbnB1dCgpIGljb24/OiBzdHJpbmc7XG4gIEBJbnB1dCgpIGNsYXNzTmFtZXM/OiBHb2V5VG9hc3RDbGFzc05hbWVzO1xuICBASW5wdXQoKSBmaWxsQ29sb3I/OiBzdHJpbmc7XG4gIEBJbnB1dCgpIGJvcmRlckNvbG9yPzogc3RyaW5nO1xuICBASW5wdXQoKSBib3JkZXJXaWR0aD86IG51bWJlcjtcbiAgQElucHV0KCkgdGltaW5nPzogR29leVRvYXN0VGltaW5ncztcbiAgQElucHV0KCkgZHVyYXRpb24/OiBudW1iZXI7XG4gIEBJbnB1dCgpIHNwcmluZyA9IHRydWU7XG4gIEBJbnB1dCgpIGJvdW5jZSA9IDAuNDtcbiAgQElucHV0KCkgdG9hc3RJZD86IHN0cmluZyB8IG51bWJlcjtcbiAgQElucHV0KCkgcG9zaXRpb24gPSAnYm90dG9tLXJpZ2h0JztcbiAgQElucHV0KCkgc2hvd0Nsb3NlID0gZmFsc2U7XG5cbiAgQE91dHB1dCgpIGRpc21pc3NlZCA9IG5ldyBFdmVudEVtaXR0ZXI8dm9pZD4oKTtcbiAgQE91dHB1dCgpIGFjdGlvbkNsaWNrZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XG5cbiAgQFZpZXdDaGlsZCgnd3JhcHBlckVsJykgd3JhcHBlclJlZiE6IEVsZW1lbnRSZWY8SFRNTERpdkVsZW1lbnQ+O1xuICBAVmlld0NoaWxkKCdibG9iUGF0aCcpIHBhdGhSZWYhOiBFbGVtZW50UmVmPFNWR1BhdGhFbGVtZW50PjtcbiAgQFZpZXdDaGlsZCgnaGVhZGVyRWwnKSBoZWFkZXJSZWYhOiBFbGVtZW50UmVmPEhUTUxEaXZFbGVtZW50PjtcbiAgQFZpZXdDaGlsZCgnY29udGVudEVsJykgY29udGVudFJlZiE6IEVsZW1lbnRSZWY8SFRNTERpdkVsZW1lbnQ+O1xuXG4gIC8vIENvbXB1dGVkIHN0YXRlXG4gIHNob3dCb2R5ID0gZmFsc2U7XG4gIGFjdGlvblN1Y2Nlc3M6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBkaXNtaXNzaW5nID0gZmFsc2U7XG4gIGhvdmVyZWQgPSBmYWxzZTtcbiAgY3VycmVudFBhdGggPSAnJztcbiAgc3ZnV2lkdGggPSAyMDA7XG4gIHN2Z0hlaWdodCA9IFBIO1xuXG4gIC8vIEFuaW1hdGlvbiBjb250cm9sbGVyc1xuICBwcml2YXRlIG1vcnBoQ3RybDogQW5pbWF0aW9uQ29udHJvbGxlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBpbGxSZXNpemVDdHJsOiBBbmltYXRpb25Db250cm9sbGVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgYmxvYlNxdWlzaEN0cmw6IEFuaW1hdGlvbkNvbnRyb2xsZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBzaGFrZUN0cmw6IEFuaW1hdGlvbkNvbnRyb2xsZXIgfCBudWxsID0gbnVsbDtcblxuICAvLyBBbmltYXRlZCBzdGF0ZVxuICBwcml2YXRlIG1vcnBoVCA9IDA7XG4gIHByaXZhdGUgYURpbXMgPSB7IHB3OiAwLCBidzogMCwgdGg6IDAgfTtcbiAgcHJpdmF0ZSBkaW1zUmVmID0geyBwdzogMCwgYnc6IDAsIHRoOiAwIH07XG4gIHByaXZhdGUgZXhwYW5kZWREaW1zUmVmID0geyBwdzogMCwgYnc6IDAsIHRoOiAwIH07XG4gIHByaXZhdGUgY29sbGFwc2luZ1JlZiA9IGZhbHNlO1xuICBwcml2YXRlIHByZURpc21pc3NSZWYgPSBmYWxzZTtcbiAgcHJpdmF0ZSBjb2xsYXBzZUVuZFRpbWUgPSAwO1xuICBwcml2YXRlIGxhc3RTcXVpc2hUaW1lID0gMDtcbiAgcHJpdmF0ZSBtb3VudFNxdWlzaGVkID0gZmFsc2U7XG4gIHByaXZhdGUgcHJldlNob3dCb2R5ID0gZmFsc2U7XG4gIHByaXZhdGUgcHJldlBoYXNlOiBHb2V5VG9hc3RQaGFzZSB8IG51bGwgPSBudWxsO1xuXG4gIC8vIFRpbWVyIHN0YXRlXG4gIHByaXZhdGUgZGlzbWlzc1RpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlbWFpbmluZ1RpbWU6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHRpbWVyU3RhcnQgPSAwO1xuXG4gIC8vIFN3aXBlIHRvIGNsb3NlIHN0YXRlXG4gIHByaXZhdGUgc3RhcnRYID0gMDtcbiAgcHJpdmF0ZSBkcmFnT2Zmc2V0ID0gMDtcbiAgcHJpdmF0ZSBpc0RyYWdnaW5nID0gZmFsc2U7XG4gIHByaXZhdGUgb25Nb3VzZU1vdmVCb3VuZCA9IHRoaXMub25Nb3VzZU1vdmUuYmluZCh0aGlzKTtcbiAgcHJpdmF0ZSBvbk1vdXNlVXBCb3VuZCA9IHRoaXMub25Nb3VzZVVwLmJpbmQodGhpcyk7XG5cbiAgcHJpdmF0ZSByZXNpemVPYnNlcnZlcj86IFJlc2l6ZU9ic2VydmVyO1xuICBwcml2YXRlIGRlc3Ryb3llZCA9IGZhbHNlO1xuXG4gIGdldCBpc1JpZ2h0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvc2l0aW9uPy5pbmNsdWRlcygncmlnaHQnKSA/PyBmYWxzZTtcbiAgfVxuXG4gIGdldCBpc0NlbnRlcigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wb3NpdGlvbj8uaW5jbHVkZXMoJ2NlbnRlcicpID8/IGZhbHNlO1xuICB9XG5cbiAgZ2V0IGVmZmVjdGl2ZVRpdGxlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aW9uU3VjY2VzcyA/PyB0aGlzLnRpdGxlO1xuICB9XG5cbiAgZ2V0IGVmZmVjdGl2ZVBoYXNlKCk6IEdvZXlUb2FzdFBoYXNlIHtcbiAgICByZXR1cm4gdGhpcy5hY3Rpb25TdWNjZXNzID8gJ3N1Y2Nlc3MnIDogdGhpcy5waGFzZTtcbiAgfVxuXG4gIGdldCBlZmZlY3RpdmVEZXNjcmlwdGlvbigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFjdGlvblN1Y2Nlc3MgPyB1bmRlZmluZWQgOiB0aGlzLmRlc2NyaXB0aW9uO1xuICB9XG5cbiAgZ2V0IGVmZmVjdGl2ZUFjdGlvbigpOiBHb2V5VG9hc3RBY3Rpb24gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFjdGlvblN1Y2Nlc3MgPyB1bmRlZmluZWQgOiB0aGlzLmFjdGlvbjtcbiAgfVxuXG4gIGdldCBpc0V4cGFuZGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoISF0aGlzLmVmZmVjdGl2ZURlc2NyaXB0aW9uIHx8ICEhdGhpcy5lZmZlY3RpdmVBY3Rpb24pICYmICF0aGlzLmRpc21pc3Npbmc7XG4gIH1cblxuICBnZXQgZWZmZWN0aXZlRmlsbENvbG9yKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZmlsbENvbG9yIHx8ICcjZmZmZmZmJztcbiAgfVxuXG4gIGdldCBlZmZlY3RpdmVCb3JkZXJDb2xvcigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmJvcmRlckNvbG9yIHx8ICdyZ2JhKDAsMCwwLDAuMDgpJztcbiAgfVxuXG4gIGdldCBlZmZlY3RpdmVCb3JkZXJXaWR0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmJvcmRlcldpZHRoID8/IDEuNTtcbiAgfVxuXG4gIGdldCB0aXRsZUNvbG9yQ2xhc3MoKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXA6IFJlY29yZDxHb2V5VG9hc3RQaGFzZSwgc3RyaW5nPiA9IHtcbiAgICAgIGxvYWRpbmc6ICdnb2V5LXRpdGxlTG9hZGluZycsXG4gICAgICBkZWZhdWx0OiAnZ29leS10aXRsZURlZmF1bHQnLFxuICAgICAgc3VjY2VzczogJ2dvZXktdGl0bGVTdWNjZXNzJyxcbiAgICAgIGVycm9yOiAnZ29leS10aXRsZUVycm9yJyxcbiAgICAgIHdhcm5pbmc6ICdnb2V5LXRpdGxlV2FybmluZycsXG4gICAgICBpbmZvOiAnZ29leS10aXRsZUluZm8nLFxuICAgIH07XG4gICAgcmV0dXJuIG1hcFt0aGlzLmVmZmVjdGl2ZVBoYXNlXSB8fCAnZ29leS10aXRsZURlZmF1bHQnO1xuICB9XG5cbiAgZ2V0IGFjdGlvbkNvbG9yQ2xhc3MoKTogc3RyaW5nIHtcbiAgICBjb25zdCBtYXA6IFJlY29yZDxHb2V5VG9hc3RQaGFzZSwgc3RyaW5nPiA9IHtcbiAgICAgIGxvYWRpbmc6ICdnb2V5LWFjdGlvbkluZm8nLFxuICAgICAgZGVmYXVsdDogJ2dvZXktYWN0aW9uRGVmYXVsdCcsXG4gICAgICBzdWNjZXNzOiAnZ29leS1hY3Rpb25TdWNjZXNzJyxcbiAgICAgIGVycm9yOiAnZ29leS1hY3Rpb25FcnJvcicsXG4gICAgICB3YXJuaW5nOiAnZ29leS1hY3Rpb25XYXJuaW5nJyxcbiAgICAgIGluZm86ICdnb2V5LWFjdGlvbkluZm8nLFxuICAgIH07XG4gICAgcmV0dXJuIG1hcFt0aGlzLmVmZmVjdGl2ZVBoYXNlXSB8fCAnZ29leS1hY3Rpb25EZWZhdWx0JztcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbmdab25lOiBOZ1pvbmUsIHByaXZhdGUgY2RyOiBDaGFuZ2VEZXRlY3RvclJlZikge31cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICB0aGlzLnByZXZQaGFzZSA9IHRoaXMucGhhc2U7XG4gIH1cblxuICBuZ0FmdGVyVmlld0luaXQoKTogdm9pZCB7XG4gICAgLy8gSW5pdGlhbCBtZWFzdXJlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm1lYXN1cmUoKTtcbiAgICAgIHRoaXMuZmx1c2goKTtcblxuICAgICAgLy8gTW91bnQgc3F1aXNoIGZvciBzaW1wbGUgKG5vbi1leHBhbmRlZCkgdG9hc3RzXG4gICAgICBpZiAodGhpcy5hRGltcy5wdyA+IDAgJiYgIXRoaXMuaXNFeHBhbmRlZCAmJiAhdGhpcy5tb3VudFNxdWlzaGVkKSB7XG4gICAgICAgIHRoaXMubW91bnRTcXVpc2hlZCA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy50cmlnZ2VyTGFuZGluZ1NxdWlzaCgnbW91bnQnKSwgNDUpO1xuICAgICAgfVxuXG4gICAgICAvLyBTdGFydCBleHBhbmQgc2VxdWVuY2UgaWYgZXhwYW5kZWRcbiAgICAgIGlmICh0aGlzLmlzRXhwYW5kZWQpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zaG93Qm9keSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgICAgIHRoaXMubWVhc3VyZSgpO1xuICAgICAgICAgIHRoaXMuc3RhcnRFeHBhbmRNb3JwaCgpO1xuICAgICAgICB9LCAzMzApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQXV0by1kaXNtaXNzIHNpbXBsZSAobm9uLWV4cGFuZGVkKSB0b2FzdHNcbiAgICAgICAgY29uc3QgZHVyID0gdGhpcy50aW1pbmc/LmRpc3BsYXlEdXJhdGlvbiA/PyB0aGlzLmR1cmF0aW9uID8/IERFRkFVTFRfRElTUExBWV9EVVJBVElPTjtcbiAgICAgICAgdGhpcy5kaXNtaXNzVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLmRpc21pc3NlZC5lbWl0KCk7XG4gICAgICAgIH0sIGR1cik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBSZXNpemVPYnNlcnZlciBmb3IgZHluYW1pYyBjb250ZW50XG4gICAgaWYgKHRoaXMuY29udGVudFJlZj8ubmF0aXZlRWxlbWVudCkge1xuICAgICAgdGhpcy5yZXNpemVPYnNlcnZlciA9IG5ldyBSZXNpemVPYnNlcnZlcigoKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgICAgICB0aGlzLm1lYXN1cmUoKTtcbiAgICAgICAgICB0aGlzLmZsdXNoKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuY29udGVudFJlZi5uYXRpdmVFbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKTogdm9pZCB7XG4gICAgLy8gSGFuZGxlIHBoYXNlIGNoYW5nZXMgKGUuZy4sIHByb21pc2UgdG9hc3QgdHJhbnNpdGlvbnMpXG4gICAgaWYgKGNoYW5nZXNbJ3BoYXNlJ10gJiYgIWNoYW5nZXNbJ3BoYXNlJ10uZmlyc3RDaGFuZ2UpIHtcbiAgICAgIGNvbnN0IG5ld1BoYXNlID0gY2hhbmdlc1sncGhhc2UnXS5jdXJyZW50VmFsdWU7XG5cbiAgICAgIC8vIEVycm9yIHNoYWtlXG4gICAgICBpZiAobmV3UGhhc2UgPT09ICdlcnJvcicgJiYgdGhpcy5wcmV2UGhhc2UgIT09ICdlcnJvcicgJiYgIXRoaXMuZGlzbWlzc2luZykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMudHJpZ2dlckVycm9yU2hha2UoKSk7XG4gICAgICB9XG4gICAgICB0aGlzLnByZXZQaGFzZSA9IG5ld1BoYXNlO1xuXG4gICAgICAvLyBSZS1tZWFzdXJlIGFuZCB1cGRhdGVcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLm1lYXN1cmUoKTtcblxuICAgICAgICAvLyBJZiBuZXdseSBleHBhbmRlZCAoZS5nLiwgcHJvbWlzZSByZXNvbHZlZCB3aXRoIGRlc2NyaXB0aW9uKVxuICAgICAgICBpZiAodGhpcy5pc0V4cGFuZGVkICYmICF0aGlzLnNob3dCb2R5KSB7XG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnNob3dCb2R5ID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY2RyLmRldGVjdENoYW5nZXMoKTtcbiAgICAgICAgICAgIHRoaXMubWVhc3VyZSgpO1xuICAgICAgICAgICAgdGhpcy5zdGFydEV4cGFuZE1vcnBoKCk7XG4gICAgICAgICAgfSwgMzMwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHRpdGxlL2Rlc2NyaXB0aW9uIGNoYW5nZXNcbiAgICBpZiAoY2hhbmdlc1sndGl0bGUnXSB8fCBjaGFuZ2VzWydkZXNjcmlwdGlvbiddIHx8IGNoYW5nZXNbJ2FjdGlvbiddKSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5tZWFzdXJlKCk7XG4gICAgICAgIHRoaXMuZmx1c2goKTtcbiAgICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIHRoaXMubW9ycGhDdHJsPy5zdG9wKCk7XG4gICAgdGhpcy5waWxsUmVzaXplQ3RybD8uc3RvcCgpO1xuICAgIHRoaXMuYmxvYlNxdWlzaEN0cmw/LnN0b3AoKTtcbiAgICB0aGlzLnNoYWtlQ3RybD8uc3RvcCgpO1xuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICBpZiAodGhpcy5kaXNtaXNzVGltZXIpIGNsZWFyVGltZW91dCh0aGlzLmRpc21pc3NUaW1lcik7XG4gIH1cblxuICBvbk1vdXNlRW50ZXIoKTogdm9pZCB7XG4gICAgdGhpcy5ob3ZlcmVkID0gdHJ1ZTtcbiAgICAvLyBQYXVzZSBkaXNtaXNzIHRpbWVyXG4gICAgaWYgKHRoaXMuZGlzbWlzc1RpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5kaXNtaXNzVGltZXIpO1xuICAgICAgY29uc3QgZWxhcHNlZCA9IERhdGUubm93KCkgLSB0aGlzLnRpbWVyU3RhcnQ7XG4gICAgICBjb25zdCByZW1haW5pbmcgPSAodGhpcy5yZW1haW5pbmdUaW1lID8/IHRoaXMuZ2V0RnVsbERlbGF5KCkpIC0gZWxhcHNlZDtcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwKSB7XG4gICAgICAgIHRoaXMucmVtYWluaW5nVGltZSA9IHJlbWFpbmluZztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZS1leHBhbmQgb24gaG92ZXIgaWYgZGlzbWlzc2luZ1xuICAgIGlmICh0aGlzLmRpc21pc3NpbmcgJiYgKCEhdGhpcy5kZXNjcmlwdGlvbiB8fCAhIXRoaXMuYWN0aW9uKSkge1xuICAgICAgdGhpcy5tb3JwaEN0cmw/LnN0b3AoKTtcbiAgICAgIHRoaXMuY29sbGFwc2luZ1JlZiA9IGZhbHNlO1xuICAgICAgdGhpcy5wcmVEaXNtaXNzUmVmID0gZmFsc2U7XG4gICAgICB0aGlzLnJlbWFpbmluZ1RpbWUgPSBudWxsO1xuICAgICAgdGhpcy5kaXNtaXNzaW5nID0gZmFsc2U7XG4gICAgICB0aGlzLnNob3dCb2R5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuY2RyLmRldGVjdENoYW5nZXMoKTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMubWVhc3VyZSgpO1xuICAgICAgICB0aGlzLnN0YXJ0RXhwYW5kTW9ycGgoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIG9uTW91c2VMZWF2ZSgpOiB2b2lkIHtcbiAgICB0aGlzLmhvdmVyZWQgPSBmYWxzZTtcbiAgICAvLyBSZXN0YXJ0IGRpc21pc3MgdGltZXIgaWYgZXhwYW5kZWRcbiAgICBpZiAodGhpcy5zaG93Qm9keSAmJiAhdGhpcy5kaXNtaXNzaW5nICYmICF0aGlzLmFjdGlvblN1Y2Nlc3MpIHtcbiAgICAgIHRoaXMuc3RhcnREaXNtaXNzVGltZXIoKTtcbiAgICB9XG4gIH1cblxuICBvbkFjdGlvbkNsaWNrKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5lZmZlY3RpdmVBY3Rpb24pIHJldHVybjtcblxuICAgIHRoaXMuZWZmZWN0aXZlQWN0aW9uLm9uQ2xpY2soKTtcbiAgICB0aGlzLmFjdGlvbkNsaWNrZWQuZW1pdCgpO1xuXG4gICAgLy8gSWYgc3VjY2VzcyBsYWJlbCBwcm92aWRlZCwgbW9ycGggYmFjayB0byBwaWxsIHNob3dpbmcgc3VjY2Vzc1xuICAgIGlmICh0aGlzLmVmZmVjdGl2ZUFjdGlvbi5zdWNjZXNzTGFiZWwpIHtcbiAgICAgIHRoaXMuYWN0aW9uU3VjY2VzcyA9IHRoaXMuZWZmZWN0aXZlQWN0aW9uLnN1Y2Nlc3NMYWJlbDtcbiAgICAgIHRoaXMuY2RyLmRldGVjdENoYW5nZXMoKTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMubWVhc3VyZSgpO1xuICAgICAgICB0aGlzLnN0YXJ0Q29sbGFwc2VNb3JwaCgpO1xuXG4gICAgICAgIC8vIEF1dG8tZGlzbWlzcyBhZnRlciBzaG93aW5nIHN1Y2Nlc3MgbGFiZWxcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5kaXNtaXNzZWQuZW1pdCgpO1xuICAgICAgICB9LCAyNTAwKTtcbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFN3aXBlIEhhbmRsZXJzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIG9uVG91Y2hTdGFydChlOiBUb3VjaEV2ZW50KTogdm9pZCB7XG4gICAgaWYgKChlLnRhcmdldCBhcyBIVE1MRWxlbWVudCkuY2xvc2VzdCgnLmdvZXktY2xvc2UtYnRuJykgfHwgKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZ29leS1hY3Rpb25CdXR0b24nKSkgcmV0dXJuO1xuICAgIHRoaXMuc3RhcnREcmFnKGUudG91Y2hlc1swXS5jbGllbnRYKTtcbiAgfVxuXG4gIG9uVG91Y2hNb3ZlKGU6IFRvdWNoRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgIHRoaXMubW92ZURyYWcoZS50b3VjaGVzWzBdLmNsaWVudFgpO1xuICB9XG5cbiAgb25Ub3VjaEVuZCgpOiB2b2lkIHtcbiAgICB0aGlzLmVuZERyYWcoKTtcbiAgfVxuXG4gIG9uTW91c2VEb3duKGU6IE1vdXNlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAoKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS5jbG9zZXN0KCcuZ29leS1jbG9zZS1idG4nKSB8fCAoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpLmNsb3Nlc3QoJy5nb2V5LWFjdGlvbkJ1dHRvbicpKSByZXR1cm47XG4gICAgdGhpcy5zdGFydERyYWcoZS5jbGllbnRYKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLm9uTW91c2VNb3ZlQm91bmQpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLm9uTW91c2VVcEJvdW5kKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Nb3VzZU1vdmUoZTogTW91c2VFdmVudCk6IHZvaWQge1xuICAgIHRoaXMubW92ZURyYWcoZS5jbGllbnRYKTtcbiAgfVxuXG4gIHByaXZhdGUgb25Nb3VzZVVwKCk6IHZvaWQge1xuICAgIHRoaXMuZW5kRHJhZygpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMub25Nb3VzZU1vdmVCb3VuZCk7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMub25Nb3VzZVVwQm91bmQpO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydERyYWcoeDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICB0aGlzLnN0YXJ0WCA9IHg7XG4gICAgdGhpcy5kcmFnT2Zmc2V0ID0gMDtcbiAgICB0aGlzLm9uTW91c2VFbnRlcigpO1xuICB9XG5cbiAgcHJpdmF0ZSBtb3ZlRHJhZyh4OiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcmFnZ2luZyB8fCAhdGhpcy53cmFwcGVyUmVmPy5uYXRpdmVFbGVtZW50KSByZXR1cm47XG4gICAgdGhpcy5kcmFnT2Zmc2V0ID0geCAtIHRoaXMuc3RhcnRYO1xuICAgIGNvbnN0IHdyYXBwZXIgPSB0aGlzLndyYXBwZXJSZWYubmF0aXZlRWxlbWVudDtcbiAgICB3cmFwcGVyLnN0eWxlLnRyYW5zZm9ybSA9ICh0aGlzLmlzUmlnaHQgPyAnc2NhbGVYKC0xKSAnIDogJycpICsgYHRyYW5zbGF0ZVgoJHt0aGlzLmRyYWdPZmZzZXR9cHgpYDtcbiAgfVxuXG4gIHByaXZhdGUgZW5kRHJhZygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNEcmFnZ2luZykgcmV0dXJuO1xuICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgIHRoaXMub25Nb3VzZUxlYXZlKCk7XG5cbiAgICBjb25zdCB3cmFwcGVyID0gdGhpcy53cmFwcGVyUmVmPy5uYXRpdmVFbGVtZW50O1xuICAgIGlmICghd3JhcHBlcikgcmV0dXJuO1xuXG4gICAgaWYgKE1hdGguYWJzKHRoaXMuZHJhZ09mZnNldCkgPiA4MCkge1xuICAgICAgY29uc3QgdGhyb3dPdXRYID0gdGhpcy5kcmFnT2Zmc2V0ID4gMCA/IHdpbmRvdy5pbm5lcldpZHRoIDogLXdpbmRvdy5pbm5lcldpZHRoO1xuICAgICAgd3JhcHBlci5zdHlsZS50cmFuc2l0aW9uID0gJ3RyYW5zZm9ybSAwLjNzIGN1YmljLWJlemllcigwLjQsIDAsIDEsIDEpJztcbiAgICAgIHdyYXBwZXIuc3R5bGUudHJhbnNmb3JtID0gKHRoaXMuaXNSaWdodCA/ICdzY2FsZVgoLTEpICcgOiAnJykgKyBgdHJhbnNsYXRlWCgke3Rocm93T3V0WH1weClgO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmRpc21pc3NlZC5lbWl0KCksIDMwMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdyYXBwZXIuc3R5bGUudHJhbnNpdGlvbiA9ICd0cmFuc2Zvcm0gMC4zcyBjdWJpYy1iZXppZXIoMC40LCAwLCAwLjIsIDEpJztcbiAgICAgIHdyYXBwZXIuc3R5bGUudHJhbnNmb3JtID0gdGhpcy5pc1JpZ2h0ID8gJ3NjYWxlWCgtMSknIDogJyc7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHdyYXBwZXIpIHdyYXBwZXIuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuICAgICAgfSwgMzAwKTtcbiAgICB9XG4gIH1cblxuICBvbkNsb3NlQ2xpY2soZTogRXZlbnQpOiB2b2lkIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHRoaXMuZGlzbWlzc2VkLmVtaXQoKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBBbmltYXRpb24gTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICBwcml2YXRlIG1lYXN1cmUoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmhlYWRlclJlZj8ubmF0aXZlRWxlbWVudCB8fCAhdGhpcy5jb250ZW50UmVmPy5uYXRpdmVFbGVtZW50KSByZXR1cm47XG5cbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5jb250ZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgY29uc3QgaGVhZGVyID0gdGhpcy5oZWFkZXJSZWYubmF0aXZlRWxlbWVudDtcblxuICAgIC8vIFRlbXBvcmFyaWx5IGNsZWFyIGNvbnN0cmFpbnRzIGZvciBhY2N1cmF0ZSBtZWFzdXJlbWVudFxuICAgIGNvbnN0IHNhdmVkVyA9IGNvbnRlbnQuc3R5bGUud2lkdGg7XG4gICAgY29uc3Qgc2F2ZWRPdiA9IGNvbnRlbnQuc3R5bGUub3ZlcmZsb3c7XG4gICAgY29uc3Qgc2F2ZWRNSCA9IGNvbnRlbnQuc3R5bGUubWF4SGVpZ2h0O1xuICAgIGNvbnN0IHNhdmVkV3JXID0gdGhpcy53cmFwcGVyUmVmPy5uYXRpdmVFbGVtZW50Py5zdHlsZS53aWR0aCA/PyAnJztcblxuICAgIGlmICh0aGlzLndyYXBwZXJSZWY/Lm5hdGl2ZUVsZW1lbnQpIHRoaXMud3JhcHBlclJlZi5uYXRpdmVFbGVtZW50LnN0eWxlLndpZHRoID0gJyc7XG4gICAgY29udGVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgIGNvbnRlbnQuc3R5bGUubWF4SGVpZ2h0ID0gJyc7XG4gICAgY29udGVudC5zdHlsZS53aWR0aCA9ICcnO1xuXG4gICAgY29uc3QgY3MgPSBnZXRDb21wdXRlZFN0eWxlKGNvbnRlbnQpO1xuICAgIGNvbnN0IHBhZGRpbmdYID0gcGFyc2VGbG9hdChjcy5wYWRkaW5nTGVmdCkgKyBwYXJzZUZsb2F0KGNzLnBhZGRpbmdSaWdodCk7XG4gICAgY29uc3QgcHcgPSBoZWFkZXIub2Zmc2V0V2lkdGggKyBwYWRkaW5nWDtcbiAgICBjb25zdCBidyA9IGNvbnRlbnQub2Zmc2V0V2lkdGg7XG4gICAgY29uc3QgdGggPSBjb250ZW50Lm9mZnNldEhlaWdodDtcblxuICAgIC8vIFJlc3RvcmUgY29uc3RyYWludHNcbiAgICBpZiAodGhpcy53cmFwcGVyUmVmPy5uYXRpdmVFbGVtZW50KSB0aGlzLndyYXBwZXJSZWYubmF0aXZlRWxlbWVudC5zdHlsZS53aWR0aCA9IHNhdmVkV3JXO1xuICAgIGNvbnRlbnQuc3R5bGUub3ZlcmZsb3cgPSBzYXZlZE92O1xuICAgIGNvbnRlbnQuc3R5bGUubWF4SGVpZ2h0ID0gc2F2ZWRNSDtcbiAgICBjb250ZW50LnN0eWxlLndpZHRoID0gc2F2ZWRXO1xuXG4gICAgdGhpcy5kaW1zUmVmID0geyBwdywgYncsIHRoIH07XG5cbiAgICAvLyBGaXJzdCByZW5kZXJcbiAgICBpZiAodGhpcy5hRGltcy5idyA8PSAwKSB7XG4gICAgICB0aGlzLmFEaW1zID0geyAuLi50aGlzLmRpbXNSZWYgfTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGZsdXNoKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgcHc6IHAsIGJ3OiBiLCB0aDogaCB9ID0gdGhpcy5hRGltcztcbiAgICBpZiAocCA8PSAwIHx8IGIgPD0gMCB8fCBoIDw9IDApIHJldHVybjtcblxuICAgIGNvbnN0IHQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCB0aGlzLm1vcnBoVCkpO1xuICAgIGNvbnN0IGlzQ2VudGVyID0gdGhpcy5pc0NlbnRlcjtcbiAgICBjb25zdCBpc1JpZ2h0ID0gdGhpcy5pc1JpZ2h0O1xuICAgIGNvbnN0IHBpbGxXID0gTWF0aC5taW4ocCwgYik7XG5cbiAgICAvLyBVcGRhdGUgU1ZHIHBhdGhcbiAgICBpZiAoaXNDZW50ZXIpIHtcbiAgICAgIGNvbnN0IGNlbnRlckJ3ID0gTWF0aC5tYXgodGhpcy5kaW1zUmVmLmJ3LCB0aGlzLmV4cGFuZGVkRGltc1JlZi5idywgcCk7XG4gICAgICB0aGlzLmN1cnJlbnRQYXRoID0gbW9ycGhQYXRoQ2VudGVyKHAsIGNlbnRlckJ3LCBoLCB0KTtcbiAgICAgIHRoaXMuc3ZnV2lkdGggPSBjZW50ZXJCdyArIDEwO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmN1cnJlbnRQYXRoID0gbW9ycGhQYXRoKHAsIGIsIGgsIHQpO1xuICAgICAgdGhpcy5zdmdXaWR0aCA9IE1hdGgubWF4KHAsIGIpICsgMTA7XG4gICAgfVxuICAgIHRoaXMuc3ZnSGVpZ2h0ID0gaCArIDEwO1xuXG4gICAgY29uc3Qgd3JhcHBlciA9IHRoaXMud3JhcHBlclJlZj8ubmF0aXZlRWxlbWVudDtcbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5jb250ZW50UmVmPy5uYXRpdmVFbGVtZW50O1xuXG4gICAgaWYgKHQgPj0gMSkge1xuICAgICAgLy8gRnVsbHkgZXhwYW5kZWQ6IGNsZWFyIGFsbCBjb25zdHJhaW50c1xuICAgICAgaWYgKHdyYXBwZXIpIHdyYXBwZXIuc3R5bGUud2lkdGggPSAnJztcbiAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQuc3R5bGUud2lkdGggPSAnJztcbiAgICAgICAgY29udGVudC5zdHlsZS5vdmVyZmxvdyA9ICcnO1xuICAgICAgICBjb250ZW50LnN0eWxlLm1heEhlaWdodCA9ICcnO1xuICAgICAgICBjb250ZW50LnN0eWxlLmNsaXBQYXRoID0gJyc7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0ID4gMCkge1xuICAgICAgLy8gTW9ycGhpbmc6IGxvY2sgY29udGVudCArIGNsaXBcbiAgICAgIGNvbnN0IHRhcmdldEJ3ID0gdGhpcy5kaW1zUmVmLmJ3O1xuICAgICAgY29uc3QgY3VycmVudFcgPSBwaWxsVyArIChiIC0gcGlsbFcpICogdDtcbiAgICAgIGNvbnN0IGN1cnJlbnRIID0gUEggKyAodGhpcy5kaW1zUmVmLnRoIC0gUEgpICogdDtcbiAgICAgIGNvbnN0IGNlbnRlckZ1bGxXID0gaXNDZW50ZXIgPyBNYXRoLm1heCh0aGlzLmRpbXNSZWYuYncsIHRoaXMuZXhwYW5kZWREaW1zUmVmLmJ3LCBwKSA6IDA7XG5cbiAgICAgIGlmICh3cmFwcGVyKSB3cmFwcGVyLnN0eWxlLndpZHRoID0gKGlzQ2VudGVyID8gY2VudGVyRnVsbFcgOiBjdXJyZW50VykgKyAncHgnO1xuICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgY29udGVudC5zdHlsZS53aWR0aCA9IChpc0NlbnRlciA/IGNlbnRlckZ1bGxXIDogdGFyZ2V0QncpICsgJ3B4JztcbiAgICAgICAgY29udGVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBjb250ZW50LnN0eWxlLm1heEhlaWdodCA9IGN1cnJlbnRIICsgJ3B4JztcbiAgICAgICAgaWYgKGlzQ2VudGVyKSB7XG4gICAgICAgICAgY29uc3QgY2xpcCA9IChjZW50ZXJGdWxsVyAtIGN1cnJlbnRXKSAvIDI7XG4gICAgICAgICAgY29udGVudC5zdHlsZS5jbGlwUGF0aCA9IGBpbnNldCgwICR7Y2xpcH1weCAwICR7Y2xpcH1weClgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGNsaXAgPSB0YXJnZXRCdyAtIGN1cnJlbnRXO1xuICAgICAgICAgIGNvbnRlbnQuc3R5bGUuY2xpcFBhdGggPSBpc1JpZ2h0XG4gICAgICAgICAgICA/IGBpbnNldCgwIDAgMCAke2NsaXB9cHgpYFxuICAgICAgICAgICAgOiBgaW5zZXQoMCAke2NsaXB9cHggMCAwKWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQ29tcGFjdDogY29uc3RyYWluIHRvIHBpbGwgZGltZW5zaW9uc1xuICAgICAgaWYgKHdyYXBwZXIpIHtcbiAgICAgICAgY29uc3QgY2VudGVyQncgPSBpc0NlbnRlciA/IE1hdGgubWF4KHRoaXMuZGltc1JlZi5idywgdGhpcy5leHBhbmRlZERpbXNSZWYuYncsIHApIDogcGlsbFc7XG4gICAgICAgIHdyYXBwZXIuc3R5bGUud2lkdGggPSBjZW50ZXJCdyArICdweCc7XG4gICAgICB9XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICBpZiAoaXNDZW50ZXIpIHtcbiAgICAgICAgICBjb25zdCBjZW50ZXJCd1ZhbCA9IE1hdGgubWF4KHRoaXMuZGltc1JlZi5idywgdGhpcy5leHBhbmRlZERpbXNSZWYuYncsIHApO1xuICAgICAgICAgIGNvbnRlbnQuc3R5bGUud2lkdGggPSBjZW50ZXJCd1ZhbCArICdweCc7XG4gICAgICAgICAgY29uc3QgY2xpcCA9IChjZW50ZXJCd1ZhbCAtIHBpbGxXKSAvIDI7XG4gICAgICAgICAgY29udGVudC5zdHlsZS5jbGlwUGF0aCA9IGBpbnNldCgwICR7Y2xpcH1weCAwICR7Y2xpcH1weClgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnRlbnQuc3R5bGUud2lkdGggPSAnJztcbiAgICAgICAgICBjb250ZW50LnN0eWxlLmNsaXBQYXRoID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY29udGVudC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgICBjb250ZW50LnN0eWxlLm1heEhlaWdodCA9IFBIICsgJ3B4JztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNkci5kZXRlY3RDaGFuZ2VzKCk7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0RXhwYW5kTW9ycGgoKTogdm9pZCB7XG4gICAgdGhpcy5tb3JwaEN0cmw/LnN0b3AoKTtcbiAgICBjb25zdCBzdGFydERpbXMgPSB7IC4uLnRoaXMuYURpbXMgfTtcbiAgICBjb25zdCB0YXJnZXREaW1zID0geyAuLi50aGlzLmRpbXNSZWYgfTtcblxuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc3ByaW5nXG4gICAgICA/IHsgdHlwZTogJ3NwcmluZycgYXMgY29uc3QsIHN0aWZmbmVzczogMjAwICsgdGhpcy5ib3VuY2UgKiA0MzcuNSwgZGFtcGluZzogMjQgLSB0aGlzLmJvdW5jZSAqIDIwLCBtYXNzOiAwLjcgfVxuICAgICAgOiB7IHR5cGU6ICdlYXNlJyBhcyBjb25zdCwgZHVyYXRpb246IDAuNiwgZWFzZTogU01PT1RIX0VBU0UgfTtcblxuICAgIHRoaXMubW9ycGhDdHJsID0gYW5pbWF0ZVZhbHVlKHRoaXMubW9ycGhULCAxLCBjb25maWcsICh0KSA9PiB7XG4gICAgICB0aGlzLm1vcnBoVCA9IHQ7XG4gICAgICB0aGlzLmFEaW1zID0ge1xuICAgICAgICBwdzogc3RhcnREaW1zLnB3ICsgKHRhcmdldERpbXMucHcgLSBzdGFydERpbXMucHcpICogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgdCkpLFxuICAgICAgICBidzogc3RhcnREaW1zLmJ3ICsgKHRhcmdldERpbXMuYncgLSBzdGFydERpbXMuYncpICogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgdCkpLFxuICAgICAgICB0aDogc3RhcnREaW1zLnRoICsgKHRhcmdldERpbXMudGggLSBzdGFydERpbXMudGgpICogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgdCkpLFxuICAgICAgfTtcbiAgICAgIHRoaXMuZmx1c2goKTtcbiAgICB9LCAoKSA9PiB7XG4gICAgICB0aGlzLm1vcnBoVCA9IDE7XG4gICAgICB0aGlzLmFEaW1zID0geyAuLi50YXJnZXREaW1zIH07XG4gICAgICB0aGlzLmZsdXNoKCk7XG5cbiAgICAgIC8vIFNxdWlzaCBvbiBleHBhbmQgc2V0dGxlXG4gICAgICBpZiAoIXRoaXMuaG92ZXJlZCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMudHJpZ2dlckxhbmRpbmdTcXVpc2goJ2V4cGFuZCcpLCA4MCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0YXJ0IGRpc21pc3MgdGltZXJcbiAgICAgIHRoaXMuc3RhcnREaXNtaXNzVGltZXIoKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhcnRDb2xsYXBzZU1vcnBoKCk6IHZvaWQge1xuICAgIHRoaXMubW9ycGhDdHJsPy5zdG9wKCk7XG4gICAgdGhpcy5waWxsUmVzaXplQ3RybD8uc3RvcCgpO1xuXG4gICAgaWYgKHRoaXMubW9ycGhUIDw9IDApIHtcbiAgICAgIHRoaXMuc2hvd0JvZHkgPSBmYWxzZTtcbiAgICAgIHRoaXMuY2RyLmRldGVjdENoYW5nZXMoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmV4cGFuZGVkRGltc1JlZiA9IHsgLi4udGhpcy5hRGltcyB9O1xuICAgIHRoaXMuY29sbGFwc2luZ1JlZiA9IHRydWU7XG5cbiAgICAvLyBDb21wdXRlIHRhcmdldCBjb21wYWN0IHBpbGxcbiAgICBjb25zdCBjb250ZW50ID0gdGhpcy5jb250ZW50UmVmPy5uYXRpdmVFbGVtZW50O1xuICAgIGNvbnN0IGhlYWRlciA9IHRoaXMuaGVhZGVyUmVmPy5uYXRpdmVFbGVtZW50O1xuICAgIGNvbnN0IHBhZFggPSBjb250ZW50ID8gcGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKGNvbnRlbnQpLnBhZGRpbmdMZWZ0KSArIHBhcnNlRmxvYXQoZ2V0Q29tcHV0ZWRTdHlsZShjb250ZW50KS5wYWRkaW5nUmlnaHQpIDogMjA7XG4gICAgY29uc3QgdGFyZ2V0UHcgPSBoZWFkZXIgPyBoZWFkZXIub2Zmc2V0V2lkdGggKyBwYWRYIDogdGhpcy5hRGltcy5wdztcbiAgICBjb25zdCB0YXJnZXREaW1zID0geyBwdzogdGFyZ2V0UHcsIGJ3OiB0YXJnZXRQdywgdGg6IFBIIH07XG4gICAgY29uc3Qgc2F2ZWREaW1zID0geyAuLi50aGlzLmFEaW1zIH07XG5cbiAgICBjb25zdCBjb25maWcgPSAodGhpcy5wcmVEaXNtaXNzUmVmIHx8ICF0aGlzLnNwcmluZylcbiAgICAgID8geyB0eXBlOiAnZWFzZScgYXMgY29uc3QsIGR1cmF0aW9uOiAwLjksIGVhc2U6IFNNT09USF9FQVNFIH1cbiAgICAgIDogeyB0eXBlOiAnc3ByaW5nJyBhcyBjb25zdCwgc3RpZmZuZXNzOiAyMDAgKyB0aGlzLmJvdW5jZSAqIDQzNy41LCBkYW1waW5nOiAyNCAtIHRoaXMuYm91bmNlICogMjAsIG1hc3M6IDAuNyAqICgwLjkgLyAwLjkpIH07XG5cbiAgICB0aGlzLnRyaWdnZXJMYW5kaW5nU3F1aXNoKCdjb2xsYXBzZScpO1xuXG4gICAgdGhpcy5tb3JwaEN0cmwgPSBhbmltYXRlVmFsdWUodGhpcy5tb3JwaFQsIDAsIGNvbmZpZywgKHQpID0+IHtcbiAgICAgIHRoaXMubW9ycGhUID0gdDtcbiAgICAgIHRoaXMuYURpbXMgPSB7XG4gICAgICAgIHB3OiB0YXJnZXREaW1zLnB3ICsgKHNhdmVkRGltcy5wdyAtIHRhcmdldERpbXMucHcpICogTWF0aC5tYXgoMCwgdCksXG4gICAgICAgIGJ3OiB0YXJnZXREaW1zLmJ3ICsgKHNhdmVkRGltcy5idyAtIHRhcmdldERpbXMuYncpICogTWF0aC5tYXgoMCwgdCksXG4gICAgICAgIHRoOiB0YXJnZXREaW1zLnRoICsgKHNhdmVkRGltcy50aCAtIHRhcmdldERpbXMudGgpICogTWF0aC5tYXgoMCwgdCksXG4gICAgICB9O1xuICAgICAgdGhpcy5mbHVzaCgpO1xuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMubW9ycGhUID0gMDtcbiAgICAgIHRoaXMuY29sbGFwc2luZ1JlZiA9IGZhbHNlO1xuICAgICAgdGhpcy5jb2xsYXBzZUVuZFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgdGhpcy5hRGltcyA9IHsgLi4udGFyZ2V0RGltcyB9O1xuICAgICAgdGhpcy5mbHVzaCgpO1xuICAgICAgdGhpcy5zaG93Qm9keSA9IGZhbHNlO1xuICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuXG4gICAgICAvLyBJZiBwcmUtZGlzbWlzcywgYWN0dWFsbHkgZGlzbWlzcyBhZnRlciBjb2xsYXBzZVxuICAgICAgaWYgKHRoaXMucHJlRGlzbWlzc1JlZikge1xuICAgICAgICB0aGlzLnByZURpc21pc3NSZWYgPSBmYWxzZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmRpc21pc3NlZC5lbWl0KCksIDIwMCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHRyaWdnZXJMYW5kaW5nU3F1aXNoKHBoYXNlOiAnZXhwYW5kJyB8ICdjb2xsYXBzZScgfCAnbW91bnQnID0gJ21vdW50Jyk6IHZvaWQge1xuICAgIGlmICghdGhpcy53cmFwcGVyUmVmPy5uYXRpdmVFbGVtZW50IHx8ICF0aGlzLnNwcmluZykgcmV0dXJuO1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgaWYgKG5vdyAtIHRoaXMubGFzdFNxdWlzaFRpbWUgPCAzMDApIHJldHVybjtcbiAgICB0aGlzLmxhc3RTcXVpc2hUaW1lID0gbm93O1xuXG4gICAgdGhpcy5ibG9iU3F1aXNoQ3RybD8uc3RvcCgpO1xuICAgIGNvbnN0IGVsID0gdGhpcy53cmFwcGVyUmVmLm5hdGl2ZUVsZW1lbnQ7XG5cbiAgICBjb25zdCBzcHJpbmdDb25maWcgPSBwaGFzZSA9PT0gJ2NvbGxhcHNlJ1xuICAgICAgPyBzcXVpc2hTcHJpbmdDb2xsYXBzZSh0aGlzLmJvdW5jZSlcbiAgICAgIDogc3F1aXNoU3ByaW5nRXhwYW5kKHRoaXMuYm91bmNlKTtcblxuICAgIGNvbnN0IGJTY2FsZSA9IHRoaXMuYm91bmNlIC8gMC40O1xuICAgIGNvbnN0IGNvbXByZXNzWSA9IChwaGFzZSA9PT0gJ2NvbGxhcHNlJyA/IDAuMDcgOiAwLjEyKSAqIGJTY2FsZTtcbiAgICBjb25zdCBleHBhbmRYID0gKHBoYXNlID09PSAnY29sbGFwc2UnID8gMC4wMzUgOiAwLjA2KSAqIGJTY2FsZTtcblxuICAgIHRoaXMuYmxvYlNxdWlzaEN0cmwgPSBhbmltYXRlVmFsdWUoMCwgMSwge1xuICAgICAgdHlwZTogJ3NwcmluZycsXG4gICAgICBzdGlmZm5lc3M6IHNwcmluZ0NvbmZpZy5zdGlmZm5lc3MsXG4gICAgICBkYW1waW5nOiBzcHJpbmdDb25maWcuZGFtcGluZyxcbiAgICAgIG1hc3M6IHNwcmluZ0NvbmZpZy5tYXNzLFxuICAgIH0sICh2KSA9PiB7XG4gICAgICBjb25zdCBpbnRlbnNpdHkgPSBNYXRoLnNpbih2ICogTWF0aC5QSSk7XG4gICAgICBjb25zdCBzeSA9IDEgLSBjb21wcmVzc1kgKiBpbnRlbnNpdHk7XG4gICAgICBjb25zdCBzeCA9IDEgKyBleHBhbmRYICogaW50ZW5zaXR5O1xuICAgICAgY29uc3QgbWlycm9yID0gdGhpcy5pc1JpZ2h0ID8gJ3NjYWxlWCgtMSkgJyA6ICcnO1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtT3JpZ2luID0gJ2NlbnRlciB0b3AnO1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gbWlycm9yICsgYHNjYWxlWCgke3N4fSkgc2NhbGVZKCR7c3l9KWA7XG4gICAgfSwgKCkgPT4ge1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gdGhpcy5pc1JpZ2h0ID8gJ3NjYWxlWCgtMSknIDogJyc7XG4gICAgICBlbC5zdHlsZS50cmFuc2Zvcm1PcmlnaW4gPSAnJztcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgdHJpZ2dlckVycm9yU2hha2UoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLndyYXBwZXJSZWY/Lm5hdGl2ZUVsZW1lbnQpIHJldHVybjtcbiAgICB0aGlzLnNoYWtlQ3RybD8uc3RvcCgpO1xuICAgIGNvbnN0IGVsID0gdGhpcy53cmFwcGVyUmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgY29uc3QgbWlycm9yID0gdGhpcy5pc1JpZ2h0ID8gJ3NjYWxlWCgtMSkgJyA6ICcnO1xuXG4gICAgdGhpcy5zaGFrZUN0cmwgPSBhbmltYXRlVmFsdWUoMCwgMSwge1xuICAgICAgdHlwZTogJ2Vhc2UnLFxuICAgICAgZHVyYXRpb246IDAuNCxcbiAgICAgIGVhc2U6IFswLCAwLCAwLjIsIDFdLFxuICAgIH0sICh2KSA9PiB7XG4gICAgICBjb25zdCBkZWNheSA9IDEgLSB2O1xuICAgICAgY29uc3Qgc2hha2UgPSBNYXRoLnNpbih2ICogTWF0aC5QSSAqIDYpICogZGVjYXkgKiAzO1xuICAgICAgZWwuc3R5bGUudHJhbnNmb3JtID0gbWlycm9yICsgYHRyYW5zbGF0ZVgoJHtzaGFrZX1weClgO1xuICAgIH0sICgpID0+IHtcbiAgICAgIGVsLnN0eWxlLnRyYW5zZm9ybSA9IG1pcnJvci50cmltKCkgfHwgJyc7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXJ0RGlzbWlzc1RpbWVyKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmhvdmVyZWQgfHwgdGhpcy5hY3Rpb25TdWNjZXNzIHx8IHRoaXMuZGlzbWlzc2luZykgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuZGlzbWlzc1RpbWVyKSBjbGVhclRpbWVvdXQodGhpcy5kaXNtaXNzVGltZXIpO1xuXG4gICAgY29uc3QgZGlzcGxheU1zID0gdGhpcy50aW1pbmc/LmRpc3BsYXlEdXJhdGlvbiA/PyBERUZBVUxUX0RJU1BMQVlfRFVSQVRJT047XG4gICAgY29uc3QgZXhwYW5kRGVsYXlNcyA9IDMzMDtcbiAgICBjb25zdCBjb2xsYXBzZU1zID0gOTAwO1xuICAgIGNvbnN0IGZ1bGxEZWxheSA9IGRpc3BsYXlNcyAtIGV4cGFuZERlbGF5TXMgLSBjb2xsYXBzZU1zO1xuICAgIGlmIChmdWxsRGVsYXkgPD0gMCkgcmV0dXJuO1xuXG4gICAgY29uc3QgZGVsYXkgPSB0aGlzLnJlbWFpbmluZ1RpbWUgPz8gZnVsbERlbGF5O1xuICAgIHRoaXMudGltZXJTdGFydCA9IERhdGUubm93KCk7XG5cbiAgICB0aGlzLmRpc21pc3NUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5yZW1haW5pbmdUaW1lID0gbnVsbDtcbiAgICAgIHRoaXMucHJlRGlzbWlzc1JlZiA9IHRydWU7XG4gICAgICB0aGlzLmRpc21pc3NpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuICAgICAgdGhpcy5zdGFydENvbGxhcHNlTW9ycGgoKTtcbiAgICB9LCBkZWxheSk7XG4gIH1cblxuICBwcml2YXRlIGdldEZ1bGxEZWxheSgpOiBudW1iZXIge1xuICAgIGNvbnN0IGRpc3BsYXlNcyA9IHRoaXMudGltaW5nPy5kaXNwbGF5RHVyYXRpb24gPz8gREVGQVVMVF9ESVNQTEFZX0RVUkFUSU9OO1xuICAgIHJldHVybiBkaXNwbGF5TXMgLSAzMzAgLSA5MDA7XG4gIH1cbn1cbiIsIjxkaXZcbiAgY2xhc3M9XCJnb2V5LXdyYXBwZXJcIlxuICAjd3JhcHBlckVsXG4gIFtjbGFzc109XCJjbGFzc05hbWVzPy53cmFwcGVyIHx8ICcnXCJcbiAgW3N0eWxlLnRyYW5zZm9ybV09XCJpc1JpZ2h0ID8gJ3NjYWxlWCgtMSknIDogJydcIlxuICAobW91c2VlbnRlcik9XCJvbk1vdXNlRW50ZXIoKVwiXG4gIChtb3VzZWxlYXZlKT1cIm9uTW91c2VMZWF2ZSgpXCJcbiAgKHRvdWNoc3RhcnQpPVwib25Ub3VjaFN0YXJ0KCRldmVudClcIlxuICAodG91Y2htb3ZlKT1cIm9uVG91Y2hNb3ZlKCRldmVudClcIlxuICAodG91Y2hlbmQpPVwib25Ub3VjaEVuZCgpXCJcbiAgKG1vdXNlZG93bik9XCJvbk1vdXNlRG93bigkZXZlbnQpXCJcbj5cbiAgPCEtLSBTVkcgYmxvYiBiYWNrZ3JvdW5kIC0tPlxuICA8c3ZnXG4gICAgY2xhc3M9XCJnb2V5LWJsb2JTdmdcIlxuICAgIFthdHRyLndpZHRoXT1cInN2Z1dpZHRoXCJcbiAgICBbYXR0ci5oZWlnaHRdPVwic3ZnSGVpZ2h0XCJcbiAgICBbc3R5bGUudHJhbnNmb3JtXT1cImlzUmlnaHQgPyAnc2NhbGVYKC0xKScgOiAnJ1wiXG4gID5cbiAgICA8cGF0aFxuICAgICAgI2Jsb2JQYXRoXG4gICAgICBbYXR0ci5kXT1cImN1cnJlbnRQYXRoXCJcbiAgICAgIFthdHRyLmZpbGxdPVwiZWZmZWN0aXZlRmlsbENvbG9yXCJcbiAgICAgIFthdHRyLnN0cm9rZV09XCJlZmZlY3RpdmVCb3JkZXJDb2xvclwiXG4gICAgICBbYXR0ci5zdHJva2Utd2lkdGhdPVwiZWZmZWN0aXZlQm9yZGVyV2lkdGhcIlxuICAgIC8+XG4gIDwvc3ZnPlxuXG4gIDwhLS0gQ29udGVudCBvbiB0b3Agb2YgU1ZHIC0tPlxuICA8ZGl2XG4gICAgI2NvbnRlbnRFbFxuICAgIGNsYXNzPVwiZ29leS1jb250ZW50XCJcbiAgICBbY2xhc3MuZ29leS1jb250ZW50Q29tcGFjdF09XCIhc2hvd0JvZHlcIlxuICAgIFtjbGFzcy5nb2V5LWNvbnRlbnRFeHBhbmRlZF09XCJzaG93Qm9keVwiXG4gICAgW2NsYXNzXT1cImNsYXNzTmFtZXM/LmNvbnRlbnQgfHwgJydcIlxuICAgIFtzdHlsZS50cmFuc2Zvcm1dPVwiaXNSaWdodCA/ICdzY2FsZVgoLTEpJyA6ICcnXCJcbiAgPlxuICAgIDwhLS0gSGVhZGVyOiBpY29uICsgdGl0bGUgLS0+XG4gICAgPGRpdiBjbGFzcz1cImdvZXktaGVhZGVyXCIgI2hlYWRlckVsIFtjbGFzc109XCJjbGFzc05hbWVzPy5oZWFkZXIgfHwgdGl0bGVDb2xvckNsYXNzXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiZ29leS1pY29uV3JhcHBlclwiIFtjbGFzc109XCJjbGFzc05hbWVzPy5pY29uIHx8ICcnXCI+XG4gICAgICAgIDwhLS0gRGVmYXVsdCBpY29uIC0tPlxuICAgICAgICA8bmctY29udGFpbmVyICpuZ0lmPVwiZWZmZWN0aXZlUGhhc2UgPT09ICdkZWZhdWx0J1wiPlxuICAgICAgICAgIDxnb2V5LWljb24tZGVmYXVsdCBbc2l6ZV09XCIxOFwiPjwvZ29leS1pY29uLWRlZmF1bHQ+XG4gICAgICAgIDwvbmctY29udGFpbmVyPlxuICAgICAgICA8IS0tIFN1Y2Nlc3MgaWNvbiAtLT5cbiAgICAgICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cImVmZmVjdGl2ZVBoYXNlID09PSAnc3VjY2VzcydcIj5cbiAgICAgICAgICA8Z29leS1pY29uLXN1Y2Nlc3MgW3NpemVdPVwiMThcIj48L2dvZXktaWNvbi1zdWNjZXNzPlxuICAgICAgICA8L25nLWNvbnRhaW5lcj5cbiAgICAgICAgPCEtLSBFcnJvciBpY29uIC0tPlxuICAgICAgICA8bmctY29udGFpbmVyICpuZ0lmPVwiZWZmZWN0aXZlUGhhc2UgPT09ICdlcnJvcidcIj5cbiAgICAgICAgICA8Z29leS1pY29uLWVycm9yIFtzaXplXT1cIjE4XCI+PC9nb2V5LWljb24tZXJyb3I+XG4gICAgICAgIDwvbmctY29udGFpbmVyPlxuICAgICAgICA8IS0tIFdhcm5pbmcgaWNvbiAtLT5cbiAgICAgICAgPG5nLWNvbnRhaW5lciAqbmdJZj1cImVmZmVjdGl2ZVBoYXNlID09PSAnd2FybmluZydcIj5cbiAgICAgICAgICA8Z29leS1pY29uLXdhcm5pbmcgW3NpemVdPVwiMThcIj48L2dvZXktaWNvbi13YXJuaW5nPlxuICAgICAgICA8L25nLWNvbnRhaW5lcj5cbiAgICAgICAgPCEtLSBJbmZvIGljb24gLS0+XG4gICAgICAgIDxuZy1jb250YWluZXIgKm5nSWY9XCJlZmZlY3RpdmVQaGFzZSA9PT0gJ2luZm8nXCI+XG4gICAgICAgICAgPGdvZXktaWNvbi1pbmZvIFtzaXplXT1cIjE4XCI+PC9nb2V5LWljb24taW5mbz5cbiAgICAgICAgPC9uZy1jb250YWluZXI+XG4gICAgICAgIDwhLS0gTG9hZGluZyBzcGlubmVyIC0tPlxuICAgICAgICA8bmctY29udGFpbmVyICpuZ0lmPVwiZWZmZWN0aXZlUGhhc2UgPT09ICdsb2FkaW5nJ1wiPlxuICAgICAgICAgIDxnb2V5LWljb24tc3Bpbm5lciBbc2l6ZV09XCIxOFwiPjwvZ29leS1pY29uLXNwaW5uZXI+XG4gICAgICAgIDwvbmctY29udGFpbmVyPlxuICAgICAgPC9kaXY+XG4gICAgICA8c3BhbiBjbGFzcz1cImdvZXktdGl0bGVcIj57eyBlZmZlY3RpdmVUaXRsZSB9fTwvc3Bhbj5cbiAgICAgIDxidXR0b24gKm5nSWY9XCJzaG93Q2xvc2UgJiYgIWFjdGlvblN1Y2Nlc3NcIiAoY2xpY2spPVwib25DbG9zZUNsaWNrKCRldmVudClcIiBjbGFzcz1cImdvZXktY2xvc2UtYnRuXCIgYXJpYS1sYWJlbD1cIkNsb3NlXCI+XG4gICAgICAgIDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiMTRcIiBoZWlnaHQ9XCIxNFwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cGF0aCBkPVwiTTE4IDZMNiAxOE02IDZsMTIgMTJcIi8+PC9zdmc+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L2Rpdj5cblxuICAgIDwhLS0gRGVzY3JpcHRpb24gKHZpc2libGUgd2hlbiBleHBhbmRlZCkgLS0+XG4gICAgPGRpdlxuICAgICAgKm5nSWY9XCJzaG93Qm9keSAmJiBlZmZlY3RpdmVEZXNjcmlwdGlvblwiXG4gICAgICBjbGFzcz1cImdvZXktZGVzY3JpcHRpb25cIlxuICAgICAgW2NsYXNzXT1cImNsYXNzTmFtZXM/LmRlc2NyaXB0aW9uIHx8ICcnXCJcbiAgICA+XG4gICAgICB7eyBlZmZlY3RpdmVEZXNjcmlwdGlvbiB9fVxuICAgIDwvZGl2PlxuXG4gICAgPCEtLSBBY3Rpb24gYnV0dG9uICh2aXNpYmxlIHdoZW4gZXhwYW5kZWQpIC0tPlxuICAgIDxkaXZcbiAgICAgICpuZ0lmPVwic2hvd0JvZHkgJiYgZWZmZWN0aXZlQWN0aW9uXCJcbiAgICAgIGNsYXNzPVwiZ29leS1hY3Rpb25XcmFwcGVyXCJcbiAgICAgIFtjbGFzc109XCJjbGFzc05hbWVzPy5hY3Rpb25XcmFwcGVyIHx8ICcnXCJcbiAgICA+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIGNsYXNzPVwiZ29leS1hY3Rpb25CdXR0b25cIlxuICAgICAgICBbY2xhc3NdPVwiYWN0aW9uQ29sb3JDbGFzc1wiXG4gICAgICAgIFtjbGFzcy5nb2V5LWFjdGlvbkJ1dHRvbl09XCJ0cnVlXCJcbiAgICAgICAgKGNsaWNrKT1cIm9uQWN0aW9uQ2xpY2soKVwiXG4gICAgICA+XG4gICAgICAgIHt7IGVmZmVjdGl2ZUFjdGlvbi5sYWJlbCB9fVxuICAgICAgPC9idXR0b24+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuPC9kaXY+XG4iXX0=