import { GoeyToastData, GoeyToastOptions, GoeyPromiseData, GoeyToasterConfig } from './goey-toast.types';
import * as i0 from "@angular/core";
export declare class GoeyToastService {
    private toasts$;
    private _config;
    /** Observable of current toast stack */
    get toasts(): import("rxjs").Observable<GoeyToastData[]>;
    /** Current toast list snapshot */
    get currentToasts(): GoeyToastData[];
    /** Current global config */
    get config(): GoeyToasterConfig;
    /** Update global configuration */
    setConfig(config: Partial<GoeyToasterConfig>): void;
    /** Show a default toast */
    show(title: string, options?: GoeyToastOptions): string | number;
    /** Show a success toast */
    success(title: string, options?: GoeyToastOptions): string | number;
    /** Show an error toast */
    error(title: string, options?: GoeyToastOptions): string | number;
    /** Show a warning toast */
    warning(title: string, options?: GoeyToastOptions): string | number;
    /** Show an info toast */
    info(title: string, options?: GoeyToastOptions): string | number;
    /** Show a promise toast: loading → success/error */
    promise<T>(promise: Promise<T>, data: GoeyPromiseData<T>): string | number;
    /** Dismiss a specific toast or all toasts */
    dismiss(id?: string | number): void;
    /** Update an existing toast's data */
    updateToast(id: string | number, partial: Partial<GoeyToastData>): void;
    private createToast;
    private addToast;
    private generateId;
    static ɵfac: i0.ɵɵFactoryDeclaration<GoeyToastService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<GoeyToastService>;
}
