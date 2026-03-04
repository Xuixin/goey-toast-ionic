# goey-toast-ng

Organic blob morph toast notifications for **Ionic Angular** — a port of [goey-toast](https://goey-toast.vercel.app) (React) to Angular.

## Features

- 🫧 Organic blob morph animation (pill → blob → pill)
- ✅ Five toast types: default, success, error, warning, info
- ⏳ Promise toasts with loading → success/error transitions
- 🔘 Action buttons with optional success label morph-back
- ⏱ Configurable display duration and bounce intensity
- 🎨 Custom fill color, border color, and border width
- 📍 6 positions with automatic mirroring for right-side positions
- 🖱 Hover pause and re-expand
- 🌙 Light and dark theme support
- 🏃 Spring/bounce physics animations

## Installation

Copy the `projects/goey-toast-ionic/src/lib/` folder into your Ionic Angular project's `src/app/` or shared library folder.

**No additional dependencies needed** — uses only Angular core, CommonModule, and pure TypeScript (no framer-motion, no sonner).

## Quick Start

### 1. Import the module

```typescript
// app.module.ts
import { GoeyToastModule } from './lib/goey-toast.module';

@NgModule({
  imports: [GoeyToastModule],
})
export class AppModule {}
```

Or with **standalone components** (Angular 15+):

```typescript
// app.component.ts
import { GoeyToasterComponent } from './lib/goey-toaster.component';

@Component({
  standalone: true,
  imports: [GoeyToasterComponent],
  template: `<goey-toaster position="bottom-right"></goey-toaster>`,
})
export class AppComponent {}
```

### 2. Add the toaster to your template

```html
<goey-toaster
  position="bottom-right"
  theme="light"
  [gap]="14"
  offset="24px"
  [spring]="true"
  [bounce]="0.4"
></goey-toaster>
```

### 3. Show toasts from your component

```typescript
import { GoeyToastService } from './lib/goey-toast.service';

@Component({...})
export class MyComponent {
  constructor(private toast: GoeyToastService) {}

  showSuccess() {
    this.toast.success('Saved!');
  }

  showError() {
    this.toast.error('Payment failed', {
      description: 'Your card was declined. Please try again.',
    });
  }

  showWithAction() {
    this.toast.info('Share link ready', {
      description: 'Your link has been generated.',
      action: {
        label: 'Copy to Clipboard',
        onClick: () => navigator.clipboard.writeText('https://...'),
        successLabel: 'Copied!',
      },
    });
  }

  showPromise() {
    this.toast.promise(this.saveData(), {
      loading: 'Saving...',
      success: 'Changes saved',
      error: 'Something went wrong',
      description: {
        success: 'All changes have been synced.',
        error: 'Please try again later.',
      },
    });
  }
}
```

## API

### GoeyToastService Methods

| Method | Description |
|--------|-------------|
| `show(title, options?)` | Default (neutral) toast |
| `success(title, options?)` | Green success toast |
| `error(title, options?)` | Red error toast |
| `warning(title, options?)` | Yellow warning toast |
| `info(title, options?)` | Blue info toast |
| `promise(promise, data)` | Loading → success/error |
| `dismiss(id?)` | Dismiss one or all toasts |

### GoeyToasterComponent Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `position` | `GoeyToastPosition` | `'bottom-right'` | Toast position |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `gap` | `number` | `14` | Gap between toasts (px) |
| `offset` | `number \| string` | `'24px'` | Distance from edge |
| `spring` | `boolean` | `true` | Enable spring animations |
| `bounce` | `number` | `0.4` | Spring intensity (0.05–0.8) |

### GoeyToastOptions

| Option | Type | Description |
|--------|------|-------------|
| `description` | `string` | Body content |
| `action` | `GoeyToastAction` | Action button config |
| `duration` | `number` | Display duration in ms |
| `fillColor` | `string` | Background color |
| `borderColor` | `string` | Border color |
| `borderWidth` | `number` | Border width (px) |
| `spring` | `boolean` | Per-toast spring toggle |
| `bounce` | `number` | Per-toast bounce intensity |

## License

MIT
