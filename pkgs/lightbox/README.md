# @hanakla/react-lightbox

[![npm version](https://img.shields.io/npm/v/@hanakla/react-lightbox.svg?style=flat-square)](https://www.npmjs.com/package/@hanakla/react-lightbox)
[![npm downloads](https://img.shields.io/npm/dm/@hanakla/react-lightbox.svg?style=flat-square)](https://www.npmjs.com/package/@hanakla/react-lightbox)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@hanakla/react-lightbox?style=flat-square)](https://bundlephobia.com/package/@hanakla/react-lightbox)
[![license](https://img.shields.io/npm/l/@hanakla/react-lightbox.svg?style=flat-square)](https://github.com/hanakla/react-lightbox/blob/main/LICENSE)

A flexible headless lightbox component for React.

Inspired by [react-image-viewer-hook](https://github.com/rkusa/react-image-viewer-hook), reimagined as a headless component library for maximum flexibility and customization.

### Demo

Try it out on CodeSandbox:

[![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/devbox/qfw557?file=%2Fsrc%2FApp.tsx%3A13%2C3)

## Features

- **Headless design** - Fully customizable UI with complete control over styling
- **Pinch-to-zoom support** - Built-in support for touch gestures on mobile devices
- **TypeScript support** - Fully typed API for better developer experience
- **Flexible architecture** - Compose your own lightbox with provided building blocks
- **Accessible** - Keyboard navigation and proper ARIA attributes

## Installation

```bash
npm install @hanakla/react-lightbox
```

## Anatomy

Import the component and assemble its parts:

```tsx
import {
  useLightbox,
  Lightbox,
  useLightboxState,
} from "@hanakla/react-lightbox";

function App() {
  const lb = useLightbox({
    LightboxComponent: MyLightbox,
  });

  return (
    <>
      <button onClick={lb.getOnClick(item)}>Open</button>
      <lb.LightboxView />
    </>
  );
}

function MyLightbox() {
  const lbContext = useLightboxState();

  return (
    <Lightbox.Root>
      <Lightbox.Header>
        <Lightbox.Close />
      </Lightbox.Header>
      <Lightbox.Viewport
        $renderItem={(item, index) => (
          <Lightbox.Item $index={index}>
            <Lightbox.Pinchable>{/* Your content */}</Lightbox.Pinchable>
          </Lightbox.Item>
        )}
      />
    </Lightbox.Root>
  );
}
```

## Usage

The lightbox is built with a headless architecture, giving you complete control over the UI while handling the complex interaction logic.

### How it works

1. **Initialize the hook** - Call `useLightbox` with your custom lightbox component
2. **Trigger the lightbox** - Use `lb.getOnClick(item)` to open the lightbox with specific content
3. **Render the viewer** - Place `<lb.LightboxView />` in your component tree
4. **Build your UI** - Compose your lightbox interface using the provided building blocks

The library separates concerns:

- `useLightbox` manages state and provides methods to control the lightbox
- `useLightboxState` provides access to the current state within your lightbox component
- `Lightbox.*` components are the building blocks for your custom UI

### Basic example

```tsx
import {
  useLightbox,
  Lightbox,
  useLightboxState,
} from "@hanakla/react-lightbox";

type ImageItem = {
  kind: "image";
  url: string;
};

function App() {
  const lb = useLightbox<ImageItem>({
    onLoadNext: () => {
      console.log("Request to load next");
    },
    LightboxComponent: ImageLightbox,
  });

  const images = [
    { kind: "image", url: "/image1.jpg" },
    { kind: "image", url: "/image2.jpg" },
    { kind: "image", url: "/image3.jpg" },
  ];

  return (
    <div>
      {images.map((img, index) => (
        <img
          key={index}
          src={img.url}
          onClick={lb.getOnClick(img)}
          style={{ cursor: "pointer" }}
        />
      ))}

      <lb.LightboxView />
    </div>
  );
}

function ImageLightbox({ items, defaultIndex }: Lightbox.Props<ImageItem>) {
  const lbContext = useLightboxState<ImageItem>();

  const renderItem = (item: ImageItem, index: number) => {
    if (item.kind === "image") {
      return (
        <Lightbox.Item
          $index={index}
          className="flex items-center justify-center flex-1 p-5"
        >
          <Lightbox.Pinchable onRequestClose={lbContext.close}>
            <img src={item.url} draggable={false} />
          </Lightbox.Pinchable>
        </Lightbox.Item>
      );
    }
    return null;
  };

  return (
    <Lightbox.Root className="fixed inset-0 isolate flex flex-col bg-black/80">
      <Lightbox.Header className="flex items-center justify-end w-full py-2 px-4 bg-black/80 text-white">
        <Lightbox.Close>
          <span className="text-[24px]">&times;</span>
        </Lightbox.Close>
      </Lightbox.Header>

      <Lightbox.Viewport className="flex flex-1" $renderItem={renderItem} />
    </Lightbox.Root>
  );
}
```

## API Reference

### useLightbox

```tsx
const lb = useLightbox<T>(options);
```

Main hook to create a lightbox.

**Type Parameters**

| Parameter | Description                                  |
| --------- | -------------------------------------------- |
| `T`       | The type of items to display in the lightbox |

**Parameters**

| Prop                | Type                                     | Default     | Description                                                                                                        |
| ------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `LightboxComponent` | `React.ComponentType<Lightbox.Props<T>>` | —           | Custom lightbox component to render when the lightbox is opened                                                    |
| `onLoadNext`        | `() => void`                             | `undefined` | Callback invoked when the user navigates to the last item. Useful for implementing infinite scroll or lazy loading |

**Returns**

| Property       | Type                                         | Description                                                                             |
| -------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `getOnClick`   | `(item: T) => (e: React.MouseEvent) => void` | Returns a click handler function that opens the lightbox with the specified item        |
| `LightboxView` | `React.ComponentType`                        | Component that renders the lightbox modal. Should be placed once in your component tree |

---

### useLightboxState

```tsx
const lbContext = useLightboxState<T>();
```

Hook to access the current lightbox state from within lightbox components.

**Type Parameters**

| Parameter | Description                       |
| --------- | --------------------------------- |
| `T`       | The type of items in the lightbox |

**Returns**

| Property          | Type                      | Description                                                         |
| ----------------- | ------------------------- | ------------------------------------------------------------------- |
| `items`           | `T[]`                     | Array of all items currently in the lightbox                        |
| `currentIndex`    | `number`                  | Index of the currently displayed item                               |
| `currentItem`     | `T \| undefined`          | The currently displayed item, or `undefined` if no item is selected |
| `setCurrentIndex` | `(index: number) => void` | Function to programmatically change the current item by index       |
| `close`           | `() => void`              | Function to close the lightbox                                      |

---

### Lightbox.Root

```tsx
<Lightbox.Root className="...">
```

Root container for the lightbox.

---

### Lightbox.Header

```tsx
<Lightbox.Header className="...">
```

Container for header content like close button and actions.

---

### Lightbox.Close

```tsx
<Lightbox.Close>
  <span>&times;</span>
</Lightbox.Close>
```

Button to close the lightbox.

---

### Lightbox.Viewport

```tsx
<Lightbox.Viewport $renderItem={(item, index) => ...} />
```

Main viewport area that displays the lightbox items.

**Props**

| Prop          | Type                                          | Default | Description                                                                                   |
| ------------- | --------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `$renderItem` | `(item: T, index: number) => React.ReactNode` | —       | Render function called for each item in the lightbox. Must return a `Lightbox.Item` component |

---

### Lightbox.Item

```tsx
<Lightbox.Item $index={index}>
```

Wrapper component for individual lightbox items.

**Props**

| Prop     | Type     | Default | Description                                                                       |
| -------- | -------- | ------- | --------------------------------------------------------------------------------- |
| `$index` | `number` | —       | Index of the item being rendered. Used to track which item is currently displayed |

---

### Lightbox.Pinchable

```tsx
<Lightbox.Pinchable onRequestClose={lbContext.close}>
  <img src="..." />
</Lightbox.Pinchable>
```

Helper component that adds pinch-to-zoom and pan gestures to its children.

**Props**

| Prop             | Type         | Default     | Description                                                                                         |
| ---------------- | ------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| `onRequestClose` | `() => void` | `undefined` | Callback invoked when the user performs a close gesture. Typically connected to `lbContext.close()` |

**Features**

- Pinch-to-zoom gesture support on touch devices
- Pan gesture when zoomed in
- Double-tap to zoom
- Smooth animations and transitions

---

## Credits

This library is based on [react-image-viewer-hook](https://github.com/rkusa/react-image-viewer-hook) by [rkusa](https://github.com/rkusa), reimagined as a headless component library for maximum flexibility and customization.

Original work Copyright (c) Markus Ast (rkusa)

## License

MIT

Copyright (c) [Your Name/Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
