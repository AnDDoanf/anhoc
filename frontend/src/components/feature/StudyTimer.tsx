"use client";

import { useEffect, useRef, useCallback } from "react";
import { lessonService } from "@/services/lessonService";

interface StudyTimerProps {
  lessonId: string;
}

export default function StudyTimer({ lessonId }: StudyTimerProps) {
  const secondsRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncTime = useCallback(async () => {
    if (secondsRef.current > 0) {
      try {
        await lessonService.trackStudyTime(lessonId, secondsRef.current);
        secondsRef.current = 0;
      } catch (err) {
        console.error("Failed to sync study time:", err);
      }
    }
  }, [lessonId]);

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
  }, [lessonId, syncTime]);

  // This component doesn't render anything visible
  return null;
}
