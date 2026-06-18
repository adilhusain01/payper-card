import DemoRunner from "@/components/DemoRunner";
import { Footer, Navbar } from "@/components/Shell";

export const metadata = {
  title: "PayPer Card Demo - Sui USDC",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar badge="VISUAL DEMO" />
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <DemoRunner />
      </main>
      <Footer />
    </div>
  );
}
