"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

interface InvoicePrintButtonProps extends VariantProps<typeof buttonVariants> {
	href: string;
	label?: string;
	className?: string;
}

export const InvoicePrintButton = ({
	href,
	label = "Print Invoice",
	variant = "outline",
	size = "sm",
	className,
}: InvoicePrintButtonProps) => {
	return (
		<Button
			asChild
			variant={variant}
			size={size}
			className={className}
		>
			<Link href={href} target="_blank" rel="noopener noreferrer" prefetch={false}>
				<Printer className="h-4 w-4" />
				{label}
			</Link>
		</Button>
	);
};
