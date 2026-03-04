export type GoeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info';
export type GoeyToastPhase = 'loading' | 'default' | 'success' | 'error' | 'warning' | 'info';
export type GoeyToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export interface GoeyToastTimings {
    displayDuration?: number;
}
export interface GoeyToastClassNames {
    wrapper?: string;
    content?: string;
    header?: string;
    title?: string;
    icon?: string;
    description?: string;
    actionWrapper?: string;
    actionButton?: string;
}
export interface GoeyToastAction {
    label: string;
    onClick: () => void;
    successLabel?: string;
}
export interface GoeyToastOptions {
    description?: string;
    action?: GoeyToastAction;
    icon?: string;
    duration?: number;
    id?: string | number;
    classNames?: GoeyToastClassNames;
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
    timing?: GoeyToastTimings;
    showClose?: boolean;
    spring?: boolean;
    bounce?: number;
}
export interface GoeyPromiseData<T> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
    description?: {
        loading?: string;
        success?: string | ((data: T) => string);
        error?: string | ((error: unknown) => string);
    };
    action?: {
        success?: GoeyToastAction;
        error?: GoeyToastAction;
    };
    classNames?: GoeyToastClassNames;
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
    timing?: GoeyToastTimings;
    showClose?: boolean;
    spring?: boolean;
    bounce?: number;
}
export interface GoeyToastData {
    id: string | number;
    title: string;
    description?: string;
    type: GoeyToastType;
    phase: GoeyToastPhase;
    action?: GoeyToastAction;
    icon?: string;
    classNames?: GoeyToastClassNames;
    fillColor?: string;
    borderColor?: string;
    borderWidth?: number;
    timing?: GoeyToastTimings;
    showClose?: boolean;
    spring?: boolean;
    bounce?: number;
    duration?: number;
    dismissing?: boolean;
    createdAt: number;
}
export interface GoeyToasterConfig {
    position?: GoeyToastPosition;
    duration?: number;
    gap?: number;
    offset?: number | string;
    showClose?: boolean;
    spring?: boolean;
    bounce?: number;
    maxVisible?: number;
}
