"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceToolbarProps {
	autoPrint?: boolean;
	backHref?: string;
}

export const InvoiceToolbar = ({ autoPrint = false, backHref = "/admin/billing" }: InvoiceToolbarProps) => {
	useEffect(() => {
		document.body.classList.add("invoice-print-mode");
		return () => {
			document.body.classList.remove("invoice-print-mode");
		};
	}, []);

	useEffect(() => {
		if (!autoPrint) {
			return;
		}
		const timeout = window.setTimeout(() => {
			window.print();
		}, 300);
		return () => window.clearTimeout(timeout);
	}, [autoPrint]);

	return (
		<div className="flex items-center justify-between gap-3 print:hidden">
			<Button asChild variant="ghost" size="sm">
				<Link href={backHref}>
					<ArrowLeft className="h-4 w-4" />
					Kembali
				</Link>
			</Button>
			<Button variant="outline" size="sm" onClick={() => window.print()}>
				<Printer className="h-4 w-4" />
				Print
			</Button>
		</div>
	);
};
