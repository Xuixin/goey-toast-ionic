import { Component, Input, HostBinding, ChangeDetectionStrategy, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoeyToastComponent } from './goey-toast.component';
import * as i0 from "@angular/core";
import * as i1 from "./goey-toast.service";
import * as i2 from "@angular/common";
export class GoeyToasterComponent {
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
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToasterComponent, deps: [{ token: i1.GoeyToastService }, { token: i0.ChangeDetectorRef }], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "18.2.14", type: GoeyToasterComponent, isStandalone: true, selector: "goey-toaster", inputs: { position: "position", duration: "duration", gap: "gap", offset: "offset", showClose: "showClose", spring: "spring", bounce: "bounce", maxVisible: "maxVisible" }, host: { properties: { "class": "this.positionClass", "style.padding": "this.offsetStyle" } }, ngImport: i0, template: "<div class=\"goey-toaster-container\">\n  <div\n    *ngFor=\"let toast of toasts; trackBy: trackById\"\n    class=\"goey-toast-item goey-toast-entering\"\n    [class.goey-toast-leaving]=\"toast.dismissing\"\n    [style.marginBottom.px]=\"gap\"\n  >\n    <goey-toast\n      [title]=\"toast.title\"\n      [description]=\"toast.description\"\n      [type]=\"toast.type\"\n      [phase]=\"toast.phase\"\n      [action]=\"toast.action\"\n      [icon]=\"toast.icon\"\n      [classNames]=\"toast.classNames\"\n      [fillColor]=\"toast.fillColor || defaultFillColor\"\n      [borderColor]=\"toast.borderColor || defaultBorderColor\"\n      [borderWidth]=\"toast.borderWidth\"\n      [timing]=\"toast.timing\"\n      [duration]=\"toast.duration\"\n      [showClose]=\"toast.showClose !== undefined ? toast.showClose : showClose\"\n      [spring]=\"toast.spring !== undefined ? toast.spring : spring\"\n      [bounce]=\"toast.bounce !== undefined ? toast.bounce : bounce\"\n      [toastId]=\"toast.id\"\n      [position]=\"position\"\n      (dismissed)=\"onToastDismissed(toast.id)\"\n      (actionClicked)=\"onActionClicked(toast)\"\n    ></goey-toast>\n  </div>\n</div>\n", styles: [":host{position:fixed;z-index:99999;pointer-events:none;display:flex;flex-direction:column}:host(.goey-bottom-right){bottom:0;right:0;align-items:flex-end}:host(.goey-bottom-left){bottom:0;left:0;align-items:flex-start}:host(.goey-bottom-center){bottom:0;left:50%;transform:translate(-50%);align-items:center}:host(.goey-top-right){top:0;right:0;align-items:flex-end;flex-direction:column-reverse}:host(.goey-top-left){top:0;left:0;align-items:flex-start;flex-direction:column-reverse}:host(.goey-top-center){top:0;left:50%;transform:translate(-50%);align-items:center;flex-direction:column-reverse}.goey-toaster-container{display:flex;flex-direction:column;pointer-events:none}.goey-toast-item{pointer-events:auto;transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s cubic-bezier(.4,0,.2,1)}.goey-toast-entering{animation:goey-toast-enter .4s cubic-bezier(.21,1.11,.81,.99)}@keyframes goey-toast-enter{0%{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}.goey-toast-leaving{animation:goey-toast-leave .3s cubic-bezier(.4,0,1,1) forwards}@keyframes goey-toast-leave{0%{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-10px) scale(.95)}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i2.NgForOf, selector: "[ngFor][ngForOf]", inputs: ["ngForOf", "ngForTrackBy", "ngForTemplate"] }, { kind: "component", type: GoeyToastComponent, selector: "goey-toast", inputs: ["title", "description", "type", "phase", "action", "icon", "classNames", "fillColor", "borderColor", "borderWidth", "timing", "duration", "spring", "bounce", "toastId", "position", "showClose"], outputs: ["dismissed", "actionClicked"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "18.2.14", ngImport: i0, type: GoeyToasterComponent, decorators: [{
            type: Component,
            args: [{ selector: 'goey-toaster', standalone: true, imports: [CommonModule, GoeyToastComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: "<div class=\"goey-toaster-container\">\n  <div\n    *ngFor=\"let toast of toasts; trackBy: trackById\"\n    class=\"goey-toast-item goey-toast-entering\"\n    [class.goey-toast-leaving]=\"toast.dismissing\"\n    [style.marginBottom.px]=\"gap\"\n  >\n    <goey-toast\n      [title]=\"toast.title\"\n      [description]=\"toast.description\"\n      [type]=\"toast.type\"\n      [phase]=\"toast.phase\"\n      [action]=\"toast.action\"\n      [icon]=\"toast.icon\"\n      [classNames]=\"toast.classNames\"\n      [fillColor]=\"toast.fillColor || defaultFillColor\"\n      [borderColor]=\"toast.borderColor || defaultBorderColor\"\n      [borderWidth]=\"toast.borderWidth\"\n      [timing]=\"toast.timing\"\n      [duration]=\"toast.duration\"\n      [showClose]=\"toast.showClose !== undefined ? toast.showClose : showClose\"\n      [spring]=\"toast.spring !== undefined ? toast.spring : spring\"\n      [bounce]=\"toast.bounce !== undefined ? toast.bounce : bounce\"\n      [toastId]=\"toast.id\"\n      [position]=\"position\"\n      (dismissed)=\"onToastDismissed(toast.id)\"\n      (actionClicked)=\"onActionClicked(toast)\"\n    ></goey-toast>\n  </div>\n</div>\n", styles: [":host{position:fixed;z-index:99999;pointer-events:none;display:flex;flex-direction:column}:host(.goey-bottom-right){bottom:0;right:0;align-items:flex-end}:host(.goey-bottom-left){bottom:0;left:0;align-items:flex-start}:host(.goey-bottom-center){bottom:0;left:50%;transform:translate(-50%);align-items:center}:host(.goey-top-right){top:0;right:0;align-items:flex-end;flex-direction:column-reverse}:host(.goey-top-left){top:0;left:0;align-items:flex-start;flex-direction:column-reverse}:host(.goey-top-center){top:0;left:50%;transform:translate(-50%);align-items:center;flex-direction:column-reverse}.goey-toaster-container{display:flex;flex-direction:column;pointer-events:none}.goey-toast-item{pointer-events:auto;transition:transform .3s cubic-bezier(.4,0,.2,1),opacity .3s cubic-bezier(.4,0,.2,1)}.goey-toast-entering{animation:goey-toast-enter .4s cubic-bezier(.21,1.11,.81,.99)}@keyframes goey-toast-enter{0%{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}.goey-toast-leaving{animation:goey-toast-leave .3s cubic-bezier(.4,0,1,1) forwards}@keyframes goey-toast-leave{0%{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-10px) scale(.95)}}\n"] }]
        }], ctorParameters: () => [{ type: i1.GoeyToastService }, { type: i0.ChangeDetectorRef }], propDecorators: { position: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29leS10b2FzdGVyLmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2dvZXktdG9hc3QtaW9uaWMvc3JjL2xpYi9nb2V5LXRvYXN0ZXIuY29tcG9uZW50LnRzIiwiLi4vLi4vLi4vLi4vcHJvamVjdHMvZ29leS10b2FzdC1pb25pYy9zcmMvbGliL2dvZXktdG9hc3Rlci5jb21wb25lbnQuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUFFLEtBQUssRUFBcUIsV0FBVyxFQUM3Qix1QkFBdUIsR0FDM0MsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDOzs7O0FBVzVELE1BQU0sT0FBTyxvQkFBb0I7SUFrQ3JCO0lBQ0E7SUFsQ0QsUUFBUSxHQUFzQixjQUFjLENBQUM7SUFDN0MsUUFBUSxDQUFVO0lBQ2xCLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDVCxNQUFNLEdBQW9CLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0lBRWxCLE1BQU0sR0FBRyxJQUFJLENBQUM7SUFDZCxNQUFNLEdBQUcsR0FBRyxDQUFDO0lBQ2IsVUFBVSxHQUFHLENBQUMsQ0FBQztJQUV4QixNQUFNLEdBQW9CLEVBQUUsQ0FBQztJQUNyQixHQUFHLENBQWdCO0lBRTNCLElBQ0ksYUFBYTtRQUNmLE9BQU8sUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDakMsQ0FBQztJQUVELElBQ0ksV0FBVztRQUNiLE1BQU0sR0FBRyxHQUFHLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQy9FLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ2xCLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNwQixPQUFPLGtCQUFrQixDQUFDO0lBQzVCLENBQUM7SUFFRCxZQUNVLFlBQThCLEVBQzlCLEdBQXNCO1FBRHRCLGlCQUFZLEdBQVosWUFBWSxDQUFrQjtRQUM5QixRQUFHLEdBQUgsR0FBRyxDQUFtQjtJQUM3QixDQUFDO0lBRUosUUFBUTtRQUNOLHlCQUF5QjtRQUN6QixJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQztZQUMxQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUF1QixFQUFFLEVBQUU7WUFDeEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7WUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsU0FBUyxDQUFDLE1BQWMsRUFBRSxLQUFvQjtRQUM1QyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELGdCQUFnQixDQUFDLEVBQW1CO1FBQ2xDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxlQUFlLENBQUMsS0FBb0I7UUFDbEMsd0RBQXdEO0lBQzFELENBQUM7d0dBdkVVLG9CQUFvQjs0RkFBcEIsb0JBQW9CLGtWQ2xCakMsK29DQThCQSw0dkNEakJZLFlBQVksNEpBQUUsa0JBQWtCOzs0RkFLL0Isb0JBQW9CO2tCQVJoQyxTQUFTOytCQUNFLGNBQWMsY0FDWixJQUFJLFdBQ1AsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLENBQUMsbUJBRzFCLHVCQUF1QixDQUFDLE1BQU07cUhBR3RDLFFBQVE7c0JBQWhCLEtBQUs7Z0JBQ0csUUFBUTtzQkFBaEIsS0FBSztnQkFDRyxHQUFHO3NCQUFYLEtBQUs7Z0JBQ0csTUFBTTtzQkFBZCxLQUFLO2dCQUNHLFNBQVM7c0JBQWpCLEtBQUs7Z0JBRUcsTUFBTTtzQkFBZCxLQUFLO2dCQUNHLE1BQU07c0JBQWQsS0FBSztnQkFDRyxVQUFVO3NCQUFsQixLQUFLO2dCQU1GLGFBQWE7c0JBRGhCLFdBQVc7dUJBQUMsT0FBTztnQkFNaEIsV0FBVztzQkFEZCxXQUFXO3VCQUFDLGVBQWUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb25lbnQsIElucHV0LCBPbkluaXQsIE9uRGVzdHJveSwgSG9zdEJpbmRpbmcsXG4gIENoYW5nZURldGVjdG9yUmVmLCBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb21tb25Nb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHsgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBHb2V5VG9hc3RTZXJ2aWNlIH0gZnJvbSAnLi9nb2V5LXRvYXN0LnNlcnZpY2UnO1xuaW1wb3J0IHsgR29leVRvYXN0Q29tcG9uZW50IH0gZnJvbSAnLi9nb2V5LXRvYXN0LmNvbXBvbmVudCc7XG5pbXBvcnQgeyBHb2V5VG9hc3REYXRhLCBHb2V5VG9hc3RQb3NpdGlvbiB9IGZyb20gJy4vZ29leS10b2FzdC50eXBlcyc7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ2dvZXktdG9hc3RlcicsXG4gIHN0YW5kYWxvbmU6IHRydWUsXG4gIGltcG9ydHM6IFtDb21tb25Nb2R1bGUsIEdvZXlUb2FzdENvbXBvbmVudF0sXG4gIHRlbXBsYXRlVXJsOiAnLi9nb2V5LXRvYXN0ZXIuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9nb2V5LXRvYXN0ZXIuY29tcG9uZW50LmNzcyddLFxuICBjaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaCxcbn0pXG5leHBvcnQgY2xhc3MgR29leVRvYXN0ZXJDb21wb25lbnQgaW1wbGVtZW50cyBPbkluaXQsIE9uRGVzdHJveSB7XG4gIEBJbnB1dCgpIHBvc2l0aW9uOiBHb2V5VG9hc3RQb3NpdGlvbiA9ICdib3R0b20tcmlnaHQnO1xuICBASW5wdXQoKSBkdXJhdGlvbj86IG51bWJlcjtcbiAgQElucHV0KCkgZ2FwID0gMTQ7XG4gIEBJbnB1dCgpIG9mZnNldDogbnVtYmVyIHwgc3RyaW5nID0gJzI0cHgnO1xuICBASW5wdXQoKSBzaG93Q2xvc2UgPSBmYWxzZTtcblxuICBASW5wdXQoKSBzcHJpbmcgPSB0cnVlO1xuICBASW5wdXQoKSBib3VuY2UgPSAwLjQ7XG4gIEBJbnB1dCgpIG1heFZpc2libGUgPSA1O1xuXG4gIHRvYXN0czogR29leVRvYXN0RGF0YVtdID0gW107XG4gIHByaXZhdGUgc3ViPzogU3Vic2NyaXB0aW9uO1xuXG4gIEBIb3N0QmluZGluZygnY2xhc3MnKVxuICBnZXQgcG9zaXRpb25DbGFzcygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgZ29leS0ke3RoaXMucG9zaXRpb259YDtcbiAgfVxuXG4gIEBIb3N0QmluZGluZygnc3R5bGUucGFkZGluZycpXG4gIGdldCBvZmZzZXRTdHlsZSgpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbCA9IHR5cGVvZiB0aGlzLm9mZnNldCA9PT0gJ251bWJlcicgPyBgJHt0aGlzLm9mZnNldH1weGAgOiB0aGlzLm9mZnNldDtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgZ2V0IGRlZmF1bHRGaWxsQ29sb3IoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJyNmZmZmZmYnO1xuICB9XG5cbiAgZ2V0IGRlZmF1bHRCb3JkZXJDb2xvcigpOiBzdHJpbmcge1xuICAgIHJldHVybiAncmdiYSgwLDAsMCwwLjA4KSc7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHRvYXN0U2VydmljZTogR29leVRvYXN0U2VydmljZSxcbiAgICBwcml2YXRlIGNkcjogQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gICkge31cblxuICBuZ09uSW5pdCgpOiB2b2lkIHtcbiAgICAvLyBQdXNoIGNvbmZpZyB0byBzZXJ2aWNlXG4gICAgdGhpcy50b2FzdFNlcnZpY2Uuc2V0Q29uZmlnKHtcbiAgICAgIHBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uLFxuICAgICAgZHVyYXRpb246IHRoaXMuZHVyYXRpb24sXG4gICAgICBnYXA6IHRoaXMuZ2FwLFxuICAgICAgb2Zmc2V0OiB0aGlzLm9mZnNldCxcbiAgICAgIHNob3dDbG9zZTogdGhpcy5zaG93Q2xvc2UsXG4gICAgICBzcHJpbmc6IHRoaXMuc3ByaW5nLFxuICAgICAgYm91bmNlOiB0aGlzLmJvdW5jZSxcbiAgICAgIG1heFZpc2libGU6IHRoaXMubWF4VmlzaWJsZSxcbiAgICB9KTtcblxuICAgIHRoaXMuc3ViID0gdGhpcy50b2FzdFNlcnZpY2UudG9hc3RzLnN1YnNjcmliZSgodG9hc3RzOiBHb2V5VG9hc3REYXRhW10pID0+IHtcbiAgICAgIHRoaXMudG9hc3RzID0gdG9hc3RzO1xuICAgICAgdGhpcy5jZHIuZGV0ZWN0Q2hhbmdlcygpO1xuICAgIH0pO1xuICB9XG5cbiAgbmdPbkRlc3Ryb3koKTogdm9pZCB7XG4gICAgdGhpcy5zdWI/LnVuc3Vic2NyaWJlKCk7XG4gIH1cblxuICB0cmFja0J5SWQoX2luZGV4OiBudW1iZXIsIHRvYXN0OiBHb2V5VG9hc3REYXRhKTogc3RyaW5nIHwgbnVtYmVyIHtcbiAgICByZXR1cm4gdG9hc3QuaWQ7XG4gIH1cblxuICBvblRvYXN0RGlzbWlzc2VkKGlkOiBzdHJpbmcgfCBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLnRvYXN0U2VydmljZS5kaXNtaXNzKGlkKTtcbiAgfVxuXG4gIG9uQWN0aW9uQ2xpY2tlZCh0b2FzdDogR29leVRvYXN0RGF0YSk6IHZvaWQge1xuICAgIC8vIEFjdGlvbiBoYW5kbGluZyBpcyBkb25lIGluIHRoZSB0b2FzdCBjb21wb25lbnQgaXRzZWxmXG4gIH1cbn1cbiIsIjxkaXYgY2xhc3M9XCJnb2V5LXRvYXN0ZXItY29udGFpbmVyXCI+XG4gIDxkaXZcbiAgICAqbmdGb3I9XCJsZXQgdG9hc3Qgb2YgdG9hc3RzOyB0cmFja0J5OiB0cmFja0J5SWRcIlxuICAgIGNsYXNzPVwiZ29leS10b2FzdC1pdGVtIGdvZXktdG9hc3QtZW50ZXJpbmdcIlxuICAgIFtjbGFzcy5nb2V5LXRvYXN0LWxlYXZpbmddPVwidG9hc3QuZGlzbWlzc2luZ1wiXG4gICAgW3N0eWxlLm1hcmdpbkJvdHRvbS5weF09XCJnYXBcIlxuICA+XG4gICAgPGdvZXktdG9hc3RcbiAgICAgIFt0aXRsZV09XCJ0b2FzdC50aXRsZVwiXG4gICAgICBbZGVzY3JpcHRpb25dPVwidG9hc3QuZGVzY3JpcHRpb25cIlxuICAgICAgW3R5cGVdPVwidG9hc3QudHlwZVwiXG4gICAgICBbcGhhc2VdPVwidG9hc3QucGhhc2VcIlxuICAgICAgW2FjdGlvbl09XCJ0b2FzdC5hY3Rpb25cIlxuICAgICAgW2ljb25dPVwidG9hc3QuaWNvblwiXG4gICAgICBbY2xhc3NOYW1lc109XCJ0b2FzdC5jbGFzc05hbWVzXCJcbiAgICAgIFtmaWxsQ29sb3JdPVwidG9hc3QuZmlsbENvbG9yIHx8IGRlZmF1bHRGaWxsQ29sb3JcIlxuICAgICAgW2JvcmRlckNvbG9yXT1cInRvYXN0LmJvcmRlckNvbG9yIHx8IGRlZmF1bHRCb3JkZXJDb2xvclwiXG4gICAgICBbYm9yZGVyV2lkdGhdPVwidG9hc3QuYm9yZGVyV2lkdGhcIlxuICAgICAgW3RpbWluZ109XCJ0b2FzdC50aW1pbmdcIlxuICAgICAgW2R1cmF0aW9uXT1cInRvYXN0LmR1cmF0aW9uXCJcbiAgICAgIFtzaG93Q2xvc2VdPVwidG9hc3Quc2hvd0Nsb3NlICE9PSB1bmRlZmluZWQgPyB0b2FzdC5zaG93Q2xvc2UgOiBzaG93Q2xvc2VcIlxuICAgICAgW3NwcmluZ109XCJ0b2FzdC5zcHJpbmcgIT09IHVuZGVmaW5lZCA/IHRvYXN0LnNwcmluZyA6IHNwcmluZ1wiXG4gICAgICBbYm91bmNlXT1cInRvYXN0LmJvdW5jZSAhPT0gdW5kZWZpbmVkID8gdG9hc3QuYm91bmNlIDogYm91bmNlXCJcbiAgICAgIFt0b2FzdElkXT1cInRvYXN0LmlkXCJcbiAgICAgIFtwb3NpdGlvbl09XCJwb3NpdGlvblwiXG4gICAgICAoZGlzbWlzc2VkKT1cIm9uVG9hc3REaXNtaXNzZWQodG9hc3QuaWQpXCJcbiAgICAgIChhY3Rpb25DbGlja2VkKT1cIm9uQWN0aW9uQ2xpY2tlZCh0b2FzdClcIlxuICAgID48L2dvZXktdG9hc3Q+XG4gIDwvZGl2PlxuPC9kaXY+XG4iXX0=