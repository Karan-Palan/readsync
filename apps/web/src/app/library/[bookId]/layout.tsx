import Header from "@/components/header";

export default function BookDetailLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="grid h-svh grid-rows-[auto_1fr] overflow-hidden">
			<Header />
			<div className="overflow-y-auto">{children}</div>
		</div>
	);
}
