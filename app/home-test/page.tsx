import { Navbar } from "@/components/v0-home/navbar"
import { Hero } from "@/components/v0-home/hero"
import { Categories } from "@/components/v0-home/categories"
import { ResultsPreview } from "@/components/v0-home/results-preview"
import { Footer } from "@/components/v0-home/footer"

export default function HomeTestPage() {
  return (
    <main className="min-h-screen bg-background font-sans">
      <Navbar />
      <Hero />
      <Categories />
      <ResultsPreview />
      <Footer />
    </main>
  )
}