"use client";

import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { usePathname } from "next/navigation";

export function OnboardingGuide() {
  const [run, setRun] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Only run tour once, checking localstorage. And only if user is logged in (handled by root layout rendering).
    const guided = localStorage.getItem("nootle_tour_completed");

    // Slight delay to ensure elements render
    const t = setTimeout(() => {
      if (!guided && pathname === "/") {
        setRun(true);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [pathname]);

  const steps: Step[] = [
    {
      target: "body",
      placement: "center",
      content: (
        <div>
          <h2 className="text-lg font-bold">Welcome to Nootle! 🎉</h2>
          <p className="text-sm mt-2 text-muted-foreground">
            Your purely local, lightning-fast workspace. Every piece of data
            stays on your device. Let's take a quick 1-minute look around!
          </p>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: ".tour-sidebar-todos",
      placement: "right",
      content: (
        <div>
          <h3 className="font-semibold text-primary">Todos</h3>
          <p className="text-sm mt-1">
            Manage your pending tasks and track deadlines completely offline.
          </p>
        </div>
      ),
    },
    {
      target: ".tour-sidebar-notebooks",
      placement: "right",
      content: (
        <div>
          <h3 className="font-semibold text-primary">Notebooks</h3>
          <p className="text-sm mt-1">
            Write structured markdown notes under organized notebooks.
          </p>
        </div>
      ),
    },
    {
      target: ".tour-sidebar-drawings",
      placement: "right",
      content: (
        <div>
          <h3 className="font-semibold text-primary">Whiteboards</h3>
          <p className="text-sm mt-1">
            Sketch out ideas with the local Tldraw integration.
          </p>
        </div>
      ),
    },
    {
      target: ".tour-sidebar-timer",
      placement: "right",
      content: (
        <div>
          <h3 className="font-semibold text-primary">Timer</h3>
          <p className="text-sm mt-1">
            Use a Pomodoro or Stopwatch timer. Don't worry, it runs even if you
            refresh!
          </p>
        </div>
      ),
    },
    {
      target: ".tour-sidebar-categories",
      placement: "right",
      content: (
        <div>
          <h3 className="font-semibold text-primary">Categories</h3>
          <p className="text-sm mt-1">
            Create tags (like 'Work' or 'Personal') to easily group your content
            across the whole app.
          </p>
        </div>
      ),
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem("nootle_tour_completed", "true");
    }
  };

  if (!mounted) return null;

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: "#000",
          textColor: "var(--foreground)",
          backgroundColor: "var(--background)",
          arrowColor: "var(--background)",
        },
        tooltip: {
          borderRadius: "12px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        },
        buttonNext: {
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
          borderRadius: "6px",
          padding: "8px 16px",
          fontWeight: "500",
        },
        buttonBack: {
          color: "var(--muted-foreground)",
          marginRight: 10,
        },
        buttonSkip: {
          color: "var(--muted-foreground)",
        },
      }}
    />
  );
}
