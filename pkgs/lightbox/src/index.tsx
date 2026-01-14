import { useDrag, useGesture } from "@use-gesture/react";
import { FocusTrap } from "focus-trap-react";
import {
	type ComponentProps,
	cloneElement,
	createContext,
	type Dispatch,
	type ForwardedRef,
	forwardRef,
	memo,
	type SetStateAction,
	Suspense,
	type SyntheticEvent,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

export type LightboxProps<T> = {
	items: Array<T>;
	onLoadNext: () => void;
	onClose: () => void;
	defaultIndex: number | null;
	inertDocument?: boolean;
	open?: boolean;
};

type LightboxContext<T> = {
	rootRef: React.RefObject<HTMLElement | null>;
	items: Array<T>;
	currentIndex: number | null;
	setCurrentIndex: Dispatch<SetStateAction<number | null>>;
	preventScrollWhileOpen: boolean;
	onLoadNext: () => void;
	close: () => void;
};

type LightboxDragContext = {
	offset: number;
	setOffset: Dispatch<SetStateAction<number>>;
};

const LightboxContext = createContext<LightboxContext<any> | null>(null);
const LightboxDragContext = createContext<LightboxDragContext | null>(null);

function useContextStrict<T>(Context: React.Context<T | null>) {
	const context = useContext<T | null>(Context);

	if (!context) {
		throw new Error("Lightbox components must be used within a Lightbox.Root");
	}

	return context;
}

export namespace Lightbox {
	export type Props<T> = LightboxProps<T>;
}

export const Lightbox = {
	/**
	 * Root container for the lightbox.
	 */
	Root: memo(
		forwardRef(function Root(
			{
				$onClose,
				onKeyDown,
				children,
				...props
			}: ComponentProps<"div"> & {
				$onClose?: () => void;
			},
			propsRef: React.Ref<HTMLDivElement>,
		) {
			const {
				rootRef,
				items,
				onLoadNext,
				currentIndex,
				setCurrentIndex,
				preventScrollWhileOpen,
				close,
			} = useContextStrict<LightboxContext<any>>(LightboxContext);

			const ref = useConcatRef(props.ref, rootRef, propsRef);

			const onClickBackdrop = useEventCallback((e: React.MouseEvent) => {
				if (e.target === e.currentTarget) {
					close();
				}
			});

			const onKeydown = useEventCallback(
				(e: React.KeyboardEvent<HTMLDivElement>) => {
					onKeyDown?.(e);
					if (e.defaultPrevented) return;
					if (currentIndex == null) return;

					if (e.key === "Escape") {
						$onClose?.();
						close();
					}

					if (e.key === "ArrowRight") {
						const nextIndex = currentIndex + 1;
						if (nextIndex >= items.length - 1) {
							onLoadNext();
						}

						setCurrentIndex(Math.min(nextIndex, items.length - 1));
					} else if (e.key === "ArrowLeft") {
						const prevIndex = currentIndex - 1;
						setCurrentIndex(Math.max(prevIndex, 0));
					}
				},
			);

			// Prevent background scrolling when lightbox is open
			useEffect(() => {
				const original = document.body.style.overflow;

				if (preventScrollWhileOpen) {
					document.body.style.overflow = currentIndex != null ? "hidden" : "";
				}

				return () => {
					if (preventScrollWhileOpen) {
						document.body.style.overflow = original;
					}
				};
			}, [currentIndex, preventScrollWhileOpen]);

			useEffect(() => {
				requestAnimationFrame(() => {
					rootRef.current?.focus();
				});
			}, [rootRef.current]);

			return (
				<FocusTrap active={currentIndex != null}>
					<div
						ref={ref as React.Ref<HTMLDivElement>}
						role="dialog"
						tabIndex={-1}
						aria-modal="true"
						onClick={onClickBackdrop}
						onKeyDown={onKeydown}
						{...props}
					>
						{children}
					</div>
				</FocusTrap>
			);
		}),
	),
	/**
	 * Container for header content like close button and actions.
	 */
	Header: memo(
		forwardRef(function Header(
			{ children, ...props }: ComponentProps<"header">,
			ref: ForwardedRef<HTMLElement>,
		) {
			return (
				<header ref={ref} {...props}>
					{children}
				</header>
			);
		}),
	),
	/**
	 * Button to close the lightbox.
	 */
	Close: memo(
		forwardRef(function Close(
			{ onClick, children, ...props }: ComponentProps<"button">,
			ref: ForwardedRef<HTMLButtonElement>,
		) {
			const context = useContextStrict<LightboxContext<any>>(LightboxContext);

			const close = useEventCallback(
				(e: React.MouseEvent<HTMLButtonElement>) => {
					onClick?.(e);
					if (e.defaultPrevented) return;

					e.stopPropagation();
					context.close();
				},
			);

			return (
				<button ref={ref} type="button" onClick={close} {...props}>
					{children}
				</button>
			);
		}),
	),
	/**
	 * Main viewport area that displays the lightbox items.
	 *
	 * @param $renderItem - Render function called for each item in the lightbox. Must return a `Lightbox.Item` component
	 * @param $direction - Direction of the viewport (horizontal or vertical). Default is "horizontal"
	 */
	Viewport: memo(
		forwardRef(function Viewport(
			{
				children,
				$renderItem,
				$direction = "horizontal",
				...props
			}: ComponentProps<"div"> & {
				$renderItem: (item: unknown, index: number) => React.ReactElement;
				$direction?: "horizontal" | "vertical";
			},
			ref: ForwardedRef<HTMLDivElement>,
		) {
			const { items, currentIndex } =
				useContextStrict<LightboxContext<any>>(LightboxContext);

			const [offsetX, setOffsetX] = useState(0);

			const dragContext = useMemo(
				() => ({
					offset: offsetX,
					setOffset: setOffsetX,
				}),
				[offsetX],
			);

			if (currentIndex == null) return null;

			const visibleIndices = [
				currentIndex - 1,
				currentIndex,
				currentIndex + 1,
			].filter((i) => i >= 0 && i < items.length);

			return (
				<LightboxDragContext.Provider value={dragContext}>
					<section
						ref={ref}
						aria-live="polite"
						style={{
							position: "relative",
							overflow: "hidden",
						}}
						{...props}
					>
						{visibleIndices.map((index) => {
							const item = items[index];
							if (!item) return null;

							const element = $renderItem(item, index);
							return cloneElement(element, {
								key: index,
							});
						})}
					</section>
				</LightboxDragContext.Provider>
			);
		}),
	),
	/**
	 * Wrapper component for individual lightbox items.
	 *
	 * @param $index - Index of the item being rendered. Used to track which item is currently displayed
	 */
	Item: memo(
		forwardRef(function Item(
			{
				style,
				children,
				$index,
				...props
			}: ComponentProps<"div"> & { $index: number },
			ref: ForwardedRef<HTMLDivElement>,
		) {
			const { currentIndex, rootRef, items, onLoadNext, setCurrentIndex } =
				useContextStrict<LightboxContext<any>>(LightboxContext);

			const dragContext = useContextStrict<LightboxDragContext | null>(
				LightboxDragContext,
			);

			const { offset, setOffset } = dragContext;

			const bind = useDrag(
				async ({
					down,
					movement: [mx],
					direction: [xDir],
					initial: [ix],
					cancel,
				}) => {
					if (currentIndex == null) return;

					// Only allow swipe from left or right edge (20% of width)
					if (down && rootRef.current) {
						const width = rootRef.current.clientWidth;
						const edgeThreshold = width * 0.35;

						// Check if drag started from edge area
						if (ix > edgeThreshold && ix < width - edgeThreshold) {
							cancel();
							return;
						}
					}

					if (down) {
						setOffset(mx);
					} else {
						const threshold = 100;
						if (Math.abs(mx) > threshold) {
							const nextIndex = currentIndex + (xDir < 0 ? 1 : -1);

							if (nextIndex >= items.length - 1) {
								await onLoadNext();
							}

							setCurrentIndex(
								Math.min(Math.max(nextIndex, 0), items.length - 1),
							);
						}

						setOffset(0);
					}
				},
				{
					axis: "x",
					filterTaps: true,
					pointer: { touch: true },
					// enabled: !isZoomed,
				},
			);

			if (currentIndex == null) return null;

			return (
				<div
					ref={ref}
					{...props}
					{...bind()}
					style={{
						...style,
						position: "absolute",
						top: 0,
						left: `${$index * 100}%`,
						width: "100%",
						height: "100%",
						flex: "1",
						touchAction: "none",
						userSelect: "none",
						transform: `translateX(calc(-${currentIndex * 100}% + ${offset}px))`,
						transition: offset === 0 ? "transform 0.3s ease-out" : "none",
					}}
				>
					{children}
				</div>
			);
		}),
	),
	/**
	 * Helper component that adds pinch-to-zoom and pan gestures to its children.
	 *
	 * Features:
	 * - Pinch-to-zoom gesture support on touch devices
	 * - Pan gesture when zoomed in
	 * - Double-tap to zoom
	 * - Smooth animations and transitions
	 *
	 * @param onRequestClose - Callback invoked when the user performs a close gesture. Typically connected to `lbContext.close()`
	 */
	Pinchable: memo(
		forwardRef(function Pinchable(
			{
				className,
				children,
				onRequestClose,
				onZoomChange,
			}: {
				className?: string;
				children: React.ReactNode;
				onRequestClose?: (e: React.MouseEvent) => void;
				onZoomChange?: (zoomed: boolean) => void;
			},
			ref: React.Ref<HTMLDivElement>,
		) {
			const [{ scale, x, y }, setTransform] = useState({
				scale: 1,
				x: 0,
				y: 0,
			});
			const [swipeOffsetY, setSwipeOffsetY] = useState(0);
			const imageRef = useConcatRef<HTMLDivElement>(ref);

			useGesture(
				{
					onDrag: ({
						offset: [ox, oy],
						down,
						movement: [, my],
						pinching,
						cancel,
						event,
					}) => {
						if (scale !== 1) {
							event.stopPropagation();
						}

						if (pinching) return cancel();

						if (scale > 1) {
							// When zoomed, allow panning the image
							setTransform({ scale, x: ox, y: oy });
						} else {
							// When not zoomed, allow vertical swipe to close
							if (down) {
								// Only allow downward swipe
								setSwipeOffsetY(Math.max(0, my));
							} else {
								const threshold = 100;
								if (my > threshold) {
									// Swipe down threshold exceeded, close viewer
									onRequestClose?.({} as React.MouseEvent);
								}
								setSwipeOffsetY(0);
							}
						}
					},
					onPinch: ({ offset: [s], event }) => {
						event.preventDefault();
						const newScale = Math.max(1, Math.min(s, 4));
						setTransform({ scale: newScale, x: 0, y: 0 });
						onZoomChange?.(newScale > 1);
					},
					onWheel: ({ event, ctrlKey }) => {
						if (ctrlKey) {
							event.preventDefault();
						}
					},
				},
				{
					target: imageRef,
					drag: {
						from: () => (scale > 1 ? [x, y] : [0, 0]),
					},
					pinch: {
						scaleBounds: { min: 1, max: 4 },
						rubberband: true,
						eventOptions: { passive: false },
					},
					eventOptions: { passive: false },
				},
			);

			const handleClick = useEventCallback((e: React.MouseEvent) => {
				if (scale !== 1) return;

				if (e.target === e.currentTarget) {
					onRequestClose?.(e);
				}
			});

			const handleDoubleClick = useEventCallback((e: React.MouseEvent) => {
				console.log("hi");
				e.stopPropagation();
				setTransform({ scale: 1, x: 0, y: 0 });
				onZoomChange?.(false);
			});

			const handleKeyDown = useEventCallback((e: React.KeyboardEvent) => {
				// Allow keyboard events to propagate when not zoomed
				if (scale === 1) {
					return;
				}

				// Prevent arrow keys from changing images when zoomed
				if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
					e.stopPropagation();
				}
			});

			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: ok
				<div
					ref={imageRef}
					onClick={handleClick}
					onDoubleClick={handleDoubleClick}
					onKeyDown={handleKeyDown}
					className={className}
					style={{
						touchAction: "none",
						cursor: scale > 1 ? "grab" : "default",
						opacity: scale === 1 ? Math.max(0.5, 1 - swipeOffsetY / 300) : 1,
						transform: `translate(${x}px, ${
							y + (scale === 1 ? swipeOffsetY : 0)
						}px) scale(${scale})`,
						maxHeight: `calc(100vh)`,
					}}
				>
					{children}
				</div>
			);
		}),
	),
};

/**
 * Main hook to create a lightbox.
 *
 * The lightbox is built with a headless architecture, giving you complete control over the UI
 * while handling the complex interaction logic.
 *
 * @template T - The type of items to display in the lightbox
 *
 * @param LightboxComponent - Custom lightbox component to render when the lightbox is opened
 * @param onLoadNext - Callback invoked when the user navigates to the last item. Useful for implementing infinite scroll or lazy loading
 * @param onVisibilityChange - Optional callback invoked when the lightbox visibility changes
 * @param preventScrollWhileOpen - Whether to prevent scrolling on the document body when the lightbox is open. Default is `true`
 *
 * @returns An object containing:
 * - `getOnClick`: Returns a click handler function that opens the lightbox with the specified item
 * - `LightboxView`: Component that renders the lightbox modal. Should be placed once in your component tree
 *
 * @example
 * ```tsx
 * const lb = useLightbox<ImageItem>({
 *   LightboxComponent: MyLightbox,
 *   onLoadNext: () => console.log("Load more"),
 * });
 *
 * return (
 *   <>
 *     <img onClick={lb.getOnClick(item)} />
 *     <lb.LightboxView />
 *   </>
 * );
 * ```
 */
export function useLightbox<T>({
	onLoadNext,
	onVisibilityChange,
	preventScrollWhileOpen = true,
	LightboxComponent,
}: {
	onLoadNext: () => void;
	onVisibilityChange?: (visible: boolean) => void;
	preventScrollWhileOpen?: boolean;
	LightboxComponent: React.ComponentType<LightboxProps<T>>;
}) {
	const items = useRef<Array<T>>([]);
	items.current = []; // Reset items on each render

	const setOpens = useRef<Set<Dispatch<SetStateAction<number | null>>>>(
		new Set(),
	);

	const onLoadNextRef = useEventCallback(onLoadNext);
	const onVisibilityChangeRef = useEventCallback(
		onVisibilityChange ?? (() => {}),
	);

	const LightboxView = useMemo(
		() =>
			function LightboxView() {
				// biome-ignore-start lint/correctness/useHookAtTopLevel: internal
				const rootRef = useRef<HTMLDivElement>(null);
				const [isOpen, setOpen] = useState<number | null>(null);

				useEffect(() => {
					setOpens.current.add(setOpen);
					return () => {
						setOpens.current.delete(setOpen);
					};
				}, []);

				const setIndex = useEventCallback(
					(index: ((prev: number | null) => number | null) | number | null) => {
						setOpen((prev) => {
							let next: number | null = null;

							if (typeof index === "function") {
								next = index(prev);
							} else {
								next = index;
							}

							return next
								? Math.max(0, Math.min(next, items.current.length - 1))
								: next;
						});
					},
				);

				const handleClose = useEventCallback(() => {
					setOpen(null);
					onVisibilityChangeRef(false);
				});

				const context = useMemo(
					() =>
						({
							rootRef,
							items: items.current,
							currentIndex: isOpen,
							setCurrentIndex: setIndex,
							close: handleClose,
							preventScrollWhileOpen,
							onLoadNext: onLoadNextRef,
						}) satisfies LightboxContext<T>,
					[isOpen, setIndex, handleClose, preventScrollWhileOpen],
				);

				// biome-ignore-end lint/correctness/useHookAtTopLevel: internal

				if (isOpen == null || typeof window === "undefined") {
					return null;
				}

				return (
					<Suspense>
						<Portal>
							<LightboxContext.Provider value={context}>
								<LightboxComponent
									items={items.current}
									onLoadNext={onLoadNextRef}
									onClose={handleClose}
									defaultIndex={isOpen}
									open={isOpen != null}
								/>
							</LightboxContext.Provider>
						</Portal>
					</Suspense>
				);
			},
		[
			onLoadNextRef,
			onVisibilityChangeRef,
			LightboxComponent,
			preventScrollWhileOpen,
		],
	);

	return {
		// biome-ignore lint/complexity/useArrowFunction: generic type
		getOnClick: function <E extends SyntheticEvent>(
			item: T,
			onClick?: (e: E) => void,
		) {
			items.current.push(item);
			const itemIndex = items.current.length - 1;

			return (e: E) => {
				onClick?.(e);

				if (e.defaultPrevented) return;

				for (const setOpen of setOpens.current) {
					setOpen(itemIndex);
					onVisibilityChangeRef(true);
				}
			};
		},
		LightboxView,
	};
}

/**
 * Hook to access the current lightbox state from within lightbox components.
 *
 * @template T - The type of items in the lightbox
 *
 * @returns An object containing:
 * - `items`: Array of all items currently in the lightbox
 * - `currentIndex`: Index of the currently displayed item
 * - `currentItem`: The currently displayed item, or `undefined` if no item is selected
 * - `setCurrentIndex`: Function to programmatically change the current item by index
 * - `close`: Function to close the lightbox
 *
 * @example
 * ```tsx
 * function MyLightbox() {
 *   const lbContext = useLightboxState<ImageItem>();
 *
 *   return (
 *     <Lightbox.Root>
 *       <button onClick={lbContext.close}>Close</button>
 *       <div>Current: {lbContext.currentIndex + 1} / {lbContext.items.length}</div>
 *     </Lightbox.Root>
 *   );
 * }
 * ```
 */
export function useLightboxState<T>() {
	const context = useContextStrict(LightboxContext);

	return useMemo(
		() => ({
			close: context.close,
			items: context.items as T[],
			currentItem:
				context.currentIndex != null
					? (context.items[context.currentIndex] as T)
					: null,
			currentIndex: context.currentIndex,
			setCurrentIndex: context.setCurrentIndex,
		}),
		[context],
	);
}

function Portal({ children }: { children: React.ReactNode }) {
	const [container, setContainer] = useState<HTMLElement | null>(null);

	useEffect(() => {
		const el = document.createElement("div");
		document.body.appendChild(el);
		setContainer(el);

		return () => {
			document.body.removeChild(el);
		};
	}, []);

	if (!container) return null;

	return createPortal(children, container);
}

function useConcatRef<T>(
	...refs: Array<React.Ref<T> | undefined | null>
): React.RefObject<T | null> {
	let current: T | null = null;
	let disposers: Array<(() => void) | void> = [];

	// biome-ignore lint/correctness/useExhaustiveDependencies: refs array
	return useMemo(
		() => ({
			set current(value: T | null) {
				current = value;

				if (value == null) {
					for (const disposer of disposers) disposer?.();
					disposers = [];
				} else {
					for (const ref of refs) {
						if (ref == null) continue;
						if (typeof ref === "function") {
							const disposer = ref(value);
							disposers.push(() => disposer);
						} else {
							ref.current = value;
						}
					}
				}
			},
			get current() {
				return current;
			},
		}),
		[...refs],
	);
}

/** Stable referenced useCallback */
// biome-ignore-start lint/correctness/useHookAtTopLevel: Why???
export function useEventCallback<T extends (...args: any[]) => any>(fn: T) {
	const latestRef = useRef<T | null>(null);
	const stableRef = useRef<T | null>(null);

	if (stableRef.current == null) {
		stableRef.current = function (this: any) {
			return latestRef.current?.apply(this, arguments as any);
		} as T;
	}

	useLayoutEffect(() => {
		latestRef.current = fn;
	}, [fn]);

	return stableRef.current;
}
// biome-ignore-end lint/correctness/useHookAtTopLevel: Why???
