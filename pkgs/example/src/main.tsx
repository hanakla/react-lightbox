import "./global.css";
import {
	Lightbox,
	useLightbox,
	useLightboxState,
} from "@hanakla/react-lightbox";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { twMerge } from "tailwind-merge";

createRoot(document.getElementById("root")!).render(<App />);

type ItemType = {
	kind: "image";
	url: string;
};

function App() {
	const [images, setImages] = useState<Set<string>>(
		new Set([
			"https://images.pexels.com/photos/374631/pexels-photo-374631.jpeg",
			"https://images.pexels.com/photos/416682/pexels-photo-416682.jpeg",
			"https://images.pexels.com/photos/545580/pexels-photo-545580.jpeg",
		]),
	);

	const lb = useLightbox<ItemType>({
		onLoadNext: () => {
			setTimeout(() => {
				setImages(
					new Set([
						...images,
						"https://images.pexels.com/photos/35204301/pexels-photo-35204301.jpeg",
						"https://images.pexels.com/photos/9493870/pexels-photo-9493870.jpeg",
						"https://images.pexels.com/photos/3776939/pexels-photo-3776939.jpeg",
					]),
				);
			}, 1000);

			console.log("Request to load next");
		},
		LightboxComponent: AppLightbox,
	});

	return (
		<div className="p-12">
			<h1 className="text-2xl mb-8">React Lightbox example</h1>

			<ul className="grid grid-cols-5">
				{Array.from(images).map((src, index) => (
					<li key={index}>
						<Focusible onClick={lb.getOnClick({ kind: "image", url: src })}>
							<img
								src={src}
								alt={`Image ${index + 1}`}
								className="w-32 h-32 object-cover cursor-pointer"
							/>
						</Focusible>
					</li>
				))}
			</ul>

			<lb.LightboxView />
		</div>
	);
}

function AppLightbox() {
	const lbContext = useLightboxState<ItemType>();

	const renderItem = useCallback(
		(item: ItemType, index) => {
			if (item.kind === "image")
				return (
					<Lightbox.Item
						$index={index}
						className="flex items-center justify-center flex-1 p-5"
					>
						<Lightbox.Pinchable
							className="transition-transform"
							onRequestClose={lbContext.close}
						>
							<img
								alt={`Image ${index + 1}`}
								src={item.url}
								draggable={false}
							/>
						</Lightbox.Pinchable>
					</Lightbox.Item>
				);
			return null;
		},
		[lbContext.close],
	);

	return (
		<Lightbox.Root
			className="fixed inset-0 isolate flex flex-col bg-black/80"
			aria-modal="true"
			aria-label="Image viewer"
		>
			<Lightbox.Header className="top-0 z-2 flex items-center gap-2 justify-end w-full py-2 px-4 bg-black/80 text-white">
				<div className="sr-only" aria-live="polite" aria-atomic="true">
					Image {(lbContext.currentIndex ?? 0) + 1} of {lbContext.items.length}
				</div>

				<div>
					<a
						href={lbContext.currentItem?.url}
						target="_blank"
						rel="noreferrer"
						aria-label="Download image"
					>
						<Download aria-hidden="true" />
					</a>
				</div>

				<Lightbox.Close aria-label="Close lightbox">
					<span className="text-[24px]" aria-hidden="true">
						&times;
					</span>
				</Lightbox.Close>
			</Lightbox.Header>

			<Lightbox.Viewport className="flex flex-1" $renderItem={renderItem} />

			<div className="bg-black/50">
				<ul
					className="flex flex-row gap-2 py-4 items-start justify-center"
					aria-label="Thumbnail navigation"
				>
					{lbContext.items.map((item, idx) => (
						<li key={idx}>
							<Focusible
								onClick={() => lbContext.setCurrentIndex(idx)}
								aria-label={`Go to image ${idx + 1}`}
								aria-current={
									idx === lbContext.currentIndex ? "true" : undefined
								}
							>
								<img
									src={item.url}
									alt=""
									className={twMerge(
										"w-40 transition-colors",
										idx === lbContext.currentIndex ? "ring-4 ring-white" : "",
									)}
								/>
							</Focusible>
						</li>
					))}
				</ul>
			</div>
		</Lightbox.Root>
	);
}

function Focusible(
	props: React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	>,
) {
	return <button type="button" {...props} />;
}
