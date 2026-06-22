"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { TopicList } from "@/components/topic-list"
import { ChatScreen } from "@/components/chat-screen"
import { loadStore, useStore } from "@/lib/store"
import { useAppNav } from "@/lib/use-app-nav"

export default function Page() {
  const { loaded } = useStore()
  const { activeTopic, openTopic, closeTopic } = useAppNav()

  useEffect(() => {
    loadStore()
  }, [])

  return (
    <main className="flex h-dvh w-full items-center justify-center overflow-hidden bg-secondary">
      <div className="relative h-dvh w-full overflow-hidden bg-background md:h-[90vh] md:max-h-[900px] md:w-[400px] md:rounded-[2rem] md:border-[6px] md:border-foreground/10 md:shadow-2xl">
        {!loaded ? (
          <LoadingScreen />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {activeTopic ? (
              <motion.div
                key="chat"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 bg-background"
              >
                <ChatScreen topicId={activeTopic} onBack={closeTopic} />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ x: "-25%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-25%", opacity: 0.6 }}
                transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0"
              >
                <TopicList onOpenTopic={openTopic} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}
