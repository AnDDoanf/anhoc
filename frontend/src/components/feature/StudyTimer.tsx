"use client";

import { useEffect, useRef } from "react";
import { lessonService } from "@/services/lessonService";

interface StudyTimerProps {
  lessonId: string;
}

export default function StudyTimer({ lessonId }: StudyTimerProps) {
  const secondsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Increment local timer every second
    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
    }, 1000);

    // Sync to backend every 30 seconds OR on unmount
    const syncInterval = setInterval(() => {
      syncTime();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(syncInterval);
      syncTime(); // Final sync on unmount
    };
  }, [lessonId]);

  const syncTime = async () => {
    if (secondsRef.current > 0) {
      try {
        await lessonService.trackStudyTime(lessonId, secondsRef.current);
        secondsRef.current = 0; // Reset after successful sync
      } catch (err) {
        console.error("Failed to sync study time:", err);
      }
    }
  };

  // This component doesn't render anything visible
  return null;
}
