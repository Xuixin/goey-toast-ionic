import * as i0 from "@angular/core";
import * as i1 from "@angular/common";
import * as i2 from "./goey-toast.component";
import * as i3 from "./goey-toaster.component";
import * as i4 from "./icons/goey-icons.component";
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
export declare class GoeyToastModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<GoeyToastModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<GoeyToastModule, never, [typeof i1.CommonModule, typeof i2.GoeyToastComponent, typeof i3.GoeyToasterComponent, typeof i4.GoeyIconDefaultComponent, typeof i4.GoeyIconSuccessComponent, typeof i4.GoeyIconErrorComponent, typeof i4.GoeyIconWarningComponent, typeof i4.GoeyIconInfoComponent, typeof i4.GoeyIconSpinnerComponent], [typeof i3.GoeyToasterComponent, typeof i2.GoeyToastComponent]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<GoeyToastModule>;
}
