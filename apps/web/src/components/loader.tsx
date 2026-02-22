import { Loader2 } from "lucide-react";

interface LoaderProps {
	/** Tailwind size class, e.g. "h-4 w-4", "h-8 w-8", "h-10 w-10". Defaults to unset (lucide default). */
	size?: string;
	/** Optional label shown below the spinner */
	label?: string;
}

export default function Loader({ size, label }: LoaderProps = {}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 pt-8">
			<Loader2 className={`animate-spin ${size ?? ""}`} />
			{label && <p className="text-muted-foreground text-sm">{label}</p>}
		</div>
	);
}
