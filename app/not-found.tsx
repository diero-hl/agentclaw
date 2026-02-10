import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to Marketplace
        </Link>
      </div>
    </div>
  );
}
