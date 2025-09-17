"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
	type LoginResult,
	loginAction,
} from "@/app/(auth)/admin/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SubmitButton = () => {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" className="w-full" disabled={pending}>
			{pending ? "Masuk..." : "Masuk"}
		</Button>
	);
};

export const AdminLoginForm = () => {
	const searchParams = useSearchParams();
	const redirectTo = searchParams?.get("redirectTo") ?? "/admin/orders";
	const [state, formAction] = useActionState(loginAction, { error: "" });

	return (
		<form action={formAction} className="space-y-4">
			<input type="hidden" name="redirectTo" value={redirectTo} />
			{state?.error && <Alert variant="destructive">{state.error}</Alert>}
			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					name="email"
					type="email"
					required
					placeholder="admin@hotelzoom.com"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input id="password" name="password" type="password" required />
			</div>
			<SubmitButton />
		</form>
	);
};
