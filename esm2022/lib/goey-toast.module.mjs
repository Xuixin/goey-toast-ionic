import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoeyToastComponent } from './goey-toast.component';
import { GoeyToasterComponent } from './goey-toaster.component';
import { GoeyIconDefaultComponent, GoeyIconSuccessComponent, GoeyIconErrorComponent, GoeyIconWarningComponent, GoeyIconInfoComponent, GoeyIconSpinnerComponent, } from './icons';
import * as i0 from "@angular/core";
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
export class GoeyToastModule {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29leS10b2FzdC5tb2R1bGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9nb2V5LXRvYXN0LWlvbmljL3NyYy9saWIvZ29leS10b2FzdC5tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUNMLHdCQUF3QixFQUN4Qix3QkFBd0IsRUFDeEIsc0JBQXNCLEVBQ3RCLHdCQUF3QixFQUN4QixxQkFBcUIsRUFDckIsd0JBQXdCLEdBQ3pCLE1BQU0sU0FBUyxDQUFDOztBQUVqQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBa0JILE1BQU0sT0FBTyxlQUFlO3dHQUFmLGVBQWU7eUdBQWYsZUFBZSxZQWZ4QixZQUFZO1lBQ1osa0JBQWtCO1lBQ2xCLG9CQUFvQjtZQUNwQix3QkFBd0I7WUFDeEIsd0JBQXdCO1lBQ3hCLHNCQUFzQjtZQUN0Qix3QkFBd0I7WUFDeEIscUJBQXFCO1lBQ3JCLHdCQUF3QixhQUd4QixvQkFBb0I7WUFDcEIsa0JBQWtCO3lHQUdULGVBQWUsWUFmeEIsWUFBWTtZQUNaLGtCQUFrQjtZQUNsQixvQkFBb0I7OzRGQWFYLGVBQWU7a0JBakIzQixRQUFRO21CQUFDO29CQUNSLE9BQU8sRUFBRTt3QkFDUCxZQUFZO3dCQUNaLGtCQUFrQjt3QkFDbEIsb0JBQW9CO3dCQUNwQix3QkFBd0I7d0JBQ3hCLHdCQUF3Qjt3QkFDeEIsc0JBQXNCO3dCQUN0Qix3QkFBd0I7d0JBQ3hCLHFCQUFxQjt3QkFDckIsd0JBQXdCO3FCQUN6QjtvQkFDRCxPQUFPLEVBQUU7d0JBQ1Asb0JBQW9CO3dCQUNwQixrQkFBa0I7cUJBQ25CO2lCQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvbW1vbk1vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbic7XG5pbXBvcnQgeyBHb2V5VG9hc3RDb21wb25lbnQgfSBmcm9tICcuL2dvZXktdG9hc3QuY29tcG9uZW50JztcbmltcG9ydCB7IEdvZXlUb2FzdGVyQ29tcG9uZW50IH0gZnJvbSAnLi9nb2V5LXRvYXN0ZXIuY29tcG9uZW50JztcbmltcG9ydCB7XG4gIEdvZXlJY29uRGVmYXVsdENvbXBvbmVudCxcbiAgR29leUljb25TdWNjZXNzQ29tcG9uZW50LFxuICBHb2V5SWNvbkVycm9yQ29tcG9uZW50LFxuICBHb2V5SWNvbldhcm5pbmdDb21wb25lbnQsXG4gIEdvZXlJY29uSW5mb0NvbXBvbmVudCxcbiAgR29leUljb25TcGlubmVyQ29tcG9uZW50LFxufSBmcm9tICcuL2ljb25zJztcblxuLyoqXG4gKiBHb2V5VG9hc3RNb2R1bGUg4oCUIGltcG9ydCB0aGlzIG1vZHVsZSBpbiB5b3VyIEFwcE1vZHVsZSBvciBmZWF0dXJlIG1vZHVsZS5cbiAqXG4gKiBVc2FnZTpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBHb2V5VG9hc3RNb2R1bGUgfSBmcm9tICdnb2V5LXRvYXN0LWlvbmljJztcbiAqXG4gKiBATmdNb2R1bGUoeyBpbXBvcnRzOiBbR29leVRvYXN0TW9kdWxlXSB9KVxuICogZXhwb3J0IGNsYXNzIEFwcE1vZHVsZSB7fVxuICogYGBgXG4gKlxuICogVGhlbiBpbiB5b3VyIHRlbXBsYXRlOlxuICogYGBgaHRtbFxuICogPGdvZXktdG9hc3RlciBwb3NpdGlvbj1cImJvdHRvbS1yaWdodFwiIHRoZW1lPVwibGlnaHRcIj48L2dvZXktdG9hc3Rlcj5cbiAqIGBgYFxuICpcbiAqIEFuZCBpbiB5b3VyIGNvbXBvbmVudDpcbiAqIGBgYHRzXG4gKiBjb25zdHJ1Y3Rvcihwcml2YXRlIHRvYXN0OiBHb2V5VG9hc3RTZXJ2aWNlKSB7fVxuICogc2hvd1RvYXN0KCkgeyB0aGlzLnRvYXN0LnN1Y2Nlc3MoJ1NhdmVkIScpOyB9XG4gKiBgYGBcbiAqL1xuQE5nTW9kdWxlKHtcbiAgaW1wb3J0czogW1xuICAgIENvbW1vbk1vZHVsZSxcbiAgICBHb2V5VG9hc3RDb21wb25lbnQsXG4gICAgR29leVRvYXN0ZXJDb21wb25lbnQsXG4gICAgR29leUljb25EZWZhdWx0Q29tcG9uZW50LFxuICAgIEdvZXlJY29uU3VjY2Vzc0NvbXBvbmVudCxcbiAgICBHb2V5SWNvbkVycm9yQ29tcG9uZW50LFxuICAgIEdvZXlJY29uV2FybmluZ0NvbXBvbmVudCxcbiAgICBHb2V5SWNvbkluZm9Db21wb25lbnQsXG4gICAgR29leUljb25TcGlubmVyQ29tcG9uZW50LFxuICBdLFxuICBleHBvcnRzOiBbXG4gICAgR29leVRvYXN0ZXJDb21wb25lbnQsXG4gICAgR29leVRvYXN0Q29tcG9uZW50LFxuICBdLFxufSlcbmV4cG9ydCBjbGFzcyBHb2V5VG9hc3RNb2R1bGUge31cbiJdfQ==