'use client'

import { TextEditor } from "@/components/text-editor"
import { ErrorDisplay } from "@/components/error-display"
import { watsonApi, type WatsonResponse } from "@/lib/watson-api"
import { useState } from "react"

export default function Home() {
  const [corrections, setCorrections] = useState<WatsonResponse>([])
  const [synonyms, setSynonyms] = useState<string>("")

  // Function to update corrections when new errors are found
  const handleErrorsFound = (newCorrections: WatsonResponse) => {
    setCorrections(newCorrections)
    setSynonyms("") // Clear synonyms when showing errors
  }

  // Function to update synonyms when generated
  const handleSynonymsGenerated = (newSynonyms: string) => {
    setSynonyms(newSynonyms)
    setCorrections([]) // Clear corrections when showing synonyms
  }

  return (
    <main className="flex min-h-screen p-8 justify-center">
      <div className="flex gap-6 max-w-[1200px] w-full">
        <div className="w-[400px]">
          <ErrorDisplay 
            corrections={corrections} 
            synonyms={synonyms}
          />
        </div>
        <div className="flex-1">
          <TextEditor 
            onErrorsFound={handleErrorsFound}
            onSynonymsGenerated={handleSynonymsGenerated}
          />
        </div>
      </div>
    </main>
  )
}
